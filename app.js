/* Finance OS — budget, épargne et patrimoine. Données : appareil + Gist GitHub privé. */
"use strict";
const LS = "financeos_v1", CFG = "financeos_gh", THEME_KEY = "financeos_theme", HIDE_KEY = "financeos_hide";
const FILE = "finance-os.json", DESC = "Finance OS — données (ne pas supprimer)";

/* ============ Outils ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const r2 = n => Math.round(n * 100) / 100;
const sum = (a, f = x => x) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const num = v => { const n = parseFloat(String(v ?? "").replace(/\s| |€/g, "").replace(",", ".")); return isFinite(n) ? n : 0 };
const NF2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NF0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const money = (n, d) => (d === 0 || (d === undefined && (Math.abs(n) >= 10000 || Number.isInteger(r2(n))))) ? NF0.format(Math.round(n)) : NF2.format(n);
const eur = (n, d) => `<span class="amt">${money(n, d)}</span>`;
const pc = (n, d = 0) => (isFinite(n) ? n : 0).toFixed(d).replace(".", ",") + " %";
const sgn = n => (n > 0 ? "+" : n < 0 ? "−" : "");
const MN = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const mk = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const addM = (k, n) => { const [y, m] = k.split("-").map(Number); return mk(new Date(y, m - 1 + n, 1)) };
const mLabel = k => { const [y, m] = k.split("-").map(Number); return MN[m - 1] + " " + y };
const mShort = k => { const [y, m] = k.split("-").map(Number); return MS[m - 1] + (y !== new Date().getFullYear() ? " " + String(y).slice(2) : "") };
const mDiff = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1) };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ============ Référentiels ============ */
const CATS = {
  "Revenus": ["💼", "#9AA3B5"], "Épargne": ["🏦", "#3DD598"], "Logement": ["🏠", "#7C9CFF"], "Crédits": ["💳", "#5E7CE2"],
  "Télécom": ["📱", "#5FB3F9"], "Abonnements": ["🔁", "#A98BFA"], "Santé": ["🩺", "#2DD4BF"], "Alimentation": ["🛒", "#E7C36E"],
  "Transport": ["🚗", "#F39A73"], "Banque": ["🏛️", "#94A3B8"], "Soins": ["💈", "#F5A8D0"], "Sport": ["🏋️", "#6EE7A0"],
  "Loisirs": ["🎉", "#F472B6"], "Shopping": ["🛍️", "#D58BF5"], "Cadeaux": ["🎁", "#FB7185"], "Voyages": ["✈️", "#38BDF8"],
  "Découvert": ["⚠️", "#FF6B7A"], "Divers": ["📦", "#A1A1AA"]
};
const catOf = c => CATS[c] || CATS.Divers;
const BK = {
  epargne: { n: "Épargne & investissement", s: "Épargne", c: "#3DD598", h: "Payez-vous en premier : ces virements partent dès la paie." },
  fixes: { n: "Charges fixes", s: "Fixes", c: "#7C9CFF", h: "Loyer, crédit, assurances, abonnements : prélevés chaque mois." },
  variables: { n: "Charges variables", s: "Variables", c: "#B794F6", h: "Courses, essence, santé : nécessaires mais pilotables. Note tes dépenses avec +." },
  envies: { n: "Loisirs & envies", s: "Envies", c: "#F472B6", h: "Sorties, shopping, cadeaux : le plaisir, avec un plafond (méthode des enveloppes)." }
};
const BORDER = ["epargne", "fixes", "variables", "envies"];
const METHODS = {
  "503020": { n: "50 / 30 / 20", d: "La règle la plus connue : 50 % pour les besoins, 30 % pour les envies, 20 % pour l'épargne.",
    g: [{ n: "Besoins", b: ["fixes", "variables"], p: 50, c: "#7C9CFF" }, { n: "Envies", b: ["envies"], p: 30, c: "#F472B6" }, { n: "Épargne", b: ["epargne"], p: 20, c: "#3DD598" }] },
  "perso": { n: "Ma méthode 55 / 25 / 12 / 8", d: "Celle de ton tableur : 55 % fixes, 25 % variables, 12 % épargne, 8 % loisirs.",
    g: [{ n: "Charges fixes", b: ["fixes"], p: 55, c: BK.fixes.c }, { n: "Charges variables", b: ["variables"], p: 25, c: BK.variables.c }, { n: "Épargne", b: ["epargne"], p: 12, c: BK.epargne.c }, { n: "Loisirs", b: ["envies"], p: 8, c: BK.envies.c }] },
  "8020": { n: "Payez-vous d'abord · 80 / 20", d: "20 % partent en épargne le jour de la paie, tu vis librement avec les 80 % restants.",
    g: [{ n: "Dépenses", b: ["fixes", "variables", "envies"], p: 80, c: "#7C9CFF" }, { n: "Épargne", b: ["epargne"], p: 20, c: "#3DD598" }] },
  "custom": { n: "Personnalisée", d: "Tes propres pourcentages sur les 4 enveloppes.", g: null }
};
const ACCT = {
  courant: { n: "Compte courant", g: "Liquidités", c: "#9AA3B5", e: "💳" },
  livretA: { n: "Livret A", g: "Épargne réglementée", c: "#3DD598", e: "🏦", plaf: 22950 },
  livretJeune: { n: "Livret Jeune", g: "Épargne réglementée", c: "#2BB583", e: "🌱", plaf: 1600 },
  ldds: { n: "LDDS", g: "Épargne réglementée", c: "#1F9E73", e: "🌿", plaf: 12000 },
  lep: { n: "LEP", g: "Épargne réglementée", c: "#178A63", e: "🛟", plaf: 10000 },
  pea: { n: "PEA", g: "Bourse", c: "#E7C36E", e: "📈", plaf: 150000, plafTxt: "versements" },
  cto: { n: "Compte-titres", g: "Bourse", c: "#D9A845", e: "📊" },
  av: { n: "Assurance-vie", g: "Bourse", c: "#C7963A", e: "☂️" },
  crypto: { n: "Crypto", g: "Crypto", c: "#A98BFA", e: "🪙" },
  autre: { n: "Autre", g: "Autre", c: "#F39A73", e: "💼" }
};
const AGROUP_C = { "Liquidités": "#9AA3B5", "Épargne réglementée": "#3DD598", "Bourse": "#E7C36E", "Crypto": "#A98BFA", "Autre": "#F39A73" };
const SAFE_TYPES = ["courant", "livretA", "livretJeune", "ldds", "lep"]; // disponibles en cas d'urgence

/* ============ État ============ */
function blank() {
  return {
    v: 1, method: "503020", custom: { fixes: 50, variables: 15, envies: 15, epargne: 20 }, months: {},
    accounts: [
      { id: "a1", name: "Compte courant", type: "courant", balance: 0 },
      { id: "a2", name: "Livret A", type: "livretA", balance: 0 },
      { id: "a3", name: "PEA", type: "pea", balance: 0 }
    ],
    history: [], goals: [], updated: 0
  };
}
function norm(s) {
  const b = blank(); s = s && typeof s === "object" ? s : {};
  const o = { ...b, ...s };
  o.custom = { ...b.custom, ...(s.custom || {}) };
  o.months = s.months && typeof s.months === "object" ? s.months : {};
  for (const k in o.months) {
    const m = o.months[k] || {}; m.income = Array.isArray(m.income) ? m.income : []; m.lines = Array.isArray(m.lines) ? m.lines : [];
    m.lines.forEach(l => { l.tx = Array.isArray(l.tx) ? l.tx : []; if (!BK[l.bucket]) l.bucket = "variables" });
    o.months[k] = m;
  }
  o.accounts = Array.isArray(s.accounts) ? s.accounts : b.accounts;
  o.history = Array.isArray(s.history) ? s.history : [];
  o.goals = Array.isArray(s.goals) ? s.goals : [];
  if (!METHODS[o.method]) o.method = "503020";
  return o;
}
let S = blank();
const V = { tab: "home", month: null, amonth: null, modal: null, simu: { i: 0, m: 50, r: 7, y: 20 } };
let hide = false; try { hide = localStorage.getItem(HIDE_KEY) === "1" } catch (e) { }

/* ============ Stockage local + synchro GitHub Gist ============ */
function getTheme() { try { return localStorage.getItem(THEME_KEY) || "dark" } catch (e) { return "dark" } }
function applyTheme(t) {
  const dark = t === "auto" ? !matchMedia("(prefers-color-scheme: light)").matches : t !== "light";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#0B0C0F" : "#F4F3EF";
}
applyTheme(getTheme());
let gh = null; try { gh = JSON.parse(localStorage.getItem(CFG) || "null") } catch (e) { }
let syncState = gh ? "idle" : "off", pushT = null;
function loadLocal() { try { const r = localStorage.getItem(LS); if (r) S = norm(JSON.parse(r)) } catch (e) { } }
function saveLocal() { try { localStorage.setItem(LS, JSON.stringify(S)) } catch (e) { } }
function markDirty(v) { try { v ? localStorage.setItem(LS + "_dirty", "1") : localStorage.removeItem(LS + "_dirty") } catch (e) { } }
const isDirty = () => { try { return localStorage.getItem(LS + "_dirty") === "1" } catch (e) { return false } };
function setSync(s) { syncState = s; const d = document.getElementById("syncdot"); if (d) d.className = "dot " + ({ ok: "ok", busy: "busy", err: "err" }[s] || "") }
async function api(path, opts = {}) {
  const r = await fetch("https://api.github.com" + path, { ...opts, cache: "no-store", headers: { Authorization: "Bearer " + gh.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" } });
  if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e }
  return r.json();
}
async function pull() {
  if (!gh || !gh.gistId) return; setSync("busy");
  try {
    const g = await api("/gists/" + gh.gistId); const f = g.files && g.files[FILE]; let remote = null;
    if (f) { const txt = f.truncated ? await (await fetch(f.raw_url, { cache: "no-store" })).text() : f.content; remote = norm(JSON.parse(txt || "{}")) }
    if (remote && (remote.updated || 0) > (S.updated || 0) && !isDirty()) { S = remote; saveLocal(); render() }
    else if (isDirty() || !remote) await push();
    setSync("ok");
  } catch (e) { setSync("err") }
}
async function push() {
  if (!gh || !gh.gistId) return; setSync("busy");
  try { await api("/gists/" + gh.gistId, { method: "PATCH", body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(S) } } }) }); markDirty(false); setSync("ok") }
  catch (e) { setSync("err") }
}
async function connect(token) {
  gh = { token: token.trim(), gistId: null }; setSync("busy");
  try {
    let found = null;
    for (let p = 1; p <= 5 && !found; p++) { const list = await api("/gists?per_page=100&page=" + p); found = list.find(x => x.description === DESC && x.files && x.files[FILE]); if (list.length < 100) break }
    if (found) gh.gistId = found.id;
    else { const g = await api("/gists", { method: "POST", body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content: JSON.stringify(S) } } }) }); gh.gistId = g.id }
    localStorage.setItem(CFG, JSON.stringify(gh)); await pull(); toast("GitHub connecté"); render();
  } catch (e) {
    const st = e.status; gh = null; try { localStorage.removeItem(CFG) } catch (x) { } syncState = "off"; render();
    alert(st === 401 || st === 403 ? "Jeton refusé. Vérifie qu'il a bien la permission « gist »." : "Connexion impossible. Vérifie ton réseau puis réessaie.");
  }
}
function disconnect() {
  if (!confirm("Déconnecter GitHub sur cet appareil ? Tes données restent sur l'appareil et dans ton Gist.")) return;
  try { localStorage.removeItem(CFG) } catch (e) { } gh = null; syncState = "off"; render();
}
function commit() {
  S.updated = Date.now(); saveLocal(); markDirty(true); render();
  if (gh) { clearTimeout(pushT); pushT = setTimeout(push, 1200) }
}
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200) }

/* ============ Calculs ============ */
const spent = l => sum(l.tx || [], t => t.amount);
const lineVal = l => Math.max(+l.amount || 0, spent(l));
const keys = () => Object.keys(S.months).sort();
function curKey() {
  return V.month || mk();
}
function groups() {
  if (S.method === "custom") return BORDER.map(b => ({ n: BK[b].s, b: [b], p: +S.custom[b] || 0, c: BK[b].c }));
  return METHODS[S.method].g;
}
function stats(k) {
  const m = S.months[k]; const b = { epargne: 0, fixes: 0, variables: 0, envies: 0 }; const cats = {};
  if (!m) return null;
  const inc = sum(m.income, i => i.amount);
  m.lines.forEach(l => { const v = lineVal(l); b[l.bucket] += v; if (v > 0) cats[l.cat || "Divers"] = (cats[l.cat || "Divers"] || 0) + v });
  const out = b.epargne + b.fixes + b.variables + b.envies;
  return { inc, b, cats, out, dep: out - b.epargne, reste: inc - out, rate: inc ? b.epargne / inc : 0 };
}
function groupStats(st) {
  return groups().map(g => {
    const v = sum(g.b, x => st.b[x]); const target = st.inc * g.p / 100;
    return { ...g, v, pct: st.inc ? v / st.inc * 100 : 0, target, sav: g.b.length === 1 && g.b[0] === "epargne" };
  });
}
const netWorth = () => sum(S.accounts, a => a.balance);
const accVal = id => { const a = S.accounts.find(x => x.id === id); return a ? +a.balance || 0 : 0 };
const goalCur = g => g.account ? accVal(g.account) : (+g.current || 0);
function snapshot() {
  const k = mk(), by = {}; S.accounts.forEach(a => by[a.id] = +a.balance || 0);
  const e = { m: k, total: r2(netWorth()), by };
  const i = S.history.findIndex(h => h.m === k); if (i >= 0) S.history[i] = e; else S.history.push(e);
  S.history.sort((a, b) => a.m < b.m ? -1 : 1);
}
function monthlyNeeds() { // dépenses courantes (hors épargne) moyennes des 3 derniers mois
  const ks = keys().slice(-3); if (!ks.length) return 0;
  return sum(ks, k => stats(k).dep) / ks.length;
}
function salaryDay(k) { const m = S.months[k]; if (!m) return null; const s = m.income.slice().sort((a, b) => b.amount - a.amount)[0]; return s && s.day ? s.day : null }

/* ============ Conseils automatiques ============ */
function insights(k) {
  const st = stats(k); if (!st) return [];
  const out = [], m = S.months[k], gs = groupStats(st);
  if (st.inc <= 0) out.push({ l: "warn", t: "Aucun revenu saisi", d: "Ajoute ton salaire dans Budget pour que les pourcentages aient du sens." });
  if (st.reste < 0) out.push({ l: "bad", t: `Mois dans le rouge : ${money(st.reste)}`, d: "Tes sorties dépassent tes revenus. Commence par les enveloppes variables et loisirs, puis revois les abonnements." });
  const dec = sum(m.lines.filter(l => l.cat === "Découvert"), lineVal);
  if (dec > 0) out.push({ l: "bad", t: `Découvert reporté : ${money(dec)}`, d: "Priorité n°1 : le résorber avant d'épargner ou d'investir. Les agios coûtent plus que ce que rapporte un livret." });
  const sg = gs.find(g => g.sav);
  if (sg && st.inc > 0) {
    if (sg.v + 0.5 < sg.target) {
      const sd = salaryDay(k);
      out.push({ l: "warn", t: `Épargne à ${pc(sg.pct)} (cible ${sg.p} %)`, d: `Il manque ${money(sg.target - sg.v, 0)} par mois. Programme un virement automatique ${sd ? "le " + Math.min(sd + 1, 28) + " de chaque mois, juste après la paie" : "le lendemain de la paie"} : ce qui part en premier ne se dépense pas.` });
    } else out.push({ l: "good", t: `Épargne à ${pc(sg.pct)} : objectif tenu`, d: `Tu mets de côté ${money(sg.v, 0)} ce mois-ci. Continue en automatique.` });
  }
  gs.filter(g => !g.sav && g.pct > g.p + 0.5 && st.inc > 0).forEach(g => {
    const top = m.lines.filter(l => g.b.includes(l.bucket)).sort((a, b) => lineVal(b) - lineVal(a)).slice(0, 3).map(l => l.label).join(", ");
    out.push({ l: "warn", t: `${g.n} à ${pc(g.pct)} (cible ${g.p} %)`, d: `${money(g.v - g.target, 0)} au-dessus de la cible. Les plus gros postes : ${top}.` });
  });
  const loyer = sum(m.lines.filter(l => /loyer/i.test(l.label)), lineVal);
  if (loyer && st.inc && loyer / st.inc > 0.33) out.push({ l: "warn", t: `Loyer = ${pc(loyer / st.inc * 100)} de tes revenus`, d: "Repère courant : un tiers des revenus maximum. C'est ton plus gros levier à long terme (colocation, renégociation, prochain déménagement)." });
  const ab = sum(m.lines.filter(l => l.cat === "Abonnements"), lineVal);
  if (ab > 0) out.push({ l: "info", t: `Abonnements : ${money(ab)}/mois, soit ${money(ab * 12, 0)}/an`, d: "Fais le tri tous les 3 mois : garde seulement ceux que tu utilises chaque semaine." });
  const env = sum(m.lines.filter(l => l.bucket === "envies"), lineVal);
  if (env === 0 && m.lines.some(l => l.bucket === "envies")) out.push({ l: "info", t: "Loisirs à 0 € : vraiment ?", d: "Les sorties payées en liquide passent sous le radar. Note-les avec le bouton + pour voir où part l'argent." });
  const need = monthlyNeeds(), safe = sum(S.accounts.filter(a => SAFE_TYPES.includes(a.type) && a.type !== "courant"), a => a.balance);
  if (need > 0) {
    const mo = safe / need;
    if (S.accounts.every(a => !+a.balance)) out.push({ l: "info", t: "Renseigne tes soldes", d: "Indique ce que tu as sur chaque compte (Patrimoine) pour suivre ton fonds d'urgence et ton patrimoine." });
    else if (mo < 3) out.push({ l: "warn", t: `Fonds d'urgence : ${mo.toFixed(1).replace(".", ",")} mois de dépenses`, d: `Vise 3 à 6 mois (${money(need * 3, 0)} à ${money(need * 6, 0)}) sur un livret disponible avant d'investir en bourse.` });
    else out.push({ l: "good", t: `Fonds d'urgence : ${mo.toFixed(1).replace(".", ",")} mois couverts`, d: mo >= 6 ? "Matelas complet : le surplus peut aller vers le PEA, en investissement régulier." : "Tu es dans la zone 3–6 mois. Continue jusqu'à 6 mois." });
  }
  S.accounts.filter(a => ACCT[a.type] && ACCT[a.type].plaf && a.type !== "pea" && +a.balance >= ACCT[a.type].plaf).forEach(a =>
    out.push({ l: "info", t: `${a.name} au plafond (${money(ACCT[a.type].plaf, 0)})`, d: "Les intérêts continuent de tomber, mais tes nouveaux versements doivent aller ailleurs (Livret A, LDDS, PEA)." }));
  const frais = sum(m.lines.filter(l => l.cat === "Banque"), lineVal);
  if (frais > 0) out.push({ l: "info", t: `Frais bancaires : ${money(frais * 12, 0)}/an`, d: "Compare avec une banque en ligne : beaucoup proposent une carte sans frais sous condition d'usage." });
  const prev = keys().filter(x => x < k).slice(-3);
  if (prev.length >= 2) {
    const avg = sum(prev, x => stats(x).dep) / prev.length;
    if (avg > 0 && st.dep > avg * 1.1) out.push({ l: "warn", t: `Dépenses en hausse de ${pc((st.dep / avg - 1) * 100)}`, d: `Par rapport à ta moyenne des ${prev.length} mois précédents (${money(avg, 0)}).` });
  }
  const ord = { bad: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => ord[a.l] - ord[b.l]);
}

/* ============ Graphiques (SVG maison) ============ */
function area(vals, color, h = 150) {
  const W = 600, n = vals.length; if (!n) return "";
  const mx = Math.max(...vals), mn = Math.min(...vals), pad = (mx - mn) * 0.15 || Math.abs(mx) * 0.1 || 1;
  const top = mx + pad, bot = Math.max(0, mn - pad) === 0 && mn >= 0 ? Math.max(0, mn - pad) : mn - pad;
  const x = i => n === 1 ? W / 2 : i * W / (n - 1), y = v => h - 8 - (v - bot) / (top - bot) * (h - 16);
  const pts = (n === 1 ? [[0, y(vals[0])], [W, y(vals[0])]] : vals.map((v, i) => [x(i), y(v)]));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}` }
  const id = "g" + Math.random().toString(36).slice(2, 7), last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" style="height:${h}px">
    <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${W},${h} L0,${h} Z" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${color}" vector-effect="non-scaling-stroke"/></svg>`;
}
function donut(segs, center, size = 170) {
  const tot = sum(segs, s => s.v); const R = 42, C = 2 * Math.PI * R; let off = 0;
  const arcs = tot > 0 ? segs.filter(s => s.v > 0).map(s => { const L = s.v / tot * C, gap = segs.length > 1 ? Math.min(1.6, L * .3) : 0; const a = `<circle r="${R}" cx="50" cy="50" fill="none" stroke="${s.c}" stroke-width="11" stroke-dasharray="${Math.max(L - gap, .01)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>`; off += L; return a }).join("")
    : `<circle r="${R}" cx="50" cy="50" fill="none" stroke="var(--card2)" stroke-width="11"/>`;
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 100 100">${arcs}</svg><div class="c">${center}</div></div>`;
}
function ring(p, color) {
  const R = 26, C = 2 * Math.PI * R, v = Math.max(0, Math.min(1, p));
  return `<div class="ring"><svg viewBox="0 0 64 64"><circle r="${R}" cx="32" cy="32" fill="none" stroke="var(--card2)" stroke-width="7"/>${v > 0 ? `<circle r="${R}" cx="32" cy="32" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${v * C} ${C}"/>` : ""}</svg><b>${Math.round(p * 100)}%</b></div>`;
}

/* ============ Icônes ============ */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  budget: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18M7 15h4"/></svg>',
  analyse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  patrimoine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  reglages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19C5.5 19 2 12 2 12a18 18 0 0 1 4.1-5.1M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M3 3l18 18"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
const TABS = [["home", "Synthèse"], ["budget", "Budget"], ["analyse", "Analyse"], ["patrimoine", "Patrimoine"], ["reglages", "Réglages"]];

/* ============ Rendu ============ */
function render() {
  document.body.classList.toggle("hide", hide);
  const t = V.tab, title = TABS.find(x => x[0] === t)[1];
  const hasData = keys().length > 0 || S.updated > 0;
  let body = !hasData && t !== "reglages" ? vWelcome() : ({ home: vHome, budget: vBudget, analyse: vAnalyse, patrimoine: vPatrimoine, reglages: vReglages }[t])();
  const sub = { home: cap(mLabel(curKey())), budget: "Méthode " + (S.method === "custom" ? "personnalisée" : METHODS[S.method].n), analyse: "Tendances et postes de dépense", patrimoine: "Comptes, objectifs et projections", reglages: "Méthode, synchro et données" }[t];
  $("#root").innerHTML = `<div class="app">
    <aside class="side">
      <div class="logo"><i>€</i>Finance OS</div>
      ${TABS.map(([k, n]) => `<button class="nav ${t === k ? "on" : ""}" data-a="tab" data-v="${k}">${I[k]}${n}</button>`).join("")}
      <button class="btn pri cta" data-a="quick">${I.plus}Dépense ou revenu</button>
      <div class="foot"><span id="syncdot" class="dot"></span>${gh ? "Synchronisé avec GitHub" : "Données sur cet appareil"}</div>
    </aside>
    <main class="main"><div class="wrap">
      <div class="top"><h1>${title}<span class="sub">${esc(sub)}</span></h1>
        <button class="icb" data-a="hide" title="${hide ? "Afficher" : "Masquer"} les montants" aria-label="Masquer les montants">${hide ? I.eyeoff : I.eye}</button></div>
      ${body}
    </div></main>
  </div>
  <nav class="tabs">${TABS.map(([k, n]) => `<button class="${t === k ? "on" : ""}" data-a="tab" data-v="${k}">${I[k]}${n}</button>`).join("")}</nav>
  ${hasData ? `<button class="fab" data-a="quick" aria-label="Ajouter une dépense ou un revenu">${I.plus}</button>` : ""}`;
  setSync(syncState);
  renderModal();
}

function vWelcome() {
  return `<div class="card empty"><div class="e">💶</div><h2>Bienvenue dans Finance OS</h2>
    <p>Importe le fichier de tes données (mes-finances.json) ou commence un budget vierge. Si tu as déjà connecté GitHub sur un autre appareil, va dans Réglages pour te reconnecter : tout reviendra.</p>
    <div class="row-btns" style="justify-content:center"><button class="btn pri" data-a="import">Importer mes données</button><button class="btn" data-a="startBlank">Budget vierge</button></div></div>`;
}

function msw(k, act) {
  return `<div class="msw"><button class="icb" data-a="${act}" data-v="-1" aria-label="Mois précédent">${I.left}</button><div class="lbl">${mLabel(k)}</div><button class="icb" data-a="${act}" data-v="1" aria-label="Mois suivant">${I.right}</button></div>`;
}

/* ---- Synthèse ---- */
function vHome() {
  const k = curKey(), st = stats(k), nw = netWorth();
  const hist = S.history.slice(); const vals = hist.map(h => h.total);
  if (!hist.length || hist[hist.length - 1].m !== mk()) vals.push(nw);
  const first = vals.length > 1 ? vals[0] : null, dv = first !== null ? nw - first : 0;
  const labels = hist.map(h => mShort(h.m)); if (labels.length < vals.length) labels.push(mShort(mk()));
  let h = `<section class="card hero"><div class="eyebrow">Patrimoine net</div><div class="big">${eur(nw)}</div>
    ${first !== null ? `<div class="delta ${dv >= 0 ? "pos" : "neg"}">${sgn(dv)}${eur(Math.abs(dv), 0)} ${first ? "(" + sgn(dv) + pc(Math.abs(dv / first * 100), 1) + ")" : ""} <span class="mut">depuis ${labels[0]}</span></div>` : `<div class="delta mut">Mets à jour tes soldes chaque mois pour voir la courbe.</div>`}
    <div class="chart">${area(vals.length > 1 ? vals : [nw, nw], "var(--gold)", 140)}<div class="xl"><span>${labels[0] || ""}</span><span>${labels.length > 1 ? labels[labels.length - 1] : ""}</span></div></div>
    ${nw === 0 ? `<button class="btn sm" style="margin-top:12px" data-a="tab" data-v="patrimoine">Renseigner mes soldes →</button>` : ""}</section>`;
  if (!st) { const prev = keys().filter(x => x < k).pop(); return h + `<div class="card empty"><div class="e">🗓️</div><h2>Nouveau mois : ${mLabel(k)}</h2><p>${prev ? `Reprends tes charges, abonnements et enveloppes de ${mLabel(prev)}, puis ajuste ton salaire et tes dépenses.` : "Crée ton budget du mois."}</p><div class="row-btns" style="justify-content:center">${prev ? `<button class="btn pri" data-a="dupTo" data-from="${prev}" data-to="${k}">Reprendre ${mLabel(prev)}</button>` : ""}<button class="btn" data-a="tab" data-v="budget">Ouvrir le budget</button></div></div>` }
  const gs = groupStats(st), sg = gs.find(g => g.sav);
  h += `<div class="kpis">
    <div class="kpi"><span>Revenus</span><b>${eur(st.inc)}</b><small>${mLabel(k)}</small></div>
    <div class="kpi"><span>Dépenses</span><b>${eur(st.dep)}</b><small>${st.inc ? pc(st.dep / st.inc * 100) + " des revenus" : "—"}</small></div>
    <div class="kpi"><span>Épargne</span><b class="pos">${eur(st.b.epargne)}</b><small>Taux ${pc(st.rate * 100, 1)}</small></div>
    <div class="kpi"><span>Reste</span><b class="${st.reste < 0 ? "neg" : ""}">${eur(st.reste)}</b><small>non affecté</small></div></div>`;
  h += `<div class="grid g32"><section class="card"><h2>Répartition du budget <span class="r chip" data-a="tab" data-v="reglages" style="cursor:pointer">${esc(S.method === "custom" ? "Personnalisée" : METHODS[S.method].n)}</span></h2>
    <p class="lead">Ce que tu dépenses vraiment, comparé à la cible de ta méthode (trait blanc).</p><div class="alloc">${gs.map(allocRow).join("")}</div></section>`;
  // fonds d'urgence
  const need = monthlyNeeds(), safe = sum(S.accounts.filter(a => SAFE_TYPES.includes(a.type) && a.type !== "courant"), a => a.balance);
  const mo = need ? safe / need : 0;
  h += `<section class="card"><h2>Fonds d'urgence</h2><p class="lead">Épargne disponible (livrets) ÷ dépenses mensuelles moyennes. Cible : 3 à 6 mois.</p>
    <div class="split"><div><div class="big" style="font-size:32px">${mo.toFixed(1).replace(".", ",")} <span style="font-size:16px;color:var(--tx3);font-weight:600">mois</span></div>
    <div class="mut" style="font-size:13px">${eur(safe, 0)} sur ${eur(need * 6, 0)} (6 mois)</div></div>${ring(mo / 6, mo >= 3 ? "var(--pos)" : "var(--warn)")}</div>
    <div class="bar" style="margin-top:14px"><b style="width:${Math.min(100, mo / 6 * 100)}%;background:${mo >= 3 ? "var(--pos)" : "var(--warn)"}"></b><u style="left:50%"></u></div>
    <div class="xl"><span>0</span><span>3 mois</span><span>6 mois</span></div></section></div>`;
  // conseils + prélèvements
  const ins = insights(k);
  h += `<div class="grid g2"><section class="card"><h2>Conseils du mois</h2><p class="lead">Calculés à partir de ton budget de ${mLabel(k)}.</p>${ins.slice(0, 6).map(insHTML).join("") || '<p class="mut">Rien à signaler.</p>'}</section>`;
  h += `<section class="card"><h2>${k === mk() ? "Prochains prélèvements" : "Calendrier des prélèvements"}</h2><p class="lead">Les sorties datées de ${mLabel(k)}${k === mk() ? ", à partir d'aujourd'hui" : ""}.</p>${upcoming(k)}</section></div>`;
  return h;
}
function allocRow(g) {
  const scale = Math.max(100, g.p * 1.4, g.pct * 1.05);
  const over = !g.sav && g.v > g.target + 0.5, under = g.sav && g.v + 0.5 < g.target;
  const st = g.sav ? (under ? `<span class="neg">Il manque ${eur(g.target - g.v, 0)}</span> pour atteindre ${g.p} %` : `<span class="pos">Objectif atteint</span>`)
    : (over ? `<span class="neg">${eur(g.v - g.target, 0)} au-dessus</span> de la cible (${eur(g.target, 0)})` : `<span class="pos">Dans la cible</span> · encore ${eur(g.target - g.v, 0)} de marge`);
  return `<div><div class="al-h"><i style="background:${g.c}"></i>${esc(g.n)}<span class="v">${eur(g.v, 0)} · ${pc(g.pct)}</span><span class="t">/ ${g.p} %</span></div>
    <div class="bar"><b style="width:${Math.min(100, g.pct / scale * 100)}%;background:${g.c}"></b><u style="left:${g.p / scale * 100}%"></u></div><div class="al-s">${st}</div></div>`;
}
const insHTML = i => `<div class="ins ${i.l}"><div class="b">${{ bad: "!", warn: "!", info: "i", good: "✓" }[i.l]}</div><div><h3>${esc(i.t)}</h3><p>${esc(i.d)}</p></div></div>`;
function upcoming(k) {
  const m = S.months[k]; const today = new Date().getDate();
  let ls = m.lines.filter(l => l.day && lineVal(l) > 0); if (k === mk()) ls = ls.filter(l => l.day >= today);
  ls.sort((a, b) => a.day - b.day);
  if (!ls.length) return `<p class="mut" style="font-size:13.5px">${k === mk() ? "Plus aucun prélèvement daté d'ici la fin du mois." : "Aucune sortie datée."}</p>`;
  return `<div class="list">${ls.slice(0, 8).map(l => { const [e, c] = catOf(l.cat); return `<button class="li" data-a="editLine" data-id="${l.id}"><div class="ic" style="background:${c}22">${e}</div><div class="m"><div class="n">${esc(l.label)}</div><div class="s">le ${l.day} · ${esc(l.cat || "")}</div></div><div class="v">${eur(lineVal(l))}</div></button>` }).join("")}</div>
    ${ls.length > 8 ? `<p class="note">+ ${ls.length - 8} autres · total ${eur(sum(ls, lineVal), 0)}</p>` : `<p class="note">Total : ${eur(sum(ls, lineVal))}</p>`}`;
}

/* ---- Budget ---- */
function vBudget() {
  const k = curKey(), m = S.months[k];
  let h = msw(k, "month");
  if (!m) {
    const prev = keys().filter(x => x < k).pop() || keys().pop();
    return h + `<div class="card empty"><div class="e">🗓️</div><h2>Pas encore de budget pour ${mLabel(k)}</h2>
      <p>${prev ? `Reprends les lignes de ${mLabel(prev)} (charges, abonnements, enveloppes). Les dépenses notées et le découvert ne sont pas recopiés.` : "Commence avec un budget vierge."}</p>
      <div class="row-btns" style="justify-content:center">${prev ? `<button class="btn pri" data-a="dupTo" data-from="${prev}" data-to="${k}">Reprendre ${mLabel(prev)}</button>` : ""}<button class="btn" data-a="newMonth" data-to="${k}">Mois vierge</button></div></div>`;
  }
  const st = stats(k);
  h += `<section class="card"><div class="split" style="align-items:flex-start"><div><div class="eyebrow">Reste à affecter</div><div class="big ${st.reste < 0 ? "neg" : ""}" style="font-size:34px">${eur(st.reste)}</div>
    <div class="mut" style="font-size:13px">${eur(st.inc)} de revenus − ${eur(st.out)} prévus</div></div>${ring(st.rate, "var(--pos)")}</div>
    <div style="margin-top:16px" class="stack">${BORDER.map(b => st.b[b] > 0 ? `<b style="flex:${st.b[b]};background:${BK[b].c}"></b>` : "").join("")}${st.reste > 0 ? `<b style="flex:${st.reste};background:var(--line2)"></b>` : ""}</div>
    <div class="legend">${BORDER.map(b => `<span><i style="background:${BK[b].c}"></i>${BK[b].s} ${st.inc ? pc(st.b[b] / st.inc * 100) : ""}</span>`).join("")}<span><i style="background:var(--line2)"></i>Reste</span></div>
    <p class="note">L'anneau = ton taux d'épargne. Pour une enveloppe où tu notes tes dépenses, c'est le plus élevé entre le prévu et le réel qui compte.</p></section>`;
  // revenus
  h += `<section class="card"><div class="sec-h"><i style="background:#9AA3B5"></i><h2>Revenus</h2><div class="tot">${eur(st.inc)}</div></div>
    <div class="list">${m.income.map(i => `<button class="li" data-a="editInc" data-id="${i.id}"><div class="ic" style="background:#9AA3B522">💼</div><div class="m"><div class="n">${esc(i.label)}</div><div class="s">${i.day ? "reçu le " + i.day : "Revenu"}</div></div><div class="v pos">${eur(i.amount)}</div></button>`).join("")}</div>
    <button class="add" data-a="newInc">${I.plus}Ajouter un revenu</button></section>`;
  h += `<div class="grid g2" style="align-items:start">`;
  BORDER.forEach(b => {
    const ls = m.lines.filter(l => l.bucket === b); const tot = sum(ls, lineVal);
    h += `<section class="card"><div class="sec-h"><i style="background:${BK[b].c}"></i><h2>${BK[b].n}</h2><div class="tot">${eur(tot)}<small>${st.inc ? pc(tot / st.inc * 100, 1) + " des revenus" : ""}</small></div></div>
      <p class="lead" style="margin:4px 0 6px">${BK[b].h}</p><div class="list">${ls.map(lineRow).join("")}</div>
      <button class="add" data-a="newLine" data-b="${b}">${I.plus}Ajouter une ligne</button></section>`;
  });
  h += `</div><div class="row-btns" style="margin:4px 0 20px">${!S.months[addM(k, 1)] ? `<button class="btn" data-a="dupTo" data-from="${k}" data-to="${addM(k, 1)}">Préparer ${mLabel(addM(k, 1))}</button>` : ""}<button class="btn dng" data-a="delMonth" data-k="${k}">Supprimer ce mois</button></div>`;
  return h;
}
function lineRow(l) {
  const [e, c] = catOf(l.cat), sp = spent(l), v = lineVal(l), env = l.bucket === "variables" || l.bucket === "envies";
  const sub = [l.cat, l.day ? "le " + l.day : "", l.note].filter(Boolean).map(esc).join(" · ");
  const prog = l.tx.length ? `<div class="mini"><b style="width:${l.amount ? Math.min(100, sp / l.amount * 100) : 100}%;background:${sp > l.amount ? "var(--neg)" : c}"></b></div><div class="s" style="margin-top:4px">${eur(sp)} dépensés${l.amount ? ` sur ${eur(l.amount)} · ${sp > l.amount ? `<span class="neg">dépassé de ${eur(sp - l.amount)}</span>` : `reste ${eur(l.amount - sp)}`}` : ""}</div>` : "";
  return `<div class="li ${v === 0 ? "zero" : ""}" style="padding-right:0"><button style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;text-align:left" data-a="editLine" data-id="${l.id}">
    <div class="ic" style="background:${c}22">${e}</div><div class="m"><div class="n">${esc(l.label)}</div><div class="s">${sub}</div>${prog}</div><div class="v">${eur(v)}</div></button>
    ${env ? `<button class="plus" data-a="addTx" data-id="${l.id}" aria-label="Noter une dépense">${I.plus}</button>` : ""}</div>`;
}

/* ---- Analyse ---- */
function vAnalyse() {
  const ks = keys(); if (!ks.length) return `<div class="card empty"><h2>Pas encore de données</h2></div>`;
  const k = V.amonth && S.months[V.amonth] ? V.amonth : S.months[curKey()] ? curKey() : ks[ks.length - 1]; const st = stats(k);
  const all = ks.map(x => ({ k: x, ...stats(x) })); const mx = Math.max(...all.map(a => Math.max(a.inc, a.out)), 1);
  const show = all.slice(-12);
  let h = `<section class="card"><h2>Évolution mensuelle<span class="r">${show.length} mois</span></h2><p class="lead">Touche un mois pour l'analyser en détail.</p>
    <div class="bars">${show.map(a => `<button class="col ${a.k === k ? "on" : ""}" data-a="amonth" data-v="${a.k}" title="${mLabel(a.k)} · revenus ${money(a.inc)} · dépenses ${money(a.dep)} · épargne ${money(a.b.epargne)}">
      <div class="grp"><b style="height:${a.inc / mx * 100}%;background:var(--line2)"></b><b style="height:${a.dep / mx * 100}%;background:#7C9CFF"></b><b style="height:${a.b.epargne / mx * 100}%;background:var(--pos)"></b></div><span>${mShort(a.k)}</span></button>`).join("")}</div>
    <div class="legend"><span><i style="background:var(--line2)"></i>Revenus</span><span><i style="background:#7C9CFF"></i>Dépenses</span><span><i style="background:var(--pos)"></i>Épargne</span></div></section>`;
  const n = all.length, avgInc = sum(all, a => a.inc) / n, avgDep = sum(all, a => a.dep) / n, totSav = sum(all, a => a.b.epargne), avgRate = sum(all, a => a.inc) ? totSav / sum(all, a => a.inc) : 0;
  h += `<div class="kpis"><div class="kpi"><span>Revenu moyen</span><b>${eur(avgInc, 0)}</b><small>sur ${n} mois</small></div>
    <div class="kpi"><span>Dépense moyenne</span><b>${eur(avgDep, 0)}</b><small>hors épargne</small></div>
    <div class="kpi"><span>Taux d'épargne</span><b class="${avgRate >= 0.1 ? "pos" : "neg"}">${pc(avgRate * 100, 1)}</b><small>moyenne de la période</small></div>
    <div class="kpi"><span>Total épargné</span><b class="pos">${eur(totSav, 0)}</b><small>depuis ${mShort(ks[0])}</small></div></div>`;
  const cats = Object.entries(st.cats).filter(([c]) => c !== "Épargne").sort((a, b) => b[1] - a[1]); const ctot = sum(cats, c => c[1]);
  h += `<div class="grid g2" style="align-items:start"><section class="card"><h2>Où part l'argent<span class="r" style="text-transform:capitalize">${mLabel(k)}</span></h2><p class="lead">Dépenses par catégorie, hors épargne. Colonne de droite : le coût sur 12 mois.</p>
    <div class="dwrap">${donut(cats.map(([c, v]) => ({ v, c: catOf(c)[1] })), `<b>${eur(ctot, 0)}</b><span>dépensés</span>`)}
    <div class="list">${cats.map(([c, v]) => `<div class="li"><div class="ic" style="background:${catOf(c)[1]}22">${catOf(c)[0]}</div><div class="m"><div class="n">${esc(c)}</div><div class="s">${pc(v / ctot * 100)} des dépenses</div></div><div class="v">${eur(v)}<small>${eur(v * 12, 0)}/an</small></div></div>`).join("")}</div></div></section>`;
  const abo = S.months[k].lines.filter(l => l.cat === "Abonnements" && lineVal(l) > 0).sort((a, b) => lineVal(b) - lineVal(a)); const at = sum(abo, lineVal);
  h += `<div><section class="card"><h2>Audit des abonnements</h2><p class="lead">Chaque petit montant mensuel, ramené à l'année.</p>
    <div class="split" style="margin-bottom:8px"><div><div class="big" style="font-size:30px">${eur(at * 12, 0)}<span style="font-size:15px;color:var(--tx3);font-weight:600"> /an</span></div><div class="mut" style="font-size:13px">${eur(at)} par mois · ${abo.length} abonnement${abo.length > 1 ? "s" : ""}</div></div></div>
    <div class="list">${abo.map(l => `<button class="li" data-a="editLine" data-id="${l.id}"><div class="ic" style="background:#A98BFA22">🔁</div><div class="m"><div class="n">${esc(l.label)}</div><div class="s">${eur(lineVal(l))}/mois</div></div><div class="v">${eur(lineVal(l) * 12, 0)}<small>par an</small></div></button>`).join("") || '<p class="mut">Aucun abonnement ce mois-ci.</p>'}</div></section>`;
  const car = S.months[k].lines.filter(l => l.cat === "Transport" || /auto|voiture/i.test(l.label)); const ct = sum(car, lineVal);
  if (ct > 0) h += `<section class="card"><h2>Ce que coûte vraiment ta voiture</h2><p class="lead">Crédit, assurance, essence, péages et entretien réunis.</p>
    <div class="split"><div><div class="big" style="font-size:30px">${eur(ct * 12, 0)}<span style="font-size:15px;color:var(--tx3);font-weight:600"> /an</span></div><div class="mut" style="font-size:13px">${eur(ct)} par mois · ${st.inc ? pc(ct / st.inc * 100) + " de tes revenus" : ""}</div></div></div>
    <div class="stack" style="margin-top:14px">${car.filter(l => lineVal(l) > 0).map((l, i) => `<b style="flex:${lineVal(l)};background:${["#F39A73", "#5E7CE2", "#E7C36E", "#2DD4BF", "#F472B6", "#A98BFA"][i % 6]}" title="${esc(l.label)}"></b>`).join("")}</div>
    <div class="legend">${car.filter(l => lineVal(l) > 0).map((l, i) => `<span><i style="background:${["#F39A73", "#5E7CE2", "#E7C36E", "#2DD4BF", "#F472B6", "#A98BFA"][i % 6]}"></i>${esc(l.label)} ${eur(lineVal(l), 0)}</span>`).join("")}</div></section>`;
  h += `</div></div>`;
  return h;
}

/* ---- Patrimoine ---- */
function vPatrimoine() {
  const nw = netWorth(); const grp = {};
  S.accounts.forEach(a => { const g = (ACCT[a.type] || ACCT.autre).g; grp[g] = (grp[g] || 0) + (+a.balance || 0) });
  const gl = Object.entries(grp).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  let h = `<div class="grid g32"><section class="card hero"><div class="eyebrow">Patrimoine net</div><div class="big">${eur(nw)}</div>
    <div class="dwrap" style="margin-top:8px">${donut(gl.map(([g, v]) => ({ v, c: AGROUP_C[g] })), `<b>${gl.length}</b><span>classe${gl.length > 1 ? "s" : ""} d'actifs</span>`, 150)}
    <div class="list">${gl.map(([g, v]) => `<div class="li"><div class="ic" style="background:${AGROUP_C[g]}22"><i style="width:10px;height:10px;border-radius:4px;background:${AGROUP_C[g]}"></i></div><div class="m"><div class="n">${g}</div><div class="s">${pc(v / nw * 100, 1)}</div></div><div class="v">${eur(v)}</div></div>`).join("") || '<p class="mut">Renseigne tes soldes ci-dessous.</p>'}</div></div></section>`;
  h += `<section class="card"><h2>Comptes<span class="r">touche pour mettre à jour</span></h2><div class="list">${S.accounts.map(a => {
    const t = ACCT[a.type] || ACCT.autre; const pl = t.plaf;
    const sub = [a.name === t.n ? "" : t.n, pl ? `plafond ${money(pl, 0)}${t.plafTxt ? " de " + t.plafTxt : ""}` : ""].filter(Boolean).join(" · ");
    return `<button class="li" data-a="editAcc" data-id="${a.id}"><div class="ic" style="background:${t.c}22">${t.e}</div><div class="m"><div class="n">${esc(a.name)}</div><div class="s">${sub}</div>${pl ? `<div class="mini"><b style="width:${Math.min(100, (+a.balance || 0) / pl * 100)}%;background:${t.c}"></b></div>` : ""}</div><div class="v">${eur(+a.balance || 0)}</div></button>`
  }).join("")}</div><button class="add" data-a="newAcc">${I.plus}Ajouter un compte</button>
    <p class="note">Chaque mise à jour enregistre le relevé du mois : c'est ce qui trace la courbe de ta Synthèse.</p></section></div>`;
  // objectifs
  h += `<section class="card"><h2>Objectifs</h2><p class="lead">Relie un objectif à un compte : sa progression suit le solde automatiquement.</p><div class="grid g2" style="margin:0">${S.goals.map(goalCard).join("")}</div>
    <button class="add" data-a="newGoal">${I.plus}Ajouter un objectif</button></section>`;
  h += vSimu();
  return h;
}
function goalCard(g) {
  const cur = goalCur(g), p = g.target ? Math.min(1, cur / g.target) : 0, left = Math.max(0, g.target - cur);
  let eta = "";
  if (left <= 0) eta = `<span class="pos">Objectif atteint 🎉</span>`;
  else if (+g.monthly > 0) { const n = Math.ceil(left / g.monthly); eta = `À ${eur(g.monthly, 0)}/mois : atteint en <b>${mLabel(addM(mk(), n))}</b>` }
  let need = "";
  if (left > 0 && g.deadline) { const n = mDiff(mk(), g.deadline); need = n > 0 ? `Pour ${mLabel(g.deadline)} : <b>${eur(left / n, 0)}/mois</b>` : `<span class="neg">Échéance dépassée</span>` }
  const acc = g.account ? S.accounts.find(a => a.id === g.account) : null;
  return `<button class="card" style="margin:0;text-align:left;box-shadow:none;background:var(--card2)" data-a="editGoal" data-id="${g.id}">
    <div class="split"><div style="display:flex;gap:10px;align-items:center"><div class="ic" style="background:var(--goldbg)">${esc(g.emoji || "🎯")}</div><div><div style="font-weight:650">${esc(g.name)}</div><div class="mut" style="font-size:12.5px">${acc ? "sur " + esc(acc.name) : "suivi manuel"}</div></div></div><b class="gold">${Math.round(p * 100)} %</b></div>
    <div class="bar" style="margin-top:12px"><b style="width:${p * 100}%;background:var(--gold)"></b></div>
    <div class="split" style="margin-top:8px;font-size:13px"><span>${eur(cur, 0)}</span><span class="mut">${eur(g.target, 0)}</span></div>
    <div style="font-size:13px;margin-top:8px;color:var(--tx2)">${eta}${eta && need ? "<br>" : ""}${need}</div></button>`;
}
function simCalc(i, m, r, y) {
  const rm = Math.pow(1 + r / 100, 1 / 12) - 1; let v = i; const pts = [{ v: i, d: i }];
  for (let k = 1; k <= y * 12; k++) { v = v * (1 + rm) + m; if (k % 12 === 0) pts.push({ v, d: i + m * k }) }
  return pts;
}
function vSimu() {
  const s = V.simu, pts = simCalc(s.i, s.m, s.r, s.y), last = pts[pts.length - 1], gain = last.v - last.d;
  return `<section class="card" id="simu"><h2>Simulateur d'intérêts composés</h2><p class="lead">Ce que deviennent des versements réguliers (DCA), par exemple sur un PEA investi en ETF monde.</p>
    <div class="grid g2" style="margin:0"><div>
      <div class="sim-row"><span>Versement mensuel</span><b id="sv-m">${money(s.m, 0)}</b></div><input type="range" min="0" max="1000" step="10" value="${s.m}" data-in="simu" data-k="m">
      <div class="sim-row" style="margin-top:12px"><span>Capital de départ</span><b id="sv-i">${money(s.i, 0)}</b></div><input type="range" min="0" max="30000" step="100" value="${s.i}" data-in="simu" data-k="i">
      <div class="sim-row" style="margin-top:12px"><span>Rendement annuel</span><b id="sv-r">${pc(s.r, 1)}</b></div><input type="range" min="0" max="12" step="0.5" value="${s.r}" data-in="simu" data-k="r">
      <div class="sim-row" style="margin-top:12px"><span>Durée</span><b id="sv-y">${s.y} ans</b></div><input type="range" min="1" max="40" step="1" value="${s.y}" data-in="simu" data-k="y">
    </div><div id="simout">${simOut(pts, last, gain)}</div></div>
    <p class="note">Hypothèse, pas une promesse : les marchés actions ont déjà perdu plus de 30 % certaines années. Plus l'horizon est long, plus ces creux se lissent.</p></section>`;
}
function simOut(pts, last, gain) {
  const W = 600, H = 150, mx = Math.max(...pts.map(p => p.v), 1), n = pts.length - 1 || 1;
  const x = i => i * W / n, y = v => H - v / mx * (H - 6);
  const top = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" L"), dep = pts.map((p, i) => `${x(i)},${y(p.d)}`).join(" L");
  return `<div class="kpis" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:8px">
    <div class="kpi" style="padding:10px"><span>Capital final</span><b class="gold" style="font-size:18px">${eur(last.v, 0)}</b></div>
    <div class="kpi" style="padding:10px"><span>Versé</span><b style="font-size:18px">${eur(last.d, 0)}</b></div>
    <div class="kpi" style="padding:10px"><span>Intérêts</span><b class="pos" style="font-size:18px">${eur(gain, 0)}</b></div></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${H}px;display:block">
      <path d="M${top} L${W},${H} L0,${H} Z" fill="var(--gold)" fill-opacity=".22"/><path d="M${dep} L${W},${H} L0,${H} Z" fill="var(--tx3)" fill-opacity=".28"/>
      <path d="M${top}" fill="none" stroke="var(--gold)" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
    <div class="legend"><span><i style="background:var(--tx3)"></i>Argent versé</span><span><i style="background:var(--gold)"></i>Intérêts composés</span></div>`;
}

/* ---- Réglages ---- */
function vReglages() {
  const c = S.custom, ct = c.fixes + c.variables + c.envies + c.epargne, th = getTheme();
  let h = `<div class="grid g2" style="align-items:start"><section class="card"><h2>Méthode de budget</h2><p class="lead">Les cibles utilisées dans la Synthèse et les conseils. Les pourcentages se calculent sur tes revenus du mois.</p>
    ${Object.entries(METHODS).map(([k, m]) => `<button class="mcard ${S.method === k ? "on" : ""}" data-a="method" data-v="${k}"><b>${S.method === k ? "●" : "○"} ${esc(m.n)}</b><p>${esc(m.d)}</p>
      ${m.g ? `<div class="stack">${m.g.map(g => `<b style="flex:${g.p};background:${g.c}"></b>`).join("")}</div>` : ""}</button>`).join("")}
    ${S.method === "custom" ? `<div class="f2" style="margin-top:8px">${BORDER.map(b => `<div class="field"><label>${BK[b].s} (%)</label><input class="inp" inputmode="numeric" value="${c[b]}" data-in="custom" data-k="${b}"></div>`).join("")}</div>
      <p class="note ${ct === 100 ? "pos" : "neg"}" id="ctot">Total : ${ct} %${ct === 100 ? " ✓" : " (doit faire 100 %)"}</p>` : ""}
    <p class="note">Méthode des enveloppes : sur les lignes variables et loisirs, le bouton + te laisse noter chaque dépense et voir ce qu'il reste.</p></section>`;
  h += `<div><section class="card"><h2>Synchronisation <span id="syncdot" class="dot"></span></h2><p class="lead">Comme Life OS : tes données vont dans un Gist privé de ton compte GitHub, et tous tes appareils restent à jour.</p>`;
  if (gh) h += `<div class="list"><div class="li"><div class="ic" style="background:#24292F;color:#fff">⟳</div><div class="m"><div class="n">GitHub connecté</div><div class="s">Gist ${esc((gh.gistId || "").slice(0, 8))}…</div></div></div></div>
    <div class="row-btns" style="margin-top:10px"><button class="btn sm" data-a="syncNow">Synchroniser maintenant</button><button class="btn sm dng" data-a="ghoff">Déconnecter</button></div>`;
  else h += `<div class="field"><label>Jeton GitHub (permission « gist » uniquement)</label><input class="inp" type="password" id="ghtoken" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_…"></div>
    <button class="btn pri full" data-a="ghon">Connecter</button><p class="note">Tu peux réutiliser le même jeton que Life OS. Il reste uniquement sur cet appareil.</p>`;
  h += `</section><section class="card"><h2>Données</h2><p class="lead">Une sauvegarde de temps en temps ne fait jamais de mal.</p>
    <div class="row-btns"><button class="btn sm" data-a="export">Exporter (.json)</button><button class="btn sm" data-a="import">Importer</button><button class="btn sm dng" data-a="reset">Tout effacer</button></div></section>
    <section class="card"><h2>Apparence</h2><div class="seg" style="margin-top:10px">${[["dark", "Sombre"], ["light", "Clair"], ["auto", "Auto"]].map(([k, n]) => `<button class="${th === k ? "on" : ""}" data-a="theme" data-v="${k}">${n}</button>`).join("")}</div>
    <p class="note">L'œil en haut à droite masque tous les montants (pratique en public).</p></section></div></div>`;
  return h;
}

/* ============ Fenêtres (modales) ============ */
function catOptions(sel) { return Object.keys(CATS).filter(c => c !== "Revenus").map(c => `<option ${c === sel ? "selected" : ""}>${c}</option>`).join("") }
function findLine(id) { for (const k in S.months) { const l = S.months[k].lines.find(x => x.id === id); if (l) return [k, l] } return [null, null] }
function findInc(id) { for (const k in S.months) { const l = S.months[k].income.find(x => x.id === id); if (l) return [k, l] } return [null, null] }
function renderModal() {
  const M = V.modal, box = $("#modal"); if (!M) { box.innerHTML = ""; return }
  let t = "", b = "";
  const head = (title) => `<div class="grab"></div><h3>${title}<button class="icb" data-a="close" aria-label="Fermer">${I.x}</button></h3>`;
  if (M.t === "line") {
    const l = M.id ? findLine(M.id)[1] : { label: "", amount: "", day: "", cat: M.b === "epargne" ? "Épargne" : M.b === "envies" ? "Loisirs" : "Divers", bucket: M.b || "variables", note: "" };
    if (!l) { V.modal = null; return }
    t = M.id ? "Modifier la ligne" : "Nouvelle ligne";
    b = `<div class="field"><label>Libellé</label><input class="inp" id="f-label" value="${esc(l.label)}" placeholder="ex. Loyer"></div>
      <div class="f2"><div class="field"><label>Montant prévu (€/mois)</label><input class="inp" id="f-amount" inputmode="decimal" value="${l.amount === "" ? "" : String(l.amount).replace(".", ",")}"></div>
      <div class="field"><label>Jour du prélèvement</label><input class="inp" id="f-day" inputmode="numeric" value="${l.day || ""}" placeholder="—"></div></div>
      <div class="f2"><div class="field"><label>Enveloppe</label><select class="inp" id="f-bucket">${BORDER.map(x => `<option value="${x}" ${x === l.bucket ? "selected" : ""}>${BK[x].s}</option>`).join("")}</select></div>
      <div class="field"><label>Catégorie</label><select class="inp" id="f-cat">${catOptions(l.cat)}</select></div></div>
      <div class="field"><label>Note</label><input class="inp" id="f-note" value="${esc(l.note || "")}" placeholder="facultatif"></div>
      ${M.id && l.tx.length ? `<div class="field"><label>Dépenses notées (${eur(spent(l))})</label><div class="list">${l.tx.slice().reverse().map(x => `<div class="li"><div class="m"><div class="n">${eur(x.amount)}</div><div class="s">${esc(x.date || "")} ${esc(x.note || "")}</div></div><button class="icb" data-a="delTx" data-l="${l.id}" data-id="${x.id}" aria-label="Supprimer">${I.x}</button></div>`).join("")}</div></div>` : ""}
      <div class="row-btns" style="margin-top:6px"><button class="btn pri" style="flex:1" data-a="saveLine">Enregistrer</button>${M.id ? `<button class="btn dng" data-a="delLine">Supprimer</button>` : ""}</div>`;
  } else if (M.t === "inc") {
    const l = M.id ? findInc(M.id)[1] : { label: "", amount: "", day: "" };
    t = M.id ? "Modifier le revenu" : "Nouveau revenu";
    b = `<div class="field"><label>Libellé</label><input class="inp" id="f-label" value="${esc(l.label)}" placeholder="ex. Salaire, prime, freelance"></div>
      <div class="f2"><div class="field"><label>Montant (€)</label><input class="inp" id="f-amount" inputmode="decimal" value="${l.amount === "" ? "" : String(l.amount).replace(".", ",")}"></div>
      <div class="field"><label>Jour de réception</label><input class="inp" id="f-day" inputmode="numeric" value="${l.day || ""}"></div></div>
      <div class="row-btns"><button class="btn pri" style="flex:1" data-a="saveInc">Enregistrer</button>${M.id ? `<button class="btn dng" data-a="delInc">Supprimer</button>` : ""}</div>`;
  } else if (M.t === "tx") {
    const k = curKey(), m = S.months[k], rev = M.mode === "rev";
    t = rev ? "Ajouter un revenu" : "Noter une dépense";
    const seg = `<div class="seg" style="margin-bottom:14px"><button class="${rev ? "" : "on"}" data-a="txmode" data-v="dep">Dépense</button><button class="${rev ? "on" : ""}" data-a="txmode" data-v="rev">Revenu</button></div>`;
    if (!m) {
      const prev = keys().filter(x => x < k).pop();
      b = seg + `<p>Le budget de ${mLabel(k)} n'existe pas encore.</p>${prev ? `<button class="btn pri full" data-a="dupTo" data-from="${prev}" data-to="${k}">Reprendre ${mLabel(prev)}</button>` : `<button class="btn pri full" data-a="newMonth" data-to="${k}">Créer ${mLabel(k)}</button>`}`;
    } else if (rev) {
      b = seg + `<div class="field"><input class="inp big-inp" id="f-amount" inputmode="decimal" placeholder="0,00 €"></div>
        <div class="field"><label>Libellé</label><input class="inp" id="f-label" placeholder="ex. Salaire, prime, remboursement, vente…"></div>
        <div class="field"><label>Jour de réception</label><input class="inp" id="f-day" inputmode="numeric" value="${k === mk() ? new Date().getDate() : ""}"></div>
        <button class="btn pri full" data-a="saveRev">Ajouter aux revenus de ${mLabel(k)}</button>
        <p class="note">Pour modifier un revenu déjà saisi (ton salaire par exemple), touche-le dans l'onglet Budget, carte Revenus.</p>`;
    } else {
      const env = l => BORDER.indexOf(l.bucket) >= 2; const ls = m.lines.slice().sort((a, c) => (env(c) - env(a)) || ((+c.amount || 0) - (+a.amount || 0)));
      b = seg + `<div class="field"><input class="inp big-inp" id="f-amount" inputmode="decimal" placeholder="0,00 €"></div>
        <div class="field"><label>Enveloppe (${mLabel(k)})</label><select class="inp" id="f-line">${ls.map(l => `<option value="${l.id}" ${l.id === M.id ? "selected" : ""}>${esc(l.label)} · ${BK[l.bucket].s}${l.amount ? " · prévu " + money(l.amount) : ""}</option>`).join("")}</select></div>
        <div class="field"><label>Note</label><input class="inp" id="f-note" placeholder="ex. Leclerc, resto entre amis…"></div>
        <button class="btn pri full" data-a="saveTx">Ajouter</button><p class="note">La dépense s'ajoute à l'enveloppe. Si tu dépasses le prévu, c'est le réel qui compte dans tes totaux.</p>`;
    }
  } else if (M.t === "acc") {
    const a = M.id ? S.accounts.find(x => x.id === M.id) : { name: "", type: "livretA", balance: "" };
    t = M.id ? esc(a.name) : "Nouveau compte";
    b = `<div class="field"><label>Solde actuel (€)</label><input class="inp big-inp" id="f-bal" inputmode="decimal" value="${a.balance === "" ? "" : String(a.balance).replace(".", ",")}"></div>
      <div class="f2"><div class="field"><label>Nom</label><input class="inp" id="f-name" value="${esc(a.name)}"></div>
      <div class="field"><label>Type</label><select class="inp" id="f-type">${Object.entries(ACCT).map(([k, v]) => `<option value="${k}" ${k === a.type ? "selected" : ""}>${v.n}</option>`).join("")}</select></div></div>
      <div class="row-btns"><button class="btn pri" style="flex:1" data-a="saveAcc">Enregistrer</button>${M.id ? `<button class="btn dng" data-a="delAcc">Supprimer</button>` : ""}</div>`;
  } else if (M.t === "goal") {
    const g = M.id ? S.goals.find(x => x.id === M.id) : { name: "", emoji: "🎯", target: "", account: "", current: "", monthly: "", deadline: "" };
    t = M.id ? "Modifier l'objectif" : "Nouvel objectif";
    b = `<div class="f2" style="grid-template-columns:70px 1fr"><div class="field"><label>Icône</label><input class="inp" id="f-emoji" value="${esc(g.emoji || "")}" style="text-align:center"></div>
      <div class="field"><label>Nom</label><input class="inp" id="f-name" value="${esc(g.name)}" placeholder="ex. Voyage au Japon"></div></div>
      <div class="f2"><div class="field"><label>Montant visé (€)</label><input class="inp" id="f-target" inputmode="decimal" value="${g.target}"></div>
      <div class="field"><label>Versement mensuel (€)</label><input class="inp" id="f-monthly" inputmode="decimal" value="${g.monthly}"></div></div>
      <div class="f2"><div class="field"><label>Compte relié</label><select class="inp" id="f-acc"><option value="">Aucun (suivi manuel)</option>${S.accounts.map(a => `<option value="${a.id}" ${a.id === g.account ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Échéance</label><input class="inp" id="f-deadline" type="month" value="${g.deadline || ""}"></div></div>
      <div class="field"><label>Déjà de côté, si aucun compte relié (€)</label><input class="inp" id="f-current" inputmode="decimal" value="${g.current || ""}"></div>
      <div class="row-btns"><button class="btn pri" style="flex:1" data-a="saveGoal">Enregistrer</button>${M.id ? `<button class="btn dng" data-a="delGoal">Supprimer</button>` : ""}</div>`;
  }
  box.innerHTML = `<div class="ov" data-a="ovclose"><div class="sheet" role="dialog" aria-modal="true">${head(t)}${b}</div></div>`;
  const f = box.querySelector("#f-amount,#f-bal,#f-label"); if (f && !M.id && matchMedia("(min-width:620px)").matches) setTimeout(() => f.focus(), 60);
}
const val = id => { const e = document.getElementById(id); return e ? e.value : "" };
const dayVal = id => { const d = parseInt(val(id), 10); return d >= 1 && d <= 31 ? d : null };

/* ============ Actions ============ */
const ACT = {
  tab: b => { V.tab = b.dataset.v; V.modal = null; render(); scrollTo(0, 0) },
  month: b => { V.month = addM(curKey(), +b.dataset.v); render() },
  amonth: b => { V.amonth = b.dataset.v; render() },
  hide: () => { hide = !hide; try { localStorage.setItem(HIDE_KEY, hide ? "1" : "0") } catch (e) { } render() },
  close: () => { V.modal = null; renderModal() },
  quick: () => { V.modal = { t: "tx" }; renderModal() },
  addTx: b => { V.modal = { t: "tx", id: b.dataset.id }; renderModal() },
  editLine: b => { V.modal = { t: "line", id: b.dataset.id }; renderModal() },
  newLine: b => { V.modal = { t: "line", b: b.dataset.b }; renderModal() },
  editInc: b => { V.modal = { t: "inc", id: b.dataset.id }; renderModal() },
  newInc: () => { V.modal = { t: "inc" }; renderModal() },
  editAcc: b => { V.modal = { t: "acc", id: b.dataset.id }; renderModal() },
  newAcc: () => { V.modal = { t: "acc" }; renderModal() },
  editGoal: b => { V.modal = { t: "goal", id: b.dataset.id }; renderModal() },
  newGoal: () => { V.modal = { t: "goal" }; renderModal() },
  saveLine: () => {
    const lab = val("f-label").trim(); if (!lab) return alert("Donne un nom à la ligne.");
    const d = { label: lab, amount: r2(num(val("f-amount"))), day: dayVal("f-day"), bucket: val("f-bucket"), cat: val("f-cat"), note: val("f-note").trim() };
    if (V.modal.id) Object.assign(findLine(V.modal.id)[1], d);
    else { const k = curKey(); if (!S.months[k]) S.months[k] = { income: [], lines: [] }; S.months[k].lines.push({ id: uid(), tx: [], ...d }) }
    V.modal = null; commit();
  },
  delLine: () => { if (!confirm("Supprimer cette ligne ?")) return; const [k] = findLine(V.modal.id); S.months[k].lines = S.months[k].lines.filter(l => l.id !== V.modal.id); V.modal = null; commit() },
  saveInc: () => {
    const lab = val("f-label").trim() || "Revenu"; const d = { label: lab, amount: r2(num(val("f-amount"))), day: dayVal("f-day") };
    if (V.modal.id) Object.assign(findInc(V.modal.id)[1], d);
    else { const k = curKey(); if (!S.months[k]) S.months[k] = { income: [], lines: [] }; S.months[k].income.push({ id: uid(), ...d }) }
    V.modal = null; commit();
  },
  delInc: () => { if (!confirm("Supprimer ce revenu ?")) return; const [k] = findInc(V.modal.id); S.months[k].income = S.months[k].income.filter(l => l.id !== V.modal.id); V.modal = null; commit() },
  saveTx: () => {
    const a = r2(num(val("f-amount"))); if (!(a > 0)) return alert("Indique un montant.");
    const [, l] = findLine(val("f-line")); if (!l) return;
    const d = new Date(); l.tx.push({ id: uid(), amount: a, note: val("f-note").trim(), date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) });
    V.modal = null; commit(); toast(`${money(a)} ajoutés à ${l.label}`);
  },
  txmode: b => { V.modal.mode = b.dataset.v; renderModal() },
  saveRev: () => {
    const a = r2(num(val("f-amount"))); if (!(a > 0)) return alert("Indique un montant.");
    const k = curKey(); S.months[k].income.push({ id: uid(), label: val("f-label").trim() || "Revenu", amount: a, day: dayVal("f-day") });
    V.modal = null; commit(); toast(`${money(a)} ajoutés aux revenus`);
  },
  delTx: b => { const [, l] = findLine(b.dataset.l); if (!l) return; l.tx = l.tx.filter(x => x.id !== b.dataset.id); commit() },
  saveAcc: () => {
    const d = { name: val("f-name").trim() || ACCT[val("f-type")].n, type: val("f-type"), balance: r2(num(val("f-bal"))) };
    if (V.modal.id) Object.assign(S.accounts.find(x => x.id === V.modal.id), d); else S.accounts.push({ id: uid(), ...d });
    snapshot(); V.modal = null; commit();
  },
  delAcc: () => { if (!confirm("Supprimer ce compte ?")) return; S.accounts = S.accounts.filter(a => a.id !== V.modal.id); S.goals.forEach(g => { if (g.account === V.modal.id) g.account = "" }); snapshot(); V.modal = null; commit() },
  saveGoal: () => {
    const d = { name: val("f-name").trim() || "Objectif", emoji: val("f-emoji").trim() || "🎯", target: r2(num(val("f-target"))), monthly: r2(num(val("f-monthly"))), account: val("f-acc"), deadline: val("f-deadline"), current: r2(num(val("f-current"))) };
    if (V.modal.id) Object.assign(S.goals.find(x => x.id === V.modal.id), d); else S.goals.push({ id: uid(), ...d });
    V.modal = null; commit();
  },
  delGoal: () => { if (!confirm("Supprimer cet objectif ?")) return; S.goals = S.goals.filter(g => g.id !== V.modal.id); V.modal = null; commit() },
  dupTo: b => {
    const f = S.months[b.dataset.from], to = b.dataset.to; if (!f) return;
    S.months[to] = { income: f.income.map(i => ({ ...i, id: uid() })), lines: f.lines.filter(l => l.cat !== "Découvert").map(l => ({ ...l, id: uid(), tx: [] })) };
    V.month = to; commit(); toast(`Budget de ${mLabel(to)} créé`);
  },
  newMonth: b => { S.months[b.dataset.to] = { income: [], lines: [] }; V.month = b.dataset.to; commit() },
  delMonth: b => { if (!confirm(`Supprimer tout le budget de ${mLabel(b.dataset.k)} ?`)) return; delete S.months[b.dataset.k]; V.month = null; commit() },
  method: b => { S.method = b.dataset.v; commit() },
  theme: b => { try { localStorage.setItem(THEME_KEY, b.dataset.v) } catch (e) { } applyTheme(b.dataset.v); render() },
  ghon: b => { const t = val("ghtoken"); if (t.trim()) { b.disabled = true; b.textContent = "Connexion…"; connect(t) } },
  ghoff: () => disconnect(),
  syncNow: () => pull(),
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "finance-os-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
  },
  import: () => $("#file").click(),
  reset: () => { if (!confirm("Effacer toutes les données de cet appareil ? (Exporte d'abord si besoin.)")) return; const u = S.updated; S = blank(); S.updated = u; commit() },
  startBlank: () => { const k = mk(); S.months[k] = { income: [{ id: uid(), label: "Salaire", amount: 0, day: null }], lines: [] }; V.tab = "budget"; commit() },
  ovclose: (b, e) => { if (e.target === b) { V.modal = null; renderModal() } }
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const f = ACT[b.dataset.a]; if (!f) return;
  if (b.dataset.a === "ovclose" && e.target !== b) return;
  f(b, e);
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.in === "simu") {
    V.simu[t.dataset.k] = +t.value; const s = V.simu, pts = simCalc(s.i, s.m, s.r, s.y), last = pts[pts.length - 1];
    $("#sv-" + t.dataset.k).textContent = t.dataset.k === "r" ? pc(s.r, 1) : t.dataset.k === "y" ? s.y + " ans" : money(+t.value, 0);
    $("#simout").innerHTML = simOut(pts, last, last.v - last.d);
  } else if (t.dataset.in === "custom") {
    S.custom[t.dataset.k] = Math.max(0, Math.min(100, parseInt(t.value, 10) || 0));
    const ct = sum(BORDER, b => S.custom[b]); const n = $("#ctot"); if (n) { n.textContent = `Total : ${ct} %${ct === 100 ? " ✓" : " (doit faire 100 %)"}`; n.className = "note " + (ct === 100 ? "pos" : "neg") }
    S.updated = Date.now(); saveLocal(); markDirty(true); if (gh) { clearTimeout(pushT); pushT = setTimeout(push, 1500) }
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && V.modal) { V.modal = null; renderModal() }
  if (e.key === "Enter" && e.target.classList && e.target.classList.contains("inp") && V.modal) { const p = $("#modal .btn.pri"); if (p) p.click() }
});
$("#file").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (!d || typeof d !== "object" || !d.months) throw 0;
    if (keys().length && !confirm("Remplacer les données actuelles par celles du fichier ?")) return;
    S = norm(d); V.month = null; commit(); toast("Données importées"); V.tab = "home"; render();
  } catch (x) { alert("Ce fichier n'est pas une sauvegarde Finance OS valide.") }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && gh) pull() });

/* ============ Démarrage ============ */
loadLocal();
render();
if (gh) pull();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
