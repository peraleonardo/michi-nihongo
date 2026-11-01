'use strict';
/* Percorsi guidati N5 → N4 → N3: unità, verifiche per padronanza, checkpoint, esame finale cumulativo.
   Il curriculum è in data/percorso.json (generato da _strumenti/genpercorso.py). */
const PATH = { ok: false, D: null, U: {}, seq: {}, from: null };
const PTH = { unit: 80, cp: 75, bridge: 70, prac: 60, ready: 60, learned: .8, batchK: 8, batchV: 10 }; // soglie in %
const lowerLvs = lv => LEVELS.slice(0, LEVELS.indexOf(lv));
const prevLv = lv => LEVELS[LEVELS.indexOf(lv) - 1];
const PS = () => S.path || (S.path = { u: {}, cp: {}, fin: {}, open: {} });
const PU = id => PS().u[id] || (PS().u[id] = { st: {} }); // scrittura (crea la voce)
const PCP = id => PS().cp[id] || (PS().cp[id] = {});
const PUr = id => PS().u[id] || { st: {} }; // sola lettura
const PCPr = id => PS().cp[id] || {};
const unitNo = u => parseInt(u.id.split('-')[1], 10);
const isKana = u => u.kind === 'kana', isBridge = u => u.kind === 'bridge';
const isContent = u => !isKana(u) && !isBridge(u);

PATH.init = function () {
  const d = DB.percorso; if (!d || !d.levels) return;
  PATH.D = d; PATH.U = {}; PATH.seq = {};
  for (const lv of LEVELS) {
    const L = d.levels[lv]; if (!L) continue;
    const seq = []; let ncp = 0;
    L.units.forEach((u, i) => {
      u.lv = lv; u.i = i; PATH.U[u.id] = u;
      seq.push({ t: 'unit', id: u.id, lv });
      if (u.cp && i < L.units.length - 1) seq.push({ t: 'cp', id: `${lv}-cp${++ncp}`, lv, after: u.id });
    });
    seq.push({ t: 'final', id: lv + '-final', lv });
    PATH.seq[lv] = seq;
  }
  PATH.ok = true;
};
PATH.nodes = lv => PATH.seq[lv] || [];
PATH.node = id => { for (const lv of LEVELS) { const n = PATH.nodes(lv).find(x => x.id === id); if (n) return n; } return null; };
PATH.done = n => n.t === 'unit' ? !!PUr(n.id).pass : n.t === 'cp' ? !!PCPr(n.id).pass : !!(PS().fin[n.lv] || {}).pass;
PATH.levelDone = lv => !!(PS().fin[lv] || {}).pass;
PATH.levelOpen = lv => !prevLv(lv) || !!PS().open[lv] || PATH.levelDone(prevLv(lv));
PATH.curIdx = lv => PATH.nodes(lv).findIndex(n => !PATH.done(n));
PATH.status = n => { // done · cur · open (livello già superato) · lock
  if (PATH.done(n)) return 'done';
  if (!PATH.levelOpen(n.lv)) return 'lock';
  if (PATH.levelDone(n.lv)) return 'open';
  return (PATH.nodes(n.lv)[PATH.curIdx(n.lv)] || {}).id === n.id ? 'cur' : 'lock';
};
PATH.next = function () {
  for (const lv of [S.set.cur, ...LEVELS.filter(l => l !== S.set.cur)]) {
    if (!PATH.nodes(lv).length || !PATH.levelOpen(lv) || PATH.levelDone(lv)) continue;
    const i = PATH.curIdx(lv); if (i >= 0) return PATH.nodes(lv)[i];
  }
  return null;
};
PATH.prog = lv => { const ns = PATH.nodes(lv).filter(n => n.t !== 'final'), d = ns.filter(PATH.done).length; return { d, t: ns.length, p: PATH.levelDone(lv) ? 100 : pct(d, ns.length + 1) }; };
PATH.hrefOf = n => n.t === 'unit' ? '#/p/' + n.id : n.t === 'cp' ? '#/pc/' + n.id : '#/pf/' + n.lv;
PATH.title = n => {
  if (n.t === 'final') return `Esame finale ${LV[n.lv]}`;
  if (n.t === 'cp') return 'Checkpoint ' + (PATH.U[n.after] ? '· dopo «' + PATH.U[n.after].t + '»' : '');
  const u = PATH.U[n.id]; return isBridge(u) ? u.t : `Unità ${unitNo(u)} · ${u.t}`;
};

/* ---------- contenuti di un'unità ---------- */
const kanjiIds = u => [...(u.kanji || '')].map(c => 'k:' + c);
const learnedN = ids => ids.filter(id => S.srs[id] && S.srs[id].n >= 1).length;
const needN = n => Math.max(1, Math.ceil(n * PTH.learned));
const gramOf = u => (u.gram || []).map(id => DB.byId['g:' + id]).filter(Boolean);
const textsOf = u => (u.tx || []).map(id => DB.byId[id]).filter(Boolean);
const dialogsOf = u => (u.dl || []).map(id => DB.byId[id]).filter(Boolean);
const readDone = u => [...textsOf(u), ...dialogsOf(u)].every(x => S.read[x.id]);

function unitSteps(u) {
  const st = PUr(u.id).st, out = [];
  if (isKana(u)) {
    out.push({ k: 'tab', c: 'kana', ic: 'あ', t: 'Tabella, suono e tratti', d: `Osserva i ${u.kana.c.length} segni, ascoltali e guarda l’ordine dei tratti`, done: !!st.tab });
    out.push({ k: 'prac', c: 'kana', ic: '練', t: 'Allenamento', d: 'Leggi, riconosci, ascolta (serve almeno il 60%)', done: !!st.prac });
    return out;
  }
  if (isBridge(u)) {
    out.push({ k: 'prac', c: 'ex', ic: '練', t: 'Ripasso mirato', d: 'Domande dai livelli precedenti, scelte in base ai tuoi errori', done: !!st.prac });
    return out;
  }
  const kids = kanjiIds(u);
  if (kids.length) { const l = learnedN(kids); out.push({ k: 'kanji', c: 'kanji', ic: '漢', t: `Kanji · ${kids.length} nuovi`, d: `${l}/${kids.length} imparati · a gruppi di ${PTH.batchK}`, p: l / kids.length, done: l >= needN(kids.length) }); }
  if (u.vocab.length) { const l = learnedN(u.vocab); out.push({ k: 'vocab', c: 'vocab', ic: '語', t: `Parole · ${u.vocab.length}`, d: `${l}/${u.vocab.length} imparate · a gruppi di ${PTH.batchV}`, p: l / u.vocab.length, done: l >= needN(u.vocab.length) }); }
  const gs = gramOf(u); if (gs.length) { const l = gs.filter(g => S.gram[g.id]).length; out.push({ k: 'gram', c: 'gram', ic: '文', t: `Grammatica · ${gs.length} ${gs.length === 1 ? 'scheda' : 'schede'}`, d: `${l}/${gs.length} studiate`, p: l / gs.length, done: l === gs.length }); }
  const rs = [...textsOf(u), ...dialogsOf(u)];
  if (rs.length) { const l = rs.filter(x => S.read[x.id]).length; out.push({ k: 'read', c: 'read', ic: '読', t: 'Leggi e ascolta', d: `${textsOf(u).length} testi · ${dialogsOf(u).length} dialoghi · ${l}/${rs.length} completati`, p: l / rs.length, done: l === rs.length }); }
  out.push({ k: 'prac', c: 'ex', ic: '練', t: 'Pratica guidata', d: '12–14 domande con spiegazione (serve almeno il 60%)', done: !!st.prac });
  return out;
}

/* ---------- generatori di domande ---------- */
const kObj = id => DB.byId[id.startsWith('k:') ? id : 'k:' + id];
const koOf = id => (S.items[id] || {}).ko || 0;
function pickWeak(list, n, idf) { // gli elementi su cui hai sbagliato hanno la precedenza (con un po' di casualità)
  if (n <= 0 || !list.length) return [];
  return list.map(x => ({ x, s: (koOf(idf(x)) > 0 ? 2 : 0) + Math.random() })).sort((a, b) => b.s - a.s).slice(0, n).map(o => o.x);
}
function itKanjiMeaning(k) {
  const pool = DB.kanji[k.lv] || [];
  return { ty: 'kan', sec: 'kanji', lv: k.lv, sid: k.id, q: `Che cosa significa il kanji 「${k.k}」?`, o: [k.it, ...pick(pool.filter(x => x.it !== k.it), 3).map(x => x.it)], a: 0, e: `${k.k}: ${k.it}. On: ${(k.on || []).join('・') || '–'} · Kun: ${(k.kun || []).join('・') || '–'}` };
}
function itKanjiRead(k) {
  const ex = (k.w || []).filter(x => KANJI_RE.test(x[0])); if (!ex.length) return null;
  const x = one(ex), w = { w: x[0], r: x[1], it: x[2] }, pool = wordsOf(jlevels(k.lv));
  return { ty: 'kan', sec: 'kanji', lv: k.lv, sid: k.id, q: `「${w.w}」の読みかたは？`, o: [w.r, ...distract(pool, w, 'r', 3, true)], a: 0, e: `${w.w} = ${w.r}（${w.it}）`, say: { t: w.r } };
}
function itVocab(e, kind) {
  const w = { w: e.w, r: e.r || e.w, it: e.it }, pool = wordsOf(jlevels(e.lv));
  kind = kind || one(e.ex ? ['mean', 'rev', 'fill', 'fill'] : ['mean', 'rev']);
  if (kind === 'fill') {
    const q = blankWord(e.ex || '', e.w);
    const same = jlevels(e.lv).flatMap(l => DB.vocab[l] || []).filter(x => x.w !== e.w && (x.p || '') === (e.p || ''));
    if (q && same.length >= 3) return { ty: 'cloze', sec: 'vocab', lv: e.lv, sid: e.id, q, qi: e.et, o: [e.w, ...pick(same, 3).map(x => x.w)], a: 0, e: `${e.w}（${w.r}）= ${e.it}` };
    kind = 'mean';
  }
  if (kind === 'rev') return { ty: 'voc', sec: 'vocab', lv: e.lv, sid: e.id, q: `Come si dice 「${e.it}」?`, o: [e.w, ...distract(pool, w, 'w', 3)], a: 0, e: `${e.it} = ${e.w}（${w.r}）` };
  return { ty: 'voc', sec: 'vocab', lv: e.lv, sid: e.id, qh: `<span class="jp-big">${wr(e.w, w.r)}</span>`, q: 'Che cosa significa?', o: [e.it, ...distract(pool, w, 'it', 3)], a: 0, e: `${e.w}（${w.r}）= ${e.it}`, say: { t: w.r } };
}
let _kt = null;
function kanaTable() {
  if (_kt) return _kt; const h = {}, k = {};
  DB.kana.groups.forEach(g => g.rows.flat().forEach(([c, r]) => { h[c] = r; k[toKata(c)] = r; }));
  (DB.kana.kataExtra || []).forEach(([c, r]) => { k[c] = r; });
  return _kt = { hira: h, kata: k };
}
function kanaItems(chars, script, n) {
  const T = kanaTable()[script], all = Object.entries(T);
  return pickWeak(chars, n, c => 'kana:' + c).filter(c => T[c]).map(k => {
    const ro = T[k], len = [...k].length;
    let ds = pick(all.filter(x => x[0] !== k && x[1] !== ro && [...x[0]].length === len), 3);
    if (ds.length < 3) ds = pick(all.filter(x => x[0] !== k && x[1] !== ro), 3);
    const m = one(['k2r', 'r2k', 'listen']), base = { sec: 'kana', lv: 'n5', sid: 'kana:' + k, ty: 'kana' };
    if (m === 'k2r') return { ...base, qh: `<div class="kanji-big c">${k}</div>`, q: 'Come si legge?', o: [ro, ...ds.map(x => x[1])], a: 0, e: `${k} = ${ro}` };
    if (m === 'r2k') return { ...base, qh: `<div class="kanji-big c" style="font-family:var(--ui);font-size:64px">${ro}</div>`, q: 'Quale kana è?', o: [k, ...ds.map(x => x[0])], a: 0, e: `${ro} = ${k}` };
    return { ...base, q: 'Che suono hai sentito?', au: kanaSpec(k), o: [k, ...ds.map(x => x[0])], a: 0, e: `${k} = ${ro}`, tr: k };
  });
}
const kanaOfUnits = us => us.filter(isKana).flatMap(u => u.kana.c.map(c => [c, u.kana.s]));
function kanaMix(us, n) { // domande su kana di più unità, divise per alfabeto
  if (n <= 0) return [];
  const all = kanaOfUnits(us), out = [];
  for (const s of ['hira', 'kata']) { const cs = [...new Set(all.filter(x => x[1] === s).map(x => x[0]))]; if (cs.length) out.push(...kanaItems(cs, s, Math.max(1, Math.round(n * cs.length / (all.length || 1))))); }
  return out;
}

/* campiona domande dai contenuti di un insieme di unità; c = {k,v,g,r,l} quante per tipo */
function sampleUnits(us, c) {
  us = us.filter(isContent); const out = [];
  const ks = us.flatMap(kanjiIds).map(kObj).filter(Boolean), vs = us.flatMap(u => u.vocab).map(id => DB.byId[id]).filter(Boolean);
  const gids = new Set(us.flatMap(u => u.gram));
  const bank = [...new Set(us.map(u => u.lv))].flatMap(l => Q.bank(l)).filter(e => e.gid && gids.has(e.gid));
  const rq = us.flatMap(u => textsOf(u)).flatMap(t => (t.q || []).map(q => ({ ...q, ty: 'read', sec: 'read', lv: t.lv, sid: t.id, ctx: t.id })));
  const dids = new Set(us.flatMap(u => u.dl)), lis = dids.size ? [...new Set(us.map(u => u.lv))].flatMap(l => Q.listenSet(l, 99)).filter(x => dids.has(x.sid)) : [];
  pickWeak(ks, c.k || 0, k => k.id).forEach((k, i) => { const it = (i % 2 === 0 && itKanjiRead(k)) || itKanjiMeaning(k); out.push(it); });
  pickWeak(vs, c.v || 0, e => e.id).forEach(e => out.push(itVocab(e)));
  pickWeak(bank, c.g || 0, e => e.sid).forEach(e => out.push(e));
  pick(rq, c.r || 0).forEach(e => out.push(e));
  pick(lis, c.l || 0).forEach(e => out.push(e));
  return out;
}
const priorUnits = u => { // tutto ciò che hai già visto prima di u: unità precedenti dello stesso livello + livelli inferiori
  const same = PATH.D.levels[u.lv].units.filter(x => x.i < u.i && isContent(x)), low = lowerLvs(u.lv).flatMap(l => PATH.D.levels[l].units);
  return { same, low };
};
function reviewItems(u, n) { // ripasso a spirale: metà dai livelli inferiori (se ci sono), il resto dalle unità precedenti
  const { same, low } = priorUnits(u), lowC = low.filter(isContent);
  let nl = lowC.length && same.length ? Math.round(n / 2) : lowC.length ? n : 0, ns = same.length ? n - nl : 0;
  const mk = k => ({ k: Math.round(k * .25), v: Math.round(k * .4), g: k - Math.round(k * .25) - Math.round(k * .4) });
  let out = [...(ns ? sampleUnits(same, mk(ns)) : []), ...(nl ? sampleUnits(lowC, mk(nl)) : [])];
  if (u.lv === 'n5') out = out.concat(kanaMix(PATH.D.levels.n5.units, out.length ? 2 : n)); // N5: i kana tornano sempre un po'
  return out;
}
const uniq = items => { const s = new Set(); return items.filter(it => { const k = (it.sid || '') + '|' + (it.q || '') + '|' + (it.pass || ''); if (s.has(k)) return false; s.add(k); return true; }); };

function unitItems(u, kind) {
  if (isKana(u)) {
    const prior = PATH.D.levels.n5.units.filter(x => isKana(x) && x.i < u.i);
    const n = kind === 'quiz' ? 16 : 12, nr = kind === 'quiz' && prior.length ? 4 : 0;
    return shuffle([...kanaItems(u.kana.c, u.kana.s, n - nr), ...(nr ? kanaMix(prior, nr) : [])]);
  }
  if (isBridge(u)) {
    const low = lowerLvs(u.lv).flatMap(l => PATH.D.levels[l].units);
    const n = kind === 'quiz' ? 1 : .75, r = x => Math.round(x * n);
    let out = sampleUnits(low, { k: r(4), v: r(6), g: r(6), r: r(2), l: r(2) });
    if (u.lv === 'n4') out.push(...kanaMix(low, kind === 'quiz' ? 2 : 0));
    return shuffle(uniq(out));
  }
  const quiz = kind === 'quiz', c = quiz ? { k: 3, v: 4, g: 5, r: 2, l: 1 } : { k: 3, v: 4, g: 4, r: 1, l: 1 };
  if (!kanjiIds(u).length) { c.v += 2; c.g += 1; c.k = 0; }
  let out = sampleUnits([u], c);
  const want = quiz ? 16 : 12, rev = quiz ? 4 : 2;
  out = out.concat(reviewItems(u, rev));
  for (let r = 0; r < 3 && uniq(out).length < want; r++) out = out.concat(sampleUnits([u], { v: 2, g: 2, k: 1 }));
  return shuffle(uniq(out)).slice(0, quiz ? 20 : 14);
}
function cpItems(n) {
  const lvUnits = PATH.D.levels[n.lv].units, after = PATH.U[n.after], us = lvUnits.filter(u => u.i <= after.i);
  if (isKana(after)) return shuffle(kanaMix(us, 24));
  const cont = us.filter(isContent), low = lowerLvs(n.lv).flatMap(l => PATH.D.levels[l].units).filter(isContent);
  let out = sampleUnits(cont, { k: 5, v: 7, g: 8, r: 2, l: 2 });
  if (low.length) out = out.concat(sampleUnits(low, { k: 2, v: 3, g: 3 }));
  if (n.lv === 'n5') out = out.concat(kanaMix(lvUnits, 3));
  return shuffle(uniq(out));
}

/* ---------- avvio dei passi ---------- */
const NEXTHINT = { n5: 'N4', n4: 'N3' };
function afterPass(first, pct, min, label, xp, nextN) {
  if (pct >= min) {
    if (first) { addXP(xp, true); confetti(); snd('done'); }
    return `<div class="card" style="background:var(--okbg);text-align:left"><b>✅ ${label} superata${first ? '' : ' (di nuovo)'}!</b><div class="small">${first ? `+${xp} XP. ` : ''}${nextN ? 'Si sblocca: <b>' + esc(nextN) + '</b>.' : 'Hai completato questa tappa del percorso.'}</div></div>`;
  }
  return `<div class="card" style="background:var(--kobg);text-align:left"><b>Ancora un passo</b><div class="small">Per superare servono almeno <b>${min}%</b> (hai fatto ${pct}%). Ripassa gli errori qui sotto e riprova: le domande cambiano a ogni tentativo.</div></div>`;
}
function nextTitle(n) { const lv = n.lv, ns = PATH.nodes(lv), i = ns.findIndex(x => x.id === n.id), nx = ns[i + 1]; if (nx) return PATH.title(nx); const l2 = LEVELS[LEVELS.indexOf(lv) + 1]; return l2 ? 'livello ' + LV[l2] : ''; }
PATH.runQuiz = function (u) {
  const node = { t: 'unit', id: u.id, lv: u.lv }, back = '#/p/' + u.id, min = isBridge(u) ? PTH.bridge : PTH.unit;
  const items = unitItems(u, 'quiz'); if (!items.length) { toast('Nessuna domanda disponibile per questa unità', '⚠️'); return nav(back); }
  Q.run(items, { back, level: u.lv, onDone: () => nav(back), onResult: r => {
    const p = PU(u.id), first = !p.pass && r.pct >= min; p.n = (p.n || 0) + 1; p.last = r.pct; p.best = Math.max(p.best || 0, r.pct); p.date = today();
    if (first) p.pass = today(); save();
    return afterPass(first, r.pct, min, isBridge(u) ? 'Ripasso' : 'Unità', isBridge(u) ? 40 : 50, nextTitle(node));
  } });
};
PATH.runCP = function (n) {
  const back = '#/pc/' + n.id, items = cpItems(n); if (!items.length) { toast('Nessuna domanda disponibile', '⚠️'); return nav(back); }
  Q.run(items, { back, level: n.lv, onDone: () => nav(back), onResult: r => {
    const p = PCP(n.id), first = !p.pass && r.pct >= PTH.cp; p.n = (p.n || 0) + 1; p.last = r.pct; p.best = Math.max(p.best || 0, r.pct); p.date = today();
    if (first) p.pass = today(); save();
    return afterPass(first, r.pct, PTH.cp, 'Checkpoint', 80, nextTitle(n));
  } });
};
PATH.runPrac = function (u) {
  const back = '#/p/' + u.id, items = unitItems(u, 'prac'); if (!items.length) { toast('Nessun esercizio disponibile', '⚠️'); return nav(back); }
  Q.run(items, { back, level: u.lv, onDone: () => nav(back), onResult: r => {
    const p = PU(u.id); let h = '';
    if (r.pct >= PTH.prac) { if (!p.st.prac) { p.st.prac = today(); addXP(15, true); } save(); h = `<div class="card" style="background:var(--okbg);text-align:left"><b>✅ Pratica completata</b><div class="small">Quando ti senti pronto, passa alla verifica dell’unità.</div></div>`; }
    else h = `<div class="card" style="background:var(--kobg);text-align:left"><b>Rifai la pratica</b><div class="small">Serve almeno il ${PTH.prac}% per segnarla come completata (hai fatto ${r.pct}%). Rivedi i kanji, le parole e le schede di grammatica, poi riprova.</div></div>`;
    return h;
  } });
};
PATH.srsStep = function (u, k) {
  const all = k === 'kanji' ? kanjiIds(u) : u.vocab, back = '#/p/' + u.id, batch = k === 'kanji' ? PTH.batchK : PTH.batchV;
  const due = all.filter(isDue), nw = all.filter(id => !S.srs[id]).slice(0, batch);
  V.srs('set', u.lv, false, { ids: [...due, ...nw], back, self: `#/p/${u.id}/${k}`, more: () => all.some(id => !S.srs[id]) });
};
PATH.go = function (uid, step) {
  const u = PATH.U[uid]; if (!u) return nav('#/path');
  const st = PATH.status({ t: 'unit', id: uid, lv: u.lv });
  if (st === 'lock') return location.replace('#/p/' + uid);
  if (step === 'tab') { PU(uid).st.tab = today(); save(); return location.replace('#/kana/' + u.kana.s); }
  if (step === 'kanji' || step === 'vocab') return PATH.srsStep(u, step);
  if (step === 'gram' || step === 'read') return V.pList(u, step);
  if (step === 'prac') return PATH.runPrac(u);
  if (step === 'quiz') return PATH.runQuiz(u);
  nav('#/p/' + uid);
};

/* ---------- schermate ---------- */
const nodeIc = (n, s) => s === 'done' ? '✓' : s === 'lock' ? '🔒' : n.t === 'final' ? '試' : n.t === 'cp' ? '★' : isKana(PATH.U[n.id]) ? 'あ' : isBridge(PATH.U[n.id]) ? '⇄' : unitNo(PATH.U[n.id]);
function nodeSub(n) {
  if (n.t === 'final') { const f = PS().fin[n.lv]; return f ? (f.pass ? `Superato ✓ · miglior punteggio ${f.best}/180` : `Miglior punteggio ${f.best}/180 · ${f.n} ${f.n === 1 ? 'tentativo' : 'tentativi'}`) : 'Simulazione completa con timer · ' + (n.lv === 'n5' ? 'tutto N5' : n.lv === 'n4' ? 'N5 + N4' : 'N5 + N4 + N3'); }
  if (n.t === 'cp') { const p = PCPr(n.id); return p.best != null ? `Miglior risultato ${p.best}%` : 'Circa 30 domande sul percorso fatto finora'; }
  const u = PATH.U[n.id], p = PUr(n.id);
  if (isKana(u)) return `${u.sub} · ${u.kana.c.length} segni` + (p.best != null ? ` · ${p.best}%` : '');
  if (isBridge(u)) return 'Ripasso dei livelli precedenti' + (p.best != null ? ` · ${p.best}%` : '');
  const parts = [kanjiIds(u).length ? `${kanjiIds(u).length} kanji` : '', `${u.vocab.length} parole`, `${u.gram.length} gram.`].filter(Boolean);
  return parts.join(' · ') + (p.best != null ? ` · verifica ${p.best}%` : '');
}
function nodeRow(n) {
  const s = PATH.status(n), pr = n.t === 'unit' ? (() => { const sts = unitSteps(PATH.U[n.id]); return sts.length ? Math.round(sts.filter(x => x.done).length / sts.length * 100) : 0; })() : 0;
  return `<a class="pnode ${s} ${n.t}" href="${PATH.hrefOf(n)}"><div class="pn-n ${n.t === 'unit' && !isKana(PATH.U[n.id]) && !isBridge(PATH.U[n.id]) ? 'num' : ''}">${nodeIc(n, s)}</div><div style="flex:1;min-width:0"><div class="t jp">${rich(PATH.title(n))}</div><div class="d">${esc(nodeSub(n))}</div>${s === 'cur' && n.t === 'unit' && pr > 0 ? bar(pr, 'var(--lc)') : ''}</div>${s === 'cur' ? '<span class="tag cur">Qui</span>' : '<span class="go">›</span>'}</a>`;
}
PATH.methodSheet = function () {
  sheet(`<h2>Il metodo 🧭</h2>
  <div class="mtd"><b>1 · Poco e bene.</b> Ogni unità ha pochi kanji, parole e strutture nuove, sempre a piccoli gruppi.</div>
  <div class="mtd"><b>2 · Ripetizione a intervalli.</b> Le carte tornano appena prima che le dimentichi: il ripasso del giorno va fatto <i>prima</i> dei contenuti nuovi.</div>
  <div class="mtd"><b>3 · Dal contesto.</b> Imparo → applico: kanji dentro le parole, grammatica con esempi, poi testi e dialoghi dell’unità.</div>
  <div class="mtd"><b>4 · Si avanza per padronanza.</b> L’unità successiva si apre quando superi la verifica (≥ ${PTH.unit}%). Sbagliare è utile: gli errori tornano nelle verifiche.</div>
  <div class="mtd"><b>5 · Ripasso a spirale.</b> Ogni verifica contiene domande dalle unità precedenti. N4 include tutto N5; N3 include N5 e N4.</div>
  <div class="mtd"><b>6 · Checkpoint.</b> Ogni 4 unità un test cumulativo (≥ ${PTH.cp}%) per consolidare prima di proseguire.</div>
  <div class="mtd"><b>7 · Esame finale.</b> Una simulazione completa in 4 parti con timer. Per superare il livello servono i punteggi minimi JLPT <i>e</i> almeno il ${PTH.ready}% di risposte corrette.</div>
  <div class="mtd"><b>Ritmo consigliato.</b> 30–40 minuti al giorno, circa un’unità a settimana. Meglio poco ogni giorno che tanto una volta sola.</div>
  <button class="btn primary" id="mtdok" style="margin-top:12px">Ho capito</button>`);
  $('#mtdok').onclick = closeSheet;
};
V.path = function (lvArg) {
  if (!PATH.ok) { view().innerHTML = `<div class="page">${empty('Percorso non disponibile', 'Manca il file data/percorso.json.')}</div>`; return; }
  const nx = PATH.next(), lv = lvArg || (nx ? nx.lv : S.set.cur);
  if (lv !== S.set.cur) setLv(lv);
  const L = PATH.D.levels[lv], open = PATH.levelOpen(lv), pg = PATH.prog(lv), ns = PATH.nodes(lv), fin = PS().fin[lv];
  const cont = L.units.filter(isContent), tk = cont.reduce((a, u) => a + kanjiIds(u).length, 0), tv = cont.reduce((a, u) => a + u.vocab.length, 0), tg = cont.reduce((a, u) => a + u.gram.length, 0);
  view().innerHTML = `<div class="page lv-${lv}"><div class="row"><h1 style="flex:1">Percorso 🧭</h1><button class="btn sm" id="mtd">Il metodo</button></div>
  <p class="mut">Un cammino guidato dall’alfabeto all’esame. Segui le unità in ordine: ognuna finisce con una verifica.</p>
  <div class="chips">${LEVELS.map(l => `<a class="chip ${l === lv ? 'on' : ''}" data-lv="${l}" href="#/path/${l}">${LV[l]} ${PATH.levelDone(l) ? '✓' : PATH.levelOpen(l) ? '' : '🔒'}</a>`).join('')}</div>
  ${nx && lv !== nx.lv ? `<a class="item" href="${PATH.hrefOf(nx)}"><div class="ico s-exam">▶</div><div style="flex:1"><div class="t">Continua da dove eri</div><div class="d">${LV[nx.lv]} · ${esc(plain(PATH.title(nx)))}</div></div><span class="go">›</span></a>` : ''}
  <div class="card row"><div class="ring" style="--p:${pg.p};--rc:var(--lc)"><b>${pg.p}%</b></div><div style="flex:1"><div class="b">${esc(L.t)}</div><div class="small mut">${esc(L.intro)}</div><div class="tiny mut" style="margin-top:4px">${pg.d}/${pg.t} tappe superate · ${tk ? tk + ' kanji · ' : ''}${tv} parole · ${tg} schede di grammatica${lv !== 'n5' ? ' (+ ripasso dei livelli precedenti)' : ''}</div></div></div>
  ${open ? '' : `<div class="card" style="background:var(--bg2)"><b>🔒 Livello bloccato</b><p class="small">Per aprire ${LV[lv]} supera l’<b>esame finale ${LV[prevLv(lv)]}</b>. Se conosci già ${LV[prevLv(lv)]}, puoi provarlo subito come test d’ingresso.</p><div class="grid2"><a class="btn primary" href="#/pf/${prevLv(lv)}">Vai all’esame ${LV[prevLv(lv)]}</a><button class="btn ghost" id="unl">Sblocca comunque</button></div></div>` }
  <div class="sec-t"><h2>Tappe</h2><span class="small mut">${pg.d}/${pg.t}</span></div>
  ${ns.map(nodeRow).join('')}
  ${fin && fin.pass ? `<div class="card c" style="background:var(--okbg)"><div style="font-size:42px">🏆</div><b>${LV[lv]} superato il ${fmtDate(fin.date)}!</b><div class="small mut">Miglior punteggio ${fin.best}/180</div></div>` : ''}
  <div class="sec-t"><h2>Altro</h2></div>
  <a class="item" href="#/plan"><div class="ico s-exam">🗓️</div><div style="flex:1"><div class="t">Piano settimanale</div><div class="d">Obiettivi a calendario fino all’esame</div></div><span class="go">›</span></a>
  <button class="btn ghost" id="prst" style="margin-top:12px;color:var(--ko)">Azzera i progressi del percorso</button></div>`;
  $('#mtd').onclick = PATH.methodSheet;
  if ($('#unl')) $('#unl').onclick = () => { sheet(`<h2>Sbloccare ${LV[lv]}?</h2><p class="mut">Il percorso ${LV[lv]} presuppone di conoscere ${LV[prevLv(lv)]}. Se non sei sicuro, fai prima l’esame finale ${LV[prevLv(lv)]}: è il modo più affidabile per saperlo.</p><div class="grid2" style="margin-top:14px"><button class="btn" id="n">Annulla</button><button class="btn primary" id="y">Sblocca</button></div>`); $('#n').onclick = closeSheet; $('#y').onclick = () => { PS().open[lv] = today(); save(); closeSheet(); V.path(lv); }; };
  $('#prst').onclick = () => { sheet(`<h2>Azzerare il percorso?</h2><p class="mut">Cancella superamenti, punteggi di verifica ed esami finali del percorso. Kanji, parole e statistiche restano.</p><div class="grid2" style="margin-top:14px"><button class="btn" id="n">Annulla</button><button class="btn ko" id="y">Azzera</button></div>`); $('#n').onclick = closeSheet; $('#y').onclick = () => { S.path = { u: {}, cp: {}, fin: {}, open: {} }; save(); closeSheet(); V.path(lv); }; };
};

function lockCard(n) {
  const lv = n.lv, ns = PATH.nodes(lv), ci = PATH.curIdx(lv), cur = ci >= 0 ? ns[ci] : null;
  if (!PATH.levelOpen(lv)) return `<div class="card" style="background:var(--bg2)"><b>🔒 ${LV[lv]} è bloccato</b><p class="small">Supera prima l’esame finale ${LV[prevLv(lv)]}.</p><a class="btn" href="#/path/${lv}">Torna al percorso</a></div>`;
  return `<div class="card" style="background:var(--bg2)"><b>🔒 Non ancora</b><p class="small">Questa tappa si apre dopo aver superato${cur ? ': <b>' + esc(plain(PATH.title(cur))) + '</b>' : ' le precedenti'}.</p>${cur ? `<a class="btn primary" href="${PATH.hrefOf(cur)}">Vai alla tappa attuale</a>` : ''}</div>`;
}
V.unit = function (id) {
  const u = PATH.U[id]; if (!u) { view().innerHTML = `<div class="page">${empty('Unità non trovata', '')}</div>`; return; }
  const n = { t: 'unit', id, lv: u.lv }, s = PATH.status(n), lock = s === 'lock', steps = unitSteps(u), p = PUr(id), nextI = steps.findIndex(x => !x.done), allDone = nextI < 0;
  const warmDue = totalDue(), min = isBridge(u) ? PTH.bridge : PTH.unit;
  const ks = [...(u.kanji || '')], gs = gramOf(u);
  view().innerHTML = `<div class="page lv-${u.lv}">${back('#/path/' + u.lv, 'Percorso ' + LV[u.lv])}
  <div class="hero"><div class="small">${LV[u.lv]} · ${isBridge(u) ? 'Ponte' : 'Unità ' + unitNo(u)}${u.sub ? ' · ' + esc(u.sub) : ''}</div><h1 style="font-size:26px;margin:4px 0 8px" class="jp">${esc(u.t)}</h1><div style="font-size:15px;opacity:.95">🎯 ${esc(u.goal)}</div>${p.best != null ? `<div class="tiny" style="margin-top:8px;opacity:.9">Verifica: miglior risultato ${p.best}% ${p.pass ? '· superata ✓' : ''}</div>` : ''}</div>
  ${lock ? lockCard(n) : ''}
  ${!lock && !isBridge(u) && warmDue > 0 ? `<a class="item" href="#/srs/all/all"><div class="ico s-ex">🔁</div><div style="flex:1"><div class="t">Prima, il ripasso del giorno</div><div class="d">${warmDue} carte in scadenza · 5 minuti, poi i contenuti nuovi</div></div><span class="go">›</span></a>` : ''}
  <div class="sec-t"><h2>${isBridge(u) ? 'Ripasso' : 'Lezione'}</h2><span class="small mut">${steps.filter(x => x.done).length}/${steps.length}</span></div>
  ${steps.map((x, i) => lock ? `<div class="item dim"><div class="ico s-${x.c}">${x.ic}</div><div style="flex:1;min-width:0"><div class="t">${x.t}</div><div class="d">${esc(x.d)}</div></div><div class="done-mark"></div></div>` : `<a class="item ${i === nextI ? 'cur' : ''}" href="#/p/${id}/${x.k}" ${x.k === 'gram' || x.k === 'read' ? `data-pfrom="#/p/${id}"` : ''}><div class="ico s-${x.c}">${x.ic}</div><div style="flex:1;min-width:0"><div class="t">${x.t}</div><div class="d">${esc(x.d)}</div>${x.p != null ? bar(Math.round(x.p * 100), `var(--s-${x.c})`) : ''}</div><div class="done-mark ${x.done ? 'on' : ''}">${x.done ? '✓' : ''}</div></a>`).join('')}
  <div class="sec-t"><h2>Verifica ${p.pass ? '✓' : ''}</h2></div>
  <div class="card ${allDone && !lock ? '' : 'flat'}"><div class="b">${isBridge(u) ? 'Test di ripasso' : 'Verifica dell’unità'}</div><p class="small mut">${isKana(u) ? '16 domande sui segni di questa unità e dei precedenti' : isBridge(u) ? '20 domande su ciò che hai già studiato, scelte in base ai tuoi errori' : '16–20 domande su kanji, parole, grammatica e lettura di questa unità, più il ripasso delle precedenti'}. Per passare servono almeno <b>${min}%</b>. ${allDone ? 'Hai finito la lezione: sei pronto!' : 'Puoi farla anche subito: se la superi salti avanti.'}</p>
  <button class="btn ${allDone && !lock ? 'primary' : ''}" id="pq" ${lock ? 'disabled' : ''}>${p.pass ? 'Rifai la verifica' : 'Inizia la verifica'}</button></div>
  ${!isKana(u) && !isBridge(u) ? `<div class="sec-t"><h2>In questa unità</h2></div><div class="card flat">
    ${ks.length ? `<div class="small mut" style="margin-bottom:6px">Kanji</div><div class="chips">${ks.map(c => `<button class="chip jp kj" data-k="${c}">${c}</button>`).join('')}</div>` : ''}
    ${gs.length ? `<div class="small mut" style="margin:10px 0 6px">Grammatica</div><div class="chips">${gs.map(g => `<a class="chip jp" href="#/g/${g.id}" data-pfrom="#/p/${id}">${rich(g.t)}</a>`).join('')}</div>` : ''}</div>` : ''}
  <div class="card flat tip"><b>💡 Consiglio del sensei</b><p class="small" style="margin:4px 0 0">${isKana(u) ? 'Scrivi ogni segno a mano seguendo l’ordine dei tratti e dillo ad alta voce. 10 minuti al giorno valgono più di un’ora una volta sola.' : isBridge(u) ? 'Non saltare questo ripasso: le basi solide rendono il livello nuovo molto più facile.' : 'Prima il ripasso del giorno, poi un gruppo di kanji, poi le parole. Leggi le frasi d’esempio ad alta voce: la grammatica si impara dagli esempi, non dalle regole.'}</p></div></div>`;
  if (!lock) $('#pq').onclick = () => nav(`#/p/${id}/quiz`);
  $$('.kj').forEach(b => b.onclick = () => kanjiSheet(b.dataset.k));
};
V.pList = function (u, which) {
  const back_ = '#/p/' + u.id, pf = ` data-pfrom="${back_}"`;
  let body = '';
  if (which === 'gram') body = gramOf(u).map(g => { const s = S.items['g:' + g.id], acc = s && s.ok + s.ko ? Math.round(s.ok / (s.ok + s.ko) * 100) : null; return `<a class="item" href="#/g/${g.id}"${pf}><div class="done-mark ${S.gram[g.id] ? 'on' : ''}">${S.gram[g.id] ? '✓' : ''}</div><div style="flex:1;min-width:0"><div class="t jp">${rich(g.t)}</div><div class="d">${esc(g.s)}</div></div>${acc !== null ? `<span class="tag">${acc}%</span>` : ''}<span class="go">›</span></a>`; }).join('');
  else body = [...textsOf(u).map(t => ({ href: '#/t/' + t.id, ic: { annuncio: '📢', email: '✉️', dialogo: '💬', brano: '📖', avviso: '📌' }[t.tipo] || '📖', c: 'read', t: t.t, d: `${t.tipo || 'testo'} · ${(t.q || []).length} domande`, id: t.id })), ...dialogsOf(u).map(d => ({ href: '#/d/' + d.id, ic: '💬', c: 'asc', t: d.t, d: `dialogo · ${d.righe.length} battute${d.q ? ' · ' + d.q.length + ' domande' : ''}`, id: d.id }))]
    .map(x => `<a class="item" href="${x.href}"${pf}><div class="ico s-${x.c}">${x.ic}</div><div style="flex:1;min-width:0"><div class="t jp">${rich(x.t)}</div><div class="d">${esc(x.d)}</div></div>${S.read[x.id] ? '<span class="tag">✓</span>' : ''}<span class="go">›</span></a>`).join('');
  const tip = which === 'gram' ? 'Per ogni scheda: leggi la regola, ascolta gli esempi, fai gli esercizi, poi tocca «Segna come studiata».' : 'Leggi prima senza traduzione, poi controlla. Rispondi alle domande per segnare il testo come completato.';
  view().innerHTML = `<div class="page lv-${u.lv}">${back(back_, esc(u.t))}<h1>${which === 'gram' ? 'Grammatica 文' : 'Leggi e ascolta 読'}</h1><p class="mut">${tip}</p>${body}<a class="btn" href="${back_}" style="margin-top:14px">Torna all’unità</a></div>`;
};
V.checkpoint = function (id) {
  const n = PATH.node(id); if (!n) { view().innerHTML = `<div class="page">${empty('Checkpoint non trovato', '')}</div>`; return; }
  const s = PATH.status(n), p = PCPr(id), after = PATH.U[n.after], lock = s === 'lock';
  view().innerHTML = `<div class="page lv-${n.lv}">${back('#/path/' + n.lv, 'Percorso ' + LV[n.lv])}
  <div class="hero"><div class="small">${LV[n.lv]} · Checkpoint</div><h1 style="font-size:26px;margin:4px 0 8px">★ Fai il punto</h1><div style="font-size:15px;opacity:.95">🎯 Verifica cumulativa su tutto ciò che hai fatto fino a «${esc(plain(after.t))}»${n.lv !== 'n5' ? ', più un po’ di livelli precedenti' : ''}.</div></div>
  ${lock ? lockCard(n) : ''}
  <div class="card"><p class="small mut">Circa 30 domande miste: kanji, parole, grammatica, lettura e ascolto. Per superare servono almeno <b>${PTH.cp}%</b>. Se non ci riesci, nessun problema: ripassa gli errori e riprova.</p>${p.best != null ? `<div class="small">Miglior risultato: <b>${p.best}%</b> · tentativi: ${p.n}</div>` : ''}<button class="btn primary" id="cpgo" style="margin-top:10px" ${lock ? 'disabled' : ''}>${p.pass ? 'Rifai il checkpoint' : 'Inizia'}</button></div></div>`;
  if (!lock) $('#cpgo').onclick = () => PATH.runCP(n);
};

/* ---------- esame finale ---------- */
const FINTHR = { n5: 80, n4: 90, n3: 95 };
PATH.recordFinal = function (lv, total, acc, passJ) {
  const f = PS().fin[lv] || (PS().fin[lv] = { n: 0, best: 0, tries: [] });
  const pass = passJ && acc >= PTH.ready / 100, first = pass && !f.pass;
  f.n++; f.best = Math.max(f.best, total); f.tries.push({ d: today(), t: total, a: Math.round(acc * 100), p: pass }); f.tries = f.tries.slice(-8);
  if (pass && !f.pass) { f.pass = true; f.date = today(); }
  if (first) { addXP(200, true); }
  save(); return { pass, first };
};
PATH.finalBanner = function (lv, r, acc, passJ) {
  const nx = LEVELS[LEVELS.indexOf(lv) + 1];
  if (r.pass) return `<div class="card" style="background:var(--okbg);text-align:left"><b>🏆 Livello ${LV[lv]} superato!</b><div class="small">${r.first ? '+200 XP. ' : ''}${nx ? `Il percorso ${LV[nx]} è ora aperto.` : 'Hai completato tutto il percorso: complimenti!'}</div>${nx ? `<a class="btn primary" href="#/path/${nx}" style="margin-top:8px">Vai a ${LV[nx]}</a>` : ''}</div>`;
  return `<div class="card" style="background:var(--kobg);text-align:left"><b>Non ancora ${LV[lv]}</b><div class="small">${passJ ? `Hai raggiunto i punteggi JLPT, ma servono anche almeno il ${PTH.ready}% di risposte corrette (hai fatto ${Math.round(acc * 100)}%): è il margine di sicurezza per la differenza tra questa stima e l’esame vero.` : `Servono i punteggi minimi JLPT e almeno il ${PTH.ready}% di risposte corrette.`} Ripassa gli errori e le unità più deboli, poi riprova.</div><a class="btn" href="#/path/${lv}" style="margin-top:8px">Torna al percorso</a></div>`;
};
V.final = function (lv) {
  if (!PATH.ok) return nav('#/path');
  const f = PS().fin[lv] || {}, ns = PATH.nodes(lv).filter(n => n.t !== 'final'), dn = ns.filter(PATH.done).length, allDone = dn === ns.length, open = PATH.levelOpen(lv);
  const lvs = jlevels(lv), kids = lvs.flatMap(l => PATH.D.levels[l].units.flatMap(kanjiIds)), vids = lvs.flatMap(l => PATH.D.levels[l].units.flatMap(u => u.vocab || []));
  const lk = learnedN(kids), lvv = learnedN(vids), tlv = secTot(null, lv);
  const R = [[allDone, `Tappe superate: ${dn}/${ns.length}`, 'Puoi comunque provare l’esame come test d’ingresso.'], [lk >= needN(kids.length) * .85 || !kids.length, `Kanji imparati: ${lk}/${kids.length}`, ''], [lvv >= needN(vids.length) * .85, `Parole imparate: ${lvv}/${vids.length}`, ''], [tlv.pct === null || tlv.pct >= 70, `Precisione recente: ${tlv.pct === null ? 'n/d' : tlv.pct + '%'}`, 'Obiettivo ≥ 70%.']];
  const ready = R.every(r => r[0]);
  view().innerHTML = `<div class="page lv-${lv}">${back('#/path/' + lv, 'Percorso ' + LV[lv])}
  <div class="hero"><div class="small">${LV[lv]} · Prova finale</div><h1 style="font-size:26px;margin:4px 0 8px">試 Esame finale ${LV[lv]}</h1><div style="font-size:15px;opacity:.95">🎯 Simulazione completa in 4 parti (vocabolario e kanji, grammatica, lettura, ascolto) con timer. ${lv === 'n5' ? 'Contiene tutto N5.' : lv === 'n4' ? 'Contiene tutto N5 + N4.' : 'Contiene tutto N5 + N4 + N3.'}</div></div>
  ${!open ? `<div class="card" style="background:var(--bg2)"><b>🔒 Livello bloccato</b><p class="small">Questo esame appartiene a un livello non ancora aperto.</p><a class="btn" href="#/path/${lv}">Torna al percorso</a></div>` : ''}
  ${f.pass ? `<div class="card" style="background:var(--okbg)"><b>🏆 Superato il ${fmtDate(f.date)}</b><div class="small">Miglior punteggio: ${f.best}/180. Puoi rifarlo quando vuoi per tenerti in allenamento.</div></div>` : ''}
  <div class="card"><h3>Sei pronto?</h3>${R.map(([ok, t, h]) => `<div class="row small" style="padding:6px 0"><div class="done-mark ${ok ? 'on' : ''}" style="width:22px;height:22px">${ok ? '✓' : ''}</div><div style="flex:1">${t}${!ok && h ? `<div class="tiny mut">${h}</div>` : ''}</div></div>`).join('')}
    <p class="tiny mut">${ready ? 'Tutto in ordine: buona fortuna!' : 'Non sono requisiti bloccanti: puoi tentare l’esame in ogni momento.'}</p></div>
  <div class="card"><h3>Come si supera</h3><ul class="small" style="margin:6px 0 0;padding-left:18px"><li>Punteggio stimato ≥ <b>${FINTHR[lv]}/180</b> con il minimo richiesto in ogni sezione (regole JLPT ${LV[lv]}).</li><li>Almeno il <b>${PTH.ready}%</b> di risposte corrette: un margine di sicurezza, perché il punteggio ufficiale JLPT usa una scala equalizzata che qui si può solo stimare.</li><li>Le domande sono generate al momento: ogni tentativo è diverso. Nell’ascolto puoi riascoltare (all’esame vero no).</li></ul>
  <div class="setrow"><div style="flex:1"><div class="b">Timer per sezione</div><div class="small mut">Consigliato: l’esame vero è a tempo</div></div><button class="switch ${EX.timer ? 'on' : ''}" id="ftm"></button></div>
  <button class="btn primary" id="fgo" style="margin-top:6px" ${open ? '' : 'disabled'}>${f.n ? 'Riprova l’esame' : allDone ? 'Inizia l’esame' : 'Provalo ora (test d’ingresso)'}</button></div>
  ${f.tries && f.tries.length ? `<div class="sec-t"><h2>Tentativi</h2></div><div class="card flat">${f.tries.slice().reverse().map(t => `<div class="row small" style="padding:6px 0"><span>${fmtDate(t.d)}</span><span class="sp"></span><b>${t.t}/180</b><span class="tag" style="margin-left:8px">${t.a}%</span><span style="margin-left:8px">${t.p ? '✅' : '·'}</span></div>`).join('')}</div>` : ''}</div>`;
  $('#ftm').onclick = e => { EX.timer = !EX.timer; e.target.classList.toggle('on'); };
  if (open) $('#fgo').onclick = () => runExam(lv, true, EX.timer, { final: true, back: '#/pf/' + lv });
};

/* ---------- Home: scheda «Il tuo percorso» ---------- */
PATH.homeCard = function () {
  if (!PATH.ok) return '';
  const n = PATH.next();
  if (!n) return `<a class="card row" href="#/path"><div style="font-size:34px">🎓</div><div style="flex:1"><div class="b">Percorso completato!</div><div class="small mut">Hai superato N5, N4 e N3. Continua con ripassi e simulazioni.</div></div><span class="go">›</span></a>`;
  const pg = PATH.prog(n.lv); let hint = '';
  if (n.t === 'unit') { const st = unitSteps(PATH.U[n.id]), nx = st.find(x => !x.done); hint = nx ? 'Prossimo passo: ' + nx.t : 'Pronto per la verifica dell’unità'; }
  else if (n.t === 'cp') hint = 'Test cumulativo di circa 30 domande'; else hint = 'Simulazione completa con timer';
  return `<a class="card pcard lv-${n.lv}" href="${PATH.hrefOf(n)}"><div class="row"><span class="lvl ${n.lv}">${LV[n.lv]}</span><span class="small mut" style="flex:1">Il tuo percorso · ${pg.d}/${pg.t}</span><span class="go">›</span></div><div class="b jp" style="font-size:18px;margin:6px 0 2px">${rich(PATH.title(n))}</div><div class="small mut">${esc(hint)}</div>${bar(pg.p, 'var(--lc)')}</a>`;
};

// i link marcati data-pfrom ricordano da quale unità arrivi, così «indietro» ti riporta lì
document.addEventListener('click', e => { const a = e.target.closest('[data-pfrom]'); if (a) PATH.from = a.dataset.pfrom; }, true);
