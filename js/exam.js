'use strict';
/* Simulazioni d'esame in formato JLPT: vocabolario/kanji, grammatica, lettura, ascolto — con timer e punteggio */
const EX = { lv: null, full: false, timer: true, gen: true };
const isMC = i => qNorm(i).kind === 'mc';
const SECT = { lex: ['文字・語彙', 'Vocabolario e kanji', 35], gram: ['文法', 'Grammatica', 50], read: ['読解', 'Lettura', 90], asc: ['聴解', 'Ascolto', 70] };
const THR = { n5: { pass: 80, lk: 38, asc: 19 }, n4: { pass: 90, lk: 38, asc: 19 }, n3: { pass: 95, sec: 19 } };

function buildExamGen(lv, full) {
  const k = full ? 1 : .4, r = x => Math.max(1, Math.round(x));
  const asc = J.listenSet(lv, r(20 * k)), lex = J.vocabSet(lv, r(30 * k)), gram = J.gramSet(lv, r(18 * k)), read = J.readSet(lv, r(10 * k));
  return [['lex', lex], ['gram', gram], ['read', read], ['asc', asc]].filter(([, it]) => it.length).map(([id, items]) => ({ id, items: items.map(x => ({ ...x, sec: id === 'lex' ? (x.sec || 'vocab') : x.sec })), t: SECT[id][0], sub: SECT[id][1], spq: SECT[id][2] }));
}
function buildExam(lv, full) {
  if (EX.gen) { try { const g = buildExamGen(lv, full); if (g.length) return g; } catch (e) { console.error(e); } }
  const k = full ? 1 : .4, r = x => Math.max(1, Math.round(x));
  const lex = [...Q.gen.kanjiRead(lv, r(12 * k)), ...Q.gen.kanjiWrite(lv, r(8 * k)), ...Q.gen.vocabFill(lv, r(8 * k)), ...Q.gen.vocab(lv, r(8 * k)), ...Q.gen.kanjiMeaning(lv, r(3 * k))].filter(isMC);
  const gram = pick(Q.bank(lv, ['cloze', 'part', 'mc', 'star', 'trad']).filter(isMC), r(20 * k));
  const read = []; for (const t of shuffle(DB.testi[lv])) { (t.q || []).forEach(q => read.push({ ...q, ty: 'read', sec: 'read', lv, sid: t.id, ctx: t.id })); if (read.length >= (full ? 10 : 4)) break; }
  const asc = Q.listenSet(lv, full ? 16 : 6).filter(isMC);
  return [['lex', lex], ['gram', gram], ['read', read], ['asc', asc]].filter(([, it]) => it.length).map(([id, items]) => ({ id, items: shuffle(items).map(x => ({ ...x, sec: id === 'lex' ? (x.sec || 'kanji') : x.sec })), t: SECT[id][0], sub: SECT[id][1], spq: SECT[id][2] }));
}
V.examHome = function () {
  EX.lv = EX.lv || S.set.cur;
  const lv = EX.lv, avail = { lex: wordsOf(lv).length, gram: Q.bank(lv, ['cloze', 'part', 'mc', 'star', 'trad']).length, read: DB.testi[lv].reduce((a, t) => a + (t.q || []).length, 0), asc: Q.listenSet(lv, 99).length };
  view().innerHTML = `<div class="page">${back('#/practice', 'Esercizi')}<h1>Simulazione d’esame 試</h1><p class="mut">Quattro parti come al JLPT: vocabolario/kanji, grammatica, lettura, ascolto. Nessun feedback finché non finisci.</p>
  <div class="chips">${LEVELS.map(l => `<button class="chip ${l === lv ? 'on' : ''}" data-lv="${l}">${LV[l]}</button>`).join('')}</div>
  <div class="card"><div class="seg" id="mode"><button data-v="0" class="${EX.full ? '' : 'on'}">Mini (~20 domande)</button><button data-v="1" class="${EX.full ? 'on' : ''}">Completa</button></div>
  <div class="setrow"><div style="flex:1"><div class="b">Domande generate (formato JLPT)</div><div class="small mut">Sempre nuove, con i tipi dell’esame. Spento: usa le domande salvate.</div></div><button class="switch ${EX.gen ? 'on' : ''}" id="gen"></button></div>
  <div class="setrow"><div style="flex:1"><div class="b">Timer per sezione</div><div class="small mut">Tempo proporzionale al numero di domande</div></div><button class="switch ${EX.timer ? 'on' : ''}" id="tmr"></button></div></div>
  <div class="card flat"><h3>Contenuti disponibili ${LV[lv]}</h3>${Object.entries(SECT).map(([id, [j, t]]) => `<div class="row small" style="padding:6px 0"><span class="jp b" style="min-width:90px">${j}</span><span style="flex:1">${t}</span><span class="tag">${avail[id]} ${avail[id] ? '' : '— vuoto'}</span></div>`).join('')}<p class="tiny mut">Se una parte è vuota viene saltata: più contenuti aggiungi, più la simulazione è completa.</p></div>
  <button class="btn primary" id="go">Inizia la simulazione</button></div>`;
  $$('.chip[data-lv]').forEach(b => b.onclick = () => { EX.lv = b.dataset.lv; V.examHome(); });
  $$('#mode button').forEach(b => b.onclick = () => { EX.full = b.dataset.v === '1'; $$('#mode button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#gen').onclick = e => { EX.gen = !EX.gen; e.target.classList.toggle('on'); };
  $('#tmr').onclick = e => { EX.timer = !EX.timer; e.target.classList.toggle('on'); };
  $('#go').onclick = () => runExam(lv, EX.full, EX.timer);
};
function runExam(lv, full, timer, opt) { // opt: {final, back} se lanciata dall'esame finale del percorso
  const exitTo = (opt && opt.back) || '#/exam';
  const secs = buildExam(lv, full), res = [];
  if (!secs.length) { toast('Nessun contenuto disponibile per questo livello', '⚠️'); return; }
  const step = i => {
    if (i >= secs.length) return examResults(lv, full, secs, res, opt);
    const s = secs[i], time = timer ? Math.round(s.items.length * s.spq * (lv === 'n3' ? 1.15 : 1)) : 0;
    document.body.classList.remove('focus'); window.scrollTo(0, 0);
    view().innerHTML = `<div class="page done"><span class="lvl ${lv}">${LV[lv]}</span><div class="big jp" style="font-size:48px;margin-top:10px">${s.t}</div><h2>${s.sub}</h2><p class="mut">Parte ${i + 1} di ${secs.length} · ${s.items.length} domande${time ? ` · ${Math.ceil(time / 60)} minuti` : ' · senza timer'}</p>${s.id === 'asc' ? '<p class="small mut">🎧 Alza il volume. Puoi riascoltare ogni audio quante volte vuoi (all’esame vero si ascolta una volta sola).</p>' : ''}<button class="btn primary" id="go">Via!</button><button class="btn ghost" id="ab" style="margin-top:10px">Annulla</button></div>`;
    $('#ab').onclick = () => nav(exitTo);
    $('#go').onclick = () => Q.run(s.items, { exam: true, time, level: lv, onExit: () => nav(exitTo), onFinish: r => { res.push({ s, r }); step(i + 1); } });
  };
  step(0);
}
function examResults(lv, full, secs, res, opt) {
  const tot = { lex: [0, 0], gram: [0, 0], read: [0, 0], asc: [0, 0] }, wrong = [];
  res.forEach(({ s, r }) => r.items.forEach((it, i) => {
    const ok = r.ans[i] === it.a; tot[s.id][1]++; if (ok) tot[s.id][0]++; else wrong.push(it);
    rec(it.sec, it.lv || lv, ok, it.sid); if (it.sec === 'asc') bump('listen');
  }));
  const P = (...ids) => { const a = ids.reduce((x, i) => x + tot[i][0], 0), b = ids.reduce((x, i) => x + tot[i][1], 0); return b ? a / b : null; };
  let parts = [], total, pass, note = '';
  if (lv === 'n3') {
    parts = [['文字・語彙', P('lex')], ['文法・読解', P('gram', 'read')], ['聴解', P('asc')]].map(([n, p]) => ({ n, p, max: 60, sc: p === null ? null : Math.round(p * 60) }));
    const av = parts.filter(x => x.sc !== null); total = av.length ? Math.round(av.reduce((a, x) => a + x.sc, 0) / (av.length * 60) * 180) : 0;
    pass = total >= THR.n3.pass && av.every(x => x.sc >= THR.n3.sec);
  } else {
    parts = [['言語知識・読解', P('lex', 'gram', 'read')], ['聴解', P('asc')]].map(([n, p], i) => ({ n, p, max: i ? 60 : 120, sc: p === null ? null : Math.round(p * (i ? 60 : 120)) }));
    const av = parts.filter(x => x.sc !== null); total = av.length ? Math.round(av.reduce((a, x) => a + x.sc, 0) / av.reduce((a, x) => a + x.max, 0) * 180) : 0;
    const T = THR[lv]; pass = total >= T.pass && (parts[0].sc === null || parts[0].sc >= T.lk) && (parts[1].sc === null || parts[1].sc >= T.asc);
  }
  if (parts.some(x => x.sc === null)) note = 'Alcune parti non erano disponibili: il totale è riportato su 180 in proporzione.';
  const nOk = Object.values(tot).reduce((a, x) => a + x[0], 0), nTot = Object.values(tot).reduce((a, x) => a + x[1], 0);
  let finHtml = '';
  if (opt && opt.final) { const acc = nTot ? nOk / nTot : 0, passJ = pass, r = PATH.recordFinal(lv, total, acc, passJ); pass = r.pass; finHtml = PATH.finalBanner(lv, r, acc, passJ); }
  S.exams.push({ date: today(), lv, full, total, pass, parts: parts.map(x => x.sc) }); bump('exam'); addXP(30 + nOk * 2, true); checkBadges(); save();
  if (pass) { confetti(); snd('done'); }
  const wr_ = [...new Map(wrong.map(w => [w.sid + (w.q || ''), w])).values()];
  view().innerHTML = `<div class="page done"><div class="big">${pass ? '🏆' : '💪'}</div><h1>${pass ? 'Promosso!' : 'Ci sei quasi'}</h1><p class="mut">Punteggio stimato</p>
  <div style="font-size:54px;font-weight:900;line-height:1">${total}<span style="font-size:20px" class="mut">/180</span></div><p class="small mut">Soglia ${LV[lv]}: ${THR[lv].pass}/180 e minimo per sezione. ${note}</p>
  ${finHtml}<div class="card" style="text-align:left">${parts.map(x => `<div style="margin:10px 0"><div class="row small"><b class="jp">${x.n}</b><span class="sp"></span><b>${x.sc === null ? 'n/d' : x.sc + '/' + x.max}</b></div>${bar(x.p === null ? 0 : Math.round(x.p * 100), x.p !== null && x.p >= .6 ? 'var(--ok)' : 'var(--ko)')}</div>`).join('')}<p class="tiny mut">${nOk}/${nTot} risposte corrette · valutazione indicativa: non è il punteggio ufficiale JLPT (che usa una scala equalizzata).</p></div>
  ${wr_.length ? `<div class="card flat" style="text-align:left"><h3>Errori (${wr_.length})</h3>${wr_.slice(0, 15).map(w => `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="jp">${w.qh ? '' : rich(w.q || '')}</div><div class="small" style="color:var(--ok)">✓ ${rich(w.o[w.a])}</div>${w.e ? `<div class="small mut">${rich(w.e)}</div>` : ''}</div>`).join('')}</div>` : ''}
  <div class="grid2">${wr_.length ? '<button class="btn" id="rt">Ripassa gli errori</button>' : ''}<a class="btn primary" href="${(opt && opt.back) || '#/practice'}" style="${wr_.length ? '' : 'grid-column:1/3'}">Fine</a></div></div>`;
  if ($('#rt')) $('#rt').onclick = () => Q.run(wr_.map(w => ({ ...w, retry: false })), { back: (opt && opt.back) || '#/exam', level: lv });
}
