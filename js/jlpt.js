'use strict';
/* Generatori di esercizi nel formato dell'esame JLPT (vocabolario e grammatica).
   Ogni chiamata crea esercizi NUOVI combinando dati, schemi e distrattori casuali. */
const J = { P: {} };
Object.assign(TYL, { j1: '読み方 · 問題1', j2: '表記 · 問題2', j3: '文脈 · 問題3', j4: '言い換え · 問題4', j5: '用法 · 問題5', g1: '文法形式 · 問題1', g2: '文の組み立て ★ · 問題2', g3: '文章の文法 · 問題3', r4: '短文 · 問題4', r5: '中文 · 問題5', r7: '情報検索 · 問題7', l1: '課題理解 · 問題1', l2: 'ポイント理解 · 問題2', l3: '概要理解 · 問題3', l4: '発話表現 · 問題4', l5: '即時応答 · 問題5' });
const jlevels = lv => lv === 'n5' ? ['n5'] : lv === 'n4' ? ['n5', 'n4'] : ['n5', 'n4', 'n3'];
const wrM = (w, r) => { // come wr() ma restituisce il markup {漢|かん}
  if (!r || r === w || !KANJI_RE.test(w)) return w;
  let pre = 0; while (pre < w.length && !KANJI_RE.test(w[pre]) && w[pre] === r[pre]) pre++;
  let suf = 0; while (suf < w.length - pre && suf < r.length - pre - 1 && !KANJI_RE.test(w[w.length - 1 - suf]) && w[w.length - 1 - suf] === r[r.length - 1 - suf]) suf++;
  return w.slice(0, pre) + '{' + w.slice(pre, w.length - suf) + '|' + r.slice(pre, r.length - suf) + '}' + w.slice(w.length - suf);
};
function tokMk(s) { const out = []; String(s).split(/(\{[^|{}]+\|[^{}]+\})/).forEach(p => { const m = /^\{([^|{}]+)\|([^{}]+)\}$/.exec(p); if (m) out.push({ b: m[1], raw: p }); else [...p].forEach(ch => out.push({ b: ch, raw: ch })); }); return out; }
function cutBefore(ex, target) { const t = tokMk(ex), pl = t.map(x => x.b).join(''), idx = pl.indexOf(target); if (idx < 0) return null; let pos = 0; for (let i = 0; i < t.length; i++) { if (pos === idx) return t.slice(0, i).map(x => x.raw).join(''); if (pos > idx) return null; pos += t[i].b.length; } return null; }
const allPure = s => [...s].every(c => KANJI_RE.test(c));
const dedupePlain = arr => { const seen = new Set(); return arr.filter(x => { const k = plain(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

/* ---------- coniugazione dei verbi (su stringa scritta o su lettura) ---------- */
const V5T = { 'う': ['っ', 'わ', 'い', 'え', 'お'], 'つ': ['っ', 'た', 'ち', 'て', 'と'], 'る': ['っ', 'ら', 'り', 'れ', 'ろ'], 'む': ['ん', 'ま', 'み', 'め', 'も'], 'ぶ': ['ん', 'ば', 'び', 'べ', 'ぼ'], 'ぬ': ['ん', 'な', 'に', 'ね', 'の'], 'く': ['い', 'か', 'き', 'け', 'こ'], 'ぐ': ['い', 'が', 'ぎ', 'げ', 'ご'], 'す': ['し', 'さ', 'し', 'せ', 'そ'] };
function conjStr(s, p, form) {
  if (p === 'v1') { if (!s.endsWith('る')) return null; const st = s.slice(0, -1); return { te: st + 'て', ta: st + 'た', nai: st + 'ない', stem: st, ba: st + 'れば', dict: s, masu: st + 'ます', pot: st + 'られる' }[form] ?? null; }
  if (p === 'v5') {
    const last = s.slice(-1), T = V5T[last]; if (!T) return null; const st = s.slice(0, -1), goku = /(行く|いく|ゆく)$/.test(s) && last === 'く';
    const eu = goku ? 'っ' : T[0], te = (last === 'む' || last === 'ぶ' || last === 'ぬ') ? 'んで' : (last === 'ぐ') ? 'いで' : (last === 'す') ? 'して' : (goku || last === 'う' || last === 'つ' || last === 'る') ? 'って' : 'いて', ta = te.replace(/て$/, 'た').replace(/で$/, 'だ');
    if (s === 'ある' || s === '有る') return { te: s.slice(0, -1) + 'って', ta: s.slice(0, -1) + 'った', nai: 'ない', stem: s.slice(0, -1) + 'り', ba: s.slice(0, -1) + 'れば', dict: s, masu: s.slice(0, -1) + 'ります', pot: null }[form] ?? null;
    return { te: st + te, ta: st + ta, nai: st + T[1] + 'ない', stem: st + T[2], ba: st + T[3] + 'ば', dict: s, masu: st + T[2] + 'ます', pot: st + T[3] + 'る' }[form] ?? null;
  }
  if (p === 'vs') { if (!s.endsWith('する')) return null; const st = s.slice(0, -2); return { te: st + 'して', ta: st + 'した', nai: st + 'しない', stem: st + 'し', ba: st + 'すれば', dict: s, masu: st + 'します', pot: st + 'できる' }[form] ?? null; }
  if (p === 'vk') {
    if (s.endsWith('来る')) { const st = s.slice(0, -2); return { te: st + '来て', ta: st + '来た', nai: st + '来ない', stem: st + '来', ba: st + '来れば', dict: s, masu: st + '来ます', pot: st + '来られる' }[form] ?? null; }
    if (s.endsWith('くる')) { const st = s.slice(0, -2); return { te: st + 'きて', ta: st + 'きた', nai: st + 'こない', stem: st + 'き', ba: st + 'くれば', dict: s, masu: st + 'きます', pot: st + 'こられる' }[form] ?? null; }
  }
  return null;
}
const cjM = (e, form) => { const a = conjStr(e.w, e.p, form), b = conjStr(e.r || e.w, e.p, form); return a && b ? wrM(a, b) : null; };
const NOVERB = new Set(['ある', 'いる', '居る', '要る', '死ぬ', '下さる', '頂く', '致す', '参る', '申す', '申し上げる', '召し上がる', '仰る', 'ご覧になる', 'お出でになる', '伺う', '差し上げる', '行う', '生じる', '拝見', 'する', 'できる']);
J.verbs = lv => jlevels(lv).flatMap(l => DB.vocab[l]).filter(e => e.ex && !NOVERB.has(e.w) && (e.p === 'v1' || e.p === 'v5' || e.p === 'vk' || (e.p === 'vs' && e.w.endsWith('する'))));
function ruleErrors(e, form) { // forme sbagliate "da studente": regole applicate ai verbi di un altro gruppo
  const out = [], w = e.w, r = e.r || e.w, p = e.p; if (p === 'vs' || p === 'vk') return out;
  const add = (a, b) => { if (a && b) out.push(wrM(a, b)); };
  const st = s => s.slice(0, -1);
  if (form === 'te' || form === 'ta') {
    const T = form === 'te' ? ['って', 'んで', 'いて', 'して', 'いで'] : ['った', 'んだ', 'いた', 'した', 'いだ'], ok = conjStr(w, p, form);
    for (const x of T) { if (st(w) + x !== ok) add(st(w) + x, st(r) + x); }
    if (p === 'v5') add(conjStr(w, 'v5', 'stem') + (form === 'te' ? 'て' : 'た'), conjStr(r, 'v5', 'stem') + (form === 'te' ? 'て' : 'た'));
  } else if (form === 'nai') { if (p === 'v5') add(conjStr(w, 'v5', 'stem') + 'ない', conjStr(r, 'v5', 'stem') + 'ない'); add(w + 'ない', r + 'ない'); }
  else if (form === 'ba') { if (p === 'v5') add(conjStr(w, 'v5', 'stem') + 'れば', conjStr(r, 'v5', 'stem') + 'れば'); add(w + 'ば', r + 'ば'); }
  return out;
}
const CONS = [
  { suf: '＿＿ください。', form: 'te', note: 'V-てください' },
  { suf: '＿＿でください。', form: 'nai', note: 'V-ないでください' },
  { suf: '＿＿たいです。', form: 'stem', note: 'V radice + たい' },
  { suf: '＿＿ことができます。', form: 'dict', note: 'V(dizionario) + ことができる' },
  { suf: '＿＿ら、{連絡|れんらく}します。', form: 'ta', note: 'V-たら' },
  { suf: '＿＿ば、{分|わ}かります。', form: 'ba', note: 'V-ば' }
];
const ALLF = ['te', 'ta', 'nai', 'stem', 'ba', 'dict'];
J.convItem = function (lv) {
  const verbs = J.verbs(lv); if (!verbs.length) return null;
  for (let t = 0; t < 80; t++) {
    const e = one(verbs), cons = one(CONS), mas = conjStr(e.w, e.p, 'masu'); if (!mas) continue;
    const pre = cutBefore(e.ex, mas); if (pre === null || pre.length < 2) continue;
    const ok = cjM(e, cons.form); if (!ok) continue;
    let wrong = ruleErrors(e, cons.form);
    const others = shuffle(ALLF.filter(f => f !== cons.form && !(cons.form === 'dict' && f === 'nai'))).map(f => cjM(e, f)).filter(Boolean);
    const opts = dedupePlain([ok, ...pick(wrong, 2), ...others]).slice(0, 4);
    if (opts.length < 4 || opts[0] !== ok) { const fix = dedupePlain([ok, ...pick(wrong, 3), ...others]).slice(0, 4); if (fix.length < 4 || fix[0] !== ok) continue; opts.splice(0, 4, ...fix); }
    return { ty: 'g1', sec: 'gram', lv, sid: 'jlpt:g1conj', q: pre + cons.suf, o: opts, a: 0, e: `${cons.note}: ${plain(e.w)}（${e.r}）→ ${ok}` };
  }
  return null;
};
J.g1 = function (lv, n = 8) {
  const bank = Q.bank(jlevels(lv), ['cloze', 'part', 'mc']).filter(x => !x.ctx && x.o && x.o.length >= 3 && !/^[A-Za-z]/.test(x.q || ''));
  const out = [];
  for (let i = 0; i < n; i++) {
    const it = (i % 2 === 0 && bank.length) ? { ...one(bank), ty: 'g1' } : (J.convItem(lv) || (bank.length ? { ...one(bank), ty: 'g1' } : null));
    if (it) out.push(it);
  }
  return out;
};

/* ---------- 問題2 ★ : catene rigide di pezzi ---------- */
const PL = { n: [['{机|つくえ}', '{本|ほん}'], ['{机|つくえ}', 'ペン'], ['かばん', '{財布|さいふ}'], ['テーブル', '{花|はな}'], ['{棚|たな}', '{辞書|じしょ}'], ['{冷蔵庫|れいぞうこ}', '{牛乳|ぎゅうにゅう}']], loc: ['{上|うえ}', '{中|なか}', '{横|よこ}', '{前|まえ}'] };
const STAR = [
  () => { const [a, b] = one(PL.n); return { pre: a + 'の', ch: [one(PL.loc), 'に', b, 'が'], post: 'あります。' }; },
  () => { const s = one([['{公園|こうえん}', '{歩|ある}く'], ['{川|かわ}の{近|ちか}く', '{走|はし}る'], ['{町|まち}', '{歩|ある}く']]); return { pre: '{私|わたし}は{毎朝|まいあさ}', ch: [s[0], 'を', s[1], 'こと'], post: 'にしています。' }; },
  () => { const s = one([['{駅|えき}まで', '{歩|ある}いて'], ['{学校|がっこう}まで', '{自転車|じてんしゃ}で'], ['{空港|くうこう}まで', 'バスで']]); return { pre: s[0], ch: [s[1].replace(/^/, ''), '{行|い}く', 'ことが', 'できます'], post: '。' }; },
  () => { const s = one([['{借|か}りた', '{本|ほん}', '{返|かえ}しました'], ['もらった', '{本|ほん}', '{読|よ}みました'], ['{聞|き}いた', '{話|はなし}', '{忘|わす}れました'], ['{教|おそ}わった', '{歌|うた}', '{歌|うた}いました']]); return { pre: one(['{友達|ともだち}に', '{先生|せんせい}に', '{母|はは}に']), ch: [s[0], s[1], 'を', s[2]], post: '。' }; },
  () => { const s = one([['{雨|あめ}が', '{降|ふ}る', 'かもしれない'], ['{彼|かれ}が', '{来|く}る', 'かもしれない'], ['{試験|しけん}が', '{難|むずか}しい', 'でしょう']]); return { pre: one(['{明日|あした}は', '{今日|きょう}は']).replace(/は$/, ''), ch: [s[0], s[1], s[2], 'と'], post: '{思|おも}います。' }; },
  () => { const s = one([['{写真|しゃしん}', '{撮|と}る'], ['{料理|りょうり}', '{作|つく}る'], ['{本|ほん}', '{読|よ}む'], ['{音楽|おんがく}', '{聞|き}く']]); return { pre: '{私|わたし}の{趣味|しゅみ}は', ch: [s[0], 'を', s[1], 'こと'], post: 'です。' }; },
  () => { const s = one([['あの{本|ほん}', '{高|たか}く'], ['{昨日|きのう}', '{寒|さむ}く'], ['{東京|とうきょう}', '{暑|あつ}く']]); return { pre: one(['この{本|ほん}は', '{今日|きょう}は', '{大阪|おおさか}は']), ch: [s[0], 'ほど', s[1], 'ありません'], post: '。' }; },
  () => { const s = one([['{日本語|にほんご}', '{英語|えいご}'], ['{英語|えいご}', '{中国語|ちゅうごくご}'], ['{歌|うた}', 'ダンス']]); return { pre: one(['{彼|かれ}は', '{彼女|かのじょ}は']), ch: [s[0], 'だけでなく', s[1], 'も'], post: one(['{上手|じょうず}です。', '{得意|とくい}です。']) }; },
  () => { const s = one([['{手|て}を', '{洗|あら}って', '{ご飯|はん}を', '{食|た}べます。'], ['{宿題|しゅくだい}を', 'して', 'テレビを', '{見|み}ます。'], ['{薬|くすり}を', '{飲|の}んで', 'すぐ', '{寝|ね}ます。']]); return { pre: '', ch: [s[0], s[1], 'から、', s[2]], post: s[3] }; }
];
J.g2 = function (lv, n = 4) {
  const out = []; for (let i = 0; i < n; i++) {
    const t = one(STAR)(), full = t.pre + t.ch.join('') + t.post;
    out.push({ ty: 'g2', sec: 'gram', lv, sid: 'jlpt:g2', q: `${t.pre}＿＿ ＿＿ ★ ＿＿${t.post}`, qi: 'Metti le 4 parti nell\'ordine giusto: quale va nel ★ (terzo spazio)?', o: [...t.ch], a: 2, e: 'Ordine corretto: ' + full });
  }
  return out;
};
/* ---------- 問題3 : brano con 5 spazi ---------- */
/* testo con spazi: più semplice e robusto, costruito da frasi alternative */
const G3S = {
  p: ['{田中|たなか}{先生|せんせい}', '{山田|やまだ}さん', '{鈴木|すずき}さん', '{佐藤|さとう}{先生|せんせい}'],
  ev: ['パーティー', '{食事会|しょくじかい}', '{勉強会|べんきょうかい}', '{見学|けんがく}'],
  hob: ['{料理|りょうり}', '{歌|うた}', '{運動|うんどう}', '{英語|えいご}']
};
J.g3 = function (lv, n = 1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const p = one(G3S.p), ev = one(G3S.ev), hb = one(G3S.hob), tpl = rnd(2);
    let paras, blanks;
    if (tpl === 0) {
      paras = [`${p}へ`, `{先日|せんじつ}は、${ev}に{来|き}てくださって、ありがとうございました。(1)、{皆|みな}さんにも{楽|たの}しんでもらえて、よかったです。`, `{私|わたし}は${hb}が{苦手|にがて}でしたが、(2){毎日|まいにち}{練習|れんしゅう}して、{少|すこ}しずつ{上手|じょうず}になりました。`, `{来月|らいげつ}もまた${ev}を{開|ひら}く{予定|よてい}です。(3)、{都合|つごう}が{良|よ}ければ、ぜひ{来|き}てください。(4)、(5){楽|たの}しみにしています。`];
      blanks = [['おかげさまで', 'それにもかかわらず', 'ところで'], ['それでも', 'それで', 'それから'], ['{今度|こんど}は', 'ところが', 'なぜなら'], ['また', 'もし', 'たとえば'], ['お{会|あ}いできるのを', 'お{会|あ}いしたいのを', 'お{会|あ}いするのが']];
    } else {
      paras = [`${p}へ`, `${ev}の{連絡|れんらく}をありがとうございます。(1) {日時|にちじ}と{場所|ばしょ}を{確認|かくにん}しました。`, `{残念|ざんねん}ですが、その{日|ひ}は{仕事|しごと}が{入|はい}っていて、(2){行|い}けません。(3)、{次|つぎ}の{会|かい}にはぜひ{参加|さんか}したいと{思|おも}います。`, `ところで、(4) {写真|しゃしん}があれば、(5) {見|み}せていただけませんか。`];
      blanks = [['さっそく', 'ところが', 'なぜなら'], ['どうしても', 'たとえば', 'ところで'], ['その{代|か}わり', '{残念|ざんねん}ながら', 'それとも'], ['{当日|とうじつ}の', '{当日|とうじつ}に', '{当日|とうじつ}が'], ['あとで', 'さっき', 'まだ']];
    }
    const ans = [0, 0, 0, 0, 0];
    const idx = shuffle([0, 1, 2, 3, 4]).slice(0, 5);
    for (let b = 0; b < 5; b++) {
      const marks = paras.join('\n'); const items = blanks[b];
      const pass = paras.map(t => t.replace(/\((\d)\)/g, (m, d) => (+d - 1 === b ? '【＿＿＿＿】' : `（${d}）`))).join('\n\n');
      out.push({ ty: 'g3', sec: 'gram', lv, sid: 'jlpt:g3', pass, q: `（${b + 1}）に{入|はい}るのに{最|もっと}もよいものはどれですか。`, qi: `Brano — spazio ${b + 1}`, o: [...items], a: ans[b], e: `（${b + 1}）→ ${items[ans[b]]}` });
    }
    break;
  }
  return out;
};

/* ---------- 問題1-5 : vocabolario ---------- */
const FR = {
  n: ['__W__について、{先生|せんせい}に{聞|き}きました。', '__W__のことを{考|かんが}えています。', '{昨日|きのう}、__W__の{話|はなし}を{聞|き}きました。', 'これは__W__に{関|かん}する{本|ほん}です。', '__W__は{大切|たいせつ}だと{思|おも}います。'],
  v: ['__W__ことが{大切|たいせつ}です。', '__W__ことは{難|むずか}しくありません。'], i: ['とても__W__と{思|おも}います。', 'この{町|まち}は__W__ですね。'], na: ['とても__W__だと{思|おも}います。', 'あの{人|ひと}は__W__ですね。']
};
function wtype(e) { const p = e.p; if (!p) return allPure(e.w) && e.w.length >= 2 ? 'n' : null; if (p === 'n' || (p === 'vs' && !e.w.endsWith('する'))) return 'n'; if (p === 'v1' || p === 'v5' || p === 'vk' || (p === 'vs' && e.w.endsWith('する'))) return 'v'; if (p === 'i') return 'i'; if (p === 'na') return 'na'; return null; }
J.cand = function (lv, pure) {
  const key = lv + (pure ? 'P' : 'A'); J._c = J._c || {}; if (J._c[key]) return J._c[key];
  const out = [], seen = new Set();
  jlevels(lv).forEach(l => { [...DB.vocab[l], ...DB.words[l]].forEach(e => { if (!KANJI_RE.test(e.w) || !e.r || seen.has(e.w + e.r)) return; const t = wtype(e); if (!t || (pure && !(t === 'n' && allPure(e.w)))) return; seen.add(e.w + e.r); out.push({ ...e, t }); }); });
  return J._c[key] = out;
};
const DAKU = { 'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご', 'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ', 'た': 'だ', 'ち': 'じ', 'つ': 'ず', 'て': 'で', 'と': 'ど', 'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ' };
const UNDAKU = {}; Object.entries(DAKU).forEach(([a, b]) => { if (!UNDAKU[b]) UNDAKU[b] = a; });
function mutReading(r) {
  const out = new Set(), ch = [...r], O = 'おこそとのほもよろごぞどぼぽょ', E = 'えけせてねへめれげぜでべぺ';
  for (let i = 1; i < ch.length; i++) { if (DAKU[ch[i]]) out.add([...ch.slice(0, i), DAKU[ch[i]], ...ch.slice(i + 1)].join('')); if (UNDAKU[ch[i]]) out.add([...ch.slice(0, i), UNDAKU[ch[i]], ...ch.slice(i + 1)].join('')); }
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i], n = ch[i + 1];
    if (n === 'う' && (O + 'うゆくすつぬふむるぐずぷ').includes(c)) out.add([...ch.slice(0, i + 1), ...ch.slice(i + 2)].join(''));
    else if (O.includes(c) && n !== 'う' && n !== undefined) out.add([...ch.slice(0, i + 1), 'う', ...ch.slice(i + 1)].join(''));
    if (n === 'い' && E.includes(c)) out.add([...ch.slice(0, i + 1), ...ch.slice(i + 2)].join(''));
    else if (E.includes(c) && n !== 'い' && n !== undefined) out.add([...ch.slice(0, i + 1), 'い', ...ch.slice(i + 1)].join(''));
  }
  for (let i = 1; i < ch.length; i++) if ('かきくけこさしすせそたちつてとぱぴぷぺぽ'.includes(ch[i]) && ch[i - 1] !== 'っ' && ch[i - 1] !== 'ん') out.add([...ch.slice(0, i), 'っ', ...ch.slice(i)].join(''));
  if (r.includes('っ')) out.add(r.replace('っ', ''));
  out.delete(r); return [...out].filter(x => x.length >= 2);
}
function homMap() { if (J._hom) return J._hom; const m = {}; LEVELS.forEach(l => DB.kanji[l].forEach(k => (k.on || []).forEach(o => { (m[o] = m[o] || []).push(k.k); }))); return J._hom = m; }
const altKanji = c => { const k = DB.byId['k:' + c]; if (!k) return []; const s = new Set(); (k.on || []).forEach(o => (homMap()[o] || []).forEach(x => { if (x !== c) s.add(x); })); return [...s]; };
function allWordSet() { if (J._aw) return J._aw; const s = new Set(); LEVELS.forEach(l => (DB.words[l] || []).forEach(e => s.add(e.w))); return J._aw = s; }
function orthoDistract(w) {
  const chars = [...w], cands = new Set(), aw = allWordSet();
  for (let t = 0; t < 40 && cands.size < 8; t++) {
    const i = rnd(chars.length), alts = altKanji(chars[i]); if (!alts.length) continue;
    const c = [...chars]; c[i] = one(alts); if (Math.random() < .35 && chars.length > 1) { const j = rnd(chars.length), a2 = altKanji(chars[j]); if (a2.length && j !== i) c[j] = one(a2); }
    const s = c.join(''); if (s !== w) cands.add(s);
  }
  const out = pick([...cands].filter(x => !aw.has(x)), 2);
  const sim = [...aw].filter(x => x !== w && x.length === w.length && allPure(x) && [...x].some(ch => chars.includes(ch)));
  for (const s of shuffle(sim)) { if (out.length >= 3) break; if (!out.includes(s)) out.push(s); }
  for (const s of shuffle([...cands])) { if (out.length >= 3) break; if (!out.includes(s)) out.push(s); }
  return out.slice(0, 3);
}
const frameFor = (t) => one(FR[t]);
J.v1 = function (lv, n = 5) {
  const pool = J.cand(lv, false), out = []; let guard = 0;
  while (out.length < n && guard++ < 200) {
    const e = one(pool), dis = pick(mutReading(e.r), 3); if (dis.length < 3) continue;
    const s = frameFor(e.t).replace('W', e.w);
    out.push({ ty: 'j1', sec: 'kanji', lv: e.lv, sid: e.src || e.id, q: s, qi: 'Come si legge la parola sottolineata?', o: [e.r, ...dis], a: 0, e: `${e.w} = ${e.r}（${e.it}）`, say: { t: e.r } });
  }
  return out;
};
J.v2 = function (lv, n = 5) {
  const pool = J.cand(lv, true), out = []; let guard = 0;
  while (out.length < n && guard++ < 200) {
    const e = one(pool), dis = orthoDistract(e.w); if (dis.length < 3) continue;
    out.push({ ty: 'j2', sec: 'kanji', lv: e.lv, sid: e.src || e.id, q: frameFor('n').replace('W', e.r), qi: 'Quale scrittura in kanji è corretta per la parola sottolineata?', o: [e.w, ...dis], a: 0, e: `${e.r} = ${e.w}（${e.it}）` });
  }
  return out;
};
const AFF = [['{産|さん}', '{製|せい}', ['りんご', 'みかん', 'お{米|こめ}', 'ワイン', 'ぶどう'], ['カメラ', '{車|くるま}', 'テレビ', '{時計|とけい}', 'パソコン'], ['アメリカ', '{日本|にほん}', 'フランス', 'イタリア', '{中国|ちゅうごく}']]];
J.v3 = function (lv, n = 5) {
  const out = Q.gen.vocabFill(jlevels(lv), n * 2).filter(x => x.o.length === 4).slice(0, n), W = new Map(jlevels(lv).flatMap(l => DB.vocab[l] || []).map(e => [e.w, e]));
  const items = out.map(x => ({ ...x, ty: 'j3', lv, o: x.o.map(w => W.has(w) ? wrM(w, W.get(w).r) : w) }));
  if (items.length && Math.random() < .6) { // suffissi: 産 / 製
    const a = AFF[0], san = Math.random() < .5, noun = one(san ? a[2] : a[3]), ctry = one(a[4]);
    items[0] = { ty: 'j3', sec: 'vocab', lv, sid: 'jlpt:j3aff', q: `この${noun}は${ctry}（　　）です。`.replace('（　　）', '＿＿'), o: [san ? '{産|さん}' : '{製|せい}', san ? '{製|せい}' : '{産|さん}', '{作|さく}', '{品|ひん}'], a: 0, e: san ? '産 = prodotto in quel luogo (frutta, riso, ecc.)' : '製 = fabbricato (macchine, apparecchi)' };
  }
  return items.slice(0, n);
};
const GR = [
  { fr: 'n', m: ['{準備|じゅんび}', '{用意|ようい}'], x: ['{返事|へんじ}', '{旅行|りょこう}'] }, { fr: 'n', m: ['{理由|りゆう}', 'わけ'] }, { fr: 'n', m: ['{経験|けいけん}', '{体験|たいけん}'] },
  { fr: 'n', m: ['{返事|へんじ}', '{返答|へんとう}'] }, { fr: 'n', m: ['{質問|しつもん}', '{問|と}い'] }, { fr: 'n', m: ['{相談|そうだん}', '{話|はな}し{合|あ}い'] }, { fr: 'n', m: ['{方法|ほうほう}', 'やり{方|かた}'] },
  { fr: 'n', m: ['{以前|いぜん}', '{昔|むかし}'] }, { fr: 'n', m: ['{値段|ねだん}', '{価格|かかく}'] }, { fr: 'n', m: ['{会話|かいわ}', '{話|はなし}'] }, { fr: 'n', m: ['{出発|しゅっぱつ}', '{出|で}かけること'] },
  { fr: 'na', m: ['{大切|たいせつ}', '{大事|だいじ}'] },
  { fr: 'deg', m: ['とても', '{大変|たいへん}', '{非常|ひじょう}に', 'すごく'], x: ['{少|すこ}し', 'ちょっと', 'やや', 'まあまあ'] },
  { fr: 'sud', m: ['{突然|とつぜん}', '{急|きゅう}に', 'いきなり'], x: ['ゆっくり', 'だんだん', '{少|すこ}しずつ', 'そろそろ'] },
  { fr: 'all', m: ['{全部|ぜんぶ}', 'すべて', 'みんな'], x: ['{半分|はんぶん}', '{少|すこ}し', '{一部|いちぶ}', 'ちょっと'] },
  { fr: 'maybe', m: ['たぶん', 'おそらく'], x: ['{必|かなら}ず', '{絶対|ぜったい}に', '{決|けっ}して', 'とうてい'] },
  { fr: 'fin', m: ['やっと', 'ついに', 'とうとう'], x: ['すぐに', 'もう', 'まだ', 'ゆっくり'] },
];
const GFR = { deg: '{今日|きょう}は__W__{寒|さむ}いです。', sud: '__W__、{雨|あめ}が{降|ふ}ってきました。', all: '{料理|りょうり}を__W__{食|た}べました。', maybe: '__W__{明日|あした}は{雨|あめ}でしょう。', fin: '__W__{宿題|しゅくだい}が{終|お}わりました。' };
J.v4 = function (lv, n = 5) {
  const out = []; let guard = 0; const NP = GR.filter(g => g.fr === 'n').flatMap(g => g.m);
  while (out.length < n && guard++ < 100) {
    const g = one(GR); let target, ans, dis;
    if (g.fr === 'n' || g.fr === 'na') {
      [target, ans] = shuffle(g.m).slice(0, 2); const nn = g.fr === 'n' ? NP : ['{親切|しんせつ}', '{有名|ゆうめい}', '{便利|べんり}', '{静|しず}か'];
      dis = pick(nn.filter(x => !g.m.includes(x)), 3); out.push({ ty: 'j4', sec: 'vocab', lv, sid: 'jlpt:j4', q: frameFor(g.fr).replace('W', target), qi: 'Quale parola ha il significato più vicino a quella sottolineata?', o: [ans, ...dis], a: 0, e: `${plain(target)} ≈ ${plain(ans)}` });
    } else {
      [target, ans] = shuffle(g.m).slice(0, 2); dis = pick(g.x, 3);
      out.push({ ty: 'j4', sec: 'vocab', lv, sid: 'jlpt:j4', q: GFR[g.fr].replace('W', target), qi: 'Quale parola ha il significato più vicino a quella sottolineata?', o: [ans, ...dis], a: 0, e: `${plain(target)} ≈ ${plain(ans)}` });
    }
  }
  return out;
};
J.v5 = function (lv, n = 4) {
  const pool = jlevels(lv).flatMap(l => DB.vocab[l]).filter(e => e.ex && (e.p === 'n' || e.p === 'na' || e.p === 'i') && blankWord(e.ex, e.w));
  const out = []; let guard = 0;
  while (out.length < n && guard++ < 150 && pool.length > 8) {
    const x = one(pool), blank = blankWord(x.ex, x.w); if (!blank) continue;
    const others = shuffle(pool.filter(y => y.w !== x.w && y.p === x.p && y.c !== x.c)).slice(0, 3); if (others.length < 3) continue;
    const U = `__${wrM(x.w, x.r)}__`, right = blank.replace('＿＿', U);
    const wrong = others.map(y => blankWord(y.ex, y.w).replace('＿＿', U));
    const oo = [right, ...wrong]; if (new Set(oo.map(plain)).size < 4) continue;
    out.push({ ty: 'j5', sec: 'vocab', lv: x.lv, sid: x.id, qh: `<div class="qtext jp" style="text-align:center">${wr(x.w, x.r)}</div>`, q: '', qi: `Quale frase usa correttamente la parola 「${plain(x.w)}」?`, o: [right, ...wrong], a: 0, e: `${x.w}（${x.r}）= ${x.it}`, two: false });
  }
  return out;
};
J.vocabSet = (lv, n = 15) => [...J.v1(lv, Math.ceil(n * .3)), ...J.v2(lv, Math.ceil(n * .2)), ...J.v3(lv, Math.ceil(n * .25)), ...J.v4(lv, Math.ceil(n * .15)), ...J.v5(lv, Math.max(1, Math.floor(n * .1)))].slice(0, n + 3);
J.gramSet = (lv, n = 12) => [...J.g1(lv, Math.ceil(n * .5)), ...J.g2(lv, Math.ceil(n * .3)), ...J.g3(lv, 1)].slice(0, n + 5);
