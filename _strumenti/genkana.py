"""Audio dei kana (audio/kana/<codici>.m4a) con VOICEVOX 四国めたん. Avvia prima il motore su 127.0.0.1:50021.
Nome file = codepoint esadecimali dei caratteri uniti da '-' (es. あ -> 3042, きゃ -> 304d-3083): stessa regola di kanaF() in js/audio.js."""
import json, os, re, subprocess, sys, tempfile, shutil, urllib.request, urllib.parse
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
HOST = 'http://127.0.0.1:50021'; SPEAKER = 2
def post(path, params, body=None):
    req = urllib.request.Request(HOST + path + '?' + urllib.parse.urlencode(params), data=body, method='POST', headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=60).read()
def kata(s): return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)
def fname(k): return '-'.join('%x' % ord(c) for c in k)
d = json.load(open(APP + 'data/kana.json', encoding='utf8'))
hira = [k for g in d['groups'] for r in g['rows'] for k, _ in r]
kt = [kata(k) for k in hira] + [k for k, _ in d['kataExtra']]
os.makedirs(APP + 'audio/kana', exist_ok=True)
done = {}; bad = []
for k in sorted(set(kt)):
    q = json.loads(post('/audio_query', {'text': k, 'speaker': SPEAKER}))
    got = ''.join(m['text'] for p in q['accent_phrases'] for m in p['moras'])
    if got.replace('ヲ', 'オ').replace('ヂ', 'ジ').replace('ヅ', 'ズ') != k.replace('ヲ', 'オ').replace('ヂ', 'ジ').replace('ヅ', 'ズ'): bad.append((k, got))
    q['speedScale'] = 0.85; q['prePhonemeLength'] = 0.15; q['postPhonemeLength'] = 0.2; q['outputSamplingRate'] = 24000
    wav = post('/synthesis', {'speaker': SPEAKER}, json.dumps(q).encode())
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: t.write(wav)
    out = APP + 'audio/kana/' + fname(k) + '.m4a'
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '24000', '-c', '1', t.name, out], check=True); os.unlink(t.name); done[k] = out
# copia per l'hiragana (stesso suono)
for k in hira:
    shutil.copyfile(done[kata(k)], APP + 'audio/kana/' + fname(k) + '.m4a')
print('katakana', len(done), 'hiragana', len(hira), 'letture diverse:', bad)
