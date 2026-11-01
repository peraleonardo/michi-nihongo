import collections,json
S='/private/tmp/claude-501/-Users-peraleonardo-Library-Application-Support-Claude-scratch-workspaces-41c391cd-3755-42c9-83eb-aabcdaa216d8-2f5dbff5-0dc0-4507-bc97-7d59c251590c-scratch-2026-11-01-bc2e61/e0c3ee0a-2a99-45bd-baf5-2d43bf2eb5b2/scratchpad/tat/'
ids={}
for lang in ('jpn','ita','eng'):
    ids[lang]=set(ln.split('\t')[0] for ln in open(S+f'{lang}_sentences.tsv',encoding='utf8'))
print({k:len(v) for k,v in ids.items()})
j2e=collections.defaultdict(set); e2i=collections.defaultdict(set)
for ln in open(S+'x/links.csv'):
    a,b=ln.rstrip('\n').split('\t')
    for x,y in ((a,b),(b,a)):
        if x in ids['jpn'] and y in ids['eng']: j2e[x].add(y)
        if x in ids['eng'] and y in ids['ita']: e2i[x].add(y)
print(len(j2e),len(e2i))
piv={}
for j,es in j2e.items():
    for e in es:
        if e2i.get(e): piv[j]=sorted(e2i[e])[0]; break
print('pivot pairs',len(piv))
json.dump(piv,open(S+'pivot.json','w'))
