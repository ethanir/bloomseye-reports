#!/usr/bin/env python3
"""Simulate BloomsEye's two search surfaces EXACTLY as coded, plus inventory.

Picker (src/shared/PlantLibraryModal.tsx, matches()):
  hay = (commonName + " " + botanicalName + " " + category + " " + tags.join(" ")).lower()
  match := hay.includes(query.trim().lower())        # single contiguous substring, NO tokenization
  Groups also match when query is a substring of groupName.

Browse (src/browse/BrowseTab.tsx, results):
  search = (commonName + " " + botanicalName).lower()  # NOTE: no category, no tags
  tokens = query.trim().lower().split(/\\s+/)
  match := tokens.every(t => search.includes(t))       # per-token AND substring
"""
import json, os

OUT = "/Users/eirim/bloomseye-reports/naming-audit"
PLANTS = json.load(open(os.path.join(OUT, "dataset.json")))

def picker_hay(p):
    return (p["commonName"] + " " + (p["botanicalName"] or "") + " " + (p["category"] or "") + " " + " ".join(p["tags"] or [])).lower()

def browse_hay(p):
    return (p["commonName"] + " " + (p["botanicalName"] or "")).lower()

# Precompute
for p in PLANTS:
    p["_picker"] = picker_hay(p)
    p["_browse"] = browse_hay(p)
    p["_groupName"] = (p.get("groupName") or "").lower()

def picker_search(query):
    ql = query.strip().lower()
    if not ql:
        return list(PLANTS)
    out = []
    for p in PLANTS:
        if ql in p["_picker"] or (p["_groupName"] and ql in p["_groupName"]):
            out.append(p)
    return out

def browse_search(query):
    tokens = [t for t in query.strip().lower().split() if t]
    if not tokens:
        return list(PLANTS)
    return [p for p in PLANTS if all(t in p["_browse"] for t in tokens)]

def summarize(query):
    pk = picker_search(query)
    bz = browse_search(query)
    def names(rs, n=6):
        return [r["commonName"] for r in rs[:n]]
    return {
        "query": query,
        "picker_n": len(pk), "picker_sample": names(pk),
        "browse_n": len(bz), "browse_sample": names(bz),
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "inventory":
        # Naming landscape inventory
        common = sorted({p["commonName"] for p in PLANTS})
        genera = sorted({(p["botanicalName"] or "").split(" ")[0].split("'")[0].strip() for p in PLANTS if p["botanicalName"]})
        genera = [g for g in genera if g]
        tags = {}
        for p in PLANTS:
            for t in (p["tags"] or []):
                tags[t] = tags.get(t, 0) + 1
        cats = {}
        for p in PLANTS:
            cats[p["category"]] = cats.get(p["category"], 0) + 1
        groupnames = sorted({p["groupName"] for p in PLANTS if p.get("groupName")})
        print("distinct commonNames:", len(common))
        print("distinct genera:", len(genera))
        print("distinct tags:", len(tags))
        print("categories:", cats)
        print("distinct groupNames:", len(groupnames))
        json.dump({
            "commonNames": common, "genera": genera,
            "tags": sorted(tags.items(), key=lambda x:-x[1]),
            "groupNames": groupnames,
        }, open(os.path.join(OUT, "inventory.json"), "w"), indent=1)
        print("wrote inventory.json")
    else:
        # Probe demonstration queries
        probes = ["stonecrop","sedum","coneflower","echinacea","coral bells","heuchera",
                  "cherry truffle","martha stewart","black eyed susan","hosta","lavender",
                  "mum","rose","knock out","endless summer","wave petunia","hydrangea",
                  "cranesbill","geranium","pincushion","lambs ear","tickseed","blanket flower"]
        for q in probes:
            r = summarize(q)
            print(f'{q:20s} picker={r["picker_n"]:4d} browse={r["browse_n"]:4d}  picker:{r["picker_sample"][:4]}')
