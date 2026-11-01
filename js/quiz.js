'use strict';
/* Motore esercizi: scelta multipla, riordino, abbinamento, dettato, shadowing, ascolto + generatori */
const TYL = { mc: 'Scelta multipla', cloze: 'Completamento', part: 'Particella', trad: 'Traduzione', ord: 'Riordino', mat: 'Abbinamento', kan: 'Lettura dei kanji', star: 'Costruzione ★', voc: 'Vocabolario', kana: 'Kana', lis: 'Ascolto', mp: 'Coppie minime', num: 'Numeri, orari e prezzi', qr: 'Risposta rapida', dic: 'Dettato', shd: 'Shadowing', read: 'Comprensione' };
const Q = { gen: {} };

/* ---------- romaji → kana (per scrivere senza tastiera giapponese) ---------- */
const ROM = (() => {
  const m = {}, V = 'aiueo', rows = { '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  for (const c in rows) [...V].forEach((v, i) => m[c + v] = rows[c][i]);
  Object.assign(m, { ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', si: 'し', shi: 'し', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', hu: 'ふ', fu: 'ふ', zi: 'じ', ji: 'じ', di: 'ぢ', du: 'づ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', xtu: 'っ', ltu: 'っ' });
  const sm = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
  ['k', 'g', 'n', 'h', 'm', 'r', 'b', 'p'].forEach(c => ['a', 'u', 'o'].forEach(v => m[c + 'y' + v] = rows[c][1] + sm[v]));
  [['sh', 'し'], ['ch', 'ち'], ['j', 'じ'], ['sy', 'し'], ['ty', 'ち'], ['zy', 'じ'], ['jy', 'じ'], ['dy', 'ぢ']].forEach(([c, b]) => { ['a', 'u', 'o'].forEach(v => m[c + v] = b + sm[v]); m[c + 'e'] = b + 'ぇ'; });
  return m;
})();
function rom2kana(s, fin) {
  s = String(s).toLowerCase(); let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!/[a-z'\-]/.test(c)) { out += c; i++; continue; }
    if (c === '-') { out += 'ー'; i++; continue; }
    if (i + 1 < s.length && c === s[i + 1] && /[kstpcgzdbfhjmrwy]/.test(c)) { out += 'っ'; i++; continue; }
    if (c === 'n') {
      const nx = s[i + 1];
      if (nx === "'") { out += 'ん'; i += 2; continue; }
      if (nx === 'n') { const n2 = s[i + 2]; out += 'ん'; i += (n2 === undefined || !/[aiueoy]/.test(n2)) ? 2 : 1; continue; }
      if (nx === undefined) { out += fin ? 'ん' : 'n'; i++; continue; }
      if (!/[aiueoy]/.test(nx)) { out += 'ん'; i++; continue; }
    }
    let m = false;
    for (let L = 3; L >= 1; L--) { const sub = s.substr(i, L); if (ROM[sub]) { out += ROM[sub]; i += L; m = true; break; } }
    if (!m) { out += c; i++; }
  }
  return out;
}

/* ---------- numeri, orari, date, prezzi ---------- */
const NUM = (() => {
  const D1 = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  const b10k = n => {
    let s = ''; const th = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), t = Math.floor(n % 100 / 10), u = n % 10;
    if (th) s += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : D1[th] + 'せん';
    if (h) s += h === 1 ? 'ひゃく' : h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : D1[h] + 'ひゃく';
    if (t) s += t === 1 ? 'じゅう' : D1[t] + 'じゅう';
    if (u) s += D1[u];
    return s;
  };
  const num = n => { if (n === 0) return 'ゼロ'; const man = Math.floor(n / 10000), r = n % 10000; return (man ? b10k(man) + 'まん' : '') + (r ? b10k(r) : ''); };
  const yen = n => { let s = num(n); if (n % 10 === 4) s = s.replace(/よん$/, 'よ'); return s + 'えん'; };
  const HOUR = ['', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ'];
  const MU = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん', 'じゅっぷん'], TENS = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう'];
  const mins = m => { if (m === 0) return ''; if (m === 30) return 'はん'; if (m <= 10) return MU[m]; const t = Math.floor(m / 10), u = m % 10; return u === 0 ? TENS[t].replace(/じゅう$/, 'じゅっ') + 'ぷん' : TENS[t] + MU[u]; };
  const time = (h, m, pm) => (pm === undefined ? '' : pm ? 'ごご' : 'ごぜん') + HOUR[h] + mins(m);
  const MON = ['', 'いちがつ', 'にがつ', 'さんがつ', 'しがつ', 'ごがつ', 'ろくがつ', 'しちがつ', 'はちがつ', 'くがつ', 'じゅうがつ', 'じゅういちがつ', 'じゅうにがつ'];
  const DAY = ['', 'ついたち', 'ふつか', 'みっか', 'よっか', 'いつか', 'むいか', 'なのか', 'ようか', 'ここのか', 'とおか', 'じゅういちにち', 'じゅうににち', 'じゅうさんにち', 'じゅうよっか', 'じゅうごにち', 'じゅうろくにち', 'じゅうしちにち', 'じゅうはちにち', 'じゅうくにち', 'はつか', 'にじゅういちにち', 'にじゅうににち', 'にじゅうさんにち', 'にじゅうよっか', 'にじゅうごにち', 'にじゅうろくにち', 'にじゅうしちにち', 'にじゅうはちにち', 'にじゅうくにち', 'さんじゅうにち', 'さんじゅういちにち'];
  const date = (m, d) => MON[m] + DAY[d];
  const WD = ['にちようび', 'げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび', 'どようび'], WDK = '日月火水木金土';
  return { num, yen, time, date, mins, WD, WDK, MON, DAY };
})();
function distinct(correct, cands, n = 3) { const s = new Set([correct]); cands.forEach(c => { if (s.size < n + 1 && c !== undefined && !s.has(c)) s.add(c); }); return [...s]; }
Q.gen.numeri = function (n = 6, kinds = ['yen', 'time', 'date', 'num']) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = kinds[i % kinds.length]; let it;
    if (k === 'yen' || k === 'num') {
      const v = k === 'yen' ? (1 + rnd(99)) * one([10, 100, 100, 1000, 10, 10000]) : one([rnd(90) + 11, rnd(900) + 100, (rnd(9) + 1) * 100 + rnd(60), (rnd(9) + 1) * 1000 + rnd(500)]);
      const f = x => k === 'yen' ? x.toLocaleString('ja-JP') + '円' : String(x);
      const near = [v * 10, v % 10 === 0 ? v / 10 : v + 1, v + one([10, 100, 1000]), v - one([10, 100]), +String(v).split('').reverse().join('')];
      const opts = distinct(f(v), near.filter(x => x > 0).map(f));
      while (opts.length < 4) opts.push(f(v + (opts.length + 1) * one([1, 10, 100])));
      const rd = k === 'yen' ? NUM.yen(v) : NUM.num(v);
      it = { ty: 'num', q: k === 'yen' ? 'Quanto costa?' : 'Che numero hai sentito?', au: { t: rd }, o: opts, a: 0, e: `${rd} → ${f(v)}`, tr: rd };
    } else if (k === 'time') {
      const h = 1 + rnd(12), m = one([0, 0, 15, 30, 45, 5, 10, 20, 40, 50, 25, 35]), pm = rnd(2) === 1;
      const f = (hh, mm) => `${hh}:${String(mm).padStart(2, '0')}`;
      const opts = distinct(f(h, m), [f(h, one([0, 15, 30, 45].filter(x => x !== m))), f(h % 12 + 1, m), f(((h + 10) % 12) + 1, m), f(h, (m + 10) % 60), f(h === 4 ? 7 : h === 7 ? 4 : (h + 2) % 12 + 1, m)]);
      const rd = NUM.time(h, m, pm);
      it = { ty: 'num', q: 'Che ora è?', au: { t: rd }, o: opts, a: 0, e: `${rd} → ${f(h, m)} (${pm ? 'pomeriggio' : 'mattina'})`, tr: rd };
    } else {
      const mo = 1 + rnd(12), d = 1 + rnd(28), f = (mm, dd) => `${mm}月${dd}日`;
      const opts = distinct(f(mo, d), [f(mo, d + 1 > 28 ? d - 1 : d + 1), f(mo % 12 + 1, d), f(mo, d > 10 ? d - 10 : d + 10), f(mo === 4 ? 7 : mo === 7 ? 4 : (mo + 2) % 12 + 1, d), f(mo, d > 2 ? d - 2 : d + 2)]);
      const rd = NUM.date(mo, d);
      it = { ty: 'num', q: 'Che data hai sentito?', au: { t: rd }, o: opts, a: 0, e: `${rd} → ${f(mo, d)}`, tr: rd };
    }
    it.sec = 'asc'; it.sid = 'asc:num'; out.push(it);
  }
  return out;
};

/* ---------- generatori dinamici dai dati ---------- */
const wordsOf = lvs => [].concat(lvs).flatMap(l => DB.words[l] || []);
const hasKanji = w => KANJI_RE.test(w.w);
function distract(pool, w, key, n = 3, near) {
  const bad = new Set([w[key]]);
  let c = shuffle(pool.filter(x => x[key] && !bad.has(x[key]) && (!near || Math.abs(x[key].length - w[key].length) <= 1)));
  const out = []; for (const x of c) { if (!bad.has(x[key])) { bad.add(x[key]); out.push(x[key]); } if (out.length >= n) break; }
  if (out.length < n) for (const x of shuffle(pool)) { if (!bad.has(x[key]) && x[key]) { bad.add(x[key]); out.push(x[key]); } if (out.length >= n) break; }
  return out;
}
Q.gen.kanjiRead = (lvs, n = 8) => {
  const pool = wordsOf(lvs), ws = pick(pool.filter(hasKanji), n);
  return ws.map(w => ({ ty: 'kan', sec: 'kanji', lv: w.lv, sid: w.src, q: `「${w.w}」の読みかたは？`, o: [w.r, ...distract(pool, w, 'r', 3, true)], a: 0, e: `${w.w} = ${w.r}（${w.it}）`, au: null, say: { t: w.r } }));
};
Q.gen.kanjiWrite = (lvs, n = 6) => {
  const pool = wordsOf(lvs).filter(hasKanji), ws = pick(pool, n);
  return ws.map(w => ({ ty: 'kan', sec: 'kanji', lv: w.lv, sid: w.src, q: `「${w.r}」を漢字で書くと？`, o: [w.w, ...distract(pool, w, 'w', 3, true)], a: 0, e: `${w.r} = ${w.w}（${w.it}）` }));
};
Q.gen.kanjiMeaning = (lvs, n = 6) => {
  const ks = [].concat(lvs).flatMap(l => DB.kanji[l] || []), sel = pick(ks, n);
  return sel.map(k => ({ ty: 'kan', sec: 'kanji', lv: k.lv, sid: k.id, q: `Che cosa significa il kanji 「${k.k}」?`, o: [k.it, ...pick(ks.filter(x => x.it !== k.it), 3).map(x => x.it)], a: 0, e: `${k.k}: ${k.it}. On: ${k.on.join('・') || '–'} · Kun: ${k.kun.join('・') || '–'}` }));
};
Q.gen.vocab = (lvs, n = 8, rev) => {
  const pool = wordsOf(lvs), ws = pick(pool, n);
  return ws.map(w => {
    const ds = distract(pool, w, 'it', 3);
    return rev ? { ty: 'voc', sec: 'vocab', lv: w.lv, sid: w.src, q: `Come si dice 「${w.it}」?`, o: [w.w, ...distract(pool, w, 'w', 3)], oh: null, a: 0, e: `${w.it} = ${w.w}（${w.r}）` }
      : { ty: 'voc', sec: 'vocab', lv: w.lv, sid: w.src, qh: `<span class="jp-big">${wr(w.w, w.r)}</span>`, q: 'Che cosa significa?', o: [w.it, ...ds], a: 0, e: `${w.w}（${w.r}）= ${w.it}`, say: { t: w.r } };
  });
};
function blankWord(ex, w) { // sostituisce w nella frase con markup con ＿＿ mantenendo le furigana altrove
  const toks = []; ex.split(/(\{[^|{}]+\|[^{}]+\})/).forEach(p => { const m = /^\{([^|{}]+)\|([^{}]+)\}$/.exec(p); if (m) toks.push({ b: m[1], raw: p }); else [...p].forEach(ch => toks.push({ b: ch, raw: ch })); });
  const pl = toks.map(t => t.b).join(''), idx = pl.indexOf(w); if (idx < 0) return null;
  let pos = 0, first = -1, last = -1;
  toks.forEach((t, i) => { const s = pos, e = pos + t.b.length; if (e > idx && s < idx + w.length) { if (first < 0) first = i; last = i; } pos = e; });
  if (toks.slice(first, last + 1).map(t => t.b).join('') !== w) return null;
  return toks.slice(0, first).map(t => t.raw).join('') + '＿＿' + toks.slice(last + 1).map(t => t.raw).join('');
}
Q.gen.vocabFill = (lvs, n = 6) => {
  const vs = [].concat(lvs).flatMap(l => DB.vocab[l] || []).filter(v => v.ex), out = [];
  for (const v of shuffle(vs)) {
    const q = blankWord(v.ex, v.w); if (!q) continue;
    const pool = [].concat(lvs).flatMap(l => DB.vocab[l]).filter(x => x.w !== v.w && (x.p || '') === (v.p || ''));
    out.push({ ty: 'cloze', sec: 'vocab', lv: v.lv, sid: v.id, q, qi: v.et, o: [v.w, ...pick(pool, 3).map(x => x.w)], a: 0, e: `${v.w}（${v.r || v.w}）= ${v.it}` });
    if (out.length >= n) break;
  }
  return out.filter(x => x.o.length === 4);
};
Q.gen.kana = (script = 'hira', n = 10, mode, groups = ['base', 'daku']) => {
  const all = []; DB.kana.groups.filter(g => groups.includes(g.id)).forEach(g => g.rows.forEach(r => r.forEach(([k, ro]) => all.push([script === 'kata' ? toKata(k) : k, ro]))));
  const sel = pick(all, n);
  return sel.map(([k, ro]) => {
    const m = mode || one(['k2r', 'r2k', 'listen']);
    const ds = pick(all.filter(x => x[0] !== k && x[1] !== ro), 3);
    const base = { sec: 'kana', lv: 'n5', sid: 'kana:' + k, ty: 'kana' };
    if (m === 'k2r') return { ...base, qh: `<div class="kanji-big c">${k}</div>`, q: 'Come si legge?', o: [ro, ...ds.map(x => x[1])], a: 0, e: `${k} = ${ro}` };
    if (m === 'r2k') return { ...base, qh: `<div class="kanji-big c" style="font-family:var(--ui);font-size:64px">${ro}</div>`, q: 'Quale kana è?', o: [k, ...ds.map(x => x[0])], a: 0, e: `${ro} = ${k}` };
    return { ...base, q: 'Che suono hai sentito?', au: { t: k }, o: [k, ...ds.map(x => x[0])], a: 0, e: `${k} = ${ro}`, tr: k };
  });
};
// banca esercizi: file esercizi-nX.json + esercizi delle schede di grammatica
Q.bank = (lvs, types) => {
  let out = [];
  [].concat(lvs).forEach(l => {
    (DB.es[l] || []).forEach((e, i) => out.push({ ...e, lv: l, sec: e.sec || 'ex', sid: e.sid || `es:${l}:${i}` }));
    (DB.gram[l] || []).forEach(g => (g.es || []).forEach((e, i) => out.push({ ...e, lv: l, sec: 'gram', sid: 'g:' + g.id, gid: g.id })));
  });
  if (types) out = out.filter(e => types.includes(e.ty));
  return out;
};
Q.mix = (lv, n = 10) => {
  const bank = Q.bank(lv).filter(e => e.ty !== 'mat' || true);
  const gens = [...(Q.gen.fr ? Q.gen.fr.mix(lv, 3) : []), ...Q.gen.kanjiRead(lv, 3), ...Q.gen.vocab(lv, 3), ...Q.gen.vocabFill(lv, 2), ...Q.gen.kanjiMeaning(lv, 2)];
  return pick([...pick(bank, Math.ceil(n * .6)), ...gens], n);
};
Q.listenSet = (lv, n = 6) => {
  const a = DB.asc[lv] || {}, out = [];
  (a.dialoghi || []).forEach(d => (d.q || []).forEach(q => out.push({ ty: 'lis', sec: 'asc', lv, sid: d.id, au: { dlg: d.righe, id: d.id, lv, v: d.v }, q: q.q, qj: q.qj, o: q.o, a: q.a, e: q.e })));
  (a.coppie || []).forEach(c => out.push(Q.pairItem(c, lv)));
  (a.risposte || []).forEach(c => out.push({ ty: 'qr', sec: 'asc', lv, sid: c.id, q: 'Qual è la risposta più naturale?', au: { t: c.p, f: `${lv}/${c.id}`, who: c.g || 'M' }, o: c.o, a: c.a ?? 0, e: c.e, tr: `${c.p}\n${c.i || ''}` }));
  return pick(out, n).concat(n > 5 ? Q.gen.numeri(Math.min(3, Math.floor(n / 4))) : []);
};
Q.pairItem = (c, lv) => { const sayA = rnd(2) === 0, w = sayA ? c.a : c.b; return { ty: 'mp', sec: 'asc', lv, sid: 'asc:' + c.id, q: 'Quale parola hai sentito?', au: { t: w, f: `${lv}/${c.id}${sayA ? 'a' : 'b'}`, who: 'F' }, o: [c.a, c.b], a: sayA ? 0 : 1, noshuf: false, two: true, e: `「${c.a}」= ${c.ia || ''} · 「${c.b}」= ${c.ib || ''}${c.cat ? ' (' + c.cat + ')' : ''}`, tr: w }; };

/* ---------- normalizzazione item ---------- */
function qNorm(it) {
  it = { ...it };
  if (it.ty === 'star') {
    const s = it.star ?? 2; it.q = `${it.pre || ''}${it.ch.map((_, i) => i === s ? '★' : '＿＿').join(' ')}${it.post || ''}`; it.qi = 'Disponi le 4 parti in ordine: quale va nel ★?'; it.o = it.ch; it.a = s;
    it.e = (it.e ? it.e + '\n' : '') + 'Frase completa: ' + (it.pre || '') + it.ch.join('') + (it.post || '');
  }
  it.kind = it.ty === 'ord' ? 'ord' : it.ty === 'mat' ? 'mat' : it.ty === 'dic' ? 'dic' : it.ty === 'shd' ? 'shd' : 'mc';
  it.sec = it.sec || 'ex'; it.lv = it.lv || S.set.cur;
  return it;
}
function diffChars(user, ans) {
  const a = [...user], b = [...ans], n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i; for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const ops = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { ops.push({ c: a[i - 1], t: a[i - 1] === b[j - 1] ? 'ok' : 'ko' }); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push({ c: a[i - 1], t: 'ko' }); i--; }
    else { ops.push({ c: '＿', t: 'miss' }); j--; }
  }
  return ops.reverse();
}
const normKana = s => toHira(String(s)).replace(/[^\p{L}\p{N}]/gu, '');

/* ---------- esecuzione ---------- */
Q.run = function (items, o = {}) {
  const st = { items: items.map(qNorm), i: 0, ok: 0, wrong: [], ans: [], tools: { tr: false, furi: false, it: false }, tick: null, left: o.time || 0, done: false };
  st.total = st.items.length;
  document.body.classList.add('focus'); window.scrollTo(0, 0);
  const exit = () => { clearInterval(st.tick); AU.stop(); document.body.classList.remove('focus'); if (o.onExit) o.onExit(); else nav(o.back || '#/practice'); };
  const root = () => $('.qwrap');

  function draw() {
    const it = st.items[st.i], pct = Math.round(st.i / st.items.length * 100);
    view().innerHTML = `<div class="qwrap" style="--qc:var(--s-${(SEC[it.sec] || SEC.ex).c})">
      <div class="qhead"><button class="x" id="qx" aria-label="Esci">✕</button><div class="qbar"><i style="width:${pct}%"></i></div>${o.time ? `<div class="timer" id="qt"></div>` : ''}<div class="qcount">${st.i + 1}/${st.items.length}</div></div>
      <div class="qbody" id="qb"></div><div class="qfoot" id="qf"></div></div>`;
    $('#qx').onclick = () => {
      sheet(`<h2>Vuoi uscire?</h2><p class="mut">${o.exam ? 'La simulazione verrà interrotta.' : 'I progressi di questa lezione andranno persi.'}</p><div class="grid2" style="margin-top:14px"><button class="btn" id="qc">Continua</button><button class="btn ko" id="qe">Esci</button></div>`);
      $('#qc').onclick = closeSheet; $('#qe').onclick = () => { closeSheet(); exit(); };
    };
    if (o.time) tickDraw();
    setTimeout(() => $('.qbar i') && ($('.qbar i').style.width = pct + '%'), 20);
    ({ mc: drawMC, ord: drawOrd, mat: drawMat, dic: drawDic, shd: drawShd })[it.kind](it);
  }
  function tickDraw() { const e = $('#qt'); if (!e) return; const m = Math.floor(st.left / 60), s = st.left % 60; e.textContent = `${m}:${String(s).padStart(2, '0')}`; e.classList.toggle('low', st.left <= 60); }
  if (o.time) st.tick = setInterval(() => { st.left--; tickDraw(); if (st.left <= 0) { clearInterval(st.tick); finish(true); } }, 1000);

  function head(it) { return `<span class="qty">${esc(TYL[it.ty] || 'Esercizio')}</span>`; }
  function auPanel(it) {
    if (!it.au) return '';
    return `<div class="audio-panel"><button class="play" id="qplay" aria-label="Ascolta">${ICON_PLAY}</button><div><div class="b">Ascolta${it.au.dlg ? ' il dialogo' : ''}</div><div class="tiny mut">Tocca per ripetere</div></div>${rateChips()}</div>
      <div class="chips" style="margin-top:-6px"><button class="chip tg ${st.tools.tr ? 'on' : ''}" data-tg="tr">Trascrizione</button><button class="chip tg ${st.tools.furi ? 'on' : ''}" data-tg="furi">Furigana</button><button class="chip tg ${st.tools.it ? 'on' : ''}" data-tg="it">Traduzione</button></div>
      <div id="trbox"></div>`;
  }
  function trHtml(it, answered) {
    if (!it.au && !it.tr) return '';
    const showJ = answered || st.tools.tr, showI = (answered && S.set.trans) || st.tools.it; if (!showJ && !showI) return '';
    let h = '';
    if (it.au && it.au.dlg) h = it.au.dlg.map(l => `<div class="l"><span class="s">${esc(l.s)}</span><div>${showJ ? `<div class="jp">${rich(l.t)}</div>` : ''}${showI && l.i ? `<div class="small mut">${esc(l.i)}</div>` : ''}</div></div>`).join('');
    else { const [j, i] = String(it.tr || (it.au && it.au.t) || '').split('\n'); h = `<div class="l"><div>${showJ ? `<div class="jp">${rich(j)}</div>` : ''}${showI && i ? `<div class="small mut">${esc(i)}</div>` : ''}</div></div>`; }
    return `<div class="tr ${st.tools.furi ? 'furi-all' : ''}">${h}</div>`;
  }
  function bindAudio(it, answered) {
    if (!it.au) return;
    const play = () => { const b = $('#qplay'); b && b.classList.add('playing'); const p = it.au.dlg ? AU.seq(it.au.dlg, it.au.id, it.au.lv) : AU.say(it.au); Promise.resolve(p).then(() => b && b.classList.remove('playing')); };
    $('#qplay').onclick = play;
    $$('.tg').forEach(b => b.onclick = () => { st.tools[b.dataset.tg] = !st.tools[b.dataset.tg]; b.classList.toggle('on'); $('#trbox').innerHTML = trHtml(it, st.answeredNow); });
    $('#trbox').innerHTML = trHtml(it, false);
    if (it.auto !== false) setTimeout(play, 350);
  }

  /* scelta multipla */
  function drawMC(it) {
    const order = it.noshuf ? it.o.map((_, i) => i) : shuffle(it.o.map((_, i) => i));
    st.answeredNow = false;
    const lab = i => it.opAudio ? `<span class="oplay" data-oa="${i}" role="button" aria-label="Ascolta ${i + 1}">${ICON_PLAY}</span><b class="onum">${'①②③④'[i]}</b>` : `<b class="onum">${'①②③④'[i]}</b>`;
    const passH = it.pass ? `<div class="passage jp">${it.pass.split('\n\n').map(x => `<p>${rich(x)}</p>`).join('')}</div>` : (it.passHtml || '');
    $('#qb').innerHTML = `${head(it)}${it.ctx ? ' <button class="chip" id="qctx">📖 Rivedi il testo</button>' : ''}${auPanel(it)}${passH}${it.qh || ''}${it.q ? `<div class="qtext ${it.ty === 'trad' && /^[A-Za-zÀ-ÿ]/.test(it.q) ? 'it' : ''}">${rich(it.q)}</div>` : ''}${it.qi ? `<div class="small mut" style="margin:-8px 0 12px">${rich(it.qi)}</div>` : ''}
      ${it.say ? `<div style="margin:-8px 0 12px">${spk(it.say.t)}</div>` : ''}
      <div class="opts ${it.two ? 'two' : ''}">${order.map(i => `<button class="opt ${it.opHide || it.opAudio ? 'hid' : ''}" data-i="${i}">${it.opHide || it.opAudio ? lab(i) : it.oh && it.oh[i] ? it.oh[i] : rich(it.o[i])}</button>`).join('')}</div>`;
    bindAudio(it);
    $$('.oplay').forEach(b => b.onclick = e => { e.stopPropagation(); AU.stop(); b.classList.add('playing'); const i = +b.dataset.oa; AU.say({ t: it.oa ? it.oa[i] : it.o[i], who: it.ow || 'F' }).then(() => b.classList.remove('playing')); });
    const reveal = () => { if (it.opHide || it.opAudio) $$('.opt.hid').forEach(x => x.insertAdjacentHTML('beforeend', `<span class="jp" style="margin-left:10px">${rich(it.o[+x.dataset.i])}</span>`)); };
    if (it.ctx) $('#qctx').onclick = () => { window.__gl = (DB.byId[it.ctx] || {}).gl; sheet(`<h3 class="jp">${rich((DB.byId[it.ctx] || {}).t)}</h3>${Q.ctxHtml(it.ctx)}`); };
    if (o.exam) {
      $('#qf').innerHTML = `<button class="btn primary" id="qn">${st.i + 1 === st.items.length ? 'Termina' : 'Avanti'}</button>`;
      $$('.opt').forEach(b => b.onclick = () => { $$('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); st.ans[st.i] = +b.dataset.i; });
      $('#qn').onclick = () => { AU.stop(); st.ok += st.ans[st.i] === it.a ? 1 : 0; next(); };
      return;
    }
    $$('.opt').forEach(b => b.onclick = () => {
      if (st.answeredNow) return; st.answeredNow = true;
      const pick = +b.dataset.i, ok = pick === it.a; AU.stop();
      reveal();
      $$('.opt').forEach(x => { x.classList.add('dim'); if (+x.dataset.i === it.a) { x.classList.remove('dim'); x.classList.add('right'); } });
      if (!ok) { b.classList.remove('dim'); b.classList.add('wrong'); }
      $('#trbox') && ($('#trbox').innerHTML = trHtml(it, true));
      if (!it.au && it.tr) $('.opts').insertAdjacentHTML('afterend', trHtml(it, true));
      answered(it, ok, it.e);
    });
  }

  /* riordino */
  function drawOrd(it) {
    const chips = shuffle([...it.w.map((t, i) => ({ t, i })), ...(it.x || []).map(t => ({ t, i: -1 }))]);
    let placed = [];
    $('#qb').innerHTML = `${head(it)}<div class="qtext it">${esc(it.i || 'Riordina la frase')}</div><div class="slots" id="slots"></div><div class="chipbank" id="bank"></div>`;
    const refresh = () => {
      $('#slots').innerHTML = placed.map((k, p) => `<button class="wchip" data-p="${p}">${rich(chips[k].t)}</button>`).join('');
      $('#bank').innerHTML = chips.map((c, k) => `<button class="wchip ${placed.includes(k) ? 'used' : ''}" data-k="${k}">${rich(c.t)}</button>`).join('');
      $$('#slots .wchip').forEach(b => b.onclick = () => { placed.splice(+b.dataset.p, 1); refresh(); });
      $$('#bank .wchip').forEach(b => b.onclick = () => { placed.push(+b.dataset.k); refresh(); });
      $('#qchk').disabled = !placed.length;
    };
    $('#qf').innerHTML = `<button class="btn primary" id="qchk" disabled>Controlla</button>`;
    refresh();
    $('#qchk').onclick = () => {
      const got = placed.map(k => plain(chips[k].t)).join(''), want = it.w.map(plain).join(''), ok = got === want;
      $$('.wchip').forEach(b => b.style.pointerEvents = 'none');
      $('#slots').style.borderColor = ok ? 'var(--ok)' : 'var(--ko)';
      answered(it, ok, `${ok ? '' : 'Ordine corretto: '}<div class="jp-l">${it.w.map(rich).join('')}</div>${it.e ? '<br>' + rich(it.e) : ''}`, true);
    };
  }

  /* abbinamento */
  function drawMat(it) {
    const L = it.p.map((p, i) => ({ t: p[0], i })), R = shuffle(it.p.map((p, i) => ({ t: p[1], i })));
    let sel = null, left = it.p.length, errs = 0;
    $('#qb').innerHTML = `${head(it)}<div class="qtext it">${esc(it.q || 'Abbina le coppie')}</div><div class="grid2"><div class="mcol" id="ml">${L.map(x => `<button class="mbtn" data-i="${x.i}">${rich(x.t)}</button>`).join('')}</div><div class="mcol" id="mr">${R.map(x => `<button class="mbtn" data-i="${x.i}">${rich(x.t)}</button>`).join('')}</div></div>`;
    $$('#ml .mbtn').forEach(b => b.onclick = () => { if (b.classList.contains('right')) return; $$('#ml .mbtn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; });
    $$('#mr .mbtn').forEach(b => b.onclick = () => {
      if (!sel || b.classList.contains('right')) return;
      if (b.dataset.i === sel.dataset.i) { b.classList.add('right'); sel.classList.remove('sel'); sel.classList.add('right'); sel = null; snd('ok'); if (--left === 0) answered(it, errs === 0, errs ? `Hai sbagliato ${errs} ${errs === 1 ? 'volta' : 'volte'}.` : 'Tutte le coppie giuste al primo colpo!', true); }
      else { errs++; b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 450); snd('ko'); }
    });
  }

  /* dettato in kana */
  function drawDic(it) {
    const want = [normKana(yomi(it.t)), ...(it.alt || []).map(normKana)];
    $('#qb').innerHTML = `${head(it)}<div class="audio-panel"><button class="play" id="qplay">${ICON_PLAY}</button><div><div class="b">Ascolta e scrivi in kana</div><div class="tiny mut">Puoi scrivere in romaji: si converte da solo</div></div>${rateChips()}</div>
      <input type="text" id="dic" class="dict jp" lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ひらがな…"><div id="dres"></div>`;
    const inp = $('#dic'); const play = () => AU.say({ t: it.t, f: it.f, who: it.g });
    $('#qplay').onclick = play; setTimeout(play, 350);
    inp.addEventListener('input', e => { if (e.isComposing || !S.set.romaji) return; const v = rom2kana(inp.value, false); if (v !== inp.value) inp.value = v; });
    $('#qf').innerHTML = `<div class="grid2"><button class="btn" id="qskip">Non lo so</button><button class="btn primary" id="qchk">Controlla</button></div>`;
    const check = skip => {
      const u = normKana(rom2kana(inp.value, true)); let ok = !skip && want.includes(u); inp.disabled = true; AU.stop();
      const best = want[0];
      const dif = skip ? '' : `<div class="diff jp c">${diffChars(u, best).map(x => `<span class="${x.t}">${esc(x.c)}</span>`).join('')}</div>`;
      $('#dres').innerHTML = `${dif}<div class="tr"><div class="jp jp-l">${rich(it.t)}</div>${it.i ? `<div class="small mut">${esc(it.i)}</div>` : ''}</div>`;
      answered(it, ok, ok ? 'Perfetto!' : `Corretto: <b class="jp">${esc(best)}</b>`, true);
    };
    $('#qchk').onclick = () => check(false); $('#qskip').onclick = () => check(true);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !inp.disabled) check(false); });
  }

  /* shadowing con registrazione */
  function drawShd(it) {
    let mr = null, stream = null, blob = null, url = '', recording = false, mine = null;
    $('#qb').innerHTML = `${head(it)}<div class="qtext ${st.tools.furi ? 'furi-all' : ''}">${rich(it.t)}</div><div class="small mut" style="margin:-8px 0 12px">${esc(it.i || '')}</div>
      <div class="audio-panel"><button class="play" id="qplay">${ICON_PLAY}</button><div><div class="b">Ascolta il modello</div><div class="tiny mut">Poi ripeti ad alta voce</div></div>${rateChips()}</div>
      <div class="card flat c"><div class="row" style="justify-content:center;gap:18px"><button class="rec-btn" id="rec" aria-label="Registra">●</button><div class="small mut" id="rhint" style="text-align:left;max-width:180px">Tocca per registrare, tocca di nuovo per fermare</div></div>
      <div id="mine" class="hide" style="margin-top:14px"><div class="grid2"><button class="btn" id="pm">▶ La mia voce</button><button class="btn" id="cmp">⇄ Confronta</button></div></div></div>`;
    const orig = () => AU.say({ t: it.t, f: it.f, who: it.g });
    $('#qplay').onclick = orig; setTimeout(orig, 350);
    const stopStream = () => { try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) { } };
    $('#rec').onclick = async () => {
      if (!recording) {
        if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Registrazione non supportata su questo dispositivo', '🎙️'); return; }
        try {
          AU.stop(); stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mt = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)); const chunks = [];
          mr = new MediaRecorder(stream, mt ? { mimeType: mt } : {}); mr.ondataavailable = e => e.data.size && chunks.push(e.data);
          mr.onstop = () => { blob = new Blob(chunks, { type: mr.mimeType || 'audio/mp4' }); if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); stopStream(); $('#mine').classList.remove('hide'); $('#rhint').textContent = 'Riascoltati e confronta con il modello'; $('#qf').innerHTML = `<div class="grid2"><button class="btn" id="bad">Da migliorare</button><button class="btn ok" id="good">Ben fatto!</button></div>`; $('#bad').onclick = () => answered(it, false, 'Riascolta il modello e riprova: la ripetizione è la chiave!', true); $('#good').onclick = () => answered(it, true, 'Ottima pronuncia, continua così!', true); };
          mr.start(); recording = true; $('#rec').classList.add('on'); $('#rec').textContent = '■'; $('#rhint').textContent = 'Sto registrando…';
        } catch (e) { toast('Permesso al microfono negato', '🎙️'); }
      } else { recording = false; $('#rec').classList.remove('on'); $('#rec').textContent = '●'; try { mr.stop(); } catch (e) { } }
    };
    const playMine = () => new Promise(r => { mine = new Audio(url); mine.onended = r; mine.onerror = r; mine.play().catch(r); });
    $('#pm').onclick = playMine;
    $('#cmp').onclick = async () => { await AU.say({ t: it.t, f: it.f, who: it.g }); await new Promise(r => setTimeout(r, 300)); await playMine(); };
    $('#qf').innerHTML = `<button class="btn ghost" id="sk">Salta</button>`; $('#sk').onclick = () => { stopStream(); next(); };
  }

  /* registrazione risposta + feedback */
  function answered(it, ok, expl, html) {
    if (it.sec === 'asc') bump('listen');
    if (it.sec === 'kana') bump('kana');
    if (!it.retry) { rec(it.sec, it.lv, ok, it.sid); if (ok) st.ok++; else st.wrong.push(it); }
    if (ok) { addXP(it.retry ? 3 : (it.sec === 'asc' ? 12 : 10)); snd('ok'); } else { snd('ko'); if (!it.retry) st.items.push({ ...it, retry: true }); }
    const msg = ok ? one(CHEER_OK) : one(CHEER_KO);
    $('#qf').innerHTML = `<div class="fb ${ok ? 'ok' : 'ko'}"><div class="h">${ok ? '✅' : '❌'} ${msg}</div>${expl ? `<div class="e">${html ? expl : rich(expl)}</div>` : ''}</div><button class="btn ${ok ? 'ok' : 'ko'}" id="qn" autofocus>Continua</button>`;
    $('#qn').onclick = next;
    $('#qf').scrollIntoView({ block: 'end', behavior: 'smooth' });
    if (ok && it.kind === 'mc') { /* piccolo bagliore */ }
  }
  function next() { AU.stop(); st.i++; if (st.i >= st.items.length) finish(); else draw(); }

  function finish(timeout) {
    if (st.done) return; st.done = true; clearInterval(st.tick); AU.stop();
    const real = st.total, ok = st.ok, pct = Math.round(ok / real * 100);
    bump('ex');
    if (o.exam) { document.body.classList.remove('focus'); o.onFinish({ items: st.items.slice(0, real), ans: st.ans, ok, n: real, timeout }); return; }
    const bonus = pct >= 90 ? 20 : pct >= 70 ? 10 : 5; addXP(bonus, true);
    if (real >= 5 && st.wrong.length === 0) { S.flags.perfect = 1; checkBadges(); }
    snd('done'); if (pct >= 70) confetti();
    const wrongs = [...new Map(st.wrong.map(w => [w.sid + w.q, w])).values()];
    view().innerHTML = `<div class="page done"><div class="big">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div><h1>${pct >= 90 ? 'Fantastico!' : pct >= 70 ? 'Ottimo lavoro!' : pct >= 50 ? 'Buon inizio!' : 'Non mollare!'}</h1>
      <p class="mut">${ok} risposte giuste su ${real} · ${pct}%</p>
      <div class="row" style="justify-content:center;gap:12px;margin:14px 0"><div class="stat" style="background:var(--card);box-shadow:var(--sh)"><b>+${ok * 10 + bonus}</b><span>XP</span></div><div class="stat" style="background:var(--card);box-shadow:var(--sh)"><b>${pct}%</b><span>precisione</span></div></div>
      ${wrongs.length ? `<div class="card flat" style="text-align:left"><h3>Da ripassare</h3>${wrongs.slice(0, 6).map(w => `<div class="small" style="padding:6px 0;border-top:1px solid var(--line)">${w.q ? rich(plain(w.q).slice(0, 60)) : ''}${w.e ? `<div class="mut">${rich(String(w.e).split('\n')[0])}</div>` : ''}</div>`).join('')}</div>` : ''}
      <div class="grid2">${wrongs.length ? `<button class="btn" id="rt">Ripassa gli errori</button>` : ''}<button class="btn primary" id="fin" style="${wrongs.length ? '' : 'grid-column:1/3'}">Continua</button></div></div>`;
    document.body.classList.remove('focus'); window.scrollTo(0, 0);
    $('#fin').onclick = () => { if (o.onDone) o.onDone(); else nav(o.back || '#/practice'); };
    if ($('#rt')) $('#rt').onclick = () => Q.run(wrongs.map(w => ({ ...w, retry: false })), { ...o });
  }
  draw();
};
