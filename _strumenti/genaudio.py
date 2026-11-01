"""Genera gli audio (audio/<livello>/<id>.m4a) con VOICEVOX in locale.
Uso: avvia il motore VOICEVOX (run --host 127.0.0.1 --port 50021) poi:  python3 -I _strumenti/genaudio.py [--force]
Voci: F = 四国めたん (id 2), M = 青山龍星 (id 13). Crediti richiesti: «VOICEVOX:四国めたん», «VOICEVOX:青山龍星».
"""
import json, re, subprocess, os, sys, tempfile, urllib.request, urllib.parse
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
HOST = 'http://127.0.0.1:50021'
VOICE = {'F': 2, 'M': 13}
FORCE = '--force' in sys.argv
def plainjp(s): return re.sub(r'\*\*|__', '', re.sub(r'\{([^|{}]+)\|[^{}]+\}', r'\1', s)).replace('/', '')
def yomi(s): return re.sub(r'\*\*|__', '', re.sub(r'\{[^|{}]+\|([^{}]+)\}', r'\1', s)).replace('/', '')
def post(path, params, body=None):
    url = HOST + path + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=body, method='POST', headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=120).read()
def kata(s): return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)
def norm(s):
    s = kata(s)
    s = re.sub(r'[ー、。？！\s\'_/]', '', s)
    s = re.sub(r'([オコソトノホモヨロゴゾドボポョ])[ウオ]', r'\1', s)
    s = re.sub(r'([エケセテネヘメレゲゼデベペ])イ', r'\1', s)
    return s.replace('ヲ', 'オ').replace('ヅ', 'ズ').replace('ヂ', 'ジ')
def synth(text, kana, speaker, out):
    for t in (text, kana):  # prima il testo con kanji (accento migliore); se la lettura non coincide, uso il kana
        q = json.loads(post('/audio_query', {'text': t, 'speaker': speaker}))
        got = ''.join(m['text'] for p in q['accent_phrases'] for m in p['moras'] + ([p['pause_mora']] if p.get('pause_mora') else []))
        if t is kana or norm(got) == norm(kana):
            break
        text = None
    q['speedScale'] = 0.95; q['prePhonemeLength'] = 0.1; q['postPhonemeLength'] = 0.15; q['outputSamplingRate'] = 24000
    wav = post('/synthesis', {'speaker': speaker}, json.dumps(q).encode())
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp: tmp.write(wav)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '40000', '-c', '1', tmp.name, out], check=True)
    os.unlink(tmp.name)
    return text is not None
jobs = []
for lv in ('n5', 'n4', 'n3'):
    a = json.load(open(APP + f'data/ascolto-{lv}.json', encoding='utf8'))
    for d in a.get('dialoghi', []):
        for i, l in enumerate(d['righe']): jobs.append((f"{lv}/{d['id']}_{i+1}", l['t'], l.get('g') or (d.get('v') or {}).get(l['s']) or ('F' if l['s'] == 'A' else 'M')))
    for c in a.get('coppie', []): jobs += [(f"{lv}/{c['id']}a", c['a'], 'F'), (f"{lv}/{c['id']}b", c['b'], 'F')]
    for c in a.get('dettato', []): jobs.append((f"{lv}/{c['id']}", c['t'], c.get('g') or 'F'))
    for c in a.get('risposte', []): jobs.append((f"{lv}/{c['id']}", c['p'], c.get('g') or 'M'))
    for c in a.get('shadowing', []): jobs.append((f"{lv}/{c['id']}", c['t'], c.get('g') or 'F'))
# frasi di Tatoeba: voce F se l'id numerico è pari, M se dispari (stessa regola in js/frasi.js)
fr = json.load(open(APP + 'data/frasi.json', encoding='utf8'))
for lv, items in fr.items():
    for x in items:
        j = ''.join(x['b']); jobs.append((f"fr/{x['id']}", j, 'F' if int(x['id'][2:]) % 2 == 0 else 'M'))
print(len(jobs), 'file', flush=True)
n = kanji_ok = 0
for f, t, g in jobs:
    out = APP + 'audio/' + f + '.m4a'; os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out) and not FORCE: continue
    if os.path.exists(out): os.unlink(out)
    kanji_ok += synth(plainjp(t), yomi(t), VOICE[g], out); n += 1
    if n % 25 == 0: print(n, flush=True)
print('fatti', n, 'con lettura da kanji:', kanji_ok, flush=True)
