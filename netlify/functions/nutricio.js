const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const prompt = buildPrompt(payload);

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 25000);

  let r;
  try {
    r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: prompt,
        max_output_tokens: 700,
        temperature: 0.6
      }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = String(e && e.name === "AbortError" ? "Timeout" : (e?.message || e));
    return { statusCode: 504, body: msg };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!r.ok) {
    const text = await r.text();
    return { statusCode: r.status, body: text };
  }

  const data = await r.json();
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: data?.output_text ?? "" })
  };
};

function buildPrompt(a) {
  const safe = (v) => (v === null || v === undefined) ? "" : String(v).trim();
  const arr = (v) => Array.isArray(v) ? v.map(safe).filter(Boolean) : [];
  const pick = (label, v) => {
    const s = safe(v);
    return s ? `- ${label}: ${s}` : "";
  };
  const pickList = (label, v) => {
    const xs = arr(v);
    return xs.length ? `- ${label}: ${xs.join(", ")}` : "";
  };

  const week = a.week || {};
  const today = a.today || {};
  const trainingToday = safe(today.training) || "Descans";

  const weekTxt = [
    `Dl ${safe(week.dilluns)}`,
    `Dt ${safe(week.dimarts)}`,
    `Dc ${safe(week.dimecres)}`,
    `Dj ${safe(week.dijous)}`,
    `Dv ${safe(week.divendres)}`,
    `Ds ${safe(week.dissabte)}`,
    `Dg ${safe(week.diumenge)}`
  ].filter(s => !s.endsWith(" ")).join(" | ");

  const lines = [
    "Ets un nutricionista pràctic. Escriu en català. To motivador, professional, clar i directe.",
    "",
    "Resposta en MARKDOWN amb EXACTAMENT aquests 4 títols (amb emojis):",
    "📊 La teva estratègia metabòlica",
    "🏋️ AVUI ENTRENO (dia d’alta energia)",
    "🛌 AVUI DESCANSO (dia de recuperació)",
    "💡 El “per què” d’aquest pla (educació)",
    "",
    "Regles curtes:",
    "- Dona calories i macros aproximats i explica el perquè (rang si falta info).",
    "- Dona 2–3 opcions (A/B/C). En entreno: Esmorzar, Pre, Post, Àpat principal + Per què (2–4 punts).",
    "- En descans: Esmorzar, Dinar, Sopar, Snack (si cal) + Per què (2–4 punts).",
    "- Entreno: més carbohidrats. Descans: menys carbohidrats, més verdures + greixos saludables.",
    "- Adapta a preferències/al·lèrgies/intoleràncies i temps per cuinar. No diagnostiquis.",
    "- Prioritza la secció del tipus d’avui: si avui és Descans → 🛌; si no → 🏋️.",
    "",
    `Avui: ${trainingToday}`,
    weekTxt ? `Setmana: ${weekTxt}` : "",
    "",
    "Dades (només les que hi són):",
    [
      pick("Nom", a.nom),
      pick("Edat", a.edat),
      pick("Alçada", a.alcada),
      pick("Pes", a.pes),
      pick("Objectiu", a.objectiu),
      pick("Activitat", a.activitat),
      pick("Passos/dia", a.passos),
      pick("Son", a.sonHores ? `${a.sonHores} (qualitat: ${safe(a.sonQualitat)})` : ""),
      pick("Estrès", a.estres),
      pick("Aigua", a.aigua),
      pick("Alcohol", a.alcohol),
      pick("Cafeïna", a.cafeina),
      pick("Temps per cuinar", a.temps),
      pick("Menja fora", a.menjadorFora),
      pick("Esmorzar habitual", a.esmorzar),
      pick("Dinar habitual", a.dinar),
      pick("Sopar habitual", a.sopar),
      pick("Snacks habituals", a.snacks),
      pickList("Preferències", a.preferencies),
      pickList("Al·lèrgies", a.alergies),
      pickList("Intoleràncies", a.intolerancies),
      pickList("Problemes", a.problemes),
      pick("Notes", a.notes)
    ].filter(Boolean).join("\n")
  ].filter(Boolean);

  return lines.join("\n");
}

module.exports = { handler };