import json,re,sys
from furi import T, align, kata2hira, KJ, conv
APP='/Users/peraleonardo/Desktop/michi-nihongo/data/'
FIX={'日本':'にほん','他':'ほか'}
POSTFIX=[('{食事|しょくじ}/の/{後|のち}','{食事|しょくじ}/の/{後|あと}'),('{忙|いそが}しい{中|ちゅう}','{忙|いそが}しい{中|なか}'),('{一|いち}{日|にち}{中|ちゅう}','{一日|いちにち}{中|じゅう}'),('{二|に}/{十|じゅう}{日|にち}','{二十日|はつか}'),('{十|じゅう}{日|にち}','{十日|とおか}'),('{一|いち}か{月|げつ}','{一|いっ}か{月|げつ}'),('{十|じゅう}{分|ふん}{後|ご}','{十分|じゅっぷん}{後|ご}'),('{二|に}{人|にん}','{二人|ふたり}'),('{一|いち}{人|にん}','{一人|ひとり}')]
def postfix(x):
    for a,b in POSTFIX: x=x.replace(a,b)
    return x
def tokmark(t):
    s=t.surface
    if not KJ.search(s): return s
    rd=FIX.get(s) or (kata2hira(t.reading) if t.reading!='*' else None)
    a=align(s,rd) if rd else None
    return a or s
def segs(text):
    out=[]; 
    for t in T.tokenize(text):
        p=t.part_of_speech.split(',')
        merge = out and (p[0]=='助動詞' or (p[0]=='助詞' and t.surface in ('て','で','ば','たり','ながら','つつ') and out[-1][-1].part_of_speech.split(',')[0] in ('動詞','形容詞','助動詞'))
          or (re.fullmatch(r'[ァ-ヶー]+',t.surface) and re.fullmatch(r'[ァ-ヶー]+',out[-1][-1].surface)) or p[1]=='接尾' or (p[0]=='動詞' and p[1]=='接尾'))
        if merge: out[-1].append(t)
        else: out.append([t])
    return out
def mark_sent(text):
    ss=segs(text); jp='/'.join(''.join(tokmark(t) for t in s) for s in ss); return jp, ss
def plainseg(s): return ''.join(t.surface for t in s)
def rdseg(s):
    r=''
    for t in s:
        x=FIX.get(t.surface) or (kata2hira(t.reading) if t.reading!='*' else t.surface)
        r+=x
    return r
def parse(fn):
    texts=[];cur=None
    for ln in open(fn,encoding='utf8'):
        ln=ln.rstrip('\n')
        if not ln.strip(): continue
        p=ln.split('|')
        if p[0]=='#T': cur={'id':p[1],'tipo':p[2],'t':p[3],'S':[],'G':'','Q':[]}; texts.append(cur)
        elif p[0]=='S': cur['S'].append((p[1],p[2]))
        elif p[0]=='G': cur['G']=p[1]
        elif p[0]=='Q':
            assert len(p)==7,(cur['id'],ln[:40],len(p)); cur['Q'].append(p[1:])
    return texts
out={'n4':[],'n3':[]}; warn=[]
for t in parse('texts.txt'):
    jp=[];it=[];allsegs=[]
    for j,i in t['S']:
        m,ss=mark_sent(j); jp.append(postfix(m)); it.append(i); allsegs+=ss
    # glossary
    ents=[]
    for piece in t['G'].split(';'):
        if '=' in piece: ents.append(piece.strip())
        else: ents[-1]+=';'+piece
    gl={}
    for e in ents:
        k,m=e.split('=',1); k=k.strip(); found=None
        for s in allsegs:
            if k in plainseg(s): found=s;break
        if not found and k[-1] in 'るいうくすつぬむぶぐ':
            for s in allsegs:
                if k[:-1] in plainseg(s): found=s;break
        if not found: warn.append((t['id'],'gloss not found',k)); continue
        gl[plainseg(found)]=[rdseg(found),m.strip()]
    q=[]
    for qq in t['Q']:
        question,right,w1,w2,w3,e=qq
        em,_=conv(e)
        q.append({'q':question,'o':[right,w1,w2,w3],'a':0,'e':em})
    tt,_=conv(t['t'])
    lv=t['id'].split('-')[1]
    out[lv].append({'id':t['id'],'t':tt,'tipo':t['tipo'],'jp':jp,'it':it,'gl':gl,'q':q})
for lv in out:
    f=APP+f'testi-{lv}.json'; cur=json.load(open(f,encoding='utf8')); new={x['id'] for x in out[lv]}
    allt=[x for x in cur if x['id'] not in new]+out[lv]
    json.dump(allt,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=1)
    print(lv,len(allt))
print('warn',warn)
for lv in out:
    for x in out[lv]:
        print('==',x['id'],x['t']); print('\n'.join(x['jp']))
