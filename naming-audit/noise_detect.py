#!/usr/bin/env python3
"""Deterministic noise + ambiguity detection over CURRENT search behaviour.

Two scans:
 A) CURATED high-traffic shopper terms -> intended genus. Flags cross-genus
    contamination (a result from an unrelated genus) on each surface.
 B) AUTOMATED cross-genus scan over every one-word common-name token and every
    group name: run it, and if the result set spans >=2 genera, report it (many
    are legitimate synonyms; the curated pass separates real noise).
"""
import json, os
from collections import defaultdict
from search_sim import picker_search, browse_search, PLANTS

def genus_of(b):
    if not b: return ""
    t = b.strip().split()
    if not t: return ""
    g = t[0]
    if g in ("×","x") and len(t)>1: g=t[1]
    return g.strip("'\"×")

for p in PLANTS:
    p["_genus"] = genus_of(p["botanicalName"])

# ---- A) curated term -> intended genus/genera (what the shopper means) ----
CURATED = [
    ("mum", ["Chrysanthemum"]),
    ("mums", ["Chrysanthemum"]),
    ("aster", ["Symphyotrichum","Aster"]),
    ("geranium", ["Geranium"]),             # true hardy geranium; Pelargonium is the annual
    ("coral bells", ["Heuchera"]),
    ("bells", ["Heuchera","Campanula"]),
    ("iris", ["Iris"]),
    ("lily", ["Lilium"]),
    ("daisy", ["Leucanthemum","Bellis"]),
    ("sage", ["Salvia"]),
    ("pink", ["Dianthus"]),                 # "pinks" the flower vs colour
    ("rose", ["Rosa"]),
    ("cedar", ["Cedrus","Thuja","Juniperus"]),
    ("laurel", ["Prunus","Kalmia","Laurus"]),
    ("jasmine", ["Jasminum","Trachelospermum"]),
    ("snowball", ["Viburnum"]),
    ("bluebell", ["Hyacinthoides","Mertensia"]),
    ("primrose", ["Primula","Oenothera"]),
    ("cypress", ["Cupressus","Chamaecyparis"]),
    ("holly", ["Ilex"]),
    ("ice plant", ["Delosperma"]),
    ("dusty miller", ["Senecio","Jacobaea"]),
    ("money plant", ["Lunaria","Pilea","Crassula"]),
    ("mock orange", ["Philadelphus"]),
    ("sweet pea", ["Lathyrus"]),
    ("morning glory", ["Ipomoea"]),
]

def report_term(term, intended):
    pk = picker_search(term); bz = browse_search(term)
    def genera(rs):
        g = defaultdict(list)
        for r in rs: g[r["_genus"]].append(r["commonName"])
        return g
    out = {"term": term, "intended": intended,
           "picker_n": len(pk), "browse_n": len(bz),
           "picker_genera": {}, "browse_genera": {}, "noise": []}
    for surface, rs in (("picker", pk), ("browse", bz)):
        g = genera(rs)
        out[surface+"_genera"] = {k: v[:4] for k,v in sorted(g.items(), key=lambda x:-len(x[1]))}
        for gen, names in g.items():
            if gen and gen not in intended:
                out["noise"].append({"surface":surface,"genus":gen,"examples":names[:4]})
    return out

if __name__ == "__main__":
    A = [report_term(t,i) for t,i in CURATED]
    json.dump(A, open(os.path.join(os.path.dirname(__file__),"noise_curated.json"),"w"), indent=1)
    print("=== CURATED NOISE SCAN (unrelated-genus contamination) ===")
    for r in A:
        noisy = r["noise"]
        if not noisy:
            print(f'  {r["term"]!r:16} pk={r["picker_n"]:3} bz={r["browse_n"]:3}  clean')
            continue
        contaminants = sorted({n["genus"] for n in noisy})
        print(f'  {r["term"]!r:16} pk={r["picker_n"]:3} bz={r["browse_n"]:3}  NOISE from: {contaminants}')
        for n in noisy[:4]:
            print(f'        [{n["surface"]}] {n["genus"]}: {n["examples"]}')
