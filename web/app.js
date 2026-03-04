const form = document.getElementById("qForm");
const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("sendBtn");
const resultEl = document.getElementById("result");
const copyBtn = document.getElementById("copyBtn");
const printBtn = document.getElementById("printBtn");

let lastText = "";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setBusy(true, "Enviant…");

  const data = formToPayload(new FormData(form));

  try {
    const r = await fetch("http://localhost:8787/api/nutricio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `Error ${r.status}`);
    }

    const out = await r.json();
    const text = (out?.text || "").trim();
    lastText = text;
    renderPretty(text);
    copyBtn.disabled = !text;
    printBtn.disabled = !text;
    setBusy(false, "Fet.");
  } catch (err) {
    renderError(String(err?.message || err));
    setBusy(false, "Hi ha hagut un error.");
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastText) return;
  await navigator.clipboard.writeText(lastText);
  statusEl.textContent = "Copiat al porta-retalls.";
  setTimeout(() => statusEl.textContent = "", 1400);
});

printBtn.addEventListener("click", () => {
  if (!lastText) return;
  window.print();
});

function setBusy(busy, msg) {
  statusEl.textContent = msg || "";
  sendBtn.disabled = busy;
  sendBtn.style.opacity = busy ? ".8" : "1";
}

function formToPayload(fd) {
  const split = (s) => (s || "").split(",").map(x => x.trim()).filter(Boolean);

  return {
    nom: fd.get("nom"),
    edat: fd.get("edat"),
    alcada: fd.get("alcada"),
    pes: fd.get("pes"),
    objectiu: fd.get("objectiu"),
    activitat: fd.get("activitat"),
    passos: fd.get("passos"),
    sonHores: fd.get("sonHores"),
    sonQualitat: fd.get("sonQualitat"),
    feina: fd.get("feina"),
    estres: fd.get("estres"),
    aigua: fd.get("aigua"),
    alcohol: fd.get("alcohol"),
    cafeina: fd.get("cafeina"),
    pressupost: fd.get("pressupost"),
    temps: fd.get("temps"),
    menjarsDia: fd.get("menjarsDia"),
    preferencies: split(fd.get("preferencies")),
    alergies: split(fd.get("alergies")),
    intolerancies: split(fd.get("intolerancies")),
    cuina: fd.get("cuina"),
    menjadorFora: fd.get("menjadorFora"),
    esmorzar: fd.get("esmorzar"),
    dinar: fd.get("dinar"),
    sopar: fd.get("sopar"),
    snacks: fd.get("snacks"),
    capsSetmana: fd.get("capsSetmana"),
    problemes: split(fd.get("problemes")),
    notes: fd.get("notes")
  };
}

function renderPretty(text) {
  if (!text) {
    resultEl.innerHTML = `<div class="placeholder"><div class="phTitle"></div><div class="phLine"></div><div class="phLine"></div><div class="phLine short"></div></div>`;
    return;
  }

  const blocks = splitIntoBlocks(text);
  resultEl.innerHTML = blocks.map(b => `
    <div class="block">
      <h3>${escapeHtml(b.title)}</h3>
      <div class="content">${escapeHtml(b.content)}</div>
    </div>
  `).join("");
}

function splitIntoBlocks(text) {
  const titles = [
    "1) Resum ràpid",
    "2) Prioritats (Top 5)",
    "3) Pla setmanal simple",
    "4) Llista de la compra",
    "5) Trucs ràpids",
    "6) Si menja fora: com triar millor",
    "7) Seguiment",
    "8) Nota de seguretat"
  ];

  const normalized = text.replace(/\r/g, "");
  const found = [];

  for (let i = 0; i < titles.length; i++) {
    const idx = normalized.indexOf(titles[i]);
    found.push({ title: titles[i], idx });
  }

  const present = found.filter(f => f.idx >= 0).sort((a,b) => a.idx - b.idx);

  if (present.length < 2) {
    return [{ title: "Resposta", content: text }];
  }

  const out = [];
  for (let i = 0; i < present.length; i++) {
    const start = present[i].idx;
    const end = i + 1 < present.length ? present[i+1].idx : normalized.length;
    const chunk = normalized.slice(start, end).trim();
    const firstLineEnd = chunk.indexOf("\n");
    const title = firstLineEnd > 0 ? chunk.slice(0, firstLineEnd).trim() : present[i].title;
    const content = firstLineEnd > 0 ? chunk.slice(firstLineEnd + 1).trim() : "";
    out.push({ title, content });
  }
  return out;
}

function renderError(msg) {
  resultEl.innerHTML = `
    <div class="block" style="background: rgba(231,76,60,.08); border-color: rgba(231,76,60,.20)">
      <h3>Error</h3>
      <div class="content">${escapeHtml(msg)}</div>
    </div>
  `;
  copyBtn.disabled = true;
  printBtn.disabled = true;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}