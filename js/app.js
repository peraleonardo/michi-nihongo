'use strict';
/* Router, avvio, service worker */
const ROUTES = [
  [/^#\/home$/, () => V.home(), 'home'], [/^#\/study$/, () => V.study(), 'study'], [/^#\/practice$/, () => V.practice(), 'practice'],
  [/^#\/glossary$/, () => V.glossary(), 'glossary'], [/^#\/stats$/, () => V.stats(), 'stats'], [/^#\/settings$/, () => V.settings(), ''],
  [/^#\/plan$/, () => V.plan(), 'home'],
  [/^#\/path(?:\/(n\d))?$/, m => V.path(m[1]), 'path'], [/^#\/p\/([\w-]+)$/, m => V.unit(m[1]), 'path'], [/^#\/p\/([\w-]+)\/(\w+)$/, m => PATH.go(m[1], m[2]), 'path'], [/^#\/pc\/([\w-]+)$/, m => V.checkpoint(m[1]), 'path'], [/^#\/pf\/(n\d)$/, m => V.final(m[1]), 'path'], [/^#\/kana$/, () => V.kana(), 'study'], [/^#\/kana\/(hira|kata)$/, m => V.kanaChart(m[1]), 'study'],
  [/^#\/kanji\/(n\d)$/, m => V.kanjiList(m[1]), 'study'], [/^#\/vocab\/(n\d)$/, m => V.vocabList(m[1]), 'study'],
  [/^#\/srs\/(all|kanji|vocab)\/(all|n\d)(\/more)?$/, m => V.srs(m[1], m[2], !!m[3]), 'study'],
  [/^#\/gram\/(n\d)$/, m => V.gramList(m[1]), 'study'], [/^#\/g\/(.+)$/, m => V.gramDetail(decodeURIComponent(m[1])), 'study'],
  [/^#\/read\/(n\d)$/, m => V.readList(m[1]), 'study'], [/^#\/t\/(.+)$/, m => V.readText(decodeURIComponent(m[1])), 'study'],
  [/^#\/listen\/(n\d)$/, m => V.listenStudy(m[1]), 'study'], [/^#\/d\/(.+)$/, m => V.dialog(decodeURIComponent(m[1])), 'study'],
  [/^#\/ex\/([^/]+)\/(n\d)$/, m => V.exRun(decodeURIComponent(m[1]), m[2]), 'practice'], [/^#\/exam$/, () => V.examHome(), 'practice'], [/^#\/jlpt$/, () => V.jlpt(), 'practice'], [/^#\/resources$/, () => V.resources(), 'study']
];
function nav(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  const h = location.hash || '#/home';
  if (!/^#\/(g|t|d|ex|p)\//.test(h)) PATH.from = null;
  document.body.classList.remove('focus'); AU.stop(); AU.specs.length = 0; closeSheet();
  let tab = 'home';
  try {
    const r = ROUTES.find(([re]) => re.test(h));
    if (!r) { location.replace('#/home'); return; }
    tab = r[2]; view().classList.remove('page'); r[1](r[0].exec(h));
  } catch (e) {
    console.error(e); view().innerHTML = `<div class="page card"><h2>Ops, qualcosa non va 😅</h2><p class="mut">${esc(e.message)}</p><a class="btn primary" href="#/home">Torna alla Home</a></div>`;
  }
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === tab));
  if (!document.body.classList.contains('focus')) window.scrollTo(0, 0);
  const lb = $('#lvbtn'); if (lb) lb.textContent = LV[S.set.cur];
}
addEventListener('hashchange', render);

// furigana “tocca per mostrare”
document.addEventListener('click', e => {
  const r = e.target.closest('ruby');
  if (r && S.set.furi === 'tap' && !e.target.closest('button,a,.opt,.wchip,.mbtn,.tw')) r.classList.toggle('on');
});
$('#lvbtn').onclick = () => {
  sheet(`<h2>Livello di studio</h2><div class="grid3" style="margin-top:14px">${LEVELS.map(l => `<button class="btn lv-${l}" data-l="${l}" style="${l === S.set.cur ? 'background:var(--lc);color:#fff' : ''}">${LV[l]}</button>`).join('')}</div>`);
  $$('#overlay [data-l]').forEach(b => b.onclick = () => { setLv(b.dataset.l); closeSheet(); render(); });
};

/* service worker + aggiornamenti */
let swReg = null;
function showUpdate() {
  const t = $('#toast'); t.innerHTML = 'Nuova versione pronta <button id="upn" style="margin-left:10px;padding:6px 12px;border-radius:10px;background:var(--brand);color:#fff;font-weight:800">Aggiorna</button>';
  t.style.pointerEvents = 'auto'; t.classList.add('show'); $('#upn').onclick = () => location.reload();
}
function checkUpdate(manual) {
  if (!swReg) { if (manual) toast('Aggiornamenti non disponibili in questa modalità'); return; }
  swReg.update().then(() => { if (manual) toast('Controllo completato: se c’è una novità vedrai il pulsante Aggiorna', '🔄'); }).catch(() => manual && toast('Sei offline: riprova più tardi', '📴'));
}
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(r => { swReg = r; setInterval(() => r.update().catch(() => { }), 3600e3); }).catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) showUpdate(); });
}

(async function boot() {
  load(); applySettings(); AU.init();
  view().innerHTML = '<div class="page c" style="padding:80px 0"><div class="kanji-big" style="font-size:64px">道</div><p class="mut">Caricamento…</p></div>';
  try { await loadData(); } catch (e) { console.error(e); }
  // assegna le voci ai dialoghi (A = femminile, B = maschile, salvo indicazione)
  LEVELS.forEach(l => ((DB.asc[l] || {}).dialoghi || []).forEach(d => d.righe.forEach(x => { if (!x.g) x.g = (d.v && d.v[x.s]) || (x.s === 'A' ? 'F' : 'M'); })));
  PATH.init();
  checkBadges(); render(); registerSW();
})();
