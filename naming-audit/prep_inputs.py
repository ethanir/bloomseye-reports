#!/usr/bin/env python3
"""Build agent-input artifacts from dataset.json:
  - catalog_compact.txt : one line per plant: commonName | botanical | category | group
  - genus_index.json    : genus -> [commonNames], for cross-reference + noise detection
  - categories.json     : category -> [ {slug, commonName, botanical, group} ]
"""
import json, os, re
from collections import defaultdict

OUT = "/Users/eirim/bloomseye-reports/naming-audit"
P = json.load(open(os.path.join(OUT, "dataset.json")))

def genus_of(botanical):
    if not botanical:
        return ""
    # first token, strip ×, quotes
    tok = botanical.strip().split()
    if not tok:
        return ""
    g = tok[0]
    if g in ("×", "x") and len(tok) > 1:
        g = tok[1]
    return g.strip("'\"×").strip()

# compact catalog
lines = []
for p in sorted(P, key=lambda x: x["commonName"].lower()):
    g = p.get("groupName") or ""
    lines.append(f'{p["commonName"]} | {p["botanicalName"]} | {p["category"]} | {g}')
open(os.path.join(OUT, "catalog_compact.txt"), "w").write("\n".join(lines))

# genus index
gi = defaultdict(list)
for p in P:
    g = genus_of(p["botanicalName"])
    if g:
        gi[g].append(p["commonName"])
json.dump({k: sorted(set(v)) for k, v in sorted(gi.items())}, open(os.path.join(OUT, "genus_index.json"), "w"), indent=1)

# categories
cats = defaultdict(list)
for p in P:
    cats[p["category"]].append({
        "slug": p["slug"], "commonName": p["commonName"],
        "botanical": p["botanicalName"], "group": p.get("groupName"),
    })
json.dump(cats, open(os.path.join(OUT, "categories.json"), "w"), indent=1)

# genus list sorted by plant count (for ambiguity reference)
gcount = sorted(((k, len(set(v))) for k, v in gi.items()), key=lambda x:-x[1])
print("plants:", len(P))
print("distinct genera:", len(gi))
print("top genera by count:")
for g, n in gcount[:30]:
    print(f"  {g:20s} {n}")
print("\ncategory sizes:", {k: len(v) for k, v in cats.items()})
print("catalog_compact.txt bytes:", os.path.getsize(os.path.join(OUT,"catalog_compact.txt")))
