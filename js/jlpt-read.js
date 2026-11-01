'use strict';
/* Lettura in formato JLPT: documenti brevi (問題4), testi medi (問題5), ricerca di informazioni (問題7). Tutto generato con valori casuali. */
const DOW = [['日', 'にち'], ['月', 'げつ'], ['火', 'か'], ['水', 'すい'], ['木', 'もく'], ['金', 'きん'], ['土', 'ど']];
const dowM = i => `{${DOW[i][0]}|${DOW[i][1]}}{曜日|ようび}`;
const dayM = (m, d) => `${m}{月|がつ}{${d}日|${NUM.DAY[d]}}`;
const hrK = h => h <= 12 ? NUM.time(h, 0) : h === 20 ? 'にじゅうじ' : 'じゅう' + NUM.time(h - 10, 0);
const tmM = (h, m = 0) => m === 0 ? `{${h}時|${hrK(h)}}` : m === 30 ? `{${h}時半|${hrK(h)}はん}` : `{${h}時|${hrK(h)}}{${m}分|${NUM.mins(m)}}`;
const yenM = n => `${n.toLocaleString('ja-JP')}{円|えん}`;
const opt4 = (right, pool) => { const w = dedupePlain([right, ...shuffle(pool)]).filter((x, i) => i === 0 || plain(x) !== plain(right)).slice(0, 4); return w.length === 4 && w[0] === right ? w : null; };
const NAMES = ['{田中|たなか}', '{山田|やまだ}', '{鈴木|すずき}', '{佐藤|さとう}', '{木村|きむら}', '{高橋|たかはし}', '{中村|なかむら}', '{小林|こばやし}'];
const rit = (o) => ({ sec: 'read', sid: 'jlpt:' + o.ty, ...o });

const TASK = [
  { te: '{資料|しりょう}を{人数分|にんずうぶん}コピーして', ru: '{資料|しりょう}をコピーすること' },
  { te: '{会議室|かいぎしつ}の{椅子|いす}を{並|なら}べて', ru: '{会議室|かいぎしつ}の{椅子|いす}を{並|なら}べること' },
  { te: 'お{客|きゃく}さんに{電話|でんわ}して', ru: 'お{客|きゃく}さんに{電話|でんわ}をすること' },
  { te: '{荷物|にもつ}を{受|う}け{取|と}って', ru: '{荷物|にもつ}を{受|う}け{取|と}ること' },
  { te: '{部屋|へや}を{掃除|そうじ}して', ru: '{部屋|へや}を{掃除|そうじ}すること' },
  { te: 'プリンターに{紙|かみ}を{入|い}れて', ru: 'プリンターに{紙|かみ}を{入|い}れること' },
  { te: 'メールの{返事|へんじ}を{書|か}いて', ru: 'メールの{返事|へんじ}を{書|か}くこと' },
  { te: '{飲|の}み{物|もの}を{買|か}ってきて', ru: '{飲|の}み{物|もの}を{買|か}ってくること' }
];
const EVENT = ['{会議|かいぎ}', '{発表会|はっぴょうかい}', '{説明会|せつめいかい}', '{勉強会|べんきょうかい}'];
function docMemo() {
  const t = shuffle(TASK).slice(0, 4), n = one(NAMES), ev = one(EVENT);
  const pass = `これは、${one(NAMES)}さんが${n}さんの{机|つくえ}の{上|うえ}に{置|お}いたメモです。\n\n${n}さん\nおはようございます。\n${ev}のことで、お{願|ねが}いがあります。\nまず、${t[0].te}ください。そのあと、${t[1].te}ください。{最後|さいご}に、${t[2].te}ください。\n${t[3].ru}は{私|わたし}がしておきます。`;
  const q1 = opt4(`${n}さんは、${t[0].ru}から{始|はじ}めなければならない。`, [`${n}さんは、${t[3].ru}もしなければならない。`, `${n}さんは、${t[2].ru}から{始|はじ}めなければならない。`, `${n}さんは、${t[1].ru}をしなくてもいい。`]);
  const q2 = opt4(t[2].ru, [t[0].ru, t[1].ru, t[3].ru]);
  if (!q1 || !q2) return [];
  return [rit({ ty: 'r4', pass, q: 'このメモの{内容|ないよう}と{合|あ}っているものはどれですか。', qi: 'Quale affermazione corrisponde al contenuto del memo?', o: q1, a: 0, e: `Prima cosa da fare: ${plain(t[0].ru)}. ${plain(t[3].ru)} lo fa chi scrive.` }),
    rit({ ty: 'r4', pass, q: `${n}さんが{最後|さいご}にしなければならないのは、どれですか。`, qi: 'Che cosa deve fare per ultimo?', o: q2, a: 0, e: `「{最後|さいご}に、」→ ${plain(t[2].ru)}` })];
}
const EVN = ['テニス{大会|たいかい}', 'バーベキュー', 'スピーチ{大会|たいかい}', 'バスツアー', '{映画会|えいがかい}', '{新年会|しんねんかい}', '{料理教室|りょうりきょうしつ}'];
const PLACE = ['{市民|しみん}ホール', '{駅前|えきまえ}の{公園|こうえん}', '{大学|だいがく}の{体育館|たいいくかん}', 'レストラン「{春|はる}」', '{文化|ぶんか}センター', '{海|うみ}の{近|ちか}くの{広場|ひろば}'];
const ITEM = ['{飲|の}み{物|もの}', 'タオル', '{帽子|ぼうし}', '{傘|かさ}', '{お弁当|べんとう}', '{身分証|みぶんしょう}', '{運動靴|うんどうぐつ}', '{筆記用具|ひっきようぐ}'];
function docEvent() {
  const ev = one(EVN), p = one(NAMES), place = one(PLACE), item = one(ITEM), m = 1 + rnd(12), d = 8 + rnd(18), t1 = 9 + rnd(8), len = 1 + rnd(3), fee = (1 + rnd(8)) * 500, dl = d - (3 + rnd(4));
  const pass = `これは、${p}さんが{学生|がくせい}{全員|ぜんいん}に{送|おく}ったメールです。\n\n【{件名|けんめい}】${ev}のお{知|し}らせ\n\n${ev}を{開|ひら}きます。{参加|さんか}したい{人|ひと}は、${dayM(m, dl)}までに${p}に{返事|へんじ}をしてください。\n\n{日時|にちじ}：${dayM(m, d)}　${tmM(t1)}〜${tmM(t1 + len)}\n{場所|ばしょ}：${place}\n{参加費|さんかひ}：${yenM(fee)}（{当日|とうじつ}、{会場|かいじょう}で{払|はら}ってください）\n{持|も}ち{物|もの}：${item}`;
  const qs = [];
  const dates = [dl, dl - 1, dl + 1, dl + 3].map(x => dayM(m, Math.max(1, x)));
  const a1 = opt4(dayM(m, dl), dates); if (a1) qs.push(rit({ ty: 'r4', pass, q: '{参加|さんか}したい{人|ひと}は、いつまでに{返事|へんじ}をしなければなりませんか。', qi: 'Entro quando bisogna rispondere?', o: a1, a: 0, e: `「${plain(dayM(m, dl))}までに」` }));
  const a2 = opt4(yenM(fee), [fee + 500, Math.max(500, fee - 500), fee * 2, fee + 1000].map(yenM)); if (a2) qs.push(rit({ ty: 'r4', pass, q: '{当日|とうじつ}、{会場|かいじょう}で{払|はら}うお{金|かね}は、いくらですか。', qi: 'Quanto si paga sul posto?', o: a2, a: 0, e: `「{参加費|さんかひ}：${yenM(fee)}」` }));
  const a3 = opt4(item, ITEM.filter(x => x !== item)); if (a3) qs.push(rit({ ty: 'r4', pass, q: '{持|も}っていかなければならないものは、{何|なん}ですか。', qi: 'Che cosa bisogna portare?', o: a3, a: 0, e: `「{持|も}ち{物|もの}：${item}」` }));
  const e1 = t1 + len, a4 = opt4(tmM(e1), [tmM(e1 + 1), tmM(e1 - 1), tmM(t1), tmM(e1 + 2)]); if (a4) qs.push(rit({ ty: 'r4', pass, q: `${ev}は、{何時|なんじ}に{終|お}わりますか。`, qi: 'A che ora finisce?', o: a4, a: 0, e: `「${plain(tmM(t1))}〜${plain(tmM(e1))}」` }));
  return pick(qs, 2);
}
const STORE = ['パン{屋|や}「ひまわり」', 'カフェ「{桜|さくら}」', '{図書館|としょかん}', '{美術館|びじゅつかん}', '{花屋|はなや}「{春|はる}」'];
function docShop() {
  const s = one(STORE), o = 8 + rnd(3), c = 17 + rnd(4), oe = 10 + rnd(3), ce = 15 + rnd(3), off = 1 + rnd(5), hours = (h) => `${h}:00`;
  const pass = `${s}の{営業時間|えいぎょうじかん}\n\n{月|げつ}〜{金|きん}：${hours(o)}〜${hours(c)}\n{土|ど}・{日|にち}：${hours(oe)}〜${hours(ce)}\n{休|やす}み：${dowM(off)}`;
  const pn = one(NAMES), dow = rnd(7), h = 7 + rnd(14), wk = dow >= 1 && dow <= 5; const open = dow === off ? null : (wk ? [o, c] : [oe, ce]);
  let st; if (!open) st = 'その{日|ひ}は{休|やす}みだ。'; else if (h < open[0]) st = 'まだ{開|あ}いていない。'; else if (h >= open[1]) st = 'もう{閉|し}まっている。'; else st = '{開|あ}いている。';
  const all = ['その{日|ひ}は{休|やす}みだ。', 'まだ{開|あ}いていない。', 'もう{閉|し}まっている。', '{開|あ}いている。'];
  return [rit({ ty: 'r4', pass, q: `${pn}さんは、${dowM(dow)}の${tmM(h)}に${s}へ{行|い}きます。そのとき、どうなっていますか。`, qi: 'In quel momento, qual è la situazione?', o: [st, ...all.filter(x => x !== st)], a: 0, e: `${dow === off ? 'Giorno di chiusura.' : `Orario del giorno: ${open[0]}:00-${open[1]}:00.`}` })];
}
J.r4 = function (lv, n = 3) {
  const out = []; let g = 0; while (out.length < n && g++ < 20) out.push(...one([docMemo, docEvent, docShop])()); return out.slice(0, n);
};

/* ---------- 問題5 : testi medi con "questo/quello" e idea principale ---------- */
const TOPIC = [
  { A: ({ n, y }) => `ここ${y}{年|ねん}で、{紙|かみ}の{本|ほん}を{読|よ}む{人|ひと}が{減|へ}り、スマートフォンで{読|よ}む{人|ひと}が${n}{割|わり}も{増|ふ}えた。`, As: '{紙|かみ}の{本|ほん}を{読|よ}む{人|ひと}が{減|へ}り、スマートフォンで{読|よ}む{人|ひと}が{増|ふ}えたこと', B: '{確|たし}かに、スマートフォンは{軽|かる}くて{便利|べんり}だ。しかし、{長|なが}い{時間|じかん}{読|よ}むと{目|め}が{疲|つか}れやすいという{問題|もんだい}もある。', Bs: 'スマートフォンで{読|よ}むと{目|め}が{疲|つか}れること', C: '{私|わたし}は、{便利|べんり}さだけでなく、{体|からだ}への{影響|えいきょう}も{考|かんが}えて{読|よ}み{方|かた}を{選|えら}ぶべきだと{思|おも}う。', main: '{読|よ}み{方|かた}は、{便利|べんり}さと{体|からだ}への{影響|えいきょう}の{両方|りょうほう}を{考|かんが}えて{選|えら}ぶべきだ。', w: ['スマートフォンで{読|よ}むのは{体|からだ}に{悪|わる}いから、{紙|かみ}の{本|ほん}だけを{読|よ}むべきだ。', '{便利|べんり}なのだから、{紙|かみ}の{本|ほん}はなくなっても{問題|もんだい}ない。'] },
  { A: ({ n, y }) => `${y}{年|ねん}{前|まえ}に{比|くら}べて、{手紙|てがみ}を{書|か}く{人|ひと}は${n}{割|わり}{減|へ}り、メールやメッセージを{送|おく}る{人|ひと}が{増|ふ}えた。`, As: '{手紙|てがみ}を{書|か}く{人|ひと}が{減|へ}り、メールやメッセージを{送|おく}る{人|ひと}が{増|ふ}えたこと', B: 'メールは{早|はや}く{届|とど}くので{便利|べんり}だが、{気持|きも}ちが{伝|つた}わりにくいと{感|かん}じる{人|ひと}も{多|おお}い。', Bs: 'メールでは{気持|きも}ちが{伝|つた}わりにくいと{感|かん}じる{人|ひと}がいること', C: '{大切|たいせつ}な{人|ひと}には、{時々|ときどき}{手紙|てがみ}を{書|か}いてみるのもいいと{思|おも}う。', main: '{大切|たいせつ}な{人|ひと}には、{手紙|てがみ}で{気持|きも}ちを{伝|つた}えることも{大切|たいせつ}だ。', w: ['メールは{気持|きも}ちが{伝|つた}わらないから、{使|つか}うのをやめるべきだ。', '{手紙|てがみ}は{早|はや}く{届|とど}くので、{一番|いちばん}{便利|べんり}だ。'] },
  { A: ({ n, y }) => `この${y}{年|ねん}で、{家族|かぞく}そろって{夕食|ゆうしょく}を{食|た}べる{家|いえ}が${n}{割|わり}{減|へ}った。{仕事|しごと}や{習|なら}い{事|ごと}で、{家|いえ}に{帰|かえ}る{時間|じかん}がバラバラになったからだ。`, As: '{家族|かぞく}そろって{夕食|ゆうしょく}を{食|た}べる{家|いえ}が{減|へ}ったこと', B: '{一人|ひとり}で{食|た}べる{子|こ}どもは、{野菜|やさい}を{食|た}べる{量|りょう}が{少|すく}なく、{話|はな}す{機会|きかい}も{少|すく}ないという{調査|ちょうさ}がある。', Bs: '{一人|ひとり}で{食|た}べる{子|こ}どもは{野菜|やさい}が{少|すく}なく{話|はな}す{機会|きかい}も{少|すく}ないこと', C: '{週|しゅう}に{一回|いっかい}でも、{家族|かぞく}で{食事|しょくじ}をする{日|ひ}をつくるといいと{思|おも}う。', main: '{忙|いそが}しくても、{家族|かぞく}で{食事|しょくじ}をする{時間|じかん}をつくることが{大切|たいせつ}だ。', w: ['{家族|かぞく}で{食事|しょくじ}をするために、{仕事|しごと}や{習|なら}い{事|ごと}をやめるべきだ。', '{一人|ひとり}で{食|た}べても、{野菜|やさい}を{食|た}べれば{問題|もんだい}ない。'] },
  { A: ({ n, y }) => `${y}{年|ねん}{前|まえ}は{町|まち}に{小|ちい}さな{店|みせ}がたくさんあったが、{今|いま}はその${n}{割|わり}がなくなり、{大|おお}きなスーパーが{増|ふ}えた。`, As: '{町|まち}の{小|ちい}さな{店|みせ}が{減|へ}り、{大|おお}きなスーパーが{増|ふ}えたこと', B: 'スーパーは{安|やす}くて{品物|しなもの}も{多|おお}い。しかし、{店|みせ}の{人|ひと}と{話|はな}す{機会|きかい}が{減|へ}って、{町|まち}の{人|ひと}との{関係|かんけい}が{薄|うす}くなったと{言|い}われている。', Bs: '{町|まち}の{人|ひと}との{関係|かんけい}が{薄|うす}くなったと{言|い}われていること', C: '{私|わたし}は、{時々|ときどき}{近|ちか}くの{小|ちい}さな{店|みせ}で{買|か}い{物|もの}をしたいと{思|おも}っている。', main: '{小|ちい}さな{店|みせ}での{買|か}い{物|もの}には、{人|ひと}との{関係|かんけい}をつくるよさがある。', w: ['スーパーは{高|たか}いので、{小|ちい}さな{店|みせ}で{買|か}い{物|もの}をするべきだ。', '{町|まち}の{人|ひと}と{話|はな}さなくても、{買|か}い{物|もの}は{便利|べんり}になった。'] }
];
J.r5 = function (lv, n = 1) {
  const out = []; for (let k = 0; k < n; k++) {
    const t = one(TOPIC), v = { n: 3 + rnd(5), y: one([10, 15, 20, 30]) }, A = t.A(v), pass = `${A}\n\n　__このこと__は、{大|おお}きな{変化|へんか}だと{言|い}えるだろう。${t.B}\n\n${t.C}`;
    const others = TOPIC.filter(x => x !== t).map(x => x.As), ref = opt4(t.As, [t.Bs, ...others]);
    const mainO = opt4(t.main, [...t.w, one(TOPIC.filter(x => x !== t)).main]);
    if (ref) out.push(rit({ ty: 'r5', pass, q: '「このこと」は、{何|なに}を{指|さ}していますか。', qi: 'Che cosa indica «このこと» (sottolineato)?', o: ref, a: 0, e: `「このこと」= ${plain(t.As)}（primo paragrafo）` }));
    if (mainO) out.push(rit({ ty: 'r5', pass, q: '{筆者|ひっしゃ}が{一番|いちばん}{言|い}いたいことは、どれですか。', qi: 'Qual è l\'idea principale dell\'autore?', o: mainO, a: 0, e: `Ultimo paragrafo: ${plain(t.C)}` }));
  }
  return out;
};

/* ---------- 問題7 : informazioni da una tabella (viaggi) ---------- */
J.r7 = function (lv, n = 1) {
  const F = { ski: 'スキー{用具|ようぐ}を{借|か}りられる{旅行|りょこう}', onsen: '{温泉|おんせん}{旅館|りょかん}に{泊|と}まれる{旅行|りょこう}', meal: '{食事|しょくじ}つきの{旅行|りょこう}', pick: '{空港|くうこう}まで{送|おく}り{迎|むか}えがある{旅行|りょこう}' };
  const keys = Object.keys(F), out = [], yes = '○', no = '−';
  for (let k = 0; k < n; k++) {
    let plans, want, guard = 0;
    while (guard++ < 400) {
      plans = Array.from({ length: 4 }, (_, i) => ({ id: '①②③④'[i], days: 2 + rnd(4), price: (2 + rnd(9)) * 10000, f: Object.fromEntries(keys.map(x => [x, Math.random() < .5])), dep: 1 + rnd(26) }));
      const kind = rnd(3), picks = pick(keys, 2), p0 = plans[rnd(4)], pr = p0.price + (rnd(2) ? 0 : 10000);
      want = [{ k: 'f', key: picks[0] }, kind === 0 ? { k: 'f', key: picks[1] } : kind === 1 ? { k: 'price', v: pr } : { k: 'days', v: p0.days }];
      const ok = p => want.every(w => w.k === 'f' ? p.f[w.key] : w.k === 'price' ? p.price <= w.v : p.days === w.v);
      const hit = plans.filter(ok); if (hit.length === 1) { want.idx = plans.indexOf(hit[0]); break; }
      want = null;
    }
    if (!want) continue;
    const mo = 2 + rnd(9), N = 14 + rnd(8), nm = one(NAMES), th = x => `<th>${rich(x)}</th>`;
    const rows = plans.map(p => `<tr><td><b>${p.id}</b></td><td>${rich(`{${p.days}日|${NUM.DAY[p.days]}}`)}</td><td>${rich(yenM(p.price))}</td><td>${p.f.ski ? yes : no}</td><td>${p.f.onsen ? yes : no}</td><td>${p.f.meal ? yes : no}</td><td>${p.f.pick ? yes : no}</td><td>${rich(dayM(mo, p.dep))}</td></tr>`).join('');
    const html = `<div class="passage jp" style="max-height:none;overflow:auto"><div class="small" style="font-weight:800;margin-bottom:6px">${rich('{旅行社|りょこうしゃ}の{旅行|りょこう}{案内|あんない}')}</div><table class="tbl" style="font-size:13px;line-height:1.6"><tr><th></th>${th('{日数|にっすう}')}${th('{料金|りょうきん}')}${th('スキー{用具|ようぐ}')}${th('{温泉|おんせん}{旅館|りょかん}')}${th('{食事|しょくじ}')}${th('{送迎|そうげい}')}${th('{出発日|しゅっぱつび}')}</tr>${rows}</table><div class="small" style="margin-top:8px">${rich(`○＝あり　−＝なし　{料金|りょうきん}は、{出発日|しゅっぱつび}の${N}{日前|にちまえ}までに{旅行社|りょこうしゃ}で{払|はら}ってください。`)}</div></div>`;
    const cond = want.map(w => '・' + (w.k === 'f' ? F[w.key] : w.k === 'price' ? `{料金|りょうきん}が${yenM(w.v)}{以下|いか}の{旅行|りょこう}` : `{${w.v}日|${NUM.DAY[w.v]}}{間|かん}の{旅行|りょこう}`));
    out.push(rit({ ty: 'r7', passHtml: html, q: `${nm}さんが{行|い}きたいのは、{次|つぎ}の二つに{合|あ}う{旅行|りょこう}です。\n${cond.join('\n')}\nどの{旅行|りょこう}ですか。`.replace('二つ', '{二|ふた}つ'), qi: 'Quale viaggio soddisfa le due condizioni?', o: ['①', '②', '③', '④'], a: want.idx, noshuf: true, e: `Verifica le due condizioni nella tabella: risposta ${'①②③④'[want.idx]}.` }));
    const p = plans[rnd(4)], dt = new Date(2027, mo - 1, p.dep); dt.setDate(dt.getDate() - N);
    const fd = d => dayM(d.getMonth() + 1, d.getDate()), alt = [-2, 2, 5].map(x => { const z = new Date(dt); z.setDate(z.getDate() + x); return fd(z); });
    const o2 = opt4(fd(dt), alt);
    if (o2) out.push(rit({ ty: 'r7', passHtml: html, q: `${nm}さんは、${p.id}の{旅行|りょこう}に{参加|さんか}します。{旅行社|りょこうしゃ}で{料金|りょうきん}を{払|はら}う{場合|ばあい}、いつまでに{払|はら}わなければなりませんか。`, qi: 'Entro quando bisogna pagare? (calcola la data)', o: o2, a: 0, e: `Partenza il ${plain(dayM(mo, p.dep))} − ${N} giorni = ${plain(fd(dt))}.` }));
  }
  return out;
};
J.readSet = (lv, n = 8) => [...J.r4(lv, Math.ceil(n * .4)), ...J.r5(lv, 1), ...J.r7(lv, 1)];
