import sys, json, re, pickle, collections
S='/private/tmp/claude-501/-Users-peraleonardo-Library-Application-Support-Claude-scratch-workspaces-41c391cd-3755-42c9-83eb-aabcdaa216d8-2f5dbff5-0dc0-4507-bc97-7d59c251590c-scratch-2026-11-01-bc2e61/e0c3ee0a-2a99-45bd-baf5-2d43bf2eb5b2/scratchpad'
sys.path.insert(0,S+'/pylib'); sys.path.insert(0,S+'/v3')
from janome.tokenizer import Tokenizer
from furi import align, kata2hira, KJ
APP='/Users/peraleonardo/Desktop/michi-nihongo/data/'
T=Tokenizer(); jm=pickle.load(open(S+'/jm.pkl','rb')); kd=pickle.load(open(S+'/kd.pkl','rb'))
cand=json.load(open(S+'/tat/cand.json',encoding='utf8'))
vocab={}
for l in ('n5','n4','n3'):
    for e in json.load(open(APP+f'vocabolario-{l}.json',encoding='utf8')): vocab.setdefault(e['w'],e)
UV=str.maketrans('がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ','かきくけこさしすせそたちつてとはひふへほはひふへほ')
def norm(r): r=r.translate(UV); return re.sub('っ$','',r)
def kok(run,rd):
    if len(run)==1:
        on,kun=kd.get(run,(set(),set()))
        opts={norm(kata2hira(x)) for x in on}|{norm(x) for x in kun}
        return norm(rd) in opts or any(norm(rd).startswith(o) for o in opts if len(o)>=2) and False
    return (run,rd) in jm or (run,kata2hira(rd)) in jm
FIXR={'日本':'にほん'}
def tokmark(t):
    s=t.surface
    if not KJ.search(s): return s,True
    rd=FIXR.get(s) or (kata2hira(t.reading) if t.reading!='*' else None)
    if not rd: return s,False
    a=align(s,rd)
    if not a: return s,False
    # validate each ruby chunk
    for m in re.finditer(r'\{([^|]+)\|([^}]+)\}',a):
        if not kok(m.group(1),m.group(2)): return s,False
    return a,True
def isfunc(t):
    p=t.part_of_speech.split(',')
    return p[0] in ('助詞','助動詞','記号') or p[1] in ('非自立','接尾') or (p[0]=='動詞' and p[1]=='接尾')
def build(j):
    toks=list(T.tokenize(j)); units=[]; ok=True; cw=[]
    for k,t in enumerate(toks):
        p=t.part_of_speech.split(',')
        mk,good=tokmark(t); ok&=good
        if not good: return None
        start=False
        if not units: start=True
        else:
            prev=toks[k-1]; pp=prev.part_of_speech.split(',')
            if not isfunc(t) and p[0]!='記号':
                if pp[0]=='接頭詞' or (pp[0]=='名詞' and p[0]=='名詞' and pp[1]!='代名詞') or (pp[0]=='名詞' and p[0]=='名詞'): start=False
                elif pp[0]=='記号': start=True
                else: start=True
        if p[0]=='記号' and units: start=False
        if start: units.append([mk,t.surface])
        else: units[-1][0]+=mk; units[-1][1]+=t.surface
        # cloze candidates: nouns/adverbs equal to vocab entry
        if p[0] in ('名詞','副詞') and t.surface in vocab and KJ.search(t.surface) and vocab[t.surface].get('p') in ('n','adv'):
            cw.append({'t':t.surface,'m':mk,'p':vocab[t.surface]['p']})
    return units,cw
out={'n5':[],'n4':[],'n3':[]}; seenj=set(); rej=0
for lv in ('n5','n4','n3'):
    for pid,j,i in cand[lv]:
        key=re.sub(r'[。！？!?、 ]','',j)
        if key in seenj: continue
        seenj.add(key)
        r=build(j)
        if not r: rej+=1; continue
        units,cw=r
        if not (2<=len(units)<=9) or len(j)>30: continue
        if '  ' in i: continue
        i=i.strip()
        if '"' in i and i.count('"')%2: continue
        out[lv].append({'id':'tt'+pid,'j':''.join(u[0] for u in units),'b':[u[0] for u in units],'i':i,'cw':cw})
print('rejected',rej,{k:len(v) for k,v in out.items()})
import random; random.seed(11)
CAP={'n5':450,'n4':800,'n3':1400}
for k in out:
    if len(out[k])>CAP[k]: out[k]=sorted(random.sample(out[k],CAP[k]),key=lambda x:x['id'])
json.dump(out,open(S+'/tat/frasi.json','w',encoding='utf8'),ensure_ascii=False)
random.seed(3)
for lv in out:
    for x in random.sample(out[lv],6): print(lv,'/'.join(x['b']),'|',x['i'])
