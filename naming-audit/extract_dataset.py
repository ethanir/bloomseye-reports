#!/usr/bin/env python3
"""Throwaway extractor: pull the CURRENT plant dataset from the live source.
Sources:
  - src/garden/plantLibrary.ts  (DEFS_A/B/C, one Def per line)
  - src/data/community-snapshot.json  (frozen community plants)
Also cross-checks against catalog-preview.json (older published snapshot).
Writes dataset.json into the report folder. Read-only against the repo.
"""
import json, re, os

REPO = "/Users/eirim/Downloads/bloomseye-studio"
OUT = "/Users/eirim/bloomseye-reports/naming-audit"

lib = open(os.path.join(REPO, "src/garden/plantLibrary.ts")).read()

# Isolate the DEFS_A/B/C region so we don't accidentally grab PLANT_GROUPS lines.
start = lib.index("const DEFS_A")
end = lib.index("const DEFS: Def[]")
defs_region = lib[start:end]

def grab(field, line, quoted=True):
    # matches  field: "..."  or  field: '...'
    m = re.search(r'\b' + field + r'\s*:\s*(".*?"|\'.*?\')', line)
    if not m:
        return None
    v = m.group(1)
    return v[1:-1]

def grab_tags(line):
    m = re.search(r'\btags\s*:\s*\[(.*?)\]', line)
    if not m:
        return []
    inner = m.group(1)
    return [t.strip().strip('"').strip("'") for t in re.split(r',(?![^\[]*\])', inner) if t.strip()]

plants = []
for line in defs_region.splitlines():
    line = line.strip()
    if not line.startswith("{ slug:") and not line.startswith("{slug:"):
        continue
    slug = grab("slug", line)
    name = grab("name", line)
    botanical = grab("botanical", line)
    cat = grab("cat", line)
    group = grab("group", line)
    groupName = grab("groupName", line)
    tags = grab_tags(line)
    if slug is None or name is None:
        continue
    plants.append({
        "slug": slug, "commonName": name, "botanicalName": botanical or "",
        "category": cat or "", "tags": tags, "group": group, "groupName": groupName,
        "source": "library",
    })

# ---- PLANT_GROUPS: slug -> group name (grouping assigned outside the Def) ----
grp_region = lib[lib.index("PLANT_GROUPS: PlantGroup[]"):lib.index("const DEFS_A")]
group_of = {}   # member slug -> group display name
gname_of = {}
for block in re.finditer(r'\{\s*key:\s*"(.*?)",\s*name:\s*"(.*?)",\s*default:\s*"(.*?)",\s*members:\s*\[(.*?)\]', grp_region, re.S):
    key, gname, default, members = block.groups()
    for mslug in re.findall(r'"(.*?)"', members):
        group_of[mslug] = key
        gname_of[mslug] = gname

for p in plants:
    if p["group"] is None and p["slug"] in group_of:
        p["group"] = group_of[p["slug"]]
        p["groupName"] = gname_of[p["slug"]]

lib_slugs = {p["slug"] for p in plants}

# ---- community snapshot ----
comm = json.load(open(os.path.join(REPO, "src/data/community-snapshot.json")))
for c in comm:
    if c.get("status") and c["status"] != "approved":
        # include anyway but note status; snapshot is the frozen set
        pass
    plants.append({
        "slug": c["slug"], "commonName": c["name"], "botanicalName": c.get("botanical") or "",
        "category": c.get("category") or "", "tags": c.get("tags") or [],
        "group": None, "groupName": None, "source": "community",
    })

# ---- cross-check vs catalog-preview.json ----
prev = json.load(open(os.path.join(REPO, "catalog-preview.json")))["plants"]
prev_slugs = {p["slug"] for p in prev}
cur_slugs = {p["slug"] for p in plants}

only_in_preview = sorted(prev_slugs - cur_slugs)
only_in_current = sorted(cur_slugs - prev_slugs)

json.dump(plants, open(os.path.join(OUT, "dataset.json"), "w"), indent=1)

print("library Defs parsed:", len(lib_slugs))
print("community added:", len(comm))
print("total dataset:", len(plants))
print("preview count:", len(prev))
print("slugs only in preview (dropped since):", len(only_in_preview))
print("  sample:", only_in_preview[:15])
print("slugs only in current (added since):", len(only_in_current))
print("  sample:", only_in_current[:15])
# how many have a group
print("grouped plants:", sum(1 for p in plants if p.get("group")))
# any Defs we failed to parse name/botanical?
missing_bot = [p["slug"] for p in plants if p["source"]=="library" and not p["botanicalName"]]
print("library plants missing botanical (parse gaps or truly none):", len(missing_bot), missing_bot[:10])
