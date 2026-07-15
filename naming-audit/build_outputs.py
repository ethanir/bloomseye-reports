#!/usr/bin/env python3
"""Merge curated seed + agent candidates, verify deterministically, and emit:
  - verified_all.json  (every candidate with its search behaviour)
  - alias-map.csv      (existing plant -> proposed aliases, for review)
  - findings_ranked.json (bucketed + ranked, feeds report.md prose)

Only names that currently FAIL (GAP / DIVERGENT / BURIED-NOISE) or are AMBIGUOUS
become alias-map proposals. Names that already resolve cleanly are dropped.
"""
import json, os, csv, re
from collections import defaultdict
from verify import run as verify_run, BY_NAME, PLANTS

OUT = "/Users/eirim/bloomseye-reports/naming-audit"

def load(path):
    if not os.path.exists(path): return []
    d = json.load(open(path))
    if isinstance(d, dict):
        if "candidates" in d: return d["candidates"]
        # workflow return shape {candidates:[...]}
        return d.get("candidates", [])
    return d

seed = load(os.path.join(OUT, "seed_curated.json"))
agent = load(os.path.join(OUT, "candidates_raw.json"))   # written from workflow result
recovery = load(os.path.join(OUT, "recovery_candidates.json"))  # brands + shrub-2 recovery agents
allc = seed + agent + recovery
print(f"seed={len(seed)} agent={len(agent)} recovery={len(recovery)} total_raw={len(allc)}")

verified = verify_run(allc)
json.dump(verified, open(os.path.join(OUT, "verified_all.json"), "w"), indent=1)

# keep only actionable
FAIL = {"GAP","DIVERGENT","BURIED/NOISE"}
actionable = [v for v in verified if v["status"] in FAIL or v["ambiguous"]]

order = {"high":3,"med":2,"low":1}
sev = {"GAP":3,"DIVERGENT":2,"BURIED/NOISE":2,"OK":0,"BAD-TARGET":1}
def score(v):
    return order.get(v["freq"],0)*10 + sev.get(v["status"],0) + (1 if v["ambiguous"] else 0)
actionable.sort(key=score, reverse=True)

# ---- alias-map.csv : per target plant -> aliases ----
# Build plant -> set(alias) from actionable candidates that have a real target.
plant_aliases = defaultdict(lambda: {"aliases":set(),"buckets":set(),"freq":"low","botanical":"","notes":set()})
for v in actionable:
    for t in v["real_targets"]:
        key = t
        rec = plant_aliases[key]
        rec["aliases"].add(v["query"])
        rec["buckets"] |= set(v["buckets"])
        if order.get(v["freq"],0) > order.get(rec["freq"],0): rec["freq"]=v["freq"]
        for n in v["notes"]: rec["notes"].add(n)
# botanical
name2bot = {p["commonName"]: (p["botanicalName"] or "") for p in PLANTS}
rows = []
for plant, rec in plant_aliases.items():
    rows.append({
        "existing_plant": plant,
        "botanical": name2bot.get(plant,""),
        "proposed_aliases": "; ".join(sorted(rec["aliases"])),
        "buckets": "; ".join(sorted(rec["buckets"])),
        "top_freq": rec["freq"],
        "n_aliases": len(rec["aliases"]),
    })
rows.sort(key=lambda r: (order.get(r["top_freq"],0), r["n_aliases"]), reverse=True)
with open(os.path.join(OUT,"alias-map.csv"),"w",newline="") as f:
    w = csv.DictWriter(f, fieldnames=["existing_plant","botanical","proposed_aliases","buckets","top_freq","n_aliases"])
    w.writeheader()
    for r in rows: w.writerow(r)

# ---- ambiguous names (one query -> 2+ unrelated targets) ----
ambiguous = [v for v in verified if v["ambiguous"]]
ambiguous.sort(key=score, reverse=True)

# ---- summary by bucket & status ----
by_bucket = defaultdict(lambda: defaultdict(int))
for v in actionable:
    for b in v["buckets"]:
        by_bucket[b][v["status"]] += 1

findings = {
    "counts": {
        "raw": len(allc), "verified_unique": len(verified),
        "actionable": len(actionable),
        "by_status": {s: sum(1 for v in verified if v["status"]==s) for s in ["GAP","DIVERGENT","BURIED/NOISE","OK","BAD-TARGET"]},
    },
    "top_actionable": actionable[:80],
    "ambiguous": ambiguous[:40],
    "by_bucket": {k: dict(v) for k,v in by_bucket.items()},
    "alias_rows": rows[:60],
}
json.dump(findings, open(os.path.join(OUT,"findings_ranked.json"),"w"), indent=1)

print("verified unique:", len(verified))
print("actionable:", len(actionable))
print("alias-map rows (distinct plants):", len(rows))
print("ambiguous names:", len(ambiguous))
print("by status:", findings["counts"]["by_status"])
print("\nTop 25 actionable:")
for v in actionable[:25]:
    print(f'   {v["freq"]:4} {v["status"]:12} {v["query"]!r:28} -> {v["real_targets"][:2]} {v["buckets"]}')
