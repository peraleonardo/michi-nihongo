import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../pylib')
from janome.tokenizer import Tokenizer
T = Tokenizer()
KJ = re.compile(r'[一-鿿々]')
def kata2hira(s): return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)
def align(surf, rd):
    """surface (kanji+kana) + reading hiragana -> markup or None"""
    if not KJ.search(surf): return surf
    runs = re.findall(r'[一-鿿々]+|[^一-鿿々]+', surf)
    pat = ''.join('(.+?)' if KJ.match(r) else re.escape(kata2hira(r)) for r in runs)
    m = re.fullmatch(pat, rd)
    if not m: return None
    g = list(m.groups()); out = []
    for r in runs:
        out.append('{%s|%s}' % (r, g.pop(0)) if KJ.match(r) else r)
    return ''.join(out)
def conv(text):
    out = []; bad = []
    for t in T.tokenize(text):
        s = t.surface
        if not KJ.search(s): out.append(s); continue
        rd = kata2hira(t.reading) if t.reading != '*' else None
        a = align(s, rd) if rd else None
        if a is None: bad.append(s); a = s
        out.append(a)
    return ''.join(out), bad
def furi(sentence, w, reading):
    """furigana a sentence; the target word gets the given reading (stem if conjugated)"""
    stem = w if w in sentence else w[:-1]
    rstem = reading if w in sentence else reading[:-1]
    if stem not in sentence: return None, ['target ' + w]
    i = sentence.index(stem) if w in sentence else sentence.rindex(stem)
    pre, post = sentence[:i], sentence[i + len(stem):]
    # keep okurigana attached to the stem for alignment
    a = align(stem, rstem)
    if a is None: return None, ['align ' + w]
    p1, b1 = conv(pre) if pre else ('', []); p2, b2 = conv(post) if post else ('', [])
    return p1 + a + p2, b1 + b2
if __name__ == '__main__':
    print(furi('昨日、博物館へ行きました。', '博物館', 'はくぶつかん'))
    print(furi('卵を外します。', '外す', 'はずす'))
