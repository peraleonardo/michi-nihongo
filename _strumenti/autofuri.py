import json, re, sys, glob, os
APP = sys.argv[1]; targets = sys.argv[2:]
KANJI = re.compile(r'[一-鿿々]'); RUBY = re.compile(r'\{([^|{}]+)\|([^{}]+)\}')
KANA_ = re.compile(r'[ぁ-ゖァ-ー]')
M = {}
def trim(w, r):
    pre = 0
    while pre < len(w) and not KANJI.match(w[pre]) and pre < len(r) and w[pre] == r[pre]: pre += 1
    suf = 0
    while suf < len(w)-pre and suf < len(r)-pre-1 and not KANJI.match(w[-1-suf]) and w[-1-suf] == r[-1-suf]: suf += 1
    return w[pre:len(w)-suf], r[pre:len(r)-suf]
def add(w, r):
    if not KANJI.search(w) or w == r: return
    b, rr = trim(w, r)
    if b and KANJI.search(b) and not KANA_.search(b): M.setdefault(b, rr)
# fonti di letture
for f in glob.glob(APP+'/data/*.json'):
    if os.path.basename(f).startswith(('strokes','kana','kanji-elenco')): continue
    d = json.load(open(f))
    txt = json.dumps(d, ensure_ascii=False)
    for a, b in RUBY.findall(txt): 
        if KANJI.search(a): M.setdefault(a, b)
    if os.path.basename(f).startswith('kanji-'):
        for e in d:
            for w, r, _ in e.get('w', []): add(w, r)
    if os.path.basename(f).startswith('vocabolario'):
        for e in d: add(e['w'], e.get('r', e['w']))
M.update({'枚':'まい','本':'ほん','人':'にん','個':'こ','二つ':'ふたつ'})
M.pop('二つ')
repl = []
def fix(s):
    out = []; pos = 0
    for m in RUBY.finditer(s):
        out.append(('t', s[pos:m.start()])); out.append(('r', m.group(0))); pos = m.end()
    out.append(('t', s[pos:]))
    res = ''
    for k, v in out:
        if k == 'r': res += v; continue
        i = 0
        while i < len(v):
            if KANJI.match(v[i]):
                j = i
                while j < len(v) and KANJI.match(v[j]): j += 1
                run = v[i:j]; k2 = 0
                while k2 < len(run):
                    for L in range(len(run)-k2, 0, -1):
                        if run[k2:k2+L] in M:
                            res += '{%s|%s}' % (run[k2:k2+L], M[run[k2:k2+L]]); repl.append((run[k2:k2+L], M[run[k2:k2+L]])); k2 += L; break
                    else:
                        res += run[k2]; print('UNMAPPED', run[k2], 'in', v[:40]); k2 += 1
                i = j
            else: res += v[i]; i += 1
    return res
SKIP = {'k','w','r','it','on','kun','id','cat','c','p','tag','tipo','lv','ty','sid','gl','v','g','alt','vs'}
def walk(v, key=None):
    if isinstance(v, dict): return {k: (x if k in SKIP else walk(x, k)) for k, x in v.items()}
    if isinstance(v, list): return [walk(x, key) for x in v]
    if isinstance(v, str): return fix(v) if KANJI.search(RUBY.sub('', v)) else v
    return v
for t in targets:
    f = os.path.join(APP, 'data', t); d = json.load(open(f))
    if t.startswith('vocabolario'):
        for e in d:
            if 'n' in e: e['n'] = fix(e['n']) if KANJI.search(RUBY.sub('', e['n'])) else e['n']
    else: d = walk(d)
    open(f, 'w', encoding='utf8').write('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in d) + '\n]\n')
print(sorted(set(repl)))
