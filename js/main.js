'use strict';
/* Schermate principali: Home, Studia, Esercizi, Glossario, Statistiche, Piano, Impostazioni */
function setLv(l) { S.set.cur = l; save(); applySettings(); }
const lvPicker = () => `<div class="chips" id="lvp">${LEVELS.map(l => `<button class="chip ${l === S.set.cur ? 'on' : ''}" data-lv="${l}">${LV[l]}</button>`).join('')}</div>`;
function bindLvPicker(re) { $$('#lvp .chip').forEach(b => b.onclick = () => { setLv(b.dataset.lv); re(); }); }
const fmtDate = s => parseDay(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- piano di studio ---------- */
const PLAN_T = { n5: { kanji: 100, vocab: 800, gram: 45, read: 12 }, n4: { kanji: 170, vocab: 700, gram: 60, read: 20 }, n3: { kanji: 370, vocab: 1500, gram: 110, read: 30 } };
function planModel() {
  const start = parseDay(S.set.planStart), exam = parseDay(S.set.examDate), weeks = Math.max(8, Math.ceil(daysBetween(start, exam) / 7));
  const w5 = Math.round(weeks * .22), w4 = Math.round(weeks * .36), w3 = weeks - w5 - w4, sim = Math.min(4, Math.max(2, Math.round(w3 * .17)));
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const lv = i < w5 ? 'n5' : i < w5 + w4 ? 'n4' : 'n3', wp = lv === 'n5' ? w5 : lv === 'n4' ? w4 : w3, T = PLAN_T[lv], final = i >= weeks - sim, ch = Math.ceil(wp - (lv === 'n3' ? sim : 0)) || 1;
    const from = addDays(start, i * 7), to = addDays(from, 6);
    out.push({ i, lv, from, to, final, kanji: final ? 0 : Math.ceil(T.kanji / ch), vocab: final ? 0 : Math.ceil(T.vocab / ch), gram: final ? 0 : Math.ceil(T.gram / ch), read: final ? 2 : Math.max(1, Math.ceil(T.read / ch)), listen: 3, sim: final ? 2 : (i % 8 === 7 ? 1 : 0) });
  }
  return { out, weeks, w5, w4, w3, sim };
}
function weekDone(w) { const r = { kanji: 0, vocab: 0, gram: 0, read: 0, listen: 0, sim: 0, days: 0 }; for (let d = 0; d < 7; d++) { const x = S.days[dayKey(addDays(w.from, d))]; if (x) { r.kanji += x.kanji || 0; r.vocab += x.vocab || 0; r.gram += x.gram || 0; r.read += x.read || 0; r.listen += x.listen || 0; r.sim += x.exam || 0; if (x.xp >= 10) r.days++; } } return r; }
function curWeek() { const m = planModel(), t = new Date(); t.setHours(0, 0, 0, 0); return m.out.find(w => t >= w.from && t <= addDays(w.to, 0) || (t >= w.from && t < addDays(w.from, 7))) || (t < m.out[0].from ? m.out[0] : m.out[m.out.length - 1]); }
V.plan = function () {
  const m = planModel(), cw = curWeek(), now = new Date(); now.setHours(0, 0, 0, 0);
  const dl = daysBetween(today(), S.set.examDate), done = weekDone(cw), show = window.__allWeeks ? m.out : m.out.filter(w => w.i >= cw.i - 1 && w.i <= cw.i + 6);
  const goal = (lbl, a, b) => b ? `<div style="margin:8px 0"><div class="row small"><span>${lbl}</span><span class="sp"></span><b>${Math.min(a, b)}/${b}</b></div>${bar(pct(a, b), 'var(--lc)')}</div>` : '';
  view().innerHTML = `<div class="page">${back('#/home', 'Home')}<h1>Piano di studio 🗓️</h1>
  <div class="hero"><div class="small">Obiettivo: JLPT N3 · ${fmtDate(S.set.examDate)}</div><div style="font-size:36px;font-weight:900;margin:4px 0">${dl > 0 ? dl : 0} <span style="font-size:16px;font-weight:700">giorni</span></div><div class="small">${Math.max(0, Math.ceil(dl / 7))} settimane · settimana ${cw.i + 1} di ${m.weeks}</div></div>
  <div class="card"><div class="row" style="gap:3px;height:16px;border-radius:99px;overflow:hidden">${[['n5', m.w5], ['n4', m.w4], ['n3', m.w3]].map(([l, n]) => `<div style="flex:${n};background:var(--${l});height:100%;opacity:${cw.lv === l ? 1 : .35}"></div>`).join('')}</div>
  <div class="row tiny mut" style="margin-top:6px"><span style="flex:${m.w5}">N5</span><span style="flex:${m.w4}">N4</span><span style="flex:${m.w3}">N3</span></div>
  <p class="small mut">${m.w5} sett. N5 → ${m.w4} sett. N4 → ${m.w3 - m.sim} sett. N3 → ${m.sim} sett. di simulazioni finali. Date modificabili in Impostazioni.</p></div>
  <div class="card lv-${cw.lv}"><div class="row"><span class="lvl ${cw.lv}">${LV[cw.lv]}</span><h2 style="flex:1">${cw.final ? 'Ripasso e simulazioni' : 'Questa settimana'}</h2><span class="tag">${cw.from.getDate()}/${cw.from.getMonth() + 1} – ${cw.to.getDate()}/${cw.to.getMonth() + 1}</span></div>
  ${goal('Giorni di studio', done.days, 5)}${goal('Nuovi kanji', done.kanji, cw.kanji)}${goal('Nuove parole', done.vocab, cw.vocab)}${goal('Strutture di grammatica', done.gram, cw.gram)}${goal('Testi letti', done.read, cw.read)}${goal('Esercizi di ascolto', done.listen, cw.listen * 5)}${cw.sim ? goal('Simulazioni d\'esame', done.sim, cw.sim) : ''}
  <p class="small mut">Ogni giorno: ripasso SRS (sempre!), poi i nuovi contenuti. Le settimane in cui non raggiungi tutto non sono un problema: recuperi nella successiva.</p></div>
  <div class="sec-t"><h2>Prossime settimane</h2></div>
  ${show.map(w => `<div class="week lv-${w.lv} ${w.i === cw.i ? 'now' : ''} ${w.i < cw.i ? 'past' : ''}" style="--lc:var(--${w.lv})"><div class="row"><b>Sett. ${w.i + 1}</b><span class="lvl ${w.lv}">${LV[w.lv]}</span><span class="sp"></span><span class="tiny mut">${w.from.getDate()}/${w.from.getMonth() + 1}</span></div><div class="small mut">${w.final ? `Ripasso generale · ${w.sim} simulazioni · punti deboli` : `${w.kanji} kanji · ${w.vocab} parole · ${w.gram} strutture · ${w.read} ${w.read === 1 ? 'testo' : 'testi'}${w.sim ? ' · 1 simulazione' : ''}`}</div></div>`).join('')}
  <button class="btn" id="allw">${window.__allWeeks ? 'Mostra meno' : 'Mostra tutte le settimane'}</button>
  <p class="tiny mut" style="margin-top:12px">La data dell’esame è indicativa (il JLPT di dicembre si tiene di solito la prima domenica del mese): controlla quella ufficiale e aggiornala in Impostazioni.</p></div>`;
  $('#allw').onclick = () => { window.__allWeeks = !window.__allWeeks; V.plan(); };
};

/* ---------- Home ---------- */
function todayTasks() {
  const lv = S.set.cur, d = D(), T = [], hk = kanaCount('hira'), kk = kanaCount('kata');
  if ((hk.n < hk.t * .8 || kk.n < kk.t * .8)) T.push({ c: 'kana', ic: 'あ', t: hk.n < hk.t * .8 ? 'Impara l’hiragana' : 'Impara il katakana', d: `${hk.n}/${hk.t} hiragana · ${kk.n}/${kk.t} katakana`, href: '#/kana', done: (d.kana || 0) >= 8 });
  const due = totalDue(); if (due > 0 || d.review > 0) T.push({ c: 'ex', ic: '🔁', t: due ? `Ripasso: ${due} carte da rivedere` : 'Ripasso completato', d: 'Kanji e parole in scadenza (SRS)', href: '#/srs/all/all', done: due === 0 });
  const sk = deckStats('kanji', lv), tk = Math.min(5, S.set.newPerDay);
  if (sk.nw > 0 || d.kanji > 0) T.push({ c: 'kanji', ic: '漢', t: `Nuovi kanji ${LV[lv]}`, d: `${Math.min(tk, sk.nw) || 0} da imparare oggi · ${sk.learned}/${sk.total} fatti`, href: `#/srs/kanji/${lv}`, done: d.kanji >= tk || sk.nw === 0 || newLeft('kanji') === 0 });
  const sv = deckStats('vocab', lv);
  if (sv.nw > 0 || d.vocab > 0) T.push({ c: 'vocab', ic: '語', t: `Nuove parole ${LV[lv]}`, d: `${Math.min(tk, sv.nw) || 0} da imparare oggi · ${sv.learned}/${sv.total} fatte`, href: `#/srs/vocab/${lv}`, done: d.vocab >= tk || sv.nw === 0 || newLeft('vocab') === 0 });
  const g = DB.gram[lv].find(x => !S.gram[x.id]); if (g || d.gram) T.push({ c: 'gram', ic: '文', t: g ? 'Grammatica: ' + plain(g.t) : 'Grammatica studiata', d: g ? g.s : 'Bravo!', href: g ? '#/g/' + g.id : '#/gram/' + lv, done: d.gram >= 1 || !g });
  const t = DB.testi[lv].find(x => !S.read[x.id]); if (t || d.read) T.push({ c: 'read', ic: '読', t: t ? 'Lettura: ' + plain(t.t) : 'Lettura completata', d: t ? `${t.tipo} · ${(t.q || []).length} domande` : 'Bravo!', href: t ? '#/t/' + t.id : '#/read/' + lv, done: d.read >= 1 || !t });
  if ((DB.asc[lv].dialoghi || []).length) T.push({ c: 'asc', ic: '聞', t: 'Allena l’orecchio', d: 'Una serie di ascolto JLPT', href: `#/ex/listen/${lv}`, done: d.listen >= 3 });
  T.push({ c: 'ex', ic: '練', t: 'Esercizi misti', d: '10 domande dal tuo livello', href: `#/ex/mix/${lv}`, done: d.ex >= 1 });
  return T;
}
V.home = function () {
  const xi = xpInfo(S.xp), d = D(), gp = Math.min(100, Math.round(d.xp / S.set.goal * 100)), stk = streak(), hr = new Date().getHours();
  const dl = daysBetween(today(), S.set.examDate), tasks = todayTasks(), nd = tasks.filter(t => t.done).length, cw = curWeek();
  const total = Math.max(1, daysBetween(S.set.planStart, S.set.examDate)), el = Math.max(0, Math.min(100, Math.round(daysBetween(S.set.planStart, today()) / total * 100)));
  view().innerHTML = `<div class="page">
  <div class="hero"><div class="row"><div><div class="small">${hr < 12 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera'} · ${hr < 11 ? 'おはよう' : hr < 18 ? 'こんにちは' : 'こんばんは'}</div><h1 style="font-size:24px">Livello ${xi.lvl} · ${rank(xi.lvl)}</h1></div></div>
    <div class="bar" style="margin:12px 0 6px"><i style="width:${pct(xi.cur, xi.need)}%"></i></div><div class="tiny" style="opacity:.9">${xi.cur}/${xi.need} XP al livello ${xi.lvl + 1}</div>
    <div class="row" style="margin-top:12px;gap:8px"><div class="stat"><b>🔥 ${stk}</b><span>giorni di fila</span></div><div class="stat"><b>⭐ ${S.xp}</b><span>XP totali</span></div><div class="stat"><b>🎯 ${Math.min(d.xp, S.set.goal)}/${S.set.goal}</b><span>obiettivo</span></div></div></div>
  ${PATH.homeCard()}
  <a class="card row" href="#/plan"><div class="ring" style="--p:${el};--rc:var(--lc)"><b>${el}%</b></div><div style="flex:1"><div class="b">JLPT N3 · ${fmtDate(S.set.examDate)}</div><div class="small mut">Mancano <b>${Math.max(0, dl)}</b> giorni · ora: <span class="lvl ${cw.lv}">${LV[cw.lv]}</span> settimana ${cw.i + 1}</div></div><span class="go">›</span></a>
  <div class="sec-t"><h2>Oggi da fare</h2><span class="small mut">${nd}/${tasks.length} ${nd === tasks.length ? '🎉' : ''}</span></div>
  ${bar(pct(nd, tasks.length), 'var(--ok)')}
  ${tasks.map(t => `<a class="item" href="${t.href}"><div class="ico s-${t.c}">${t.ic}</div><div style="flex:1;min-width:0"><div class="t jp" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.t)}</div><div class="d">${esc(t.d)}</div></div><div class="done-mark ${t.done ? 'on' : ''}">${t.done ? '✓' : ''}</div></a>`).join('')}
  ${nd === tasks.length ? `<div class="card c" style="background:var(--okbg)"><b>Tutto fatto per oggi!</b><div class="small mut">Se hai ancora energia, prova una simulazione d’esame.</div></div>` : ''}
  <div class="sec-t"><h2>I tuoi livelli</h2></div>
  <div class="grid3">${LEVELS.map(l => { const k = deckStats('kanji', l), v = deckStats('vocab', l), g = DB.gram[l].filter(x => S.gram[x.id]).length, gt = DB.gram[l].length, p = pct(k.learned + v.learned + g, k.total + v.total + gt); return `<button class="tile lv-${l}" data-go="${l}" style="min-height:0;align-items:flex-start"><span class="lvl ${l}">${LV[l]}</span>${bar(p, 'var(--lc)')}<div class="d">${p}% · ${k.total + v.total + gt} elementi</div></button>`; }).join('')}</div>
  <div class="grid2" style="margin-top:12px"><a class="tile" href="#/exam"><div class="ico s-exam">試</div><div class="t">Simulazione d’esame</div></a><a class="tile" href="#/stats"><div class="ico s-ex">📊</div><div class="t">Punti deboli</div></a></div></div>`;
  $$('[data-go]').forEach(b => b.onclick = () => { setLv(b.dataset.go); nav('#/study'); });
};

/* ---------- Studia ---------- */
V.study = function () {
  const lv = S.set.cur, k = deckStats('kanji', lv), v = deckStats('vocab', lv), g = DB.gram[lv], gd = g.filter(x => S.gram[x.id]).length, t = DB.testi[lv], td = t.filter(x => S.read[x.id]).length, dl = (DB.asc[lv].dialoghi || []).length, hk = kanaCount('hira'), kk = kanaCount('kata');
  const tile = (c, ic, ti, d, href, p) => `<a class="tile" href="${href}"><div class="ico s-${c}">${ic}</div><div class="t">${ti}</div>${p !== undefined ? bar(p, `var(--s-${c})`) : ''}<div class="d">${d}</div></a>`;
  view().innerHTML = `<div class="page"><h1>Studia</h1><p class="mut">Scegli il livello e una sezione.</p>${lvPicker()}
  <div class="grid2">${tile('kana', 'あ', 'Alfabeti', `Hiragana ${hk.n}/${hk.t} · Katakana ${kk.n}/${kk.t}`, '#/kana', pct(hk.n + kk.n, hk.t + kk.t))}
  ${tile('kanji', '漢', 'Kanji', `${k.learned}/${k.total} · ${k.due} da ripassare`, '#/kanji/' + lv, pct(k.learned, k.total))}
  ${tile('vocab', '語', 'Vocabolario', `${v.learned}/${v.total} · ${v.due} da ripassare`, '#/vocab/' + lv, pct(v.learned, v.total))}
  ${tile('gram', '文', 'Grammatica', `${gd}/${g.length} strutture`, '#/gram/' + lv, pct(gd, g.length))}
  ${tile('read', '読', 'Lettura', `${td}/${t.length} testi`, '#/read/' + lv, pct(td, t.length))}
  ${tile('asc', '聞', 'Ascolto', `${dl} dialoghi`, '#/listen/' + lv)}</div>
  <a class="item" style="margin-top:16px" href="#/path/${lv}"><div class="ico s-exam">🧭</div><div style="flex:1"><div class="t">Percorso guidato ${LV[lv]}</div><div class="d">Unità in ordine, verifiche e esame finale</div></div><span class="go">›</span></a>
  <a class="item" href="#/srs/all/all"><div class="ico s-ex">🔁</div><div style="flex:1"><div class="t">Ripasso SRS</div><div class="d">${totalDue()} carte in scadenza (kanji e parole)</div></div><span class="go">›</span></a>
  <a class="item" href="#/glossary"><div class="ico s-gram">📚</div><div style="flex:1"><div class="t">Glossario di grammatica</div><div class="d">Cerca e consulta tutte le strutture</div></div><span class="go">›</span></a>
  <a class="item" href="#/plan"><div class="ico s-exam">🗓️</div><div style="flex:1"><div class="t">Piano di studio</div><div class="d">Obiettivi settimanali fino a dicembre 2027</div></div><span class="go">›</span></a>
  <a class="item" href="#/resources"><div class="ico s-read">🔗</div><div style="flex:1"><div class="t">Risorse</div><div class="d">Link a materiali gratuiti e ufficiali</div></div><span class="go">›</span></a></div>`;
  bindLvPicker(V.study);
};

/* ---------- Risorse (solo link) ---------- */
V.resources = function () {
  const L = [
    ['Ufficiale', [['JLPT – sito ufficiale', 'https://www.jlpt.jp/e/'], ['Esempi di prove JLPT (ufficiali)', 'https://www.jlpt.jp/e/samples/forlearners.html']]],
    ['Elenchi di riferimento usati per i livelli', [['Kanji N5', 'https://jlptsensei.com/jlpt-n5-kanji-list/'], ['Kanji N4', 'https://jlptsensei.com/jlpt-n4-kanji-list/'], ['Kanji N3', 'https://jlptsensei.com/jlpt-n3-kanji-list/'], ['Grammatica N5', 'https://jlptsensei.com/jlpt-n5-grammar-list/'], ['Grammatica N4', 'https://jlptsensei.com/jlpt-n4-grammar-list/'], ['Grammatica N3', 'https://jlptsensei.com/jlpt-n3-grammar-list/'], ['Vocabolario N5', 'https://jlptsensei.com/jlpt-n5-vocabulary-list/'], ['Vocabolario N4', 'https://jlptsensei.com/jlpt-n4-vocabulary-list/'], ['Vocabolario N3', 'https://jlptsensei.com/jlpt-n3-vocabulary-list/']]],
    ['Dizionari e frasi', [['Jisho.org – dizionario', 'https://jisho.org/'], ['Tatoeba – frasi d’esempio', 'https://tatoeba.org/it/'], ['KanjiVG – tratti dei kanji', 'https://kanjivg.tagaini.net/']]],
    ['Lettura e ascolto (solo link, non inclusi nell’app)', [['NHK News Web Easy', 'https://www3.nhk.or.jp/news/easy/'], ['Guida di grammatica di Tae Kim', 'https://guidetojapanese.org/learn/']]]
  ];
  view().innerHTML = `<div class="page">${back('#/study', 'Studia')}<h1>Risorse 🔗</h1><p class="mut">Link esterni: si aprono nel browser. Nessun materiale protetto è copiato nell’app.</p>${L.map(([t, ls]) => `<div class="sec-t"><h2>${t}</h2></div>${ls.map(([n, u]) => `<a class="item" href="${u}" target="_blank" rel="noopener"><div style="flex:1"><div class="t">${n}</div><div class="d">${u.replace(/^https?:\/\//, '').slice(0, 44)}</div></div><span class="go">↗</span></a>`).join('')}`).join('')}</div>`;
};

/* ---------- Esercizi ---------- */
V.practice = function () {
  const lv = S.set.cur, t = (c, ic, ti, d, type) => `<a class="tile" href="#/ex/${type}/${lv}"><div class="ico s-${c}">${ic}</div><div class="t">${ti}</div><div class="d">${d}</div></a>`;
  view().innerHTML = `<div class="page"><h1>Esercizi</h1><p class="mut">Allenati con tutti i tipi di esercizio.</p>${lvPicker()}
  <a class="item" href="#/ex/mix/${lv}" style="background:linear-gradient(135deg,var(--brand),#a45cf0);color:#fff"><div class="ico" style="background:rgba(255,255,255,.25)">⚡</div><div style="flex:1"><div class="t">Mix del giorno</div><div class="d" style="color:#fff;opacity:.85">10 domande miste · ${LV[lv]}</div></div><span class="go" style="color:#fff">›</span></a>
  <a class="item" href="#/jlpt"><div class="ico s-exam">試</div><div style="flex:1"><div class="t">Formato JLPT · generato</div><div class="d">Gli stessi tipi di domanda dell’esame, sempre nuovi · ${LV[lv]}</div></div><span class="go">›</span></a>
  <div class="sec-t"><h2>Allenamento</h2></div><div class="grid2">
  ${t('ex', '✔️', 'Scelta multipla', 'Grammatica e lessico', 'mc')}${t('gram', '＿', 'Completamento', 'Riempi lo spazio', 'cloze')}${t('gram', 'は', 'Particelle', 'は・が・を・に・で…', 'part')}${t('ex', '⇄', 'Riordino frasi', 'Metti in ordine', 'ord')}
  ${t('vocab', '🔗', 'Abbinamento', 'Parole e significati', 'mat')}${t('read', '訳', 'Traduzione', 'Giapponese ⇄ italiano', 'trad')}${t('kanji', '漢', 'Lettura kanji', 'Come si legge?', 'kan')}${t('vocab', '語', 'Vocabolario', 'Significato e parola', 'voc')}</div>
  <div class="sec-t"><h2>Ascolto 聞</h2></div><div class="grid2">
  ${t('asc', '🎧', 'Ascolto JLPT', 'Dialogo, domanda, risposta', 'listen')}${t('asc', '✍️', 'Dettato', 'Scrivi in kana', 'dic')}${t('asc', '≠', 'Coppie minime', 'Lunghe/brevi, っ, じゅう…', 'mp')}${t('asc', '🔢', 'Numeri e orari', 'Date, prezzi, ore', 'num')}
  ${t('asc', '💬', 'Risposta rapida', 'La replica più naturale', 'qr')}${t('asc', '🎙️', 'Shadowing', 'Ripeti e confronta', 'shd')}</div>
  <div class="sec-t"><h2>Frasi vere 📚</h2></div><p class="tiny mut" style="margin:-6px 0 10px">Migliaia di frasi giapponese-italiano di Tatoeba, scelte in base al tuo livello e mescolate a ogni ingresso.</p><div class="grid2">
  ${t('ex', '訳', 'Italiano → giapponese', 'Scegli la frase giusta', 'fr:trad')}${t('read', '読', 'Giapponese → italiano', 'Che cosa significa?', 'fr:read')}${t('ex', '⇄', 'Riordina la frase', 'Metti i pezzi in ordine', 'fr:ord')}${t('gram', '＿', 'Completa la parola', 'Con la traduzione di aiuto', 'fr:cloze')}
  ${t('asc', '🎧', 'Ascolta e capisci', 'Frase → significato', 'fr:lis')}${t('asc', '✍️', 'Dettato di frasi', 'Scrivi in kana', 'fr:dic')}${t('asc', '🎙️', 'Shadowing di frasi', 'Ripeti e confronta', 'fr:shd')}${t('ex', '⚡', 'Mix di frasi', '10 domande miste', 'fr:mix')}</div>
  <div class="sec-t"><h2>Esami e ripassi</h2></div><div class="grid2"><a class="tile" href="#/exam"><div class="ico s-exam">試</div><div class="t">Simulazioni d’esame</div><div class="d">Formato JLPT con timer</div></a><a class="tile" href="#/ex/weak/${lv}"><div class="ico s-ex">🎯</div><div class="t">Punti deboli</div><div class="d">Ripassa i tuoi errori</div></a></div></div>`;
  bindLvPicker(V.practice);
};
function weakItems(n = 10) {
  const arr = Object.entries(S.items).filter(([id, v]) => v.ko > 0).map(([id, v]) => ({ id, r: v.ko / (v.ok + v.ko), n: v.ko })).sort((a, b) => b.r - a.r || b.n - a.n), out = [];
  for (const { id } of arr) {
    if (id.startsWith('k:')) { const k = DB.byId[id]; if (k) { const ks = DB.kanji[k.lv]; out.push({ ty: 'kan', sec: 'kanji', lv: k.lv, sid: id, q: `Che cosa significa il kanji 「${k.k}」?`, o: [k.it, ...pick(ks.filter(x => x.it !== k.it), 3).map(x => x.it)], a: 0, e: `${k.k}: ${k.it}. 音 ${k.on.join('・')} 訓 ${k.kun.join('・')}` }); } }
    else if (id.startsWith('v:')) { const v = DB.byId[id], pool = wordsOf(v ? v.lv : 'n5'); if (v && pool.length > 4) out.push({ ty: 'voc', sec: 'vocab', lv: v.lv, sid: id, qh: `<span class="jp-big">${wr(v.w, v.r)}</span>`, q: 'Che cosa significa?', o: [v.it, ...pick(pool.filter(x => x.it !== v.it), 3).map(x => x.it)], a: 0, e: `${v.w}（${v.r}）= ${v.it}` }); }
    else if (id.startsWith('g:')) { Q.bank(['n5', 'n4', 'n3']).filter(e => e.sid === id).slice(0, 2).forEach(e => out.push(e)); }
    else if (id.startsWith('kana:')) { const k = id.slice(5), ro = DB.kana.groups.flatMap(g => g.rows.flat()).find(([x]) => x === toHira(k)); if (ro) { const all = DB.kana.groups.flatMap(g => g.rows.flat()).filter(x => x[1] !== ro[1]); out.push({ ty: 'kana', sec: 'kana', lv: 'n5', sid: id, qh: `<div class="kanji-big c">${k}</div>`, q: 'Come si legge?', o: [ro[1], ...pick(all, 3).map(x => x[1])], a: 0, e: `${k} = ${ro[1]}` }); } }
    if (out.length >= n) break;
  }
  return out.slice(0, n);
}
Q.gen.match = (lv, n = 2) => Array.from({ length: n }, (_, i) => { const ws = pick(wordsOf(lv), 5); return ws.length < 3 ? null : { ty: 'mat', sec: 'vocab', lv, sid: 'vocab:match', q: 'Abbina le parole al significato', p: ws.map(w => [wr2(w.w, w.r), w.it]) }; }).filter(Boolean);
const wr2 = (w, r) => KANJI_RE.test(w) && r && r !== w ? `{${w}|${r}}` : w;
/* ---------- Formato JLPT: esercizi generati a ogni richiesta ---------- */
const JT = [
  ['文字・語彙', 'Vocabolario e kanji', 'vocab', [['v1', '読み方', 'Lettura del kanji', 6, '読'], ['v2', '表記', 'Come si scrive', 5, '書'], ['v3', '文脈規定', 'Parola nel contesto', 5, '文'], ['v4', '言い換え', 'Parola simile', 4, '換'], ['v5', '用法', 'Uso della parola', 3, '用']]],
  ['文法', 'Grammatica', 'gram', [['g1', '文の文法1', 'Forma corretta', 8, '形'], ['g2', '文の文法2', 'Costruzione ★', 5, '★'], ['g3', '文章の文法', 'Completa il testo', 1, '章']]],
  ['読解', 'Lettura', 'read', [['r4', '問題4', 'Memo, avvisi, email', 4, '短'], ['r5', '問題5', 'Testo medio', 1, '中'], ['r7', '問題7', 'Cerca le informazioni', 1, '表']]],
  ['聴解', 'Ascolto', 'listen', [['l1', '課題理解', 'Che cosa deve fare', 5, '課'], ['l2', 'ポイント理解', 'Il motivo', 5, '点'], ['l3', '概要理解', 'Il contenuto', 5, '概'], ['l4', '発話表現', 'Che cosa dici?', 5, '発'], ['l5', '即時応答', 'Risposta rapida', 6, '応']]]
];
const JR = { vocab: (l) => J.vocabSet(l, 15), gram: (l) => J.gramSet(l, 12), read: (l) => J.readSet(l, 8), listen: (l) => J.listenSet(l, 10) };
J.build = function (arg, lv) {
  if (JR[arg]) return JR[arg](lv);
  for (const g of JT) { const t = g[3].find(x => x[0] === arg); if (t) return Array.from({ length: t[3] }, () => J[arg](lv, 1)).flat().filter(Boolean).slice(0, arg === 'g3' ? 5 : 99); }
  return [];
};
V.jlpt = function () {
  const lv = S.set.cur;
  view().innerHTML = `<div class="page">${back('#/practice', 'Esercizi')}<h1>Formato JLPT 試</h1><p class="mut">Le domande hanno la stessa forma di quelle dell’esame ufficiale ma vengono <b>generate al momento</b>: ogni volta che entri trovi frasi, scelte e valori diversi. Contenuto creato da IA, non copiato da test ufficiali.</p>${lvPicker()}
  ${JT.map(([j, t, id, types]) => `<div class="sec-t"><h2><span class="jp">${j}</span> ${t}</h2></div>
  <a class="item" href="#/ex/jlpt:${id}/${lv}" style="background:linear-gradient(135deg,var(--brand),#a45cf0);color:#fff"><div class="ico" style="background:rgba(255,255,255,.25)">⚡</div><div style="flex:1"><div class="t">Set misto · ${t}</div><div class="d" style="color:#fff;opacity:.85">Tutti i tipi insieme</div></div><span class="go" style="color:#fff">›</span></a>
  <div class="grid2">${types.map(x => `<a class="tile" href="#/ex/jlpt:${x[0]}/${lv}"><div class="ico s-ex jp">${x[4]}</div><div class="t">${x[2]}</div><div class="d jp">${x[1]}</div></a>`).join('')}</div>`).join('')}
  <p class="tiny mut" style="margin-top:14px">Per la simulazione con timer e punteggio vai a <a href="#/exam">Simulazione d’esame</a>.</p></div>`;
  bindLvPicker(V.jlpt);
};
V.exRun = function (type, lv) {
  const [m0, arg] = type.split(':'), main = type.startsWith('kana') ? 'kana' : m0, bank = tys => Q.bank(lv, tys); let items = [], o = { back: '#/practice', level: lv }, a = DB.asc[lv] || {};
  const nz = (x, n) => pick(x, n);
  if (main === 'gram') { items = Q.bank(lv).filter(e => e.gid === arg); o.back = '#/g/' + arg; S.gram[arg] || 0; items = shuffle(items); }
  else if (main === 'mix') items = Q.mix(lv, 10);
  else if (main === 'mc') items = [...nz(bank(['mc', 'star']), 6), ...Q.gen.vocab(lv, 2), ...Q.gen.kanjiMeaning(lv, 2)];
  else if (main === 'cloze') items = [...nz(bank(['cloze']), 5), ...Q.gen.vocabFill(lv, 3), ...Q.gen.fr.cloze(lv, 3)];
  else if (main === 'part') items = nz(bank(['part']), 10);
  else if (main === 'ord') items = [...nz(bank(['ord']), 5), ...Q.gen.fr.ord(lv, 5)];
  else if (main === 'trad') items = [...nz(bank(['trad']), 5), ...Q.gen.fr.trad(lv, 3), ...Q.gen.fr.read(lv, 3)];
  else if (main === 'mat') items = [...nz(bank(['mat']), 2), ...Q.gen.match(lv, 2)];
  else if (main === 'kan') items = [...Q.gen.kanjiRead(lv, 5), ...Q.gen.kanjiWrite(lv, 3), ...Q.gen.kanjiMeaning(lv, 3)];
  else if (main === 'voc') items = [...Q.gen.vocab(lv, 6), ...Q.gen.vocab(lv, 4, true)];
  else if (main === 'listen') items = [...Q.listenSet(lv, 6), ...Q.gen.fr.lis(lv, 3)];
  else if (main === 'mp') items = nz(a.coppie || [], 8).map(c => Q.pairItem(c, lv));
  else if (main === 'num') items = Q.gen.numeri(8);
  else if (main === 'qr') items = nz(a.risposte || [], 8).map(c => ({ ty: 'qr', sec: 'asc', lv, sid: c.id, q: 'Qual è la risposta più naturale?', au: { t: c.p, f: `${lv}/${c.id}`, who: c.g || 'M' }, o: c.o, a: c.a ?? 0, e: c.e, tr: `${c.p}\n${c.i || ''}` }));
  else if (main === 'dic') items = [...nz(a.dettato || [], 4).map(c => ({ ty: 'dic', sec: 'asc', lv, sid: 'asc:' + c.id, t: c.t, i: c.i, f: `${lv}/${c.id}`, g: c.g, alt: c.alt })), ...Q.gen.fr.dic(lv, 3)];
  else if (main === 'shd') items = [...nz(a.shadowing || [], 3).map(c => ({ ty: 'shd', sec: 'asc', lv, sid: 'asc:' + c.id, t: c.t, i: c.i, f: `${lv}/${c.id}`, g: c.g })), ...Q.gen.fr.shd(lv, 3)];
  else if (main === 'fr') { items = arg === 'mix' ? Q.gen.fr.mix(lv, 10) : Q.gen.fr[arg](lv, arg === 'dic' || arg === 'shd' ? 6 : 8); }
  else if (main === 'jlpt') { items = J.build(arg, lv); o.back = '#/jlpt'; }
  else if (main === 'weak') { items = weakItems(10); o.back = '#/stats'; }
  else if (main === 'kana') { const p = type.split('-'); if (p[1] === 'mix') items = shuffle([...Q.gen.kana('hira', 6, null, ['base', 'daku']), ...Q.gen.kana('kata', 6, null, ['base', 'daku'])]); else items = Q.gen.kana(p[1], 10, null, p[2] === 'mix' ? ['base', 'daku', 'combo'] : [p[2]]); o.back = '#/kana'; }
  items = items.filter(Boolean);
  if (!items.length) { view().innerHTML = `<div class="page">${back('#/practice', 'Esercizi')}${empty('Nessun esercizio disponibile', main === 'weak' ? 'Non hai ancora errori da ripassare. Ottimo!' : 'Per questo livello e tipo non ci sono ancora contenuti: vedi NOTE.md per aggiungerli.')}</div>`; return; }
  Q.run(main === 'jlpt' ? items : shuffle(items), o);
};

/* ---------- Glossario ---------- */
const G = { tab: 'gram', lv: 'all', q: '' };
V.glossary = function () {
  view().innerHTML = `<div class="page"><h1>Glossario 📚</h1>
  <div class="seg" style="margin:10px 0"><button data-tab="gram" class="${G.tab === 'gram' ? 'on' : ''}">Grammatica</button><button data-tab="kanji" class="${G.tab === 'kanji' ? 'on' : ''}">Kanji</button><button data-tab="vocab" class="${G.tab === 'vocab' ? 'on' : ''}">Parole</button></div>
  <input type="search" id="gq" placeholder="Cerca (giapponese, italiano, romaji…)" value="${esc(G.q)}" autocomplete="off">
  <div class="chips"><button class="chip ${G.lv === 'all' ? 'on' : ''}" data-flv="all">Tutti</button>${LEVELS.map(l => `<button class="chip ${G.lv === l ? 'on' : ''}" data-lv="${l}" data-flv="${l}">${LV[l]}</button>`).join('')}</div>
  <div id="glist"></div></div>`;
  $$('[data-tab]').forEach(b => b.onclick = () => { G.tab = b.dataset.tab; V.glossary(); });
  $$('[data-flv]').forEach(b => b.onclick = () => { G.lv = b.dataset.flv; V.glossary(); });
  $('#gq').oninput = e => { G.q = e.target.value; glist(); };
  glist();
};
function glist() {
  const q = toHira(G.q.toLowerCase().trim()), lvs = G.lv === 'all' ? LEVELS : [G.lv], el = $('#glist'); let h = '';
  const hit = s => !q || toHira(String(s).toLowerCase()).includes(q);
  if (G.tab === 'gram') {
    const l = lvs.flatMap(x => DB.gram[x]).filter(g => hit([plain(g.t), plain(g.f || ''), g.s, g.cat, (g.tag || []).join(' '), (g.ex || []).map(e => plain(e.j) + ' ' + e.i).join(' ')].join(' ')));
    h = `<p class="small mut">${l.length} strutture</p>` + l.map(g => `<div class="item lv-${g.lv}" style="flex-wrap:wrap"><a href="#/g/${g.id}" style="flex:1;min-width:0"><span class="lvl ${g.lv}">${LV[g.lv]}</span> ${g.cat ? `<span class="tag">${esc(g.cat)}</span>` : ''}<div class="t jp" style="margin-top:4px">${rich(g.t)}</div><div class="d jp">${rich(g.f || '')}</div><div class="d">${esc(g.s)}</div></a><a class="btn sm" href="#/ex/gram:${g.id}/${g.lv}" style="${(g.es || []).length ? '' : 'display:none'}">Esercizi</a></div>`).join('') || empty('Nessun risultato', 'Prova con un’altra parola.');
  } else if (G.tab === 'kanji') {
    const l = lvs.flatMap(x => DB.kanji[x]).filter(k => hit([k.k, k.it, k.on.join(' '), k.kun.join(' '), (k.w || []).map(w => w.join(' ')).join(' ')].join(' ')));
    h = `<p class="small mut">${l.length} kanji</p>` + l.map(k => `<div class="item" data-k="${k.id}"><div class="kanji-big" style="font-size:40px;width:56px;text-align:center">${k.k}</div><div style="flex:1;min-width:0"><div class="t">${esc(k.it)}</div><div class="d jp">音 ${k.on.join('・') || '–'}　訓 ${k.kun.join('・') || '–'}</div>${S.set.showRomaji ? `<div class="d">${rom([...k.on, ...k.kun].join('・'))}</div>` : ''}</div><span class="lvl ${k.lv}">${LV[k.lv]}</span></div>`).join('') || empty('Nessun risultato', '');
  } else {
    const l = lvs.flatMap(x => DB.vocab[x]).filter(v => hit([v.w, v.r, v.it, v.c].join(' ')));
    h = `<p class="small mut">${l.length} parole</p>` + l.slice(0, 200).map(v => `<div class="item" data-v="${esc(v.id)}"><div style="flex:1;min-width:0"><div class="jp jp-l" style="line-height:1.9">${wr(v.w, v.r)}</div><div class="d">${esc(v.it)}${rom(v.r) ? ' · ' + rom(v.r) : ''}</div></div>${spk(v.r || v.w)}<span class="lvl ${v.lv}">${LV[v.lv]}</span></div>`).join('') || empty('Nessun risultato', '');
  }
  el.innerHTML = h;
  $$('[data-k]', el).forEach(b => b.onclick = () => kanjiSheet(b.dataset.k));
  $$('[data-v]', el).forEach(b => b.onclick = e => { if (!e.target.closest('.spk')) wordSheet(DB.byId[b.dataset.v]); });
}

/* ---------- Statistiche ---------- */
V.stats = function () {
  const xi = xpInfo(S.xp), all = secTot(), last = Array.from({ length: 14 }, (_, i) => { const d = addDays(new Date(), i - 13), x = S.days[dayKey(d)]; return { d, xp: x ? x.xp : 0, t: i === 13 }; }), mx = Math.max(30, ...last.map(x => x.xp));
  const weak = Object.entries(S.items).filter(([, v]) => v.ko > 0 && v.ko + v.ok >= 2).map(([id, v]) => ({ id, r: v.ko / (v.ok + v.ko), v })).sort((a, b) => b.r - a.r).slice(0, 8);
  const nameOf = id => { const e = DB.byId[id]; if (id.startsWith('k:')) return e ? `${e.k} · ${e.it}` : id; if (id.startsWith('v:')) return e ? `${e.w} · ${e.it}` : id; if (id.startsWith('g:')) return e ? plain(e.t) : id; if (id.startsWith('kana:')) return id.slice(5); return id.replace('asc:', 'ascolto: '); };
  const cell = (sec, l) => { const t = secTot(sec, l); return t.tot ? `<td><b style="color:var(--${t.pct >= 80 ? 'ok' : t.pct >= 60 ? 'warn' : 'ko'})">${t.pct}%</b><div class="tiny mut">${t.tot}</div></td>` : '<td class="mut">–</td>'; };
  const weakSecs = Object.keys(SEC).filter(s => s !== 'exam').flatMap(s => LEVELS.map(l => [s, l, secTot(s, l)])).filter(x => x[2].tot >= 5 && x[2].pct < 70);
  const gramLow = LEVELS.flatMap(l => DB.gram[l]).filter(g => { const s = S.items['g:' + g.id]; return s && s.ok + s.ko >= 3 && s.ok / (s.ok + s.ko) < .7; }).slice(0, 5);
  view().innerHTML = `<div class="page"><h1>Statistiche 📊</h1>
  <div class="grid2"><div class="card c"><div class="small mut">Livello</div><div style="font-size:30px;font-weight:900">${xi.lvl}</div><div class="small">${rank(xi.lvl)}</div></div><div class="card c"><div class="small mut">XP totali</div><div style="font-size:30px;font-weight:900">${S.xp}</div><div class="small">oggi: ${D().xp}</div></div>
  <div class="card c"><div class="small mut">Serie attuale</div><div style="font-size:30px;font-weight:900">🔥 ${streak()}</div><div class="small">record: ${bestStreak()}</div></div><div class="card c"><div class="small mut">Precisione</div><div style="font-size:30px;font-weight:900">${all.pct ?? '–'}${all.pct !== null ? '%' : ''}</div><div class="small">${all.tot} risposte</div></div></div>
  <div class="card"><h3>Ultimi 14 giorni (XP)</h3><div class="bars" style="margin-top:10px">${last.map(x => `<div class="${x.t ? 'td' : ''}" style="height:${Math.max(3, x.xp / mx * 100)}%" title="${x.xp}"></div>`).join('')}</div><div class="bars-l">${last.map(x => `<span>${x.d.getDate()}</span>`).join('')}</div></div>
  <div class="card"><h3>Percentuale corretta</h3><table class="tbl"><tr><th>Sezione</th>${LEVELS.map(l => `<th>${LV[l]}</th>`).join('')}</tr>${['kana', 'kanji', 'vocab', 'gram', 'read', 'asc', 'ex'].map(s => `<tr><td>${SEC[s].t}</td>${s === 'kana' ? cell(s, 'n5') + '<td></td><td></td>' : LEVELS.map(l => cell(s, l)).join('')}</tr>`).join('')}</table></div>
  <div class="card"><h3>Avanzamento SRS</h3>${LEVELS.map(l => { const k = deckStats('kanji', l), v = deckStats('vocab', l); return k.total + v.total ? `<div style="margin:10px 0"><span class="lvl ${l}">${LV[l]}</span> <span class="small mut">kanji ${k.learned}/${k.total} (${k.mature} consolidati) · parole ${v.learned}/${v.total} (${v.mature})</span>${bar(pct(k.learned + v.learned, k.total + v.total), `var(--${l})`)}</div>` : ''; }).join('')}</div>
  <div class="card"><h3>🎯 Punti deboli</h3>${weak.length ? weak.map(w => `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="jp" style="flex:1">${esc(nameOf(w.id))}</span><span class="tag">${w.v.ok}✓ ${w.v.ko}✗</span></div>`).join('') + `<a class="btn primary" style="margin-top:12px" href="#/ex/weak/${S.set.cur}">Ripassa i punti deboli</a>` : '<p class="mut">Ancora nessun punto debole: continua a esercitarti!</p>'}</div>
  <div class="card"><h3>✅ Ripassi consigliati</h3>
    ${totalDue() ? `<a class="item" href="#/srs/all/all" style="box-shadow:none;background:var(--bg2)"><div style="flex:1"><b>${totalDue()} carte SRS</b> in scadenza</div>›</a>` : '<p class="small mut">Nessuna carta SRS in scadenza.</p>'}
    ${gramLow.map(g => `<a class="item" href="#/g/${g.id}" style="box-shadow:none;background:var(--bg2)"><div style="flex:1" class="jp">Rivedi: ${rich(g.t)}</div>›</a>`).join('')}
    ${weakSecs.map(([s, l, t]) => `<p class="small">⚠️ ${SEC[s].t} ${LV[l]}: ${t.pct}% di risposte corrette. <a class="back" style="margin:0;display:inline" href="#/practice">Allenati</a></p>`).join('')}</div>
  <div class="sec-t"><h2>Badge</h2><span class="small mut">${Object.keys(S.badges).length}/${BADGES.length}</span></div>
  <div class="grid3">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? '' : 'off'}" title="${esc(b.d)}"><div class="e jp">${b.e}</div>${esc(b.t)}<span class="tiny mut" style="font-weight:500">${esc(b.d)}</span></div>`).join('')}</div>
  ${S.exams.length ? `<div class="sec-t"><h2>Simulazioni</h2></div>${S.exams.slice(-5).reverse().map(e => `<div class="item"><span class="lvl ${e.lv}">${LV[e.lv]}</span><div style="flex:1"><div class="t">${e.total}/180 ${e.pass ? '🏆 promosso' : ''}</div><div class="d">${fmtDate(e.date)}</div></div></div>`).join('')}` : ''}</div>`;
};

/* ---------- Impostazioni ---------- */
V.settings = function () {
  const voices = AU.voices, vopt = sel => `<option value="">Automatica</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${sel === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}`;
  const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(S.set[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const sw = (k, t, d) => `<div class="setrow"><div style="flex:1"><div class="b">${t}</div><div class="small mut">${d || ''}</div></div><button class="switch ${S.set[k] ? 'on' : ''}" data-sw="${k}" aria-label="${t}"></button></div>`;
  view().innerHTML = `<div class="page">${back('#/home', 'Home')}<h1>Impostazioni ⚙️</h1>
  <div class="card"><h3>Furigana</h3><p class="small mut">Si applica a tutti i testi giapponesi dell’app.</p>${seg('furi', [['always', 'Sempre'], ['tap', 'Tocca'], ['hide', 'Nascondi']])}<div class="card flat jp jp-l" style="margin-top:10px">{私|わたし}は{学生|がくせい}です。</div></div>
  <div class="card"><h3>Aspetto</h3>${seg('theme', [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']])}</div>
  <div class="card"><h3>Obiettivi</h3><div class="small mut" style="margin:8px 0 4px">Obiettivo giornaliero (XP)</div>${seg('goal', [[30, '30'], [50, '50'], [100, '100'], [150, '150']])}<div class="small mut" style="margin:12px 0 4px">Nuove carte al giorno</div>${seg('newPerDay', [[5, '5'], [10, '10'], [20, '20'], [30, '30']])}
  <div class="small mut" style="margin:12px 0 4px">Livelli in studio (audio offline)</div><div class="chips" id="lvs">${LEVELS.map(l => `<button class="chip ${S.set.levels.includes(l) ? 'on' : ''}" data-lv="${l}">${LV[l]}</button>`).join('')}</div></div>
  <div class="card"><h3>Audio</h3><div class="small mut" style="margin:8px 0 4px">Velocità predefinita</div>${seg('rate', [[0.7, '0,7×'], [0.85, '0,85×'], [1, '1×']])}
  <div class="small mut" style="margin:12px 0 4px">Voce femminile</div><select id="vF">${vopt(S.set.voiceF)}</select><div class="small mut" style="margin:12px 0 4px">Voce maschile</div><select id="vM">${vopt(S.set.voiceM)}</select>
  ${voices.length ? '' : '<p class="small" style="color:var(--ko)">Nessuna voce giapponese trovata. Su iPhone: Impostazioni › Accessibilità › Contenuti vocali › Voci › Giapponese. Su Android: Impostazioni › Sintesi vocale.</p>'}
  <div class="grid2" style="margin-top:10px"><button class="btn sm" id="tF">▶ Prova voce F</button><button class="btn sm" id="tM">▶ Prova voce M</button></div>
  ${sw('showRomaji', 'Mostra il romaji', 'Sotto le letture di kanji e parole (le tabelle dei kana lo mostrano sempre)')}${sw('sounds', 'Suoni di feedback', 'Effetti per risposte giuste e sbagliate')}${sw('romaji', 'Romaji → kana nei dettati', 'Scrivi “konnichiwa”, ottieni こんにちは')}
  <div class="setrow"><div style="flex:1"><div class="b">Audio offline (m4a)</div><div class="small mut">Scarica gli audio presenti nella cartella audio/ per i livelli in studio</div></div><button class="btn sm" id="dlau">Scarica</button></div>
  <div class="setrow"><div style="flex:1"><div class="b">Elenco audio da generare</div><div class="small mut">File CSV con testo e voce di ogni audio previsto</div></div><button class="btn sm" id="csv">CSV</button></div></div>
  <div class="card"><h3>Piano di studio</h3><div class="small mut" style="margin:8px 0 4px">Data dell’esame</div><input type="date" id="exd" value="${S.set.examDate}"><div class="small mut" style="margin:12px 0 4px">Inizio del piano</div><input type="date" id="pls" value="${S.set.planStart}"></div>
  <div class="card"><h3>Backup dei progressi</h3><p class="small mut">I dati sono salvati solo su questo dispositivo. Esporta un backup ogni tanto (e prima di cambiare telefono).${memOnly ? '<br><b style="color:var(--ko)">Attenzione: il salvataggio del browser non è disponibile.</b>' : ''}</p><div class="grid2"><button class="btn" id="exp">⬇ Esporta</button><button class="btn" id="imp">⬆ Importa</button></div><input type="file" id="impf" accept="application/json,.json" class="hide"></div>
  <div class="card"><h3>App</h3><p class="small mut">Versione ${APP_VERSION} · funziona offline dopo la prima apertura.</p><button class="btn" id="upd">Cerca aggiornamenti</button><button class="btn ghost ko" id="rst" style="margin-top:10px;color:var(--ko)">Azzera tutti i progressi</button>
  <p class="tiny mut" style="margin-top:12px">Crediti: ordine dei tratti da KanjiVG (© Ulrich Apel, CC BY-SA 3.0). Letture dei kanji verificate con KANJIDIC2 (EDRDG, CC BY-SA 4.0). Voci degli audio pre-registrati: VOICEVOX:四国めたん, VOICEVOX:青山龍星. Frasi d’esempio da Tatoeba (tatoeba.org, CC BY 2.0 FR, © i rispettivi autori). Contenuti didattici in parte generati con l’aiuto di un assistente IA: vedi NOTE.md.</p></div></div>`;
  $$('.seg[data-k] button').forEach(b => b.onclick = () => { const k = b.parentNode.dataset.k, v = b.dataset.v; S.set[k] = isNaN(+v) ? v : +v; save(); applySettings(); $$('button', b.parentNode).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-sw]').forEach(b => b.onclick = () => { S.set[b.dataset.sw] = !S.set[b.dataset.sw]; save(); applySettings(); b.classList.toggle('on'); });
  $$('#lvs .chip').forEach(b => b.onclick = () => { const l = b.dataset.lv, a = S.set.levels; S.set.levels = a.includes(l) ? a.filter(x => x !== l) : [...a, l]; save(); b.classList.toggle('on'); });
  $('#vF').onchange = e => { S.set.voiceF = e.target.value; save(); }; $('#vM').onchange = e => { S.set.voiceM = e.target.value; save(); };
  $('#tF').onclick = () => AU.speak('こんにちは。わたしは にほんごを べんきょうしています。', { who: 'F' }); $('#tM').onclick = () => AU.speak('こんにちは。わたしは にほんごを べんきょうしています。', { who: 'M' });
  $('#exd').onchange = e => { if (e.target.value) { S.set.examDate = e.target.value; save(); } }; $('#pls').onchange = e => { if (e.target.value) { S.set.planStart = e.target.value; save(); } };
  $('#exp').onclick = exportBackup; $('#imp').onclick = () => $('#impf').click();
  $('#impf').onchange = e => { const f = e.target.files[0]; if (f) importBackup(f, ok => { if (ok) { applySettings(); toast('Backup importato!', '✅'); V.settings(); } else toast('File di backup non valido', '⚠️'); }); };
  $('#csv').onclick = () => { const blob = new Blob(['﻿' + audioCsv()], { type: 'text/csv' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'elenco-audio.csv'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); };
  $('#dlau').onclick = async () => { const b = $('#dlau'); b.disabled = true; const r = await cacheAudio(S.set.levels, (n, t) => b.textContent = `${n}/${t}`); b.disabled = false; b.textContent = 'Scarica'; toast(r.tot ? `Audio offline: ${r.ok} file su ${r.tot}` : 'Nessun audio previsto', '🎧'); };
  $('#upd').onclick = () => checkUpdate(true);
  $('#rst').onclick = () => { sheet(`<h2>Azzerare tutto?</h2><p class="mut">Cancella XP, serie, SRS e statistiche su questo dispositivo. Esporta prima un backup se vuoi poterli recuperare.</p><div class="grid2" style="margin-top:14px"><button class="btn" id="n">Annulla</button><button class="btn ko" id="y">Azzera</button></div>`); $('#n').onclick = closeSheet; $('#y').onclick = () => { const s = S.set; S = DEF(); S.set = s; saveNow(); closeSheet(); toast('Progressi azzerati'); nav('#/home'); }; };
};
