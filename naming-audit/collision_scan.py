#!/usr/bin/env python3
"""Find short-token SUBSTRING COLLISIONS: a common flower search word that appears
as a substring of an UNRELATED plant's name/botanical, so the current substring
search surfaces the wrong plant. Deterministic, high-signal."""
import re, json, os
from search_sim import picker_search, PLANTS

def genus_of(b):
    if not b: return ""
    t=b.strip().split()
    if not t: return ""
    g=t[0]
    if g in ("×","x") and len(t)>1: g=t[1]
    return g.strip("'\"×")

# Common flower search words that are ALSO substrings of other words.
WORDS = ["aster","mum","holly","rose","iris","lily","sage","phlox","pink","fern",
         "mint","bell","bells","poppy","daisy","aster","pine","oak","elm","fir",
         "ash","yew","box","ivy","cane","reed","flag","tea","pea","dahlia","canna"]

def word_boundary_hit(word, text):
    # does the word appear as a WHOLE word (the shopper's intent)?
    return re.search(r'(?<![a-z])'+re.escape(word)+r'(?![a-z])', text) is not None

rows = []
for w in sorted(set(WORDS)):
    res = picker_search(w)
    collisions = []
    for p in res:
        hay = (p["commonName"]+" "+(p["botanicalName"] or "")+" "+" ".join(p["tags"] or [])).lower()
        if not word_boundary_hit(w, hay):
            # substring match only inside a bigger word -> collision
            collisions.append(p)
    if collisions:
        rows.append((w, len(res), collisions))

print("=== SUBSTRING COLLISIONS (word matched only INSIDE a longer word) ===")
for w, n, cols in rows:
    genera = sorted({genus_of(p["botanicalName"]) for p in cols})
    print(f'\n{w!r}  ({len(cols)} of {n} results are collisions)  genera: {genera}')
    for p in cols[:8]:
        # show WHERE it collided
        hay = (p["commonName"]+" "+(p["botanicalName"] or "")).lower()
        m = re.search(re.escape(w), hay)
        ctx = hay[max(0,m.start()-6):m.end()+6] if m else "(tag)"
        print(f'      {p["commonName"]!r:26} | {p["botanicalName"]!r:30} | ...{ctx}...')

json.dump([{"word":w,"n":n,"collisions":[p["commonName"] for p in c]} for w,n,c in rows],
          open(os.path.join(os.path.dirname(__file__),"collisions.json"),"w"), indent=1)
