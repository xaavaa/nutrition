const form = document.getElementById("qForm");
const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("sendBtn");
const resultEl = document.getElementById("result");
const copyBtn = document.getElementById("copyBtn");
const printBtn = document.getElementById("printBtn");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const stepLabel = document.getElementById("stepLabel");
const stepHint = document.getElementById("stepHint");
const progressFill = document.getElementById("progressFill");
const dots = Array.from(document.querySelectorAll(".dot"));

const overrideWrap = document.getElementById("overrideWrap");

let step = 1;
let lastText = "";

const hints = {
  1: "Dades físiques",
  2: "Hàbits",
  3: "Objectius i pla setmanal"
};

init();

function init() {
  updateWizard();

  prevBtn.addEventListener("click", (e) => {
    e.preventDefault();
    step = Math.max(1, step - 1);
    updateWizard();
  });

  nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    step = Math.min(3, step + 1);
    updateWizard();
  });

  form.addEventListener("change", (e) => {
    if (e.target && e.target.name === "changedToday") {
      const v = getRadioValue("changedToday");
      overrideWrap.style.display = v === "SI" ? "block" : "none";
    }
  });

  form.addEventListener("submit", onSubmit);

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
}

function updateWizard() {
  const steps = Array.from(document.querySelectorAll(".step"));

  steps.forEach((s, idx) => {
    const ds = s.getAttribute("data-step");
    const n = ds ? parseInt(ds, 10) : (idx + 1);
    s.classList.toggle("active", n === step);
  });

  const pct = step === 1 ? 33.333 : step === 2 ? 66.666 : 100;
  progressFill.style.width = `${pct}%`;

  stepLabel.textContent = `Pas ${step}/3`;
  stepHint.textContent = hints[step] || "";

  dots.forEach((d, idx) => d.classList.toggle("active", idx + 1 <= step));

  prevBtn.disabled = step === 1;
  nextBtn.style.display = step === 3 ? "none" : "inline-flex";
  sendBtn.style.display = step === 3 ? "inline-flex" : "none";
}

async function onSubmit(e) {
  e.preventDefault();
  setBusy(true, "Enviant…");

  const data = formToPayload(new FormData(form));
  data.today = resolveTodayTraining(data);

  try {
    const r = await fetch("/api/nutricio", {
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

    renderMarkdownCards(text);

    copyBtn.disabled = !text;
    printBtn.disabled = !text;
    setBusy(false, "Fet.");
  } catch (err) {
    renderError(String(err?.message || err));
    setBusy(false, "Hi ha hagut un error.");
  }
}

function setBusy(busy, msg) {
  statusEl.textContent = msg || "";
  sendBtn.disabled = busy;
  sendBtn.style.opacity = busy ? ".8" : "1";
  prevBtn.disabled = busy || step === 1;
  nextBtn.disabled = busy;
  if (!busy) updateWizard();
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function formToPayload(fd) {
  const split = (s) => (s || "").split(",").map(x => x.trim()).filter(Boolean);

  const week = {
    dilluns: fd.get("week_mon"),
    dimarts: fd.get("week_tue"),
    dimecres: fd.get("week_wed"),
    dijous: fd.get("week_thu"),
    divendres: fd.get("week_fri"),
    dissabte: fd.get("week_sat"),
    diumenge: fd.get("week_sun")
  };

  return {
    nom: fd.get("nom"),
    edat: fd.get("edat"),
    alcada: fd.get("alcada"),
    pes: fd.get("pes"),
    sexe: fd.get("sexe"),
    condicio: fd.get("condicio"),

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
    objectiu: fd.get("objectiu"),

    preferencies: split(fd.get("preferencies")),
    alergies: split(fd.get("alergies")),
    intolerancies: split(fd.get("intolerancies")),

    menjadorFora: fd.get("menjadorFora"),
    esmorzar: fd.get("esmorzar"),
    dinar: fd.get("dinar"),
    sopar: fd.get("sopar"),
    snacks: fd.get("snacks"),

    problemes: split(fd.get("problemes")),
    notes: fd.get("notes"),

    week,
    changedToday: getRadioValue("changedToday"),
    overrideToday: fd.get("overrideToday")
  };
}

function resolveTodayTraining(data) {
  const changed = (data.changedToday || "").toUpperCase() === "SI";
  if (changed && data.overrideToday) {
    return { training: data.overrideToday, overridden: true };
  }

  const d = new Date();
  const map = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];
  const key = map[d.getDay()];
  const training = (data.week && data.week[key]) ? data.week[key] : "Descans";
  return { training, overridden: false };
}

function renderMarkdownCards(md) {
  md = stripMarkdownFence(md);
  if (!md) {
    resultEl.innerHTML = `<div class="placeholder"><div class="phTitle"></div><div class="phLine"></div><div class="phLine"></div><div class="phLine short"></div></div>`;
    return;
  }

  const sections = splitByEmojiHeadings(md);
  resultEl.innerHTML = sections.map(sec => `
    <div class="block">
      <h3>${escapeHtml(sec.title)}</h3>
      <div class="content">${renderBasicMarkdown(sec.content)}</div>
    </div>
  `).join("");
}

function stripMarkdownFence(s) {
  const t = String(s || "").trim();
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return t;
}

function splitByEmojiHeadings(md) {
  const lines = String(md).replace(/\r/g, "").split("\n");
  const sections = [];
  let current = { title: "Resposta", content: "" };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("📊") || t.startsWith("🏋️") || t.startsWith("🛌") || t.startsWith("💡")) {
      if (current.content.trim() || current.title !== "Resposta") sections.push(current);
      current = { title: t, content: "" };
    } else {
      current.content += line + "\n";
    }
  }

  sections.push(current);

  return sections.map(s => ({
    title: s.title.trim() || "Resposta",
    content: s.content.trim()
  }));
}

function renderBasicMarkdown(text) {
  const safe = escapeHtml(text);
  const lines = safe.split("\n");
  const out = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();

    const h2 = l.match(/^##\s+(.*)$/);
    const h3 = l.match(/^###\s+(.*)$/);

    if (h2) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div style="margin:10px 0 6px; font-weight:800; color: rgba(234,240,255,.90)">${h2[1]}</div>`);
      continue;
    }

    if (h3) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div style="margin:10px 0 6px; font-weight:700; color: rgba(234,240,255,.86)">${h3[1]}</div>`);
      continue;
    }

    const li = l.match(/^-\s+(.*)$/);
    if (li) {
      if (!inList) { out.push("<ul style=\"margin:8px 0 10px; padding-left:18px\">"); inList = true; }
      out.push(`<li style="margin:6px 0">${li[1]}</li>`);
      continue;
    }

    if (inList && l === "") {
      out.push("</ul>");
      inList = false;
      continue;
    }

    if (l === "") out.push(`<div style="height:10px"></div>`);
    else out.push(`<div style="margin:6px 0">${l.replaceAll(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</div>`);
  }

  if (inList) out.push("</ul>");
  return out.join("");
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