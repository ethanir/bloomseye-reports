#!/usr/bin/env python3
"""Deeper probes to nail mechanics: hyphen/space, tags-not-in-browse, noisy substrings."""
import json, os
from search_sim import picker_search, browse_search, PLANTS

def show(q):
    pk = picker_search(q); bz = browse_search(q)
    print(f"\n=== '{q}'  picker={len(pk)} browse={len(bz)}")
    print("  picker:", [p['commonName'] for p in pk[:8]])
    print("  browse:", [p['commonName'] for p in bz[:8]])

# Does a Rudbeckia (black-eyed susan) exist at all, and under what name?
print("### Plants whose name/botanical contains 'rudbeckia' or 'susan':")
for p in PLANTS:
    hay = (p['commonName'] + ' ' + p['botanicalName']).lower()
    if 'rudbeckia' in hay or 'susan' in hay:
        print(f"   {p['commonName']!r:32} | {p['botanicalName']!r:28} | group={p.get('groupName')!r} | tags={p['tags'][:4]}")

# hyphen vs space
show("black eyed susan")
show("black-eyed susan")
show("blackeyed susan")

# The 'mum' noise
print("\n### what 'mum' matches (why noisy):")
for p in picker_search("mum")[:12]:
    print(f"   {p['commonName']!r:28} | {p['botanicalName']!r}")

# tags-not-in-browse: 'fragrant' should differ picker vs browse
for q in ["fragrant","shade","drought","pink","fall","evergreen"]:
    show(q)

# groupName-only matches: coral bells / blanket flower divergence
show("coral bells")
show("blanket flower")

# Does 'geranium' noisily catch pelargonium (annual "geranium") vs true Geranium?
print("\n### 'geranium' matches - true Geranium vs Pelargonium:")
for p in picker_search("geranium")[:25]:
    print(f"   {p['commonName']!r:28} | {p['botanicalName']!r}")
