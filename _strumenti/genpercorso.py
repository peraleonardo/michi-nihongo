#!/usr/bin/env python3
"""Genera data/percorso.json: il curriculum guidato (unità, ordine, obiettivi) di N5 → N4 → N3.

Uso:  python3 -I _strumenti/genpercorso.py            (dalla cartella dell'app)

Il curriculum è scritto qui (SPEC) a mano, da insegnante: ordine delle unità, obiettivi, schede di
grammatica, testi e dialoghi. Lo script completa in automatico quello che sarebbe noioso fare a mano
(parole per categoria, kanji per affinità con le parole) e VERIFICA che ogni scheda, kanji, testo,
dialogo e parola sia assegnato esattamente una volta. Se qualcosa non torna, si ferma con un errore.
Per cambiare l'ordine o spostare contenuti modifica SPEC e rilancia lo script.
"""
import json, math, os, sys, re

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda f: json.load(open(os.path.join(APP, 'data', f), encoding='utf-8'))
KANJI = re.compile(r'[一-鿿々]')

# ---------------------------------------------------------------- SPEC
# Ogni unità: id (suffisso), t titolo, goal obiettivo ("alla fine sarai in grado di…"),
# gram [id scheda], tx [testi], dl [dialoghi], vc [categorie vocabolario], kj (kanji, solo N5: a mano)
# kind: 'kana' (alfabeti), 'bridge' (ponte di ripasso), altrimenti unità normale.
# cp: True = dopo questa unità c'è un checkpoint cumulativo.
N5 = [
 dict(n='01', kind='kana', t='Hiragana 1', sub='あ・か・さ・た・な', goal='Leggere e riconoscere ad orecchio i 25 hiragana delle righe あ・か・さ・た・な.',
      kana=dict(s='hira', g='base', rows=[0, 1, 2, 3, 4])),
 dict(n='02', kind='kana', t='Hiragana 2', sub='は・ま・や・ら・わ・ん', goal='Completare i 46 hiragana di base: ora puoi leggere qualsiasi parola semplice.',
      kana=dict(s='hira', g='base', rows=[5, 6, 7, 8, 9])),
 dict(n='03', kind='kana', t='Hiragana 3', sub='゛゜ e combinazioni', goal='Padroneggiare dakuten ゛, handakuten ゜ (が, ぱ…), le combinazioni (きゃ, しゅ…), la っ piccola e la vocale lunga.',
      kana=dict(s='hira', g=['daku', 'combo'])),
 dict(n='04', kind='kana', t='Katakana 1', sub='ア〜ン', goal='Leggere i 46 katakana di base e riconoscere le parole straniere (コーヒー, テレビ).',
      kana=dict(s='kata', g='base')),
 dict(n='05', kind='kana', t='Katakana 2', sub='゛゜, combinazioni, suoni stranieri', goal='Leggere i katakana con dakuten, le combinazioni e i suoni stranieri (ティ, ファ…): fine degli alfabeti.',
      kana=dict(s='kata', g=['daku', 'combo'], extra=True), cp=True),
 dict(n='06', t='Presentarsi', goal='Presentarti, dire da dove vieni e cosa fai; chiedere «chi è?» e «che cos’è?».',
      kj='人日本国名先生学年', gram=['n5-wa-desu', 'n5-desu-neg', 'n5-ka-ne-yo', 'n5-no', 'n5-mo'],
      tx=['t-n5-01'], dl=['dlg-n5-08'], vc={'Persone': ['06', '11'], 'Domande': ['06'], 'Espressioni': ['06', '15'], 'Verbi': 'all', 'Aggettivi': ['09', '10', '11', '12', '13']}),
 dict(n='07', t='Numeri, prezzi e acquisti', goal='Contare, dire prezzi e quantità, chiedere «quanto costa?» e fare acquisti semplici.',
      kj='一二三四五六七八九十百千万円', gram=['n5-kosoado', 'n5-josuushi', 'n5-kara-made', 'n5-kudasai-dou'],
      tx=['t-n5-03'], dl=['dlg-n5-03'], vc={'Numeri': ['07', '08'], 'Dimostrativi': ['07'], 'Abbigliamento': ['07'], 'Oggetti': ['07', '13', '14'], 'Verbi': 'all'}),
 dict(n='08', t='La giornata', goal='Raccontare la tua giornata: orari, giorni della settimana, cosa fai e dove.',
      kj='時分半午今毎月火水木金土', gram=['n5-masu', 'n5-wo', 'n5-ni-he', 'n5-de', 'n5-hindo-fukushi'],
      tx=['t-n5-05'], dl=['dlg-n5-02'], vc={'Tempo': ['08', '14', '15'], 'Verbi': 'all'}),
 dict(n='09', t='Descrivere cose e luoghi', goal='Descrivere persone, oggetti e luoghi e dire dove si trova qualcosa.',
      kj='大小高長上下中外左右', gram=['n5-i-adj', 'n5-na-adj', 'n5-aru-iru', 'n5-to'],
      tx=['t-n5-06'], dl=[], vc={'Luoghi': ['09', '14'], 'Aggettivi': ['09', '10', '11', '12', '13'], 'Casa': ['09', '11'], 'Verbi': 'all'}, cp=True),
 dict(n='10', t='Stagioni, meteo e preferenze', goal='Parlare del tempo che fa, dire che cosa ti piace e fare confronti.',
      kj='山川天気雨東西南北白', gram=['n5-ga-suki', 'n5-no-ga-suki', 'n5-yori', 'n5-ichiban', 'n5-darou'],
      tx=['t-n5-04'], dl=['dlg-n5-04', 'dlg-n5-06'], vc={'Natura': ['10'], 'Cibo': ['10', '11'], 'Tempo libero': ['10'], 'Verbi': 'all'}),
 dict(n='11', t='Famiglia, amici e inviti', goal='Parlare della famiglia, invitare un amico e proporre di fare qualcosa insieme.',
      kj='男女子友父母', gram=['n5-tai-hoshii', 'n5-mashou', 'n5-mashouka', 'n5-ka-ka', 'n5-ni-iku'],
      tx=['t-n5-07'], dl=['dlg-n5-05'], vc={'Verbi': 'all'}),
 dict(n='12', t='Azioni di ogni giorno', goal='Usare la forma て e la forma semplice: richieste, azioni in corso, passato e negazione informali.',
      kj='行来出入見聞話読書食休', gram=['n5-te-kudasai', 'n5-teiru', 'n5-nai', 'n5-ta-form', 'n5-naide'],
      tx=['t-n5-02'], dl=['dlg-n5-07'], vc={'Azioni': ['12'], 'Corpo': ['12'], 'Avverbi': ['12', '15'], 'Verbi': 'all'}),
 dict(n='13', t='Permessi, obblighi e consigli', goal='Chiedere e dare permessi, dire che cosa si deve o non si deve fare, dare consigli.',
      kj='車電校語', gram=['n5-temo-ii', 'n5-nakereba', 'n5-nakereba-var', 'n5-hou-ga-ii', 'n5-takoto-tari', 'n5-teari'],
      tx=[], dl=[], vc={'Scuola': ['13'], 'Città': ['13', '14'], 'Verbi': 'all'}, cp=True),
 dict(n='14', t='Tempo e progetti', goal='Parlare di piani e intenzioni e mettere in sequenza le azioni (prima, dopo, quando).',
      kj='後前間何', gram=['n5-mae-kara', 'n5-toki', 'n5-tsumori', 'n5-mou-mada', 'n5-dake', 'n5-kata'],
      tx=['t-n5-08'], dl=['dlg-n5-01'], vc={'Verbi': 'all'}),
 dict(n='15', t='Spiegare e motivare', goal='Dare motivi e spiegazioni, contrapporre idee e collegare le frasi (ma, quindi, perché).',
      kj='', gram=['n5-kara-node', 'n5-nda-desu', 'n5-ga-keredo', 'n5-setsuzokushi', 'n5-naru-suru', 'n5-sugiru', 'n5-o-go', 'n5-gimonshi'],
      tx=[], dl=[], vc={'Astratti': ['15'], 'Verbi': 'all'}),
]

N4 = [
 dict(n='00', kind='bridge', t='Ponte N5 → N4', sub='ripasso', goal='Ripassare ciò che sai da N5 e colmare i buchi prima di cominciare il nuovo livello.'),
 dict(n='01', t='Capacità e opinioni', goal='Dire cosa sai o puoi fare, esprimere opinioni e supposizioni.',
      gram=['n4-koto-ga-dekiru', 'n4-kanou', 'n4-koto-ga-aru', 'n4-to-omou', 'n4-kamoshirenai', 'n4-hazu'], tx=['t-n4-10'], dl=['dlg-n4-06'],
      vc={'Astratti': ['01', '11'], 'Verbi': 'all'}),
 dict(n='02', t='Dare e ricevere', goal='Chiedere, offrire e ricevere favori; fare richieste più naturali.',
      gram=['n4-ageru-kureru-morau', 'n4-te-hoshii', 'n4-te-sumimasen', 'n4-taradou', 'n4-yasui-nikui'], tx=['t-n4-01'], dl=['dlg-n4-05'],
      vc={'Persone': ['02', '12'], 'Oggetti': ['02', '08'], 'Verbi': 'all'}),
 dict(n='03', t='Condizioni (1)', goal='Formulare condizioni: «se piove…», «quando arrivi…» con たら・ば・と・なら.',
      gram=['n4-tara', 'n4-ba', 'n4-to-jouken', 'n4-nara'], tx=['t-n4-09'], dl=['dlg-n4-01'],
      vc={'Tempo': ['03', '06'], 'Casa': ['03', '08'], 'Verbi': 'all'}),
 dict(n='04', t='Concessioni e motivi', goal='Esprimere concessioni («anche se…», «sebbene…») e dare più motivi con し.',
      gram=['n4-temo', 'n4-baai', 'n4-noni', 'n4-shi'], tx=['t-n4-06'], dl=['dlg-n4-07'],
      vc={'Scuola': ['04', '09'], 'Lavoro': ['04'], 'Verbi': 'all'}, cp=True),
 dict(n='05', t='Sfumature dell’azione', goal='Dare sfumature alle azioni: finire per sbaglio, fare in anticipo, provare, andare/venire con cambiamento.',
      gram=['n4-te-shimau', 'n4-te-oku-miru', 'n4-teiku-tekuru', 'n4-hajimeru'], tx=['t-n4-05'], dl=['dlg-n4-08'],
      vc={'Città': ['05', '10'], 'Azioni': ['05', '09'], 'Verbi': 'all'}),
 dict(n='06', t='Simultaneità e momenti', goal='Parlare di due azioni contemporanee, di cose appena fatte o in corso.',
      gram=['n4-nagara', 'n4-aida', 'n4-tabakari', 'n4-bakari', 'n4-koro'], tx=['t-n4-02'], dl=['dlg-n4-02'],
      vc={'Tempo': ['03', '06'], 'Tempo libero': ['06'], 'Natura': ['06', '10'], 'Verbi': 'all'}),
 dict(n='07', t='Decisioni e piani', goal='Parlare di decisioni, abitudini che cambiano e programmi.',
      gram=['n4-koto-ni', 'n4-you-ni', 'n4-ikoukei', 'n4-yotei'], tx=['t-n4-03'], dl=[],
      vc={'Società': ['07', '10'], 'Avverbi': ['07', '11'], 'Verbi': 'all'}),
 dict(n='08', t='Scadenze e stati', goal='Parlare di scadenze, di stati che restano invariati e di materiali.',
      gram=['n4-made-ni', 'n4-kusuru', 'n4-mama', 'n4-kara-tsukuru', 'n4-sa-nasai'], tx=['t-n4-04'], dl=[],
      vc={'Oggetti': ['02', '08'], 'Casa': ['03', '08'], 'Cibo': ['08'], 'Abbigliamento': ['08'], 'Verbi': 'all'}, cp=True),
 dict(n='09', t='Passivo e causativo', goal='Usare passivo e causativo e distinguere verbi transitivi e intransitivi.',
      gram=['n4-ukemi', 'n4-shieki', 'n4-shieki-ukemi', 'n4-jidoushi'], tx=['t-n4-08'], dl=[],
      vc={'Scuola': ['04', '09'], 'Azioni': ['05', '09'], 'Corpo': ['09']}),
 dict(n='10', t='Sembrare e riferire', goal='Riferire ciò che hai sentito, dire «sembra che…» e fare esempi.',
      gram=['n4-sou-da', 'n4-mitai-you-rashii', 'n4-to-iu', 'n4-you-na', 'n4-toka'], tx=['t-n4-11'], dl=[],
      vc={'Natura': ['06', '10'], 'Città': ['05', '10'], 'Società': ['07', '10'], 'Verbi': 'all'}),
 dict(n='11', t='Domande e conferme', goal='Fare domande indirette, chiedere conferma e usare espressioni utili per conversare.',
      gram=['n4-janaika', 'n4-kadouka', 'n4-nowa', 'n4-nakanaka', 'n4-sonota'], tx=['t-n4-07'], dl=[],
      vc={'Avverbi': ['07', '11'], 'Astratti': ['01', '11'], 'Congiunzioni': ['11'], 'Espressioni': ['11'], 'Verbi': 'all'}),
 dict(n='12', t='Cortesia e keigo', goal='Parlare in modo cortese con 尊敬語 e 謙譲語 e dire che cosa è necessario.',
      gram=['n4-keigo-sonkei', 'n4-keigo-kenjou', 'n4-garu', 'n4-hitsuyou'], tx=['t-n4-12'], dl=['dlg-n4-03', 'dlg-n4-04'],
      vc={'Keigo': ['12'], 'Persone': ['02', '12'], 'Luoghi': ['12'], 'Dimostrativi': ['12'], 'Numeri': ['12']}),
]

N3 = [
 dict(n='00', kind='bridge', t='Ponte N5+N4 → N3', sub='ripasso', goal='Ripassare N5 e N4 e colmare i buchi prima di affrontare il livello N3.'),
 dict(n='01', t='Dovere e consigli', goal='Dire che cosa si dovrebbe fare, dare consigli e confrontare con «più… più…».',
      gram=['n3-beki', 'n3-ba-ii', 'n3-ba-hodo'], tx=['t-n3-01'], dl=[]),
 dict(n='02', t='Cause e risultati', goal='Spiegare cause e risultati con ために・によって・結果.',
      gram=['n3-tame-ni', 'n3-niyoru', 'n3-kekka'], tx=['t-n3-03'], dl=['dlg-n3-02']),
 dict(n='03', t='Deduzioni e negazioni forti', goal='Trarre conclusioni («ecco perché») e fare negazioni forti («non può essere», «mai»).',
      gram=['n3-wake', 'n3-to-wa-kagiranai', 'n3-kesshite'], tx=['t-n3-06'], dl=[]),
 dict(n='04', t='Tendenze e quantità', goal='Parlare di tendenze, di abitudini e di quantità eccessive.',
      gram=['n3-gachi', 'n3-darake', 'n3-amari'], tx=['t-n3-10'], dl=['dlg-n3-04'], cp=True),
 dict(n='05', t='Confronti e relazioni', goal='Confrontare e mettere in relazione cose e fatti con に対して・につれて・にしても.',
      gram=['n3-ni-taishite', 'n3-nishitagatte', 'n3-nishite'], tx=['t-n3-07'], dl=[]),
 dict(n='06', t='Il tempo nelle frasi', goal='Collocare le azioni nel tempo con precisione: durante, ogni volta, un tempo.',
      gram=['n3-chuu', 'n3-goto-ni', 'n3-tamono'], tx=['t-n3-08'], dl=['dlg-n3-06']),
 dict(n='07', t='Contrasto ed enfasi', goal='Esprimere contrasto («benché»), aggiunta («non solo… ma anche») ed enfasi («proprio»).',
      gram=['n3-kuse-ni', 'n3-bakaride', 'n3-koso'], tx=['t-n3-09'], dl=[]),
 dict(n='08', t='Concessioni e limiti', goal='Esprimere concessioni («per quanto…»), limiti («non resta che…») e alternative.',
      gram=['n3-donnani', 'n3-shika-nai', 'n3-ippou'], tx=['t-n3-04'], dl=['dlg-n3-03'], cp=True),
 dict(n='09', t='Espressioni con て e simili', goal='Usare le espressioni con て più frequenti, il “non è che…” e il «non c’è modo di…».',
      gram=['n3-te-hyougen', 'n3-naikotowanai', 'n3-you-ga-nai'], tx=['t-n3-02'], dl=[]),
 dict(n='10', t='Tema, destinatari e aggiunte', goal='Dire il tema centrale, a chi è rivolto qualcosa e aggiungere informazioni.',
      gram=['n3-wo-chuushin', 'n3-muke', 'n3-ue-ni'], tx=['t-n3-11'], dl=['dlg-n3-05']),
 dict(n='11', t='Finzione e verbi composti', goal='Fingere, fare azioni complete e usare i verbi composti.',
      gram=['n3-furi-wo-suru', 'n3-fukugou-doushi'], tx=['t-n3-05'], dl=[]),
 dict(n='12', t='Distanza nel tempo e contrasto', goal='Dire «dopo tanto tempo», «anzi» e collegare le idee con i connettivi N3.',
      gram=['n3-burini', 'n3-mushiro'], tx=[], dl=['dlg-n3-01'], cp=True),
 dict(n='13', t='A metà e fino in fondo', goal='Parlare di azioni lasciate a metà o portate a termine.',
      gram=['n3-kakeru', 'n3-kitta'], tx=[], dl=[]),
 dict(n='14', t='Ultime espressioni N3', goal='Chiudere il programma N3 con le espressioni rimaste e un ripasso generale.',
      gram=['n3-dake-kurai', 'n3-sonota'], tx=[], dl=[]),
]

TITLE = {'n5': 'Percorso N5 — le basi', 'n4': 'Percorso N4 — conversare con sicurezza', 'n3': 'Percorso N3 — leggere e capire testi reali'}
INTRO = {
 'n5': 'Parti da zero: alfabeti, poi le prime frasi. Obiettivo: superare l’esame N5.',
 'n4': 'Include tutto N5 (lo ripassi di continuo) più i contenuti N4. Obiettivo: superare l’esame N4.',
 'n3': 'Include N5 e N4 (spiralati nei test) più i contenuti N3. Obiettivo: superare l’esame N3.'}

# ---------------------------------------------------------------- utilità
def vid(e): return 'v:' + e['w'] + ('・' + e['r'] if e.get('r') and e['r'] != e['w'] else '')

def check(cond, msg):
    if not cond:
        print('ERRORE:', msg); sys.exit(1)

def split_even(lst, m):
    n = len(lst); out = []; s = 0
    for i in range(m):
        e = s + (n - s + (m - i - 1)) // (m - i)
        out.append(lst[s:e]); s = e
    return out

def kana_chars(kana, cfg):
    gs = {g['id']: g for g in kana['groups']}
    ids = cfg['g'] if isinstance(cfg['g'], list) else [cfg['g']]
    out = []
    for gi in ids:
        rows = gs[gi]['rows']
        if 'rows' in cfg: rows = [rows[i] for i in cfg['rows']]
        for r in rows:
            for k, _ in r: out.append(k)
    if cfg['s'] == 'kata':
        out = [''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in k) for k in out]
        if cfg.get('extra'): out += [k for k, _ in kana['kataExtra']]
    return out

def build_level(lv, spec, prev_levels):
    kj = D(f'kanji-{lv}.json'); vo = D(f'vocabolario-{lv}.json'); gr = D(f'grammatica-{lv}.json')
    tx = D(f'testi-{lv}.json'); dl = D(f'ascolto-{lv}.json').get('dialoghi', [])
    kana = D('kana.json')
    content = [u for u in spec if u.get('kind') not in ('kana', 'bridge')]
    cids = [u['n'] for u in content]

    # --- grammatica / testi / dialoghi: assegnati a mano, verifica copertura esatta
    for what, key, allids in (('grammatica', 'gram', [g['id'] for g in gr]), ('testi', 'tx', [t['id'] for t in tx]), ('dialoghi', 'dl', [d['id'] for d in dl])):
        got = [x for u in content for x in u.get(key, [])]
        check(len(got) == len(set(got)), f'{lv} {what}: duplicati {[x for x in set(got) if got.count(x) > 1]}')
        check(set(got) == set(allids), f'{lv} {what}: mancano {sorted(set(allids) - set(got))} · in più {sorted(set(got) - set(allids))}')

    # --- vocabolario: per categoria, diviso in parti uguali tra le unità che la richiedono
    byc = {}
    for e in vo: byc.setdefault(e.get('c') or '', []).append(vid(e))
    # coerenza: le unità citate in una lista devono esistere
    for u in content:
        for c, v in (u.get('vc') or {}).items():
            if v != 'all': check(all(n in cids for n in v), f'{lv} {u["n"]}: vc {c} cita unità inesistente')
    # ricostruisci i claim dalle liste (la lista è la verità: unione di tutte le unità citate)
    claims = {}
    for u in content:
        for c, v in (u.get('vc') or {}).items():
            if v == 'all': claims[c] = list(cids)
            else: claims.setdefault(c, []); [claims[c].append(n) for n in v if n not in claims[c]]
    for c in claims: claims[c] = [n for n in cids if n in set(claims[c])]
    assign = {n: [] for n in cids}
    leftover = []
    if claims:
        for c, ids in byc.items():
            if c in claims:
                for n, part in zip(claims[c], split_even(ids, len(claims[c]))): assign[n] += part
            else: leftover += ids
    else:  # nessuna categoria indicata: a pezzi, nell'ordine del file
        leftover = [vid(e) for e in vo]
    # parole senza categoria richiesta: distribuite nelle unità meno piene
    for i in leftover:
        n = min(cids, key=lambda x: (len(assign[x]), x)); assign[n].append(i)
    if not claims:  # chunk contigui per mantenere l'ordine del file
        assign = {n: p for n, p in zip(cids, split_even(leftover, len(cids)))}
    allv = [i for n in cids for i in assign[n]]
    check(len(allv) == len(set(allv)) and set(allv) == {vid(e) for e in vo}, f'{lv} vocab: copertura errata')

    # --- kanji: N5 a mano; N4/N3 per affinità con le parole dell'unità
    kall = [k['k'] for k in kj]
    kassign = {n: '' for n in cids}
    if all('kj' in u for u in content):
        for u in content: kassign[u['n']] = u['kj']
        got = ''.join(kassign.values())
        check(len(got) == len(set(got)), f'{lv} kanji duplicati: {[c for c in set(got) if got.count(c) > 1]}')
        check(set(got) == set(kall), f'{lv} kanji: mancano {"".join(sorted(set(kall) - set(got)))} · in più {"".join(sorted(set(got) - set(kall)))}')
    else:
        vw = {e['w'] for e in vo}
        idw = {vid(e): e['w'] for e in vo}
        words = {n: ''.join(idw[i] for i in assign[n] if i in idw) for n in cids}
        cap = math.ceil(len(kall) / len(cids)) + 3
        cnt = {n: 0 for n in cids}; res = {n: [] for n in cids}
        for k in kall:
            cand = [n for n in cids if k in words[n] and cnt[n] < cap]
            n = min(cand, key=lambda x: (cnt[x], x)) if cand else min(cids, key=lambda x: (cnt[x], x))
            res[n].append(k); cnt[n] += 1
        # tieni l'ordine del file dentro l'unità
        for n in cids: kassign[n] = ''.join(res[n])
    # --- unità in uscita
    units = []
    for u in spec:
        o = dict(id=f'{lv}-{u["n"]}', t=u['t'], goal=u['goal'])
        if u.get('sub'): o['sub'] = u['sub']
        if u.get('kind'): o['kind'] = u['kind']
        if u.get('kind') == 'kana':
            c = u['kana']; o['kana'] = dict(s=c['s'], c=kana_chars(kana, c))
        elif u.get('kind') != 'bridge':
            o['kanji'] = kassign[u['n']]; o['vocab'] = assign[u['n']]
            o['gram'] = u['gram']; o['tx'] = u['tx']; o['dl'] = u['dl']
        if u.get('cp'): o['cp'] = True
        units.append(o)
    return units

def main():
    out = {'v': 1, 'levels': {}}
    for lv, spec in (('n5', N5), ('n4', N4), ('n3', N3)):
        ids = [u['n'] for u in spec]; check(len(ids) == len(set(ids)), f'{lv}: numeri unità duplicati')
        out['levels'][lv] = dict(t=TITLE[lv], intro=INTRO[lv], units=build_level(lv, spec, []))
    # stampa riepilogo
    print(f'{"unità":10} {"titolo":34} {"kanji":>5} {"parole":>6} {"gram":>4} {"testi":>5} {"dial":>4}')
    for lv, L in out['levels'].items():
        for u in L['units']:
            if u.get('kana'): print(f'{u["id"]:10} {u["t"]:34} kana: {len(u["kana"]["c"])} segni')
            elif u.get('kind') == 'bridge': print(f'{u["id"]:10} {u["t"]:34} (ponte)')
            else: print(f'{u["id"]:10} {u["t"]:34} {len(u["kanji"]):>5} {len(u["vocab"]):>6} {len(u["gram"]):>4} {len(u["tx"]):>5} {len(u["dl"]):>4}')
    p = os.path.join(APP, 'data', 'percorso.json')
    with open(p, 'w', encoding='utf-8') as f:
        f.write('{"v":1,"levels":{\n')
        for li, (lv, L) in enumerate(out['levels'].items()):
            f.write(f'"{lv}":{{"t":{json.dumps(L["t"], ensure_ascii=False)},"intro":{json.dumps(L["intro"], ensure_ascii=False)},"units":[\n')
            f.write(',\n'.join(json.dumps(u, ensure_ascii=False, separators=(',', ':')) for u in L['units']))
            f.write('\n]}' + (',\n' if li < 2 else '\n'))
        f.write('}}\n')
    print('scritto', p, os.path.getsize(p), 'byte')

main()
