import json, sys, glob, os, re, pickle
import xml.etree.ElementTree as ET
SP = os.path.dirname(os.path.abspath(__file__)); APP = sys.argv[1]
# kanjidic
kd = {}
cache = os.path.join(SP, 'kd.pkl')
if os.path.exists(cache): kd = pickle.load(open(cache,'rb'))
else:
    for ev, el in ET.iterparse(os.path.join(SP,'src','kanjidic2.xml')):
        if el.tag == 'character':
            lit = el.findtext('literal'); on=set(); kun=set()
            for r in el.iter('reading'):
                if r.get('r_type')=='ja_on': on.add(r.text)
                if r.get('r_type')=='ja_kun': kun.add(r.text.replace('.','').replace('-',''))
            kd[lit]=(on,kun); el.clear()
    pickle.dump(kd, open(cache,'wb'))
# jmdict
jm = set()
cache2 = os.path.join(SP,'jm.pkl')
if os.path.exists(cache2): jm = pickle.load(open(cache2,'rb'))
elif os.path.exists(os.path.join(SP,'src','JMdict_e')):
    for ev, el in ET.iterparse(os.path.join(SP,'src','JMdict_e')):
        if el.tag=='entry':
            kebs=[k.findtext('keb') for k in el.findall('k_ele')]; rebs=[r.findtext('reb') for r in el.findall('r_ele')]
            for r in rebs:
                jm.add((r,r))
                for k in kebs: jm.add((k,r))
            el.clear()
    pickle.dump(jm, open(cache2,'wb'))
print('jmdict pairs:', len(jm))
def hira(s): return ''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
bad=0
for f in sorted([x for x in glob.glob(os.path.join(APP,'data','kanji-*.json')) if 'elenco' not in x]):
    for e in json.load(open(f)):
        k=e['k']
        if k not in kd: print('NOT IN KANJIDIC', k); bad+=1; continue
        on,kun=kd[k]
        for r in e['on']:
            if r not in on: print(f'{os.path.basename(f)} {k}: on {r} not in {sorted(on)}'); bad+=1
        for r in e['kun']:
            if r not in kun: print(f'{os.path.basename(f)} {k}: kun {r} not in {sorted(kun)}'); bad+=1
        if jm:
            for w,r,_ in e.get('w',[]):
                if (w,r) not in jm and (w,hira(r)) not in jm: print(f'  word? {w} {r}'); bad+=1
for f in sorted(glob.glob(os.path.join(APP,'data','vocabolario-*.json'))):
    for e in json.load(open(f)):
        w=e['w']; r=e.get('r',w)
        if jm and (w,r) not in jm: print(f'{os.path.basename(f)} vocab? {w} {r}'); bad+=1
print('issues:', bad)
