'use strict';
/* Frasi reali (Tatoeba, CC BY 2.0 FR): esercizi generati al volo da data/frasi.json — traduzione, riordino, cloze, dettato, shadowing, ascolto */
const FRP = lv => jlevels(lv).flatMap(l => (DB.frasi[l] || []).map(x => ({ ...x, lv: l })));
const frJ = x => x.b.join('');
const frLen = x => plain(frJ(x)).length;
function frNear(pool, x, n, key) { // distrattori di lunghezza simile
  const L = key === 'i' ? x.i.length : frLen(x), g = y => key === 'i' ? y.i.length : frLen(y);
  let c = shuffle(pool.filter(y => y.id !== x.id && (key === 'i' ? y.i !== x.i : plain(frJ(y)) !== plain(frJ(x))) && Math.abs(g(y) - L) <= Math.max(4, L * .5)));
  if (c.length < n) c = shuffle(pool.filter(y => y.id !== x.id));
  return c.slice(0, n);
}
const frVoice = x => (parseInt(x.id.slice(2), 10) % 2 === 0 ? 'F' : 'M'); // come in _strumenti/genaudio.py
const frBase = (x, o) => ({ sec: 'ex', lv: x.lv, sid: 'fr:' + x.id, ...o });
Q.gen.fr = {
  trad(lv, n = 5) { const P = FRP(lv); return pick(P, n).map(x => frBase(x, { ty: 'trad', q: x.i, o: [frJ(x), ...frNear(P, x, 3).map(frJ)], a: 0, e: `${frJ(x)}` })).filter(it => new Set(it.o.map(plain)).size === 4); },
  read(lv, n = 5) { const P = FRP(lv); return pick(P, n).map(x => frBase(x, { ty: 'trad', qh: `<div class="qtext jp" style="text-align:center">${rich(frJ(x))}</div>`, q: '', qi: 'Che cosa significa?', o: [x.i, ...frNear(P, x, 3, 'i').map(y => y.i)], a: 0, e: `${frJ(x)} = ${x.i}`, say: { t: frJ(x) } })).filter(it => new Set(it.o).size === 4); },
  ord(lv, n = 5) { return pick(FRP(lv).filter(x => x.b.length >= 3 && x.b.length <= 7), n).map(x => frBase(x, { ty: 'ord', i: x.i, w: x.b, x: [], e: `${frJ(x)}` })); },
  cloze(lv, n = 5) {
    const P = FRP(lv).filter(x => x.cw && x.cw.length), V = jlevels(lv).flatMap(l => DB.vocab[l] || []).filter(e => e.r && e.r !== e.w), out = [];
    for (const x of shuffle(P)) {
      if (out.length >= n) break;
      const c = one(x.cw), at = V.find(e => e.w === c.w); if (!at) continue; const j = frJ(x), k = j.indexOf(c.m); if (k < 0) continue;
      const ds = shuffle(V.filter(e => e.w !== c.w && e.p === at.p && e.c !== at.c)).slice(0, 3); if (ds.length < 3) continue;
      out.push(frBase(x, { ty: 'cloze', sec: 'vocab', q: j.slice(0, k) + '＿＿＿＿' + j.slice(k + c.m.length), qi: x.i, o: [wrM(at.w, at.r), ...ds.map(e => wrM(e.w, e.r))], a: 0, e: `${at.w}（${at.r}）= ${at.it}` }));
    }
    return out;
  },
  dic(lv, n = 4) { return pick(FRP(lv).filter(x => frLen(x) <= 22), n).map(x => frBase(x, { ty: 'dic', sec: 'asc', t: frJ(x), i: x.i, g: frVoice(x), f: 'fr/' + x.id })); },
  shd(lv, n = 4) { return pick(FRP(lv).filter(x => frLen(x) <= 24), n).map(x => frBase(x, { ty: 'shd', sec: 'asc', t: frJ(x), i: x.i, g: frVoice(x), f: 'fr/' + x.id })); },
  lis(lv, n = 5) { const P = FRP(lv); return pick(P, n).map(x => frBase(x, { ty: 'lis', sec: 'asc', au: { t: frJ(x), f: 'fr/' + x.id, who: frVoice(x) }, q: 'Che cosa significa la frase che hai sentito?', o: [x.i, ...frNear(P, x, 3, 'i').map(y => y.i)], a: 0, e: `${frJ(x)} = ${x.i}`, tr: `${frJ(x)}\n${x.i}` })).filter(it => new Set(it.o).size === 4); },
  mix(lv, n = 10) { const k = ['trad', 'read', 'ord', 'cloze', 'lis']; return shuffle(k.flatMap(t => Q.gen.fr[t](lv, Math.ceil(n / k.length)))).slice(0, n); }
};
