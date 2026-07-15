#!/usr/bin/env python3
"""Deterministic verification of candidate shopper names against BOTH search surfaces.

Reads a candidates JSON (list of {query, targets, bucket, freq, ambiguous, note}) and classifies
each query by how it behaves in the current search:

  picker_n / browse_n            : result counts on each surface
  target_hit_picker/browse       : does the intended target appear in that surface's results?
  status:
    GAP            - returns 0 on BOTH surfaces (worst; plant unreachable by this name)
    DIVERGENT      - resolves the target on one surface but not the other
    BURIED/NOISE   - query returns results but the intended target is NOT among them (wrong plant)
    OK             - target reachable on both surfaces already (not a gap)
Also validates that each target commonName actually exists (drops fabricated targets).

Usage: verify.py <candidates.json>  ->  writes verified.json + prints summary
"""
import json, os, sys, re
from collections import defaultdict

OUT = "/Users/eirim/bloomseye-reports/naming-audit"
PLANTS = json.load(open(os.path.join(OUT, "dataset.json")))

for p in PLANTS:
    p["_picker"] = (p["commonName"] + " " + (p["botanicalName"] or "") + " " + (p["category"] or "") + " " + " ".join(p["tags"] or [])).lower()
    p["_browse"] = (p["commonName"] + " " + (p["botanicalName"] or "")).lower()
    p["_groupName"] = (p.get("groupName") or "").lower()

BY_NAME = defaultdict(list)
for p in PLANTS:
    BY_NAME[p["commonName"].lower()].append(p)

def picker_search(ql):
    if not ql: return list(PLANTS)
    return [p for p in PLANTS if ql in p["_picker"] or (p["_groupName"] and ql in p["_groupName"])]

def browse_search(query):
    toks = [t for t in query.strip().lower().split() if t]
    if not toks: return list(PLANTS)
    return [p for p in PLANTS if all(t in p["_browse"] for t in toks)]

def target_in(results, target):
    tl = target.strip().lower()
    return any(r["commonName"].lower() == tl for r in results)

def classify(query, targets):
    ql = query.strip().lower()
    # validate targets exist
    real_targets = [t for t in targets if t.strip().lower() in BY_NAME]
    pk = picker_search(ql); bz = browse_search(ql)
    pk_n, bz_n = len(pk), len(bz)
    # target hit on each surface (if we have a real target; else use "any result")
    if real_targets:
        thp = any(target_in(pk, t) for t in real_targets)
        thb = any(target_in(bz, t) for t in real_targets)
    else:
        thp = pk_n > 0; thb = bz_n > 0
    if pk_n == 0 and bz_n == 0:
        status = "GAP"
    elif real_targets and (thp != thb):
        status = "DIVERGENT"
    elif real_targets and not (thp or thb):
        status = "BURIED/NOISE"   # returns things but never the intended plant
    elif not real_targets:
        status = "BAD-TARGET" if (targets and not real_targets) else ("GAP" if pk_n==0 and bz_n==0 else "OK")
    else:
        status = "OK"
    return {
        "picker_n": pk_n, "browse_n": bz_n,
        "target_hit_picker": thp, "target_hit_browse": thb,
        "real_targets": real_targets, "status": status,
        "picker_sample": [r["commonName"] for r in pk[:5]],
        "browse_sample": [r["commonName"] for r in bz[:5]],
    }

def run(cands):
    # dedupe by (query, tuple(sorted targets lower))
    seen = {}
    for c in cands:
        q = c["query"].strip().lower()
        key = q
        if key in seen:
            # merge targets/buckets
            seen[key]["targets"] = sorted(set(seen[key]["targets"]) | set(c.get("targets", [])))
            seen[key]["buckets"] = sorted(set(seen[key]["buckets"]) | {c.get("bucket","other")})
            seen[key]["freqs"].append(c.get("freq","low"))
            seen[key]["ambiguous"] = seen[key]["ambiguous"] or bool(c.get("ambiguous"))
            if c.get("note"): seen[key]["notes"].add(c["note"])
        else:
            seen[key] = {"query": q, "targets": list(c.get("targets", [])),
                         "buckets": [c.get("bucket","other")], "freqs": [c.get("freq","low")],
                         "ambiguous": bool(c.get("ambiguous")), "notes": set([c.get("note")]) if c.get("note") else set()}
    out = []
    for k, v in seen.items():
        cl = classify(v["query"], v["targets"])
        # consensus freq = highest proposed
        order = {"high":3,"med":2,"low":1}
        freq = max(v["freqs"], key=lambda f: order.get(f,0)) if v["freqs"] else "low"
        out.append({**v, "notes": sorted(v["notes"]), "freq": freq, **cl})
    return out

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, "candidates_raw.json")
    cands = json.load(open(src))
    if isinstance(cands, dict) and "candidates" in cands:
        cands = cands["candidates"]
    res = run(cands)
    json.dump(res, open(os.path.join(OUT, "verified.json"), "w"), indent=1)
    by_status = defaultdict(int)
    for r in res: by_status[r["status"]] += 1
    print("unique queries verified:", len(res))
    print("by status:", dict(by_status))
    # show a few of each interesting status
    for st in ("GAP","DIVERGENT","BURIED/NOISE"):
        ex = [r for r in res if r["status"]==st and r["freq"]=="high"][:12]
        print(f"\n--- {st} (freq=high), {sum(1 for r in res if r['status']==st)} total ---")
        for r in ex:
            print(f'   {r["query"]!r:26} -> {r["targets"][:2]}  pk={r["picker_n"]} bz={r["browse_n"]} {r["buckets"]}')
