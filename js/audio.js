'use strict';
/* Audio: speechSynthesis (fase 1) + m4a opzionali in audio/<livello>/<id>.m4a (fase 2) con ripiego automatico sulla voce */
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const ICON_SPK = '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
// hash dei testi letti (stessa funzione di _strumenti/genall.py): audio/t/<hash>.m4a, elenco in audio/index.json
const auHash = (str) => { let h1 = 0xdeadbeef | 0, h2 = 0x41c6ce57 | 0; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const AU = {
  idx: new Set(),
  voices: [], specs: [], miss: new Set(), cur: null, tok: 0, seqTok: 0, playing: null,
  init() {
    fetch('audio/index.json').then(r => r.ok ? r.json() : []).then(l => { AU.idx = new Set(l); }).catch(() => { });
    if (!('speechSynthesis' in window)) return;
    const f = () => { AU.voices = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang)); };
    f(); try { speechSynthesis.addEventListener('voiceschanged', f); } catch (e) { speechSynthesis.onvoiceschanged = f; }
  },
  voice(who) {
    const l = AU.voices; if (!l.length) return null;
    const uri = who === 'M' ? S.set.voiceM : S.set.voiceF;
    let v = l.find(x => x.voiceURI === uri); if (v) return v;
    const male = /otoya|ichiro|keita|hattori|takumi|male|sora|ryo|kenji/i, fem = /kyoko|o-ren|haruka|ayumi|nanami|sayaka|female|mizuki|hikari|mei|aoi/i;
    if (who === 'M') return l.find(x => male.test(x.name)) || l[l.length > 1 ? 1 : 0];
    return l.find(x => fem.test(x.name)) || l[0];
  },
  speak(text, o = {}) {
    return new Promise(res => {
      if (!('speechSynthesis' in window) || !text) return res(false);
      const my = ++AU.tok; try { speechSynthesis.cancel(); } catch (e) { }
      setTimeout(() => {
        if (my !== AU.tok) return res(false);
        const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP';
        const who = o.who || 'F', v = AU.voice(who); if (v) u.voice = v;
        const same = AU.voice('F') === AU.voice('M');
        u.rate = o.rate || S.set.rate || 1; u.pitch = o.pitch || (same ? (who === 'M' ? .75 : 1.15) : 1);
        let t = setTimeout(() => res(true), 30000);
        u.onend = () => { clearTimeout(t); res(true); }; u.onerror = () => { clearTimeout(t); res(false); };
        speechSynthesis.speak(u);
      }, 60);
    });
  },
  file(url, rate) {
    return new Promise(res => {
      if (AU.miss.has(url)) return res(false);
      const a = new Audio(); a.preload = 'auto'; a.src = url; a.playbackRate = rate || 1; AU.cur = a; let done = false;
      const fin = v => { if (!done) { done = true; res(v); } };
      a.onerror = () => { AU.miss.add(url); fin(false); };
      a.onended = a.onpause = () => fin(true);
      a.play().catch(e => { if (e.name !== 'NotAllowedError') AU.miss.add(url); fin(false); });
    });
  },
  // spec: {t: testo con markup, f: 'n5/id' (m4a opzionale), who: 'F'|'M'}
  async say(spec, rate) {
    rate = rate || S.set.rate || 1;
    let f = spec.f;
    if (!f && AU.idx.size) { const h = auHash((spec.who === 'M' ? 'M:' : 'F:') + yomi(spec.t)); if (AU.idx.has(h)) f = 't/' + h; }
    if (f && !AU.miss.has(`audio/${f}.m4a`)) { if (await AU.file(`audio/${f}.m4a`, rate)) return true; }
    return AU.speak(yomi(spec.t), { who: spec.who, rate });
  },
  async seq(lines, id, lv, rate) { // dialogo: righe {s:'A', t, g:'F'|'M'}
    const my = ++AU.seqTok; const gender = {};
    for (let i = 0; i < lines.length; i++) {
      if (my !== AU.seqTok) return;
      const l = lines[i]; const g = l.g || gender[l.s] || (gender[l.s] = Object.keys(gender).length % 2 ? 'M' : 'F');
      await AU.say({ t: l.t, f: id ? `${lv}/${id}_${i + 1}` : '', who: g }, rate);
      if (my !== AU.seqTok) return;
      await new Promise(r => setTimeout(r, 380));
    }
  },
  stop() { AU.seqTok++; AU.tok++; try { speechSynthesis.cancel(); } catch (e) { } try { AU.cur && AU.cur.pause(); } catch (e) { } },
  reg(spec) { AU.specs.push(spec); return AU.specs.length - 1; }
};
// audio dei kana pre-registrati (audio/kana/<codepoint>.m4a, vedi _strumenti/genkana.py)
const kanaF = k => /^[ぁ-ゖァ-ヶ]{1,2}$/.test(k) ? 'kana/' + [...k].map(c => c.codePointAt(0).toString(16)).join('-') : undefined;
const kanaSpec = k => ({ t: k, f: kanaF(k) });
// bottone 🔊 per una frase/parola
const spk = (t, o = {}) => `<button class="spk" data-ps="${AU.reg({ t, f: o.f, who: o.who })}" aria-label="Ascolta">${ICON_SPK}</button>`;
const rateChips = () => `<div class="rates">${[.7, .85, 1].map(r => `<button data-rate="${r}" class="${(S.set.rate || 1) === r ? 'on' : ''}">${String(r).replace('.', ',')}×</button>`).join('')}</div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ps]');
  if (b) { e.preventDefault(); b.classList.add('playing'); AU.say(AU.specs[+b.dataset.ps]).then(() => b.classList.remove('playing')); return; }
  const r = e.target.closest('[data-rate]');
  if (r) { S.set.rate = +r.dataset.rate; save(); $$('[data-rate]').forEach(x => x.classList.toggle('on', +x.dataset.rate === S.set.rate)); }
});

/* Elenco di tutti gli audio previsti (per generare gli m4a e per il download offline) */
function audioList(lv) {
  const out = [], a = DB.asc[lv] || {};
  (a.dialoghi || []).forEach(d => d.righe.forEach((l, i) => out.push({ f: `${lv}/${d.id}_${i + 1}`, t: yomi(l.t), g: l.g || (d.v && d.v[l.s]) || (l.s === 'A' ? 'F' : 'M'), k: 'dialogo' })));
  (a.coppie || []).forEach(c => { out.push({ f: `${lv}/${c.id}a`, t: yomi(c.a), g: 'F', k: 'coppia' }); out.push({ f: `${lv}/${c.id}b`, t: yomi(c.b), g: 'F', k: 'coppia' }); });
  (a.dettato || []).forEach(c => out.push({ f: `${lv}/${c.id}`, t: yomi(c.t), g: c.g || 'F', k: 'dettato' }));
  (a.risposte || []).forEach(c => out.push({ f: `${lv}/${c.id}`, t: yomi(c.p), g: c.g || 'M', k: 'risposta' }));
  (a.shadowing || []).forEach(c => out.push({ f: `${lv}/${c.id}`, t: yomi(c.t), g: c.g || 'F', k: 'shadowing' }));
  if (lv === 'n5' && DB.kana) { const ks = [...DB.kana.groups.flatMap(g => g.rows.flat().map(x => x[0])), ...DB.kana.groups.flatMap(g => g.rows.flat().map(x => toKata(x[0]))), ...(DB.kana.kataExtra || []).map(x => x[0])]; ks.forEach(k => out.push({ f: kanaF(k), t: k, g: 'F', k: 'kana' })); }
  (DB.frasi[lv] || []).forEach(x => out.push({ f: `fr/${x.id}`, t: yomi(x.b.join('')), g: parseInt(x.id.slice(2), 10) % 2 === 0 ? 'F' : 'M', k: 'frase' }));
  return out;
}
function audioCsv() {
  const rows = [['file', 'voce', 'tipo', 'testo_kana']];
  LEVELS.forEach(l => audioList(l).forEach(x => rows.push([x.f + '.m4a', x.g === 'M' ? 'maschile' : 'femminile', x.k, x.t])));
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
async function cacheAudio(levels, progress) { // scarica nella cache offline gli m4a esistenti per i livelli scelti
  if (!('caches' in window)) return { ok: 0, tot: 0 };
  const c = await caches.open('michi-audio-3'); let ok = 0, tot = 0;
  const list = [...levels.flatMap(l => audioList(l)), ...[...AU.idx].map(h => ({ f: 't/' + h }))];
  for (const x of list) {
    tot++; const url = `audio/${x.f}.m4a`;
    try { if (await c.match(url)) { ok++; } else { const r = await fetch(url); if (r.ok && /audio|octet/.test(r.headers.get('content-type') || 'audio')) { await c.put(url, r); ok++; } } } catch (e) { }
    progress && progress(tot, list.length);
  }
  return { ok, tot };
}
