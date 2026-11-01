import sys, json, re, pickle, collections
S='/private/tmp/claude-501/-Users-peraleonardo-Library-Application-Support-Claude-scratch-workspaces-41c391cd-3755-42c9-83eb-aabcdaa216d8-2f5dbff5-0dc0-4507-bc97-7d59c251590c-scratch-2026-11-01-bc2e61/e0c3ee0a-2a99-45bd-baf5-2d43bf2eb5b2/scratchpad'
sys.path.insert(0,S+'/pylib'); sys.path.insert(0,S+'/v3')
from janome.tokenizer import Tokenizer
from furi import align, kata2hira, KJ
APP='/Users/peraleonardo/Desktop/michi-nihongo/data/'
T=Tokenizer()
jp={}; 
for ln in open(S+'/tat/jpn_sentences.tsv',encoding='utf8'):
    a=ln.rstrip('\n').split('\t'); jp[a[0]]=a[2]
it={}
for ln in open(S+'/tat/ita_sentences.tsv',encoding='utf8'):
    a=ln.rstrip('\n').split('\t'); it[a[0]]=a[2]
pairs=[]; seen=set()
for ln in open(S+'/tat/jpn-ita_links.tsv'):
    a,b=ln.split()
    if a in jp and b in it and a not in seen: pairs.append((a,jp[a],it[b])); seen.add(a)
piv=json.load(open(S+'/tat/pivot.json'))
for a,b in piv.items():
    if a not in seen and a in jp and b in it: pairs.append((a,jp[a],it[b])); seen.add(a)
print('pairs',len(pairs))
kj={}; known={}; vocab={}
cum=''; kw=set()
for l in ('n5','n4','n3'):
    cum+=''.join(e['k'] for e in json.load(open(APP+f'kanji-{l}.json',encoding='utf8')))
    for e in json.load(open(APP+f'vocabolario-{l}.json',encoding='utf8')):
        kw.add(e['w']); kw.add(e['r']); kw.add(re.sub(r'\{[^|]*\|([^}]*)\}',r'\1',e['w']))
    kj[l]=set(cum); known[l]=set(kw)
jm=pickle.load(open(S+'/jm.pkl','rb')); kd=pickle.load(open(S+'/kd.pkl','rb'))
OK_POS={'助詞','助動詞','記号'}
def analyse(s):
    toks=list(T.tokenize(s)); lv_need='n5'; order=['n5','n4','n3']; bad=False; marks=[]
    kan=set(c for c in s if KJ.search(c))
    # kanji level
    need=0
    for l_i,l in enumerate(order):
        if kan<=kj[l]: need=l_i; break
    else: return None
    for t in toks:
        p=t.part_of_speech.split(',')
        surf=t.surface
        if p[0] in OK_POS or p[0]=='接頭詞' or (p[0]=='名詞' and p[1] in ('数','接尾','代名詞','非自立')) or p[0]=='フィラー' or p[0]=='連体詞' and False: continue
        if p[0]=='名詞' and p[1]=='固有名詞':
            if re.fullmatch(r'[ァ-ヶー]+',surf): continue
            return None
        # content word
        base=t.base_form if t.base_form!='*' else surf
        lvl=None
        for l_i,l in enumerate(order):
            if base in known[l] or surf in known[l]: lvl=l_i; break
        if lvl is None: return None
        need=max(need,lvl)
    return order[need]
res=collections.defaultdict(list)
for pid,j,i in pairs:
    if not (4<=len(j)<=34) or len(i)>110: continue
    if re.search(r'[A-Za-z0-9０-９]',j): continue
    lv=analyse(j)
    if lv: res[lv].append((pid,j,i))
print({k:len(v) for k,v in res.items()})
json.dump(res,open(S+'/tat/cand.json','w'),ensure_ascii=False)
for l in res: print(l,res[l][:3])
