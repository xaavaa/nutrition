export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response("Missing OPENAI_API_KEY", { status: 500 });

  const payload = await req.json();
  const prompt = buildPrompt(payload);

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: prompt
    })
  });

  if (!r.ok) return new Response(await r.text(), { status: r.status });

  const data = await r.json();
  return Response.json({ text: data?.output_text ?? "" });
};

function buildPrompt(a) {
  const safe = (v) => (v === null || v === undefined) ? "" : String(v).trim();
  const joinList = (arr) => Array.isArray(arr) ? arr.map(safe).filter(Boolean).join(", ") : safe(arr);

  const profile = {
    nom: safe(a.nom),
    edat: safe(a.edat),
    alcada: safe(a.alcada),
    pes: safe(a.pes),
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
    cuina: safe(a.cuina),
    pressupost: safe(a.pressupost),
    temps: safe(a.temps),
    menjarsDia: safe(a.menjarsDia),
    esmorzar: safe(a.esmorzar),
    dinar: safe(a.dinar),
    sopar: safe(a.sopar),
    snacks: safe(a.snacks),
    capsSetmana: safe(a.capsSetmana),
    menjadorFora: safe(a.menjadorFora),
    problemes: joinList(a.problemes),
    notes: safe(a.notes)
  };

  return `
Ets un nutricionista pràctic i molt clar. Escriu en català, to proper, sense moralitzar.

Vull una resposta en format BONIC i molt estructurat, amb aquests blocs i títols exactes:
1) Resum ràpid (3-5 punts)
2) Prioritats (Top 5) amb impacte (Alt/Mig/Baix) i dificultat (Fàcil/Mitjà/Difícil)
3) Pla setmanal simple (Esmorzar/Dinar/Sopar + Snacks) amb exemples concrets i alternatives
4) Llista de la compra (per categories)
5) Trucs ràpids (10 idees) adaptats a la seva situació
6) Si menja fora: com triar millor (guia curta)
7) Seguiment: 4 mètriques fàcils + com revisar-ho en 2 setmanes
8) Nota de seguretat (1 paràgraf)

Dades:
- Nom: ${profile.nom}
- Edat: ${profile.edat}
- Alçada (cm): ${profile.alcada}
- Pes (kg): ${profile.pes}
- Objectiu: ${profile.objectiu}
- Activitat física: ${profile.activitat}
- Passos/dia: ${profile.passos}
- Son (hores): ${profile.sonHores}
- Qualitat del son: ${profile.sonQualitat}
- Tipus de feina: ${profile.feina}
- Estrès: ${profile.estres}
- Aigua (L/dia): ${profile.aigua}
- Alcohol: ${profile.alcohol}
- Cafeïna: ${profile.cafeina}
- Al·lèrgies: ${profile.alergies}
- Intoleràncies: ${profile.intolerancies}
- Preferències: ${profile.preferencies}
- Cuina: ${profile.cuina}
- Pressupost: ${profile.pressupost}
- Temps per cuinar: ${profile.temps}
- Menjars/dia: ${profile.menjarsDia}
- Esmorzar: ${profile.esmorzar}
- Dinar: ${profile.dinar}
- Sopar: ${profile.sopar}
- Snacks: ${profile.snacks}
- Caps de setmana: ${profile.capsSetmana}
- Menja fora: ${profile.menjadorFora}
- Problemes: ${profile.problemes}
- Notes: ${profile.notes}
`.trim();
}