#!/usr/bin/env python3
"""Aggregate all agent-produced candidates from the workflow journal into
candidates_raw.json, so build_outputs.py can merge them with the curated seed."""
import json, os, glob, sys

WF = "/Users/eirim/.claude/projects/-Users-eirim-Downloads-bloomseye-studio/4ef3f3aa-c924-4340-9c2c-e6fc3b1fb24d/subagents/workflows/wf_44400c28-bbb"
OUT = "/Users/eirim/bloomseye-reports/naming-audit"

def from_journal():
    cands = []
    n_agents = 0
    jp = os.path.join(WF, "journal.jsonl")
    for line in open(jp):
        try:
            j = json.loads(line)
        except Exception:
            continue
        if j.get("type") == "result":
            r = j.get("result")
            if isinstance(r, dict) and isinstance(r.get("candidates"), list):
                cands.extend(r["candidates"])
                n_agents += 1
    return cands, n_agents

if __name__ == "__main__":
    cands, n = from_journal()
    # keep only well-formed
    good = [c for c in cands if isinstance(c, dict) and c.get("query") and "targets" in c]
    json.dump(good, open(os.path.join(OUT, "candidates_raw.json"), "w"), indent=1)
    print(f"agents with results: {n}")
    print(f"raw candidates: {len(cands)}  well-formed: {len(good)}")
    # bucket + freq distribution
    from collections import Counter
    print("buckets:", dict(Counter(c.get("bucket","?") for c in good)))
    print("freq:", dict(Counter(c.get("freq","?") for c in good)))
    print("ambiguous flagged:", sum(1 for c in good if c.get("ambiguous")))
