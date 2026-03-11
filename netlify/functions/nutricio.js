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

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: prompt
    })
  });

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
  const joinList = (arr) => Array.isArray(arr) ? arr.map(safe).filter(Boolean).join(", ") : safe(arr);

  const week = a.week || {};
  const today = a.today || {};
  const trainingToday = safe(today.training) || "Descans";

  const profile = {
    nom: safe(a.nom),
    edat: safe(a.edat),
    alcada: safe(a.alcada),
    pes: safe(a.pes),
    sexe: safe(a.sexe),
    condicio: safe(a.condicio),
    objectiu: safe(a.objectiu),
    activitat: safe(a.activitat),
    passos: safe(a.passos),
    sonHores: safe(a.sonHores),
    sonQualitat: safe(a.sonQualitat),
    feina: safe(a.feina),
    estres: safe(a.estres),
    aigua: safe(a.aigua),
    alcohol: safe(a.alcohol),
    cafeina: safe(a.cafeina),
    alergies: joinList(a.alergies),
    preferencies: joinList(a.preferencies),
    intolerancies: joinList(a.intolerancies),
    pressupost: safe(a.pressupost),
    temps: safe(a.temps),
    menjarsDia: safe(a.menjarsDia),
    menjadorFora: safe(a.menjadorFora),
    esmorzar: safe(a.esmorzar),
    dinar: safe(a.dinar),
    sopar: safe(a.sopar),
    snacks: safe(a.snacks),
    problemes: joinList(a.problemes),
    notes: safe(a.notes)
  };

  const weekTxt =
    `Dilluns: ${safe(week.dilluns)} | Dimarts: ${safe(week.dimarts)} | Dimecres: ${safe(week.dimecres)} | ` +
    `Dijous: ${safe(week.dijous)} | Divendres: ${safe(week.divendres)} | Dissabte: ${safe(week.dissabte)} | Diumenge: ${safe(week.diumenge)}`;

  return `
Ets un nutricionista pràctic. Escriu en català. To motivador, professional, clar i directe. Evita tecnicismes innecessaris.

Vull una resposta en MARKDOWN i amb el format exactament així (mateixos títols i emojis):

📊 La teva estratègia metabòlica
[Breu resum de calories i macros (aprox.) + el perquè. Si falta informació, dona rangs raonables i explica-ho.]

🏋️ AVUI ENTRENO (dia d’alta energia)
Dóna 2 o 3 PLANTILLES/OPCIONS completes (Opció A/B/C) i per a CADA opció inclou:
- Esmorzar:
- Pre-entrenament:
- Post-entrenament:
- Àpat principal (dinar o sopar):
- Per què aquesta opció (2-4 punts curts)

Ajusta els carbohidrats cap amunt en dies intensos o amb volum.

🛌 AVUI DESCANSO (dia de recuperació)
Dóna 2 o 3 PLANTILLES/OPCIONS completes (Opció A/B/C) i per a CADA opció inclou:
- Esmorzar:
- Dinar:
- Sopar:
- Snack (si cal):
- Per què aquesta opció (2-4 punts curts)

En descans: menys carbohidrats i més sacietat (verdures + greixos saludables), sense extremismes.

💡 El “per què” d’aquest pla (educació)
Explica 1 concepte nutricional aplicat al seu cas. 6-10 línies, clar.

Regles:
- Personalitza segons: al·lèrgies/intoleràncies, preferències (si és vegetarià/vegà adapta), temps per cuinar, i si menja fora.
- No diagnostiquis. Si hi ha banderes vermelles, recomana consultar un professional.
- Si avui és "Descans", prioritza 🛌. Si avui NO és "Descans", prioritza 🏋️.

Context:
- Avui (tipus): ${trainingToday}
- Pla setmanal: ${weekTxt}

Dades:
- Nom: ${profile.nom}
- Edat: ${profile.edat}
- Alçada: ${profile.alcada}
- Pes: ${profile.pes}
- Sexe: ${profile.sexe}
- Condició: ${profile.condicio}
- Objectiu: ${profile.objectiu}
- Activitat: ${profile.activitat}
- Passos: ${profile.passos}
- Son: ${profile.sonHores} (qualitat: ${profile.sonQualitat})
- Feina: ${profile.feina}
- Estrès: ${profile.estres}
- Aigua: ${profile.aigua}
- Alcohol: ${profile.alcohol}
- Cafeïna: ${profile.cafeina}
- Preferències: ${profile.preferencies}
- Al·lèrgies: ${profile.alergies}
- Intoleràncies: ${profile.intolerancies}
- Pressupost: ${profile.pressupost}
- Temps per cuinar: ${profile.temps}
- Menjars/dia: ${profile.menjarsDia}
- Menja fora: ${profile.menjadorFora}
- Esmorzar habitual: ${profile.esmorzar}
- Dinar habitual: ${profile.dinar}
- Sopar habitual: ${profile.sopar}
- Snacks habituals: ${profile.snacks}
- Problemes: ${profile.problemes}
- Notes: ${profile.notes}
`.trim();
}

module.exports = { handler };