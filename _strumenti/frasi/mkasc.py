import json
from furi import conv
APP='/Users/peraleonardo/Desktop/michi-nihongo/data/'
bad=[]
def F(s):
    m,b=conv(s)
    if b: bad.append((s[:20],b))
    return m
new={'n4':{k:[] for k in ('dialoghi','coppie','dettato','risposte','shadowing')},'n3':{k:[] for k in ('dialoghi','coppie','dettato','risposte','shadowing')}}
lv=None;cur=None
for ln in open('asc.txt',encoding='utf8'):
    ln=ln.rstrip('\n')
    if not ln.strip(): continue
    if ln.startswith('#N'): lv=ln[1:].lower(); continue
    p=ln.split('|'); k=p[0]; N=new[lv]
    if k=='D':
        v=dict(x.split(':') for x in p[3].split(','))
        cur={'id':p[1],'t':F(p[2]),'v':v,'righe':[],'q':[]}; N['dialoghi'].append(cur)
    elif k=='L': cur['righe'].append({'s':p[1],'t':F(p[2]),'i':p[3]})
    elif k=='Q':
        assert len(p)==7,ln[:30]; cur['q'].append({'q':p[1],'o':p[2:6],'a':0,'e':F(p[6])})
    elif k=='P': N['coppie'].append({'id':p[1],'a':p[2],'b':p[3],'ia':p[4],'ib':p[5],'cat':p[6]})
    elif k=='C': N['dettato'].append({'id':p[1],'t':F(p[2]),'i':p[3],'g':p[4]})
    elif k=='R':
        assert len(p)==9,ln[:30]; N['risposte'].append({'id':p[1],'p':F(p[2]),'i':p[3],'o':[F(p[4]),F(p[5]),F(p[6])],'a':0,'e':F(p[7]),'g':p[8]})
    elif k=='H': N['shadowing'].append({'id':p[1],'t':F(p[2]),'i':p[3],'g':p[4]})
for l in ('n4','n3'):
    f=APP+f'ascolto-{l}.json'; d=json.load(open(f,encoding='utf8'))
    for key,items in new[l].items():
        ids={x['id'] for x in d[key]}
        d[key]+= [x for x in items if x['id'] not in ids]
    json.dump(d,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=1)
    print(l,{k:len(v) for k,v in d.items()})
print('bad',bad)
for l in new:
    for k in ('dettato','shadowing'):
        for x in new[l][k]: print(x['t'])
