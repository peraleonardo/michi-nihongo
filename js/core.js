'use strict';
/* Nucleo: utilità, storage, XP/serie/badge, SRS, caricamento dati, furigana */
const APP_VERSION = '2.5.0'; // tienila uguale a VERSION in sw.js
const LEVELS = ['n5', 'n4', 'n3'];
const LV = { n5: 'N5', n4: 'N4', n3: 'N3' };
const SEC = {
  kana: { t: 'Alfabeti', c: 'kana', ic: 'あ' }, kanji: { t: 'Kanji', c: 'kanji', ic: '漢' }, vocab: { t: 'Vocabolario', c: 'vocab', ic: '語' },
  gram: { t: 'Grammatica', c: 'gram', ic: '文' }, read: { t: 'Lettura', c: 'read', ic: '読' }, asc: { t: 'Ascolto', c: 'asc', ic: '聞' },
  ex: { t: 'Esercizi', c: 'ex', ic: '練' }, exam: { t: 'Esami', c: 'exam', ic: '試' }
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const one = a => a[rnd(a.length)];
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dayKey(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((parseDay(typeof b === 'string' ? b : dayKey(b)) - parseDay(typeof a === 'string' ? a : dayKey(a))) / 864e5);
const view = () => $('#view');
const KANJI_RE = /[一-鿿々]/;

/* ---------- storage ---------- */
const KEY = 'michi.v1';
const DEF = () => ({
  v: 1, xp: 0, days: {}, srs: {}, items: {}, stats: {}, badges: {}, read: {}, gram: {}, exams: [], meta: { nt: {} }, flags: {}, path: { u: {}, cp: {}, fin: {}, open: {} },
  set: { furi: 'always', theme: 'auto', goal: 50, newPerDay: 10, rate: 1, voiceF: '', voiceM: '', sounds: true, levels: ['n5'], cur: 'n5', examDate: '2027-12-05', planStart: today(), trans: true, romaji: true, showRomaji: true }
});
let S = DEF(), saveT = 0, memOnly = false;
function load() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) { const p = JSON.parse(r), d = DEF(); S = Object.assign(d, p); S.set = Object.assign(d.set, p.set || {}); S.meta = Object.assign({ nt: {} }, p.meta || {}); }
  } catch (e) { memOnly = true; }
}
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memOnly = true; } }
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
function applySettings() {
  document.body.dataset.furi = S.set.furi; document.body.dataset.rom = S.set.showRomaji ? 'on' : 'off';
  if (S.set.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = S.set.theme;
  document.body.className = document.body.className.replace(/\blv-n\d\b/g, '').trim() + ' lv-' + S.set.cur;
  const b = $('#lvbtn'); if (b) b.textContent = LV[S.set.cur];
}

/* ---------- registro giornaliero, XP, serie ---------- */
function D(k = today()) { return S.days[k] || (S.days[k] = { xp: 0, ok: 0, tot: 0, kanji: 0, vocab: 0, gram: 0, read: 0, listen: 0, review: 0, ex: 0, exam: 0 }); }
const bump = (k, n = 1) => { D()[k] = (D()[k] || 0) + n; save(); };
const xpInfo = xp => { const lvl = Math.floor(Math.sqrt(xp / 40)) + 1, base = 40 * (lvl - 1) ** 2, next = 40 * lvl ** 2; return { lvl, cur: xp - base, need: next - base }; };
const RANKS = ['Curioso 🌱', 'Apprendista 📘', 'Studente ✏️', 'Esploratore 🧭', 'Viaggiatore 🚃', 'Samurai di carta 🗡️', 'Maestro di kana 🌸', 'Cacciatore di kanji 🎯', 'Sensei in erba 🎓', 'Leggenda 🏯'];
const rank = lvl => RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 2))];
function addXP(n, quiet) {
  const before = xpInfo(S.xp).lvl;
  S.xp += n; D().xp += n; save();
  if (!quiet) floatXP(n);
  const after = xpInfo(S.xp).lvl;
  if (after > before) { setTimeout(() => { toast(`Livello ${after}! ${rank(after)}`, '🎉'); confetti(); snd('done'); }, 700); }
  checkBadges();
}
function streak() {
  let n = 0, d = new Date();
  if (!(S.days[dayKey(d)] && S.days[dayKey(d)].xp >= 10)) d = addDays(d, -1);
  while (S.days[dayKey(d)] && S.days[dayKey(d)].xp >= 10) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak() {
  const ks = Object.keys(S.days).filter(k => S.days[k].xp >= 10).sort();
  let best = 0, run = 0, prev = null;
  for (const k of ks) { run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}

/* ---------- statistiche ---------- */
function rec(sec, lv, ok, id) {
  const k = sec + ':' + (lv || 'n5');
  const s = S.stats[k] || (S.stats[k] = { ok: 0, tot: 0 });
  s.tot++; if (ok) s.ok++;
  const d = D(); d.tot++; if (ok) d.ok++;
  if (id) { const it = S.items[id] || (S.items[id] = { ok: 0, ko: 0 }); ok ? it.ok++ : it.ko++; it.t = Date.now(); }
  save();
}
const secTot = (sec, lv) => { let ok = 0, tot = 0; for (const k in S.stats) { const [s, l] = k.split(':'); if ((!sec || s === sec) && (!lv || l === lv)) { ok += S.stats[k].ok; tot += S.stats[k].tot; } } return { ok, tot, pct: tot ? Math.round(ok / tot * 100) : null }; };

/* ---------- SRS (stile SM-2) ---------- */
function srsNext(c, q) { // q: 0 Non lo so, 1 Difficile, 2 Bene, 3 Facile
  c = c ? { ...c } : { ef: 2.5, n: 0, iv: 0, due: 0, lp: 0 };
  const now = Date.now();
  if (q === 0) { c.n = 0; c.iv = 0; c.lp = (c.lp || 0) + 1; c.ef = Math.max(1.3, c.ef - 0.2); c.due = now + 10 * 60e3; return c; }
  const qq = [0, 3, 4, 5][q];
  c.ef = Math.max(1.3, c.ef + 0.1 - (5 - qq) * (0.08 + (5 - qq) * 0.02));
  let iv;
  if (c.n === 0) iv = [0, 1, 1, 3][q];
  else if (c.n === 1) iv = [0, 3, 4, 7][q];
  else iv = Math.max(c.iv + 1, Math.round(c.iv * [0, 1.2, c.ef, c.ef * 1.3][q]));
  c.n++; c.iv = iv;
  const d = new Date(now + iv * 864e5); d.setHours(4, 0, 0, 0); c.due = d.getTime();
  return c;
}
const ivLabel = (id, q) => { const c = srsNext(S.srs[id], q); if (q === 0) return '10 min'; return c.iv < 30 ? c.iv + ' g' : Math.round(c.iv / 30) + ' mesi'; };
function srsAnswer(id, q, sec, lv) {
  const isNew = !S.srs[id];
  S.srs[id] = srsNext(S.srs[id], q);
  if (isNew) { S.srs[id].f = today(); bump(sec === 'kanji' ? 'kanji' : 'vocab'); S.meta.nt[today() + ':' + sec] = (S.meta.nt[today() + ':' + sec] || 0) + 1; }
  bump('review');
  rec(sec, lv, q >= 1, id);
  addXP(q === 0 ? 2 : 5, true);
}
const isDue = id => S.srs[id] && S.srs[id].due <= Date.now();
const newLeft = sec => Math.max(0, S.set.newPerDay - (S.meta.nt[today() + ':' + sec] || 0));
function deckIds(sec, lv) { return (sec === 'kanji' ? DB.kanji[lv] : DB.vocab[lv]).map(e => e.id); }
function deckStats(sec, lv) {
  const ids = deckIds(sec, lv); let due = 0, nw = 0, learned = 0, mature = 0;
  for (const id of ids) { const c = S.srs[id]; if (!c) nw++; else { if (c.due <= Date.now()) due++; if (c.n >= 1) learned++; if (c.iv >= 21) mature++; } }
  return { total: ids.length, due, nw, learned, mature };
}
function totalDue() { let n = 0; for (const lv of LEVELS) for (const sec of ['kanji', 'vocab']) for (const e of (sec === 'kanji' ? DB.kanji[lv] : DB.vocab[lv])) if (isDue(e.id)) n++; return n; }

/* ---------- dati ---------- */
const DB = { percorso: null, frasi: {}, elenco: {}, kana: null, strokes: {}, kanji: {}, vocab: {}, gram: {}, testi: {}, asc: {}, es: {}, byId: {}, words: {}, wordIdx: {}, ready: false };
async function loadData() {
  const j = async f => { try { const r = await fetch('data/' + f); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  const [kana, strokes] = await Promise.all([j('kana.json'), j('strokes.json')]);
  DB.kana = kana; DB.strokes = strokes || {}; DB.elenco = (await j('kanji-elenco.json')) || {}; DB.percorso = await j('percorso.json'); DB.frasi = (await j('frasi.json')) || {};
  const files = [['kanji', 'kanji'], ['vocab', 'vocabolario'], ['gram', 'grammatica'], ['testi', 'testi'], ['asc', 'ascolto'], ['es', 'esercizi']];
  await Promise.all(LEVELS.flatMap(l => files.map(async ([k, f]) => { const d = await j(`${f}-${l}.json`); DB[k][l] = d || (k === 'asc' ? {} : []); })));
  for (const l of LEVELS) {
    DB.kanji[l].forEach(e => { e.lv = l; e.id = 'k:' + e.k; DB.byId[e.id] = e; });
    DB.vocab[l].forEach((e, i) => { e.lv = l; e.id = 'v:' + e.w + (e.r && e.r !== e.w ? '・' + e.r : ''); DB.byId[e.id] = e; });
    DB.gram[l].forEach(e => { e.lv = l; DB.byId['g:' + e.id] = e; DB.byId[e.id] = e; });
    DB.testi[l].forEach(e => { e.lv = l; DB.byId[e.id] = e; });
    (DB.asc[l].dialoghi || []).forEach(e => { e.lv = l; DB.byId[e.id] = e; });
    // pool di parole per i generatori
    const seen = new Set(), pool = [];
    const add = (w, r, it, src) => { const key = w + '|' + r; if (seen.has(key) || !w || !r) return; seen.add(key); pool.push({ w, r, it, src, lv: l }); DB.wordIdx[w] = DB.wordIdx[w] || { r, it }; };
    DB.kanji[l].forEach(e => (e.w || []).forEach(x => add(x[0], x[1], x[2], e.id)));
    DB.vocab[l].forEach(e => add(e.w, e.r || e.w, e.it, e.id));
    DB.words[l] = pool;
  }
  DB.ready = true;
}

/* ---------- furigana e testo ricco ---------- */
function rich(s) {
  if (s == null) return '';
  return esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/\n/g, '<br>');
}
const plain = s => String(s ?? '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$1').replace(/\*\*|__/g, '').replace(/\//g, '');
const yomi = s => String(s ?? '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2').replace(/\*\*|__/g, '').replace(/\//g, '').replace(/＿+/g, 'なになに').replace(/[★]/g, '');
function wr(w, r) { // parola con furigana sui soli kanji (okurigana escluse)
  if (!r || r === w || !KANJI_RE.test(w)) return esc(w);
  let pre = 0; while (pre < w.length && !KANJI_RE.test(w[pre]) && w[pre] === r[pre]) pre++;
  let suf = 0; while (suf < w.length - pre && suf < r.length - pre - 1 && !KANJI_RE.test(w[w.length - 1 - suf]) && w[w.length - 1 - suf] === r[r.length - 1 - suf]) suf++;
  return esc(w.slice(0, pre)) + `<ruby>${esc(w.slice(pre, w.length - suf))}<rt>${esc(r.slice(pre, r.length - suf))}</rt></ruby>` + esc(w.slice(w.length - suf));
}
/* kana -> romaji (Hepburn, fedele alla scrittura kana: おう = ou, ー = vocale ripetuta) */
const KROM = (() => {
  const t = 'あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をo んn がga ぎgi ぐgu げge ごgo ざza じji ずzu ぜze ぞzo だda ぢji づzu でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo ゔvu ぁa ぃi ぅu ぇe ぉo';
  const m = {}; t.split(' ').forEach(x => m[x[0]] = x.slice(1)); return m;
})();
function toRomaji(str) {
  const s = toHira(String(str)), SM = { 'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo' }, SV = { 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o' };
  const syl = []; // sillabe in romaji
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { syl.push('*'); continue; }
    if (c === 'ー') { const l = syl[syl.length - 1] || ''; syl.push(l.slice(-1).replace(/[^aiueo]/, '')); continue; }
    let r = KROM[c];
    if (r === undefined) { syl.push(c); continue; }
    if (n && SM[n]) { r = ['shi', 'chi', 'ji'].includes(r) ? r.slice(0, -1) + SM[n][1] : r.slice(0, -1) + SM[n]; i++; }
    else if (n && SV[n] && 'うつてでふしじちゔ'.includes(c)) { r = c === 'う' ? 'w' + SV[n] : r.slice(0, -1) + SV[n]; i++; }
    syl.push(r);
  }
  let out = '';
  for (let i = 0; i < syl.length; i++) {
    const r = syl[i];
    if (r === '*') { const nx = syl[i + 1] || ''; out += nx.startsWith('ch') ? 't' : nx[0] || ''; continue; }
    if (r === 'n' && /^[aiueoy]/.test(syl[i + 1] || '')) { out += "n'"; continue; }
    out += r;
  }
  return out;
}
const rom = k => S.set.showRomaji && k ? `<span class="rom">${esc(toRomaji(k))}</span>` : '';
const toKata = s => String(s).replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const toHira = s => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
// testi di lettura: segmenti separati da "/", toccabili se presenti nel glossario del testo o nel vocabolario
function lookupWord(key, gl) {
  if (gl && gl[key]) return { r: gl[key][0], it: gl[key][1] };
  if (DB.wordIdx[key]) return DB.wordIdx[key];
  const k = DB.byId['k:' + key]; if (k) return { r: (k.kun[0] || k.on[0] || ''), it: k.it };
  return null;
}
function tapHtml(s, gl) {
  return String(s).split('/').map(seg => { if (!seg) return ''; const key = plain(seg); return lookupWord(key, gl) ? `<span class="tw" data-w="${esc(key)}">${rich(seg)}</span>` : rich(seg); }).join('');
}

/* ---------- UI: toast, sheet, confetti, suoni ---------- */
let toastT = 0;
function toast(msg, ic = '') { const t = $('#toast'); t.textContent = (ic ? ic + ' ' : '') + msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function floatXP(n) { const e = document.createElement('div'); e.className = 'xpfloat'; e.textContent = '+' + n + ' XP'; document.body.appendChild(e); setTimeout(() => e.remove(), 1000); }
function sheet(html) {
  const o = $('#overlay'); o.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  o.onclick = e => { if (e.target === o) closeSheet(); };
  return o.firstChild;
}
const closeSheet = () => { $('#overlay').innerHTML = ''; };
let cfRun = 0;
function confetti() {
  const cv = $('#confetti'), cx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#6d5ae6', '#ff6b9d', '#f5a524', '#1fb57a', '#3b82f6', '#d946ef'];
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, c: one(cols), r: Math.random() * 6, vr: (Math.random() - .5) * .4 }));
  const my = ++cfRun; let f = 0;
  (function step() {
    if (my !== cfRun) return;
    cx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); cx.restore(); });
    if (++f < 110) requestAnimationFrame(step); else cx.clearRect(0, 0, cv.width, cv.height);
  })();
}
let actx = null;
function snd(kind) {
  if (!S.set.sounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok: [[660, 0], [880, .09]], ko: [[220, 0], [165, .12]], done: [[523, 0], [659, .1], [784, .2], [1047, .3]] }[kind] || [];
    seq.forEach(([f, t]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(.15, actx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + t + .22); o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .25); });
  } catch (e) { }
}
const CHEER_OK = ['Ottimo!', 'Bravissimo!', 'Perfetto!', 'Esatto!', 'すごい!', 'やった!', 'Grande!'];
const CHEER_KO = ['Quasi!', 'Non ancora…', 'Ci sei quasi', 'Riprovaci!', 'ドンマイ!'];

/* ---------- badge ---------- */
const learnedCount = p => Object.keys(S.srs).filter(k => k.startsWith(p) && S.srs[k].n >= 1).length;
const sumAns = sec => Object.keys(S.stats).filter(k => k.startsWith(sec + ':')).reduce((a, k) => a + S.stats[k].tot, 0);
function kanaCount(script) {
  if (!DB.kana) return { n: 0, t: 1 };
  let n = 0, t = 0;
  for (const g of DB.kana.groups) if (g.id !== 'combo') for (const row of g.rows) for (const [k] of row) { t++; const it = S.items['kana:' + (script === 'kata' ? toKata(k) : k)]; if (it && it.ok >= 2) n++; }
  return { n, t };
}
const BADGES = [
  { id: 'first', e: '🌱', t: 'Primo passo', d: 'Guadagna i primi XP', ok: () => S.xp > 0 },
  { id: 'kh', e: 'あ', t: 'Hiragana!', d: 'Impara 60 hiragana di base', ok: () => kanaCount('hira').n >= 60 },
  { id: 'kk', e: 'ア', t: 'Katakana!', d: 'Impara 60 katakana di base', ok: () => kanaCount('kata').n >= 60 },
  { id: 's3', e: '🔥', t: 'Serie di 3', d: '3 giorni di fila', ok: () => bestStreak() >= 3 },
  { id: 's7', e: '🔥', t: 'Serie di 7', d: '7 giorni di fila', ok: () => bestStreak() >= 7 },
  { id: 's30', e: '🏅', t: 'Serie di 30', d: '30 giorni di fila', ok: () => bestStreak() >= 30 },
  { id: 'k20', e: '漢', t: '20 kanji', d: 'Impara 20 kanji', ok: () => learnedCount('k:') >= 20 },
  { id: 'k100', e: '漢', t: '100 kanji', d: 'Impara 100 kanji', ok: () => learnedCount('k:') >= 100 },
  { id: 'v50', e: '語', t: '50 parole', d: 'Impara 50 parole', ok: () => learnedCount('v:') >= 50 },
  { id: 'v300', e: '語', t: '300 parole', d: 'Impara 300 parole', ok: () => learnedCount('v:') >= 300 },
  { id: 'g10', e: '文', t: '10 strutture', d: 'Studia 10 schede di grammatica', ok: () => Object.keys(S.gram).length >= 10 },
  { id: 'r5', e: '📖', t: 'Lettore', d: 'Leggi 5 testi', ok: () => Object.keys(S.read).length >= 5 },
  { id: 'a30', e: '👂', t: 'Buon orecchio', d: '30 risposte di ascolto', ok: () => sumAns('asc') >= 30 },
  { id: 'perf', e: '💯', t: 'Perfetto!', d: 'Una sessione senza errori', ok: () => !!S.flags.perfect },
  { id: 'xp1k', e: '⭐', t: '1000 XP', d: 'Raggiungi 1000 XP', ok: () => S.xp >= 1000 },
  { id: 'lv10', e: '👑', t: 'Livello 10', d: 'Raggiungi il livello 10', ok: () => xpInfo(S.xp).lvl >= 10 },
  { id: 'exam', e: '📝', t: 'Primo esame', d: 'Completa una simulazione', ok: () => S.exams.length >= 1 },
  { id: 'pass', e: '🏆', t: 'Promosso!', d: 'Supera una simulazione', ok: () => S.exams.some(e => e.pass) }
];
function checkBadges() {
  for (const b of BADGES) if (!S.badges[b.id]) { let ok = false; try { ok = b.ok(); } catch (e) { } if (ok) { S.badges[b.id] = today(); save(); setTimeout(() => { toast(`Nuovo badge: ${b.t}`, b.e); snd('done'); }, 1200); } }
}

/* ---------- backup ---------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: 'michi', version: APP_VERSION, date: new Date().toISOString(), data: S })], { type: 'application/json' });
  const name = `michi-backup-${today()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ files: [file], title: 'Backup Michi' }).catch(() => { }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function importBackup(file, cb) {
  const r = new FileReader();
  r.onload = () => { try { const j = JSON.parse(r.result); const d = j.data || j; if (!d || typeof d.xp !== 'number' || !d.set) throw 0; S = Object.assign(DEF(), d); S.set = Object.assign(DEF().set, d.set); S.meta = Object.assign({ nt: {} }, d.meta || {}); saveNow(); cb(true); } catch (e) { cb(false); } };
  r.readAsText(file);
}
