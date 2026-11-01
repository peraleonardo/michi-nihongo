import json, sys, glob, os, re
APP = sys.argv[1]
KANJI = re.compile(r'[一-鿿々]')
KANA = re.compile(r'^[ぁ-ゖァ-ー・ー\s]+$')
SKIP = {'k','w','r','it','on','kun','id','cat','c','p','tag','tipo','lv','ty','sid','gl','v','g','f_','alt','cat2'}
RUBY = re.compile(r'\{([^|{}]+)\|([^{}]+)\}')
n = 0
def lint_str(path, s):
    global n
    # parentesi graffe bilanciate
    t = RUBY.sub(lambda m: ('' if KANJI.search(m.group(1)) and KANA.match(m.group(2)) else '\u0000BAD:'+m.group(0)+'\u0000'), s)
    if '\u0000BAD' in t:
        print(f'BADRUBY {path}: {s[:80]}'); n += 1
    rest = RUBY.sub('', s).replace('{','\u0001').replace('}','\u0001')
    if '\u0001' in rest: print(f'BRACE {path}: {s[:80]}'); n += 1
    if KANJI.search(rest.replace('\u0001','')):
        print(f'NOFURI {path}: {s[:90]}'); n += 1
def walk(path, v, key=None):
    if isinstance(v, dict):
        for k, x in v.items():
            if k in SKIP: continue
            walk(path+'.'+k, x, k)
    elif isinstance(v, list):
        for i, x in enumerate(v): walk(f'{path}[{i}]', x, key)
    elif isinstance(v, str):
        lint_str(path, v)
for f in sorted(glob.glob(os.path.join(APP,'data','*.json'))):
    b = os.path.basename(f)
    if b.startswith(('kanji','kana','strokes')): continue
    d = json.load(open(f))
    if b.startswith('vocabolario'):
        for i,e in enumerate(d):
            for k in ('ex',):
                if k in e: lint_str(f'{b}[{i}:{e["w"]}].{k}', e[k])
            if 'n' in e: lint_str(f'{b}[{i}:{e["w"]}].n', e['n'])
        continue
    walk(b, d)
print('lint issues:', n)
