'use strict';
/* Schermate di studio: kana, kanji, vocabolario, SRS, grammatica, lettura, dialoghi */
const V = {};
const back = (h, t) => `<a class="back" href="${h}">‹ ${t}</a>`;
const lvChips = (cur, base) => `<div class="chips">${LEVELS.map(l => `<a class="chip ${l === cur ? 'on' : ''}" data-lv="${l}" href="${base}${l}">${LV[l]}</a>`).join('')}</div>`;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const bar = (p, c) => `<div class="bar" style="${c ? `--bc:${c}` : ''}"><i style="width:${Math.min(100, p)}%"></i></div>`;
const empty = (t, d) => `<div class="card c"><div style="font-size:42px">🌱</div><h3>${t}</h3><p class="mut">${d}</p></div>`;

/* ---------- ordine dei tratti ---------- */
function strokeSvg(ch) {
  const ds = DB.strokes[ch]; if (!ds) return '';
  const nums = ds.map((d, i) => { const m = /M\s*([\d.]+)[ ,]([\d.]+)/i.exec(d); return m ? `<text class="sn" x="${+m[1] - 5}" y="${+m[2] - 2}" opacity="0">${i + 1}</text>` : ''; }).join('');
  return `<svg class="stroke-svg" viewBox="0 0 109 109" data-ch="${esc(ch)}">${ds.map(d => `<path class="ghost" d="${d}"/>`).join('')}${ds.map(d => `<path class="ink" pathLength="1" d="${d}"/>`).join('')}${nums}</svg>`;
}
function animStrokes(svg, ms = 650) {
  const inks = $$('.ink', svg), ns = $$('.sn', svg);
  inks.forEach(p => { p.style.transition = 'none'; p.style.strokeDashoffset = 1; }); ns.forEach(n => { n.style.transition = 'none'; n.setAttribute('opacity', 0); });
  svg.getBoundingClientRect();
  inks.forEach((p, i) => { p.style.transition = `stroke-dashoffset ${ms}ms ease ${i * (ms + 150)}ms`; p.style.strokeDashoffset = 0; });
  ns.forEach((n, i) => { n.style.transition = `opacity .2s ${i * (ms + 150) + ms * .5}ms`; n.setAttribute('opacity', 1); });
}
function strokeBlock(chars) { // una o più lettere in sequenza
  const list = [...chars].filter(c => DB.strokes[c]); if (!list.length) return '<p class="small mut">Ordine dei tratti non disponibile per questo carattere.</p>';
  return `<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">${list.map(strokeSvg).join('')}</div><div class="grid2" style="margin-top:10px"><button class="btn sm" data-act="anim">▶ Anima i tratti</button><button class="btn sm ghost" data-act="nums">Mostra i numeri</button></div>`;
}
function bindStrokes(root) {
  const a = $('[data-act=anim]', root); if (!a) return;
  const run = () => $$('.stroke-svg', root).forEach(s => animStrokes(s));
  a.onclick = run; $('[data-act=nums]', root).onclick = () => $$('.sn', root).forEach(n => { n.style.transition = 'none'; n.setAttribute('opacity', 1); $$('.ink', root).forEach(p => { p.style.transition = 'none'; p.style.strokeDashoffset = 0; }); });
  setTimeout(run, 250);
}

/* ---------- kana ---------- */
V.kana = function () {
  const h = kanaCount('hira'), k = kanaCount('kata');
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Alfabeti 🌸</h1><p class="mut">Impara hiragana e katakana: tabelle con audio, ordine dei tratti e quiz.</p>
  <div class="grid2"><a class="tile" href="#/kana/hira"><div class="ico s-kana jp">あ</div><div class="t">Hiragana</div>${bar(pct(h.n, h.t), 'var(--s-kana)')}<div class="d">${h.n}/${h.t} imparati</div></a>
  <a class="tile" href="#/kana/kata"><div class="ico s-kana jp">ア</div><div class="t">Katakana</div>${bar(pct(k.n, k.t), 'var(--s-kana)')}<div class="d">${k.n}/${k.t} imparati</div></a></div>
  <div class="sec-t"><h2>Quiz veloci</h2></div>
  ${[['hira', 'base', 'Hiragana · suoni base', 'あ'], ['hira', 'daku', 'Hiragana · dakuten', 'が'], ['hira', 'combo', 'Hiragana · combinazioni', 'きゃ'], ['kata', 'base', 'Katakana · suoni base', 'ア'], ['kata', 'daku', 'Katakana · dakuten', 'ガ'], ['kata', 'combo', 'Katakana · combinazioni', 'キャ']].map(([s, g, t, ic]) => `<a class="item" href="#/ex/kana-${s}-${g}/n5"><div class="ico s-kana jp">${ic}</div><div><div class="t">${t}</div><div class="d">10 domande: lettura, riconoscimento, ascolto</div></div><span class="sp"></span><span class="go">›</span></a>`).join('')}
  <a class="item" href="#/ex/kana-mix/n5"><div class="ico s-kana">★</div><div><div class="t">Mix hiragana + katakana</div><div class="d">Per essere sicuri</div></div><span class="sp"></span><span class="go">›</span></a></div>`;
};
V.kanaChart = function (script) {
  const kata = script === 'kata', conv = s => kata ? toKata(s) : s;
  const groups = DB.kana.groups.map(g => {
    const cells = g.rows.map(r => r.map(([k, ro]) => ({ k: conv(k), ro }))).flat();
    let html;
    if (g.id === 'combo') html = `<div class="kgrid c3">${cells.map(c => `<button class="kcell" data-k="${c.k}" data-r="${c.ro}">${c.k}<small>${c.ro}</small></button>`).join('')}</div>`;
    else html = g.rows.map(r => `<div class="kgrid" style="margin-bottom:8px">${[...r.map(([k, ro]) => ({ k: conv(k), ro })), ...Array(Math.max(0, 5 - r.length)).fill(null)].map(c => c ? `<button class="kcell ${(S.items['kana:' + c.k] || {}).ok >= 2 ? 'm' : ''}" data-k="${c.k}" data-r="${c.ro}">${c.k}<small>${c.ro}</small></button>` : '<div class="kcell empty"></div>').join('')}</div>`).join('');
    return `<div class="sec-t"><h2>${g.t}</h2></div>${html}`;
  }).join('');
  const extra = kata ? `<div class="sec-t"><h2>Suoni stranieri</h2></div><div class="kgrid c3">${DB.kana.kataExtra.map(([k, ro]) => `<button class="kcell" data-k="${k}" data-r="${ro}">${k}<small>${ro}</small></button>`).join('')}</div>` : '';
  const note = `<div class="card flat small"><b>Ricorda:</b> ${kata ? 'il katakana si usa per parole straniere (コーヒー), nomi stranieri e onomatopee. Il segno <b>ー</b> allunga la vocale; la っ piccola (ッ) raddoppia la consonante seguente.' : 'la っ piccola raddoppia la consonante seguente (きって), le や・ゆ・よ piccole formano le combinazioni (きゃ), を si legge “o”, は come particella si legge “wa”, へ come particella “e”.'}</div>`;
  view().innerHTML = `<div class="page">${back('#/kana', 'Alfabeti')}<div class="row"><h1>${kata ? 'Katakana' : 'Hiragana'}</h1><span class="sp"></span><a class="btn sm primary" href="#/ex/kana-${script}-mix/n5">Quiz</a></div>
    <div class="seg" style="margin:10px 0"><button class="${kata ? '' : 'on'}" onclick="nav('#/kana/hira')">Hiragana</button><button class="${kata ? 'on' : ''}" onclick="nav('#/kana/kata')">Katakana</button></div>
    <p class="small mut">Tocca un carattere per ascoltarlo e vedere l’ordine dei tratti. ${'Bordo verde = già imparato.'}</p>${note}${groups}${extra}</div>`;
  $$('.kcell[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k, r = b.dataset.r; AU.say(kanaSpec(k));
    const sh = sheet(`<div class="c"><div class="kanji-big jp" style="font-size:72px">${k}</div><div class="b" style="font-size:22px">${r} ${spk(k, { f: kanaF(k) })}</div></div>${strokeBlock(k)}<p class="tiny mut c" style="margin-top:12px">Tratti: KanjiVG (CC BY-SA 3.0)</p>`);
    bindStrokes(sh);
  });
};

/* ---------- kanji ---------- */
function kanjiHtml(k, full) {
  const words = (k.w || []).map(([w, r, it]) => `<div class="word"><div class="jp">${wr(w, r)}</div><div class="small mut" style="flex:1">${esc(it)}${rom(r) ? '<br>' + rom(r) : ''}</div>${spk(r)}</div>`).join('');
  return `<div class="c"><div class="kanji-big">${k.k}</div><h2>${esc(k.it)}</h2></div>
  <div style="margin:10px 0"><div class="rd"><b>音</b>${(k.on || []).map(x => `<span>${x}${rom(x)}</span>`).join('') || '<span class="mut">–</span>'}</div><div class="rd"><b>訓</b>${(k.kun || []).map(x => `<span>${x}${rom(x)}</span>`).join('') || '<span class="mut">–</span>'}</div></div>
  <div class="card flat" style="margin:10px 0">${words}</div>${k.n ? `<p class="small mut">💡 ${rich(k.n)}</p>` : ''}${full !== false ? `<h3 style="margin:14px 0 8px">Ordine dei tratti</h3>${strokeBlock(k.k)}` : ''}`;
}
function kanjiSheet(id) {
  const k = DB.byId[id.startsWith('k:') ? id : 'k:' + id]; if (!k) return;
  const sh = sheet(`<span class="lvl ${k.lv}">${LV[k.lv]}</span>${kanjiHtml(k)}`); bindStrokes(sh);
}
V.kanjiList = function (lv) {
  const list = DB.kanji[lv], st = deckStats('kanji', lv);
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Kanji ${LV[lv]} 漢</h1>${lvChips(lv, '#/kanji/')}
  ${list.length ? `<div class="card"><div class="row"><div><div class="b">${st.learned}/${st.total} imparati</div><div class="tiny mut">Nel livello JLPT: ${list.length}/${(DB.elenco[lv] || []).length || '?'} kanji già inclusi nell’app</div><div class="small mut">${st.due} da ripassare · ${st.nw} nuovi</div></div><span class="sp"></span><a class="btn sm primary" href="#/srs/kanji/${lv}">Flashcard</a></div>${bar(pct(st.learned, st.total), 'var(--s-kanji)')}</div>
  <div class="kgrid">${list.map(k => `<button class="kcell ${S.srs[k.id] && S.srs[k.id].n >= 1 ? 'm' : ''}" data-id="${k.id}" style="font-family:var(--mincho)">${k.k}<small>${esc(k.it.split(/[,;]/)[0].slice(0, 9))}</small></button>`).join('')}</div>` : empty('Nessun kanji in questo livello (ancora)', 'Aggiungi il file data/kanji-' + lv + '.json: vedi NOTE.md')}</div>`;
  $$('.kcell[data-id]').forEach(b => b.onclick = () => kanjiSheet(b.dataset.id));
};

/* ---------- vocabolario ---------- */
function wordSheet(e) {
  const sh = sheet(`<span class="lvl ${e.lv}">${LV[e.lv]}</span> ${e.c ? `<span class="tag">${esc(e.c)}</span>` : ''}<div class="c" style="margin:12px 0"><div class="jp-big" style="font-size:38px">${wr(e.w, e.r)}</div><div class="mut">${esc(e.r || '')} ${spk(e.r || e.w)}</div><div>${rom(e.r)}</div><h2 style="margin-top:6px">${esc(e.it)}</h2></div>
    ${e.ex ? `<div class="card flat"><div class="ex" style="border:0"><div style="flex:1"><div class="j">${rich(e.ex)}</div><div class="i">${esc(e.et || '')}</div></div>${spk(e.ex)}</div></div>` : ''}${e.n ? `<p class="small mut">💡 ${rich(e.n)}</p>` : ''}`);
}
V.vocabList = function (lv, cat) {
  const list = DB.vocab[lv], cats = [...new Set(list.map(e => e.c).filter(Boolean))], st = deckStats('vocab', lv);
  const shown = cat ? list.filter(e => e.c === cat) : list;
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Vocabolario ${LV[lv]} 語</h1>${lvChips(lv, '#/vocab/')}
  ${list.length ? `<div class="card"><div class="row"><div><div class="b">${st.learned}/${st.total} imparate</div><div class="small mut">${st.due} da ripassare · ${st.nw} nuove</div></div><span class="sp"></span><a class="btn sm primary" href="#/srs/vocab/${lv}">Flashcard</a></div>${bar(pct(st.learned, st.total), 'var(--s-vocab)')}</div>
  <div class="chips"><button class="chip ${!cat ? 'on' : ''}" data-cat="">Tutte</button>${cats.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  ${shown.map(e => `<div class="item" data-id="${esc(e.id)}"><div style="flex:1"><div class="jp jp-l" style="line-height:1.9">${wr(e.w, e.r)}</div><div class="d">${esc(e.it)}${rom(e.r) ? ' · ' + rom(e.r) : ''}</div></div>${spk(e.r || e.w)}</div>`).join('')}` : empty('Nessuna parola in questo livello (ancora)', 'Aggiungi data/vocabolario-' + lv + '.json')}</div>`;
  $$('[data-cat]').forEach(b => b.onclick = () => V.vocabList(lv, b.dataset.cat));
  $$('.item[data-id]').forEach(b => b.onclick = e => { if (e.target.closest('.spk')) return; wordSheet(DB.byId[b.dataset.id]); });
};

/* ---------- sessione SRS (flashcard) ---------- */
V.srs = function (sec, lv, more, opt) { // opt: sessione su un elenco di carte deciso dal percorso {ids, back, self, more}
  let ids = [];
  if (opt) ids = opt.ids;
  else if (sec === 'all') { for (const l of LEVELS) for (const s of ['kanji', 'vocab']) deckIds(s, l).forEach(id => { if (isDue(id)) ids.push(id); }); }
  else {
    const all = deckIds(sec, lv), due = all.filter(isDue), nw = all.filter(id => !S.srs[id]).slice(0, more ? 5 : newLeft(sec));
    ids = [...due, ...nw];
  }
  ids.sort((a, b) => (S.srs[a] ? S.srs[a].due : 9e15) - (S.srs[b] ? S.srs[b].due : 9e15) || 0);
  const backH = opt ? opt.back : sec === 'all' ? '#/home' : (sec === 'kanji' ? '#/kanji/' : '#/vocab/') + lv;
  if (!ids.length) {
    view().innerHTML = `<div class="page">${back(backH, 'Indietro')}<div class="card c"><div style="font-size:54px">🎉</div><h2>Tutto in ordine!</h2><p class="mut">${opt ? 'Hai già visto tutte le carte di questo gruppo: il prossimo ripasso arriverà in automatico.' : `Non hai carte da ripassare${sec === 'all' ? '' : ' o nuove per oggi'}. Il prossimo ripasso arriverà in automatico.`}</p>${!opt && sec !== 'all' && deckIds(sec, lv).some(id => !S.srs[id]) ? `<a class="btn primary" href="#/srs/${sec}/${lv}/more">Impara altre 5 nuove</a>` : ''}<a class="btn" style="margin-top:10px" href="${backH}">Torna indietro</a></div></div>`; return;
  }
  document.body.classList.add('focus');
  const queue = [...ids], total = ids.length; let done = 0, xp = 0, flipped = false, again = 0;
  const finish = () => {
    document.body.classList.remove('focus'); snd('done'); confetti(); addXP(10, true);
    view().innerHTML = `<div class="page done"><div class="big">🌟</div><h1>Sessione completata!</h1><p class="mut">${total} carte ripassate${again ? ` · ${again} da rivedere` : ''}</p><div class="row" style="justify-content:center;margin:14px 0"><div class="stat" style="background:var(--card);box-shadow:var(--sh)"><b>+${xp + 10}</b><span>XP</span></div></div><div class="grid2">${opt ? (opt.more && opt.more() ? `<a class="btn" href="${opt.self}">Altre carte nuove</a>` : `<a class="btn" href="#/study">Studia</a>`) : sec !== 'all' && deckIds(sec, lv).some(id => !S.srs[id]) ? `<a class="btn" href="#/srs/${sec}/${lv}/more">Altre 5 nuove</a>` : '<a class="btn" href="#/study">Studia</a>'}<a class="btn primary" href="${backH}">Fine</a></div></div>`;
  };
  const draw = () => {
    if (!queue.length) return finish();
    const id = queue[0], e = DB.byId[id], isK = id.startsWith('k:'), sc = isK ? 'kanji' : 'vocab';
    let front, backc;
    if (isK) {
      front = `<div class="kanji-big">${e.k}</div><div class="mut small">Ricordi letture e significato?</div>`;
      backc = `<div class="kanji-big" style="font-size:64px">${e.k}</div><h2>${esc(e.it)}</h2><div class="rd"><b>音</b>${(e.on || []).map(x => `<span>${x}${rom(x)}</span>`).join('') || '–'}</div><div class="rd"><b>訓</b>${(e.kun || []).map(x => `<span>${x}${rom(x)}</span>`).join('') || '–'}</div>
        <div style="text-align:left;width:100%">${(e.w || []).slice(0, 3).map(([w, r, it]) => `<div class="word"><div class="jp">${wr(w, r)}</div><div class="small mut" style="flex:1">${esc(it)}${rom(r) ? '<br>' + rom(r) : ''}</div>${spk(r)}</div>`).join('')}</div><button class="btn sm ghost" id="fcst">✍ Ordine dei tratti</button><div id="fcsv"></div>`;
    } else {
      front = `<div class="jp-big" style="font-size:40px">${wr(e.w, e.r)}</div>${spk(e.r || e.w)}<div class="mut small">${e.c ? esc(e.c) : ''}</div>`;
      backc = `<div class="jp-big" style="font-size:34px">${wr(e.w, e.r)}</div><div class="mut">${esc(e.r || '')} ${spk(e.r || e.w)}</div><div>${rom(e.r)}</div><h2>${esc(e.it)}</h2>${e.ex ? `<div class="card flat" style="width:100%;text-align:left"><div class="j jp" style="font-size:18px;line-height:2">${rich(e.ex)}</div><div class="small mut">${esc(e.et || '')}</div><div style="text-align:right">${spk(e.ex)}</div></div>` : ''}`;
    }
    const isNew = !S.srs[id];
    view().innerHTML = `<div class="qwrap"><div class="qhead"><button class="x" id="qx">✕</button><div class="qbar"><i style="width:${pct(done, total)}%"></i></div><div class="qcount">${done}/${total}</div></div>
      <div class="row small" style="margin-bottom:8px"><span class="lvl ${e.lv}">${LV[e.lv]}</span>${isNew ? '<span class="tag">NUOVA</span>' : '<span class="tag">RIPASSO</span>'}</div>
      <div class="fc ${flipped ? 'flip' : ''}" id="fc">${flipped ? backc : front}</div>
      <div class="qfoot">${flipped ? `<div class="srs-btns">${['Non lo so', 'Difficile', 'Bene', 'Facile'].map((t, q) => `<button class="q${q}" data-q="${q}">${t}<small>${ivLabel(id, q)}</small></button>`).join('')}</div>` : `<button class="btn primary" id="show">Mostra la risposta</button>`}</div></div>`;
    $('#qx').onclick = () => { AU.stop(); document.body.classList.remove('focus'); nav(backH); };
    if (!flipped) {
      $('#show').onclick = $('#fc').onclick = e2 => { if (e2.target.closest('.spk')) return; flipped = true; draw(); };
      if (!isK) setTimeout(() => AU.say({ t: e.r || e.w }), 200);
    } else {
      const st = $('#fcst'); if (st) st.onclick = () => { $('#fcsv').innerHTML = strokeBlock(e.k); bindStrokes($('#fcsv')); st.remove(); };
      $$('.srs-btns button').forEach(b => b.onclick = () => {
        const q = +b.dataset.q; srsAnswer(id, q, sc, e.lv); xp += q === 0 ? 2 : 5; snd(q === 0 ? 'ko' : 'ok'); AU.stop();
        queue.shift(); if (q === 0) { again++; queue.splice(Math.min(3, queue.length), 0, id); } else done++;
        flipped = false; draw();
      });
    }
  };
  draw();
};

/* ---------- grammatica ---------- */
V.gramList = function (lv) {
  const list = DB.gram[lv], cats = {};
  list.forEach(g => (cats[g.cat || 'Altro'] = cats[g.cat || 'Altro'] || []).push(g));
  const done = list.filter(g => S.gram[g.id]).length;
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Grammatica ${LV[lv]} 文</h1>${lvChips(lv, '#/gram/')}
  ${list.length ? `<div class="card"><div class="b">${done}/${list.length} strutture studiate</div>${bar(pct(done, list.length), 'var(--s-gram)')}<a class="btn sm" style="margin-top:10px" href="#/glossary">Apri il glossario</a></div>
  ${Object.entries(cats).map(([c, gs]) => `<div class="sec-t"><h2>${esc(c)}</h2></div>${gs.map(gItem).join('')}`).join('')}` : empty('Nessuna scheda in questo livello (ancora)', 'Aggiungi data/grammatica-' + lv + '.json')}</div>`;
};
function gItem(g) {
  const s = S.items['g:' + g.id], acc = s && s.ok + s.ko ? Math.round(s.ok / (s.ok + s.ko) * 100) : null;
  return `<a class="item" href="#/g/${g.id}"><div class="done-mark ${S.gram[g.id] ? 'on' : ''}">${S.gram[g.id] ? '✓' : ''}</div><div style="flex:1;min-width:0"><div class="t jp">${rich(g.t)}</div><div class="d">${esc(g.s)}</div></div>${acc !== null ? `<span class="tag">${acc}%</span>` : ''}<span class="go">›</span></a>`;
}
V.gramDetail = function (id) {
  const g = DB.byId['g:' + id]; if (!g) { view().innerHTML = empty('Scheda non trovata', ''); return; }
  const li = a => a && a.length ? `<ul>${a.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '';
  const exN = (g.es || []).length;
  view().innerHTML = `<div class="page">${back(PATH.from || '#/gram/' + g.lv, PATH.from ? 'Unità' : 'Grammatica ' + LV[g.lv])}
  <div class="gh"><span class="lvl ${g.lv}" style="background:#fff;color:var(--lc)">${LV[g.lv]}</span> ${g.cat ? `<span class="tag" style="background:rgba(255,255,255,.25);color:#fff">${esc(g.cat)}</span>` : ''}<div class="f jp">${rich(g.f || g.t)}</div><div>${esc(g.s)}</div></div>
  <div class="gblock card"><h3>📘 La regola</h3>${String(g.regola || '').split('\n\n').map(p => `<p>${rich(p)}</p>`).join('')}</div>
  ${g.form && g.form.length ? `<div class="gblock card"><h3>🧩 Come si forma</h3>${li(g.form)}</div>` : ''}
  ${g.uso && g.uso.length ? `<div class="gblock card"><h3>🎯 Quando si usa</h3>${li(g.uso)}</div>` : ''}
  ${g.diff && g.diff.length ? `<div class="gblock card"><h3>⚖️ Differenze con strutture simili</h3>${g.diff.map(d => `<div class="vs"><b class="jp">${rich(d.vs)}</b><br>${rich(d.t)}</div>`).join('')}</div>` : ''}
  ${g.err && g.err.length ? `<div class="gblock card"><h3>⚠️ Errori comuni</h3>${g.err.map(e => `<div class="xo jp">✗ ${rich(e.x)}</div><div class="xo o jp">✓ ${rich(e.o)}</div>${e.t ? `<p class="small mut">${rich(e.t)}</p>` : ''}`).join('')}</div>` : ''}
  <div class="gblock card"><div class="row"><h3 style="flex:1">💬 Esempi</h3><button class="chip ${S.set.trans ? 'on' : ''}" id="trt">Traduzione</button></div>${(g.ex || []).map(e => `<div class="ex"><div style="flex:1"><div class="j">${rich(e.j)}</div><div class="i ${S.set.trans ? '' : 'hid'}">${esc(e.i)}</div></div>${spk(e.j)}</div>`).join('')}</div>
  ${g.rel && g.rel.length ? `<div class="gblock"><h3>🔗 Vedi anche</h3><div class="chips">${g.rel.map(r => { const x = DB.byId['g:' + r]; return x ? `<a class="chip jp" href="#/g/${r}">${rich(x.t)}</a>` : ''; }).join('')}</div></div>` : ''}
  <div class="grid2" style="margin-top:16px"><button class="btn" id="gdone">${S.gram[g.id] ? '✓ Studiata' : 'Segna come studiata'}</button><a class="btn primary" href="#/ex/gram:${g.id}/${g.lv}" ${exN ? '' : 'style="pointer-events:none;opacity:.4"'}>Esercizi (${exN})</a></div></div>`;
  $('#trt').onclick = () => { S.set.trans = !S.set.trans; save(); $('#trt').classList.toggle('on'); $$('.ex .i').forEach(x => x.classList.toggle('hid', !S.set.trans)); };
  $('#gdone').onclick = () => { if (!S.gram[g.id]) { S.gram[g.id] = today(); bump('gram'); addXP(15); checkBadges(); } $('#gdone').textContent = '✓ Studiata'; };
};

/* ---------- lettura ---------- */
V.readList = function (lv) {
  const list = DB.testi[lv];
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Comprensione del testo ${LV[lv]} 読</h1>${lvChips(lv, '#/read/')}
  ${list.length ? list.map(t => `<a class="item" href="#/t/${t.id}"><div class="ico s-read">${{ annuncio: '📢', email: '✉️', dialogo: '💬', brano: '📖', avviso: '📌' }[t.tipo] || '📖'}</div><div style="flex:1"><div class="t jp">${rich(t.t)}</div><div class="d">${esc(t.tipo || 'testo')} · ${(t.q || []).length} domande</div></div>${S.read[t.id] ? '<span class="tag">✓ letto</span>' : ''}<span class="go">›</span></a>`).join('') : empty('Nessun testo in questo livello (ancora)', 'Aggiungi data/testi-' + lv + '.json')}</div>`;
};
Q.ctxHtml = id => { const t = DB.byId[id]; return t ? `<div class="read-text jp">${t.jp.map(p => `<p>${tapHtml(p, t.gl)}</p>`).join('')}</div>` : ''; };
function wordPop(key, gl) {
  const w = lookupWord(key, gl); if (!w) return;
  const k = key.length === 1 ? DB.byId['k:' + key] : null;
  sheet(`<div class="c"><div class="jp-big" style="font-size:36px">${wr(key, w.r)}</div><div class="mut">${esc(w.r)} ${spk(w.r || key)}</div><div>${rom(w.r)}</div><h2>${esc(w.it)}</h2>${k ? `<p class="small">音 ${(k.on || []).join('・')} · 訓 ${(k.kun || []).join('・')}</p>` : ''}</div>`);
}
V.readText = function (id) {
  const t = DB.byId[id]; if (!t) { view().innerHTML = empty('Testo non trovato', ''); return; }
  view().innerHTML = `<div class="page">${back(PATH.from || '#/read/' + t.lv, PATH.from ? 'Unità' : 'Testi ' + LV[t.lv])}<span class="lvl ${t.lv}">${LV[t.lv]}</span> <span class="tag">${esc(t.tipo || '')}</span><h1 class="jp" style="margin-top:6px">${rich(t.t)}</h1>
  <div class="row" style="margin:10px 0"><button class="btn sm" id="tplay">🔊 Ascolta</button>${rateChips()}<span class="sp"></span><button class="chip ${S.set.trans ? 'on' : ''}" id="ttr">Traduzione</button></div>
  <div class="card"><div class="read-text jp">${t.jp.map((p, i) => `<p>${tapHtml(p, t.gl)}</p><div class="small mut ${S.set.trans ? '' : 'hide'} ti" style="margin:-4px 0 8px">${esc((t.it || [])[i] || '')}</div>`).join('')}</div><p class="tiny mut">👆 Tocca le parole sottolineate per lettura e significato.</p></div>
  ${t.gl ? `<div class="card flat"><h3>Parole del testo</h3>${Object.entries(t.gl).map(([w, [r, it]]) => `<div class="word"><div class="jp">${wr(w, r)}</div><div class="small mut" style="flex:1">${esc(it)}${rom(r) ? '<br>' + rom(r) : ''}</div></div>`).join('')}</div>` : ''}
  <button class="btn primary" id="tq" style="margin-top:12px">Rispondi alle domande (${(t.q || []).length})</button></div>`;
  $('#tplay').onclick = () => { const dlg = t.tipo === 'dialogo'; AU.seq(t.jp.map((p, i) => ({ s: String(i % 2), t: p.replace(/^(?:\{[^{}]+\}|[^：{\/]{1,6})\/?：\/?/, ''), g: dlg ? (i % 2 ? 'M' : 'F') : 'F' })), '', t.lv); };
  $('#ttr').onclick = () => { S.set.trans = !S.set.trans; save(); $('#ttr').classList.toggle('on'); $$('.ti').forEach(x => x.classList.toggle('hide', !S.set.trans)); };
  $('#tq').onclick = () => {
    AU.stop(); const items = (t.q || []).map(q => ({ ...q, ty: 'read', sec: 'read', lv: t.lv, sid: t.id, ctx: t.id }));
    Q.run(items, { back: PATH.from || '#/read/' + t.lv, onDone: () => { if (!S.read[t.id]) { S.read[t.id] = today(); bump('read'); addXP(15); checkBadges(); } nav(PATH.from || '#/read/' + t.lv); } });
  };
};
document.addEventListener('click', e => {
  const w = e.target.closest('.tw'); if (!w) return;
  const id = (location.hash.match(/#\/t\/(.+)/) || [])[1]; const t = id && DB.byId[id];
  wordPop(w.dataset.w, t ? t.gl : (window.__gl || null));
});

/* ---------- ascolto: dialoghi ---------- */
V.listenStudy = function (lv) {
  const l = (DB.asc[lv] || {}).dialoghi || [];
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Dialoghi ${LV[lv]} 聞</h1>${lvChips(lv, '#/listen/')}
  ${l.length ? l.map(d => `<a class="item" href="#/d/${d.id}"><div class="ico s-asc">💬</div><div style="flex:1"><div class="t jp">${rich(d.t)}</div><div class="d">${d.righe.length} battute${d.q ? ' · ' + d.q.length + ' domande' : ''}</div></div><span class="go">›</span></a>`).join('') : empty('Nessun dialogo (ancora)', 'Aggiungi data/ascolto-' + lv + '.json')}
  <a class="btn primary" style="margin-top:14px" href="#/practice">Vai agli esercizi di ascolto</a></div>`;
};
V.dialog = function (id) {
  const d = DB.byId[id]; if (!d) return;
  let showJ = true, showI = S.set.trans;
  const draw = () => {
    view().innerHTML = `<div class="page">${back(PATH.from || '#/listen/' + d.lv, PATH.from ? 'Unità' : 'Dialoghi')}<span class="lvl ${d.lv}">${LV[d.lv]}</span><h1 class="jp" style="margin-top:6px">${rich(d.t)}</h1>
    <div class="audio-panel"><button class="play" id="dp">${ICON_PLAY}</button><div><div class="b">Ascolta tutto</div><div class="tiny mut">Due voci diverse</div></div>${rateChips()}</div>
    <div class="chips"><button class="chip ${showJ ? 'on' : ''}" id="tj">Trascrizione</button><button class="chip ${showI ? 'on' : ''}" id="ti">Traduzione</button></div>
    <div class="card">${d.righe.map((l, i) => `<div class="ex"><b style="color:var(--s-asc);min-width:18px">${esc(l.s)}</b><div style="flex:1">${showJ ? `<div class="j">${rich(l.t)}</div>` : '<div class="j mut">・・・</div>'}${showI ? `<div class="i">${esc(l.i || '')}</div>` : ''}</div><button class="spk" data-line="${i}">${ICON_SPK}</button></div>`).join('')}</div>
    ${d.q && d.q.length ? `<button class="btn primary" id="dq">Rispondi alle domande (${d.q.length})</button>` : ''}</div>`;
    $('#dp').onclick = () => AU.seq(d.righe, d.id, d.lv);
    $$('[data-line]').forEach(b => b.onclick = () => AU.say({ t: d.righe[+b.dataset.line].t, f: `${d.lv}/${d.id}_${+b.dataset.line + 1}`, who: d.righe[+b.dataset.line].g || (d.v && d.v[d.righe[+b.dataset.line].s]) || (d.righe[+b.dataset.line].s === 'A' ? 'F' : 'M') }));
    $('#tj').onclick = () => { showJ = !showJ; draw(); }; $('#ti').onclick = () => { showI = !showI; draw(); };
    if ($('#dq')) $('#dq').onclick = () => { AU.stop(); Q.run(Q.listenSet(d.lv, 99).filter(x => x.sid === d.id), { back: '#/d/' + d.id, level: d.lv, onDone: () => { if (!S.read[d.id]) { S.read[d.id] = today(); bump('read'); addXP(10); } nav('#/d/' + d.id); } }); };
  };
  if (!(d.q && d.q.length) && !S.read[d.id]) { S.read[d.id] = today(); save(); }
  draw();
};
