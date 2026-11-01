'use strict';
/* Ascolto in formato JLPT: comprensione dei compiti, dei motivi, del contenuto, espressioni per situazione, risposte rapide.
   Il testo è generato a ogni richiesta da modelli con valori casuali; l'audio usa la sintesi vocale del dispositivo. */
const lit = (lv, o) => ({ sec: 'asc', lv, sid: 'jlpt:' + o.ty, noshuf: true, ...o });
const LN = (s, t, g) => ({ s, t, g });
const shuf3 = (right, wrong) => { const o = shuffle([right, ...wrong]); return { o, a: o.indexOf(right) }; };
const MARK = '①②③④';

/* 問題1 : che cosa deve fare per prima / per seconda cosa */
J.l1 = function (lv) {
  const t = shuffle(TASK).slice(0, 4), n = one(NAMES), ev = one(EVENT), second = rnd(2) === 1;
  const lines = [
    LN('A', `${n}さん、${ev}の{準備|じゅんび}をお{願|ねが}いします。まず${t[0].te}、そのあと${t[1].te}、{最後|さいご}に${t[2].te}ください。`, 'M'),
    LN('B', 'はい、わかりました。', 'F'),
    LN('A', `あ、ちょっと{待|ま}ってください。${t[2].ru}は{先|さき}にしてください。{他|ほか}は{今|いま}{言|い}った{順番|じゅんばん}でいいです。`, 'M'),
    LN('B', 'はい、わかりました。', 'F')
  ];
  const order = [t[2], t[0], t[1]], right = order[second ? 1 : 0].ru;
  const o = shuffle([order[0].ru, order[1].ru, order[2].ru, t[3].ru]);
  return lit(lv, { ty: 'l1', au: { dlg: lines }, q: second ? `${n}さんは、{二番目|にばんめ}に{何|なに}をしますか。` : `${n}さんは、まず{何|なに}をしますか。`, qi: second ? 'Che cosa farà per seconda?' : 'Che cosa farà per prima?', o, a: o.indexOf(right), noshuf: false, e: `Nuovo ordine: ${order.map(x => plain(x.ru)).join(' → ')}` });
};

/* 問題2 : il vero motivo */
const RSN = {
  late: { q: 'どうして{遅|おく}れたんですか。', qj: '{男|おとこ}の{人|ひと}は、どうして{遅|おく}れましたか。', qi: 'Perché è arrivato in ritardo?', pool: ['{電車|でんしゃ}が{止|と}まった', '{寝坊|ねぼう}した', '{道|みち}が{混|こ}んでいた', '{雨|あめ}がひどかった', '{時間|じかん}を{間違|まちが}えた', '{財布|さいふ}を{忘|わす}れた'] },
  off: { q: 'どうして{昨日|きのう}{休|やす}んだんですか。', qj: '{男|おとこ}の{人|ひと}は、どうして{昨日|きのう}{休|やす}みましたか。', qi: 'Perché ieri è stato assente?', pool: ['{熱|ねつ}が{出|で}た', '{頭|あたま}が{痛|いた}かった', '{子|こ}どもが{病気|びょうき}になった', '{病院|びょういん}に{行|い}った', '{家族|かぞく}が{来|き}た', '{引|ひ}っ{越|こ}しをした'] }
};
J.l2 = function (lv) {
  const k = one(['late', 'off']), R = RSN[k], [r, w1, w2, w3] = shuffle(R.pool);
  const lines = [
    LN('A', `${one(NAMES)}さん、${R.q}`, 'F'),
    LN('B', 'すみません。', 'M'),
    LN('A', `${w1}んですか。`, 'F'),
    LN('B', `いいえ、それは{違|ちが}います。${w2}わけでもありません。{実|じつ}は、${r}んです。`, 'M'),
    LN('A', 'そうですか。{気|き}をつけてくださいね。', 'F')
  ];
  const o = shuffle([r, w1, w2, w3].map(x => x + 'から'));
  return lit(lv, { ty: 'l2', au: { dlg: lines }, q: R.qj, qi: R.qi, o, a: o.indexOf(r + 'から'), noshuf: false, e: `Motivo vero: 「実は、${plain(r)}んです」. Gli altri due sono stati negati.` });
};

/* 問題3 : contenuto del discorso (domanda e opzioni solo ascoltate) */
const TOP3 = [
  { act: '{料理|りょうり}', why: '{健康|けんこう}にいい', diff: '{時間|じかん}がかかる', fun: '{新|あたら}しいものが{作|つく}れて{楽|たの}しい' },
  { act: 'ジョギング', why: '{体|からだ}を{動|うご}かしたい', diff: '{朝|あさ}{早|はや}く{起|お}きなければならない', fun: '{気持|きも}ちがよい' },
  { act: '{英語|えいご}の{勉強|べんきょう}', why: '{仕事|しごと}で{使|つか}う', diff: '{単語|たんご}が{覚|おぼ}えられない', fun: '{少|すこ}しずつわかるようになってきた' },
  { act: '{写真|しゃしん}', why: '{旅行|りょこう}の{思|おも}い{出|で}を{残|のこ}したい', diff: 'カメラが{高|たか}い', fun: '{町|まち}を{歩|ある}くのが{楽|たの}しくなった' },
  { act: 'ギター', why: '{好|す}きな{歌|うた}を{弾|ひ}きたい', diff: '{指|ゆび}が{痛|いた}くなる', fun: '{弾|ひ}けるようになるとうれしい' },
  { act: '{畑|はたけ}の{仕事|しごと}', why: '{野菜|やさい}を{自分|じぶん}で{作|つく}りたい', diff: '{夏|なつ}は{暑|あつ}い', fun: '{食|た}べるととてもおいしい' }
];
J.l3 = function (lv) {
  const [A, B, C] = shuffle(TOP3);
  const mono = `{私|わたし}は{最近|さいきん}、${A.act}を{始|はじ}めました。${A.why}と{思|おも}ったからです。${A.diff}ので{大変|たいへん}ですが、${A.fun}ので、これからも{続|つづ}けたいと{思|おも}っています。`;
  const right = `${A.fun}ので、{続|つづ}けたいと{思|おも}っている。`, w1 = `${A.diff}ので、やめたいと{思|おも}っている。`, w2 = `${B.why}と{思|おも}って{始|はじ}めた。`;
  const { o, a } = shuf3(right, [w1, w2]);
  const lines = [LN('A', mono, 'F'), LN('A', '{話|はなし}の{内容|ないよう}と{合|あ}っているのは、どれですか。', 'M'), ...o.map((x, i) => LN('A', `${['いち', 'に', 'さん'][i]}。${x}`, 'M'))];
  return lit(lv, { ty: 'l3', au: { dlg: lines }, q: '{話|はなし}の{内容|ないよう}と{合|あ}っているのは、どれですか。', qi: 'Le opzioni si ascoltano soltanto: scegli il numero.', o, a, opHide: true, e: `Parlante: ${plain(A.act)} — ${plain(A.why)}; ${plain(A.diff)}; ${plain(A.fun)}.` });
};

/* 問題4 : che cosa si dice in questa situazione (opzioni solo audio) */
const SIT = [
  ['Entri in casa di un amico.', '{友達|ともだち}の{家|いえ}に{入|はい}ります。', 'お{邪魔|じゃま}します。', ['いってきます。', 'ごちそうさまでした。']],
  ['Hai finito di mangiare.', '{食事|しょくじ}が{終|お}わりました。', 'ごちそうさまでした。', ['いただきます。', 'いらっしゃいませ。']],
  ['Esci di casa.', '{家|いえ}を{出|で}ます。', 'いってきます。', ['ただいま。', 'おかえりなさい。']],
  ['Torni a casa.', '{家|いえ}に{帰|かえ}ってきました。', 'ただいま。', ['いってきます。', 'いってらっしゃい。']],
  ['Incontri qualcuno per la prima volta.', '{初|はじ}めて{会|あ}う{人|ひと}に{会|あ}いました。', 'はじめまして。どうぞよろしくお{願|ねが}いします。', ['おひさしぶりです。', 'さようなら。']],
  ['Vuoi prendere in prestito una penna.', '{友達|ともだち}のペンを{借|か}りたいです。', 'ちょっと{借|か}りてもいいですか。', ['ちょっと{貸|か}してあげましょうか。', 'ちょっと{返|かえ}しに{来|き}ました。']],
  ['Il tuo collega ha lavorato fino a tardi.', '{同僚|どうりょう}が{遅|おそ}くまで{仕事|しごと}をしていました。', 'お{疲|つか}れさまでした。', ['いらっしゃいませ。', 'お{先|さき}にどうぞ。']],
  ['Hai fatto aspettare una persona.', '{人|ひと}を{待|ま}たせてしまいました。', 'お{待|ま}たせしました。', ['お{待|ま}ちください。', 'お{先|さき}に{失礼|しつれい}します。']],
  ['Qualcuno ti ha aiutato con i bagagli.', '{知|し}らない{人|ひと}が{荷物|にもつ}を{持|も}ってくれました。', 'ありがとうございます。たすかりました。', ['どういたしまして。', 'ごめんなさい。{気|き}をつけます。']],
  ['Lasci l\'ufficio prima degli altri.', '{会社|かいしゃ}で、ほかの{人|ひと}より{先|さき}に{帰|かえ}ります。', 'お{先|さき}に{失礼|しつれい}します。', ['お{疲|つか}れさまでした。ごゆっくり。', 'いらっしゃいませ。']],
  ['Non hai capito, vuoi che ripeta.', '{先生|せんせい}の{話|はなし}がよくわかりませんでした。', 'すみません、もう{一度|いちど}お{願|ねが}いします。', ['わかりました。もう{大丈夫|だいじょうぶ}です。', 'ありがとうございました。']],
  ['Auguri di guarigione a un malato.', '{友達|ともだち}が{病気|びょうき}で{寝|ね}ています。', 'お{大事|だいじ}に。', ['おめでとうございます。', 'いってらっしゃい。']]
];
J.l4 = function (lv) {
  const [it, nar, right, wrong] = one(SIT), { o, a } = shuf3(right, wrong);
  return lit(lv, { ty: 'l4', au: { t: nar + '{何|なん}と{言|い}いますか。', who: 'F' }, q: it, qi: 'Che cosa dici in questa situazione? Ascolta le 3 frasi e scegli.', o, a, opAudio: true, e: `Frase giusta: 「${plain(right)}」`, tr: nar });
};

/* 問題5 : risposta rapida (frase + 3 risposte solo ascoltate) */
const QR = [
  { p: (v) => `${v.n}さん、{今度|こんど}の${v.ev}に{来|き}ませんか。`, r: () => 'ええ、ぜひ{行|い}きたいです。', w: ['いいえ、{昨日|きのう}{来|き}ました。', 'ありがとうございます。{行|い}ってきます。'] },
  { p: (v) => `${v.n}さんは、{今|いま}どこにいますか。`, r: () => '{会議室|かいぎしつ}にいると{思|おも}いますよ。', w: ['はい、{午後|ごご}から{会議|かいぎ}です。', 'ええ、{会議室|かいぎしつ}は{広|ひろ}いです。'] },
  { p: () => 'すみません、ちょっと{手伝|てつだ}ってもらえませんか。', r: () => 'ええ、いいですよ。{何|なに}をしましょうか。', w: ['いいえ、{手伝|てつだ}ってもらいました。', 'どういたしまして。'] },
  { p: (v) => `この${v.it}、{借|か}りてもいいですか。`, r: () => 'ええ、どうぞ。{使|つか}ってください。', w: ['ええ、{借|か}りましたよ。', 'いいえ、{貸|か}してもらいました。'] },
  { p: (v) => `${v.ev}は{何時|なんじ}に{始|はじ}まるか、{知|し}っていますか。`, r: () => 'さあ、{調|しら}べてみますね。', w: ['ええ、{知|し}らないでください。', 'はい、{始|はじ}めてもいいですよ。'] },
  { p: () => '{今日|きょう}は{早|はや}く{帰|かえ}ってもいいですか。', r: () => 'ええ、いいですよ。{気|き}をつけて。', w: ['ええ、{早|はや}く{帰|かえ}りましたね。', 'いいえ、{今日|きょう}は{帰|かえ}りませんでした。'] },
  { p: (v) => `${v.it}を{忘|わす}れてしまったんですが…。`, r: () => 'それは{困|こま}りましたね。{私|わたし}のを{使|つか}いますか。', w: ['それはよかったですね。', 'はい、{忘|わす}れないでください。'] },
  { p: () => 'もうお{昼|ひる}ご{飯|はん}を{食|た}べましたか。', r: () => 'いいえ、まだです。これから{行|い}くところです。', w: ['はい、これから{食|た}べました。', 'いいえ、{食|た}べましたよ。'] },
  { p: (v) => `${v.n}さんに、この${v.it}を{渡|わた}していただけませんか。`, r: () => 'はい、{渡|わた}しておきます。', w: ['はい、{渡|わた}してもらいました。', 'いいえ、{渡|わた}してあげます。'] },
  { p: () => 'あした、ちょっと{早|はや}く{来|き}てもらえませんか。', r: () => 'わかりました。{何時|なんじ}ごろがいいですか。', w: ['わかりました。{早|はや}く{来|き}ませんでした。', 'そうですか。{早|はや}く{来|き}てください。'] }
];
const ITM = ['{傘|かさ}', '{辞書|じしょ}', '{資料|しりょう}', 'ペン', '{地図|ちず}', '{鍵|かぎ}'];
J.l5 = function (lv) {
  const q = one(QR), v = { n: one(NAMES), ev: one(EVENT), it: one(ITM) }, right = q.r(v), { o, a } = shuf3(right, q.w);
  return lit(lv, { ty: 'l5', au: { t: q.p(v), who: one(['M', 'F']) }, q: 'Ascolta la frase e scegli la risposta più naturale.', o, a, opAudio: true, e: `Risposta giusta: 「${plain(right)}」`, tr: q.p(v) });
};
J.listenSet = (lv, n = 8) => {
  const gens = [J.l1, J.l2, J.l3, J.l4, J.l5], out = [];
  for (let i = 0; i < n; i++) out.push(gens[i % 5](lv));
  return out;
};
/* opzioni audio: ciascuna opzione parlata ha la sua voce/testo (J.l4 e J.l5) */
