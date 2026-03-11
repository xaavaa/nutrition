const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: "Missing OPENAI_API_KEY" };
  }

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
        model: "gpt-5-2025-08-07",
        input: prompt,
        max_output_tokens: 350,
        reasoning: { effort: "low" },
        text: { verbosity: "low" }
      }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e?.name === "AbortError" ? "Timeout calling OpenAI" : String(e?.message || e);
    return {
      statusCode: 504,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: msg })
    };
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await r.text();

  if (!r.ok) {
    return {
      statusCode: r.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: rawText })
    };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON from OpenAI", raw: rawText.slice(0, 2000) })
    };
  }

  const text = extractText(data);

  if (!text) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "", debug: data })
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  };
};

function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  const out = Array.isArray(data?.output) ? data.output : [];

  for (const item of out) {
    if (item?.type === "output_text" && typeof item?.text === "string") {
      parts.push(item.text);
      continue;
    }

    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (c?.type === "output_text" && typeof c?.text === "string") parts.push(c.text);
      else if (c?.type === "text" && typeof c?.text === "string") parts.push(c.text);
      else if (typeof c?.text === "object" && typeof c?.text?.value === "string") parts.push(c.text.value);
      else if (typeof c === "string") parts.push(c);
    }
  }

  return parts.join("\n").trim();
}

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

  const userData = [
    pick("Edat", a.edat),
    pick("Alçada", a.alcada),
    pick("Pes", a.pes),
    pick("Objectiu", a.objectiu),
    pick("Activitat", a.activitat),
    pick("Passos/dia", a.passos),
    pick("Son", a.sonHores ? `${a.sonHores} (qualitat: ${safe(a.sonQualitat)})` : ""),
    pick("Estrès", a.estres),
    pick("Aigua", a.aigua),
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
  ].filter(Boolean).join("\n");

  return [
    "Ets un nutricionista pràctic. Escriu en català. To motivador, professional, clar i directe.",
    "IMPORTANT: NO MOSTRIS raonament. Dona NOMÉS la resposta final en Markdown.",
    "",
    "Resposta en MARKDOWN amb EXACTAMENT aquests 4 títols (amb emojis):",
    "📊 La teva estratègia metabòlica",
    "🏋️ AVUI ENTRENO (dia d’alta energia)",
    "🛌 AVUI DESCANSO (dia de recuperació)",
    "💡 El “per què” d’aquest pla (educació)",
    "",
    "Regles:",
    "- Calories i macros aproximats (rang si falta info) i el perquè (breu).",
    "- 2 opcions (A/B).",
    "- Entreno: Esmorzar, Pre-entrenament, Post-entrenament, Àpat principal + Per què (2-3 punts).",
    "- Descans: Esmorzar, Dinar, Sopar, Snack (si cal) + Per què (2-3 punts).",
    "- Entreno: més carbohidrats. Descans: menys carbohidrats, més verdures + greixos saludables.",
    "- Adapta a preferències/al·lèrgies/intoleràncies i temps per cuinar. No diagnostiquis.",
    "",
    `Avui: ${trainingToday}`,
    weekTxt ? `Setmana: ${weekTxt}` : "",
    "",
    "Dades:",
    userData
  ].filter(Boolean).join("\n");
}

module.exports = { handler };