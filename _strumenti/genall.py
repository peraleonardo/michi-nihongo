"""Genera TUTTI gli audio pre-registrati con VOICEVOX (motore su 127.0.0.1:50021), in AAC mono 24 kbps.
 - audio/<lv>/<id>.m4a         dialoghi, coppie minime, dettati, risposte, shadowing
 - audio/fr/<id>.m4a           frasi di Tatoeba
 - audio/t/<hash>.m4a          ogni parola/frase letta dai pulsanti 🔊 (vocabolario, kanji, grammatica, testi); il nome è l'hash
                               di «voce:testo in kana» (stessa funzione auHash() di js/audio.js) e audio/index.json elenca gli hash
Uso: python3 -I _strumenti/genall.py [--force]   (poi python3 -I _strumenti/genkana.py per i kana)"""
import json, os, re, sys, subprocess, tempfile, urllib.request, urllib.parse
from multiprocessing import Pool
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
HOST = 'http://127.0.0.1:50021'; VOICE = {'F': 2, 'M': 13}; BITRATE = '24000'; FORCE = '--force' in sys.argv
def i32(x): x &= 0xffffffff; return x - (1 << 32) if x & 0x80000000 else x
def imul(a, b): return i32(i32(a) * i32(b))
def auHash(s):  # cyrb53, identico a js/audio.js
    h1 = i32(0xdeadbeef); h2 = i32(0x41c6ce57)
    for ch in [ord(c) for c in s]:
        h1 = imul(h1 ^ ch, 2654435761); h2 = imul(h2 ^ ch, 1597334677)
    h1 = imul(h1 ^ ((h1 & 0xffffffff) >> 16), 2246822507); h1 = i32(h1 ^ imul(h2 ^ ((h2 & 0xffffffff) >> 13), 3266489909))
    h2 = imul(h2 ^ ((h2 & 0xffffffff) >> 16), 2246822507); h2 = i32(h2 ^ imul(h1 ^ ((h1 & 0xffffffff) >> 13), 3266489909))
    n = 4294967296 * (2097151 & h2) + (h1 & 0xffffffff)
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; out = ''
    while n: n, r = divmod(n, 36); out = d[r] + out
    return out or '0'
def plainjp(s): return re.sub(r'\*\*|__', '', re.sub(r'\{([^|{}]+)\|[^{}]+\}', r'\1', s)).replace('/', '')
# yomi() ripete js/core.js: String.replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2') ecc.
def yomi(s):
    s = re.sub(r'\{([^|{}]+)\|([^{}]+)\}', lambda m: m.group(2), str(s))
    return re.sub(r'★', '', re.sub(r'＿+', 'なになに', re.sub(r'\*\*|__', '', s))).replace('/', '')
def post(path, params, body=None):
    req = urllib.request.Request(HOST + path + '?' + urllib.parse.urlencode(params), data=body, method='POST', headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=120).read()
def kata(s): return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)
def norm(s):
    s = kata(s); s = re.sub(r"[ー、。？！\s'_/]", '', s)
    s = re.sub(r'([オコソトノホモヨロゴゾドボポョ])[ウオ]', r'\1', s); s = re.sub(r'([エケセテネヘメレゲゼデベペ])イ', r'\1', s)
    return s.replace('ヲ', 'オ').replace('ヅ', 'ズ').replace('ヂ', 'ジ')
def synth(job):
    path, text, kana, g = job
    out = APP + 'audio/' + path + '.m4a'
    if os.path.exists(out) and not FORCE: return 0
    os.makedirs(os.path.dirname(out), exist_ok=True); sp = VOICE[g]
    try:
        for t in (text, kana):
            q = json.loads(post('/audio_query', {'text': t, 'speaker': sp}))
            got = ''.join(m['text'] for p in q['accent_phrases'] for m in p['moras'] + ([p['pause_mora']] if p.get('pause_mora') else []))
            if t == kana or norm(got) == norm(kana): break
        q['speedScale'] = 0.95; q['prePhonemeLength'] = 0.1; q['postPhonemeLength'] = 0.15; q['outputSamplingRate'] = 24000
        wav = post('/synthesis', {'speaker': sp}, json.dumps(q).encode())
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp: tmp.write(wav)
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', BITRATE, '-c', '1', tmp.name, out], check=True); os.unlink(tmp.name)
        return 1
    except Exception as e:
        print('ERR', path, e, flush=True); return 0
def build():
    J = {}; idx = set()
    def add(path, text, kana, g): J.setdefault(path, (path, text, kana, g))
    def addh(markup, g='F', text=None):
        k = yomi(markup)
        if not k.strip() or len(k) > 200: return
        h = auHash(g + ':' + k); idx.add(h); add('t/' + h, text or plainjp(markup), k, g)
    L = json.load(open(APP + 'data/kanji-elenco.json', encoding='utf8')).keys()
    for lv in ('n5', 'n4', 'n3'):
        a = json.load(open(APP + f'data/ascolto-{lv}.json', encoding='utf8'))
        for d in a.get('dialoghi', []):
            for i, l in enumerate(d['righe']): add(f"{lv}/{d['id']}_{i+1}", plainjp(l['t']), yomi(l['t']), l.get('g') or (d.get('v') or {}).get(l['s']) or ('F' if l['s'] == 'A' else 'M'))
        for c in a.get('coppie', []): add(f"{lv}/{c['id']}a", c['a'], c['a'], 'F'); add(f"{lv}/{c['id']}b", c['b'], c['b'], 'F')
        for c in a.get('dettato', []): add(f"{lv}/{c['id']}", plainjp(c['t']), yomi(c['t']), c.get('g') or 'F')
        for c in a.get('risposte', []): add(f"{lv}/{c['id']}", plainjp(c['p']), yomi(c['p']), c.get('g') or 'M')
        for c in a.get('shadowing', []): add(f"{lv}/{c['id']}", plainjp(c['t']), yomi(c['t']), c.get('g') or 'F')
        for e in json.load(open(APP + f'data/vocabolario-{lv}.json', encoding='utf8')):
            r = e.get('r') or e['w']; addh(r, 'F', plainjp(e['w']) if re.search(r'[一-鿿]', e['w']) and '{' not in e['w'] else None)
            if e.get('ex'): addh(e['ex'])
        for k in json.load(open(APP + f'data/kanji-{lv}.json', encoding='utf8')):
            for w in k.get('w', []): addh(w[1], 'F', w[0] if re.search(r'[一-鿿]', w[0]) else None)
        for g in json.load(open(APP + f'data/grammatica-{lv}.json', encoding='utf8')):
            for e in g.get('ex', []): addh(e['j'])
        for t in json.load(open(APP + f'data/testi-{lv}.json', encoding='utf8')):
            dlg = t.get('tipo') == 'dialogo'
            for i, p in enumerate(t['jp']): addh(re.sub(r'^(?:\{[^{}]+\}|[^：{/]{1,6})/?：/?', '', p), ('M' if i % 2 else 'F') if dlg else 'F')
            for k, v in (t.get('gl') or {}).items(): addh(v[0])
    fr = json.load(open(APP + 'data/frasi.json', encoding='utf8'))
    for lv, items in fr.items():
        for x in items:
            j = ''.join(x['b']); add(f"fr/{x['id']}", plainjp(j), yomi(j), 'F' if int(x['id'][2:]) % 2 == 0 else 'M')
    return list(J.values()), sorted(idx)
if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--hash':
        for s in sys.argv[2:]: print(auHash(s))
        sys.exit()
    jobs, idx = build()
    json.dump(idx, open(APP + 'audio/index.json', 'w'))
    print(len(jobs), 'file,', len(idx), 'nell\'indice', flush=True)
    done = 0
    with Pool(3) as p:
        for i, r in enumerate(p.imap_unordered(synth, jobs, chunksize=8), 1):
            done += r
            if i % 200 == 0: print(i, flush=True)
    print('fatti', done, flush=True)
