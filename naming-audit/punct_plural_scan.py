#!/usr/bin/env python3
"""Systematic punctuation + plural sweep.
For every plant commonName and every group name that CONTAINS a hyphen or apostrophe,
test whether the 'naturally typed' form (hyphen->space, apostrophe removed) still
resolves the SAME plant on each surface. Also test plural of group names.
Reports forms that BREAK (stop reaching the plant) on either surface."""
import re, json, os
from search_sim import picker_search, browse_search, PLANTS

def reaches(query, target_name, surface):
    fn = picker_search if surface=="picker" else browse_search
    tl = target_name.lower()
    return any(r["commonName"].lower()==tl for r in fn(query.lower()))

# ---- 1) hyphen / apostrophe common names ----
punct_breaks = []
seen = set()
for p in PLANTS:
    nm = p["commonName"]
    if nm.lower() in seen: continue
    seen.add(nm.lower())
    variants = []
    if "-" in nm:
        variants.append(nm.replace("-", " "))          # black-eyed -> black eyed
        variants.append(nm.replace("-", ""))            # black-eyed -> blackeyed
    if "'" in nm or "’" in nm:
        variants.append(re.sub(r"['’]", "", nm))   # lamb's -> lambs
        variants.append(re.sub(r"['’]s\b", "s", nm))
    for v in variants:
        if v.lower()==nm.lower(): continue
        pk = reaches(v, nm, "picker"); bz = reaches(v, nm, "browse")
        # baseline: exact name reaches itself
        if not pk or not bz:
            punct_breaks.append({"plant":nm,"typed":v,"picker_reaches":pk,"browse_reaches":bz,"botanical":p["botanicalName"]})

# ---- 2) group-name plurals & the group singular ----
groups = {}
for p in PLANTS:
    g = p.get("groupName")
    if g: groups.setdefault(g, p["commonName"])  # any member as representative
group_breaks = []
for g, rep in sorted(groups.items()):
    # a shopper types the group concept; does it reach ANY member?
    forms = {g.lower()}
    # singularize simple plurals
    if g.endswith("ies"): forms.add(g[:-3].lower()+"y")
    elif g.endswith("es"): forms.add(g[:-2].lower())
    elif g.endswith("s"): forms.add(g[:-1].lower())
    for f in forms:
        pk = len(picker_search(f)); bz = len(browse_search(f))
        if bz == 0 or pk == 0:
            group_breaks.append({"group":g,"typed":f,"picker_n":pk,"browse_n":bz})

print(f"=== PUNCTUATION BREAKS (typed form stops reaching the plant): {len(punct_breaks)} ===")
# focus on ones that break on at least one surface, show high-value
for b in punct_breaks[:40]:
    flag = []
    if not b["picker_reaches"]: flag.append("PICKER-MISS")
    if not b["browse_reaches"]: flag.append("browse-miss")
    print(f'   {b["plant"]!r:30} typed {b["typed"]!r:30} {flag}')
print(f"   ...({len(punct_breaks)} total)")

print(f"\n=== GROUP-NAME FORMS THAT RETURN 0 ON A SURFACE: {len(group_breaks)} ===")
# The key pattern: singular/plural of a group returns 0 in browse (browse ignores groupName)
zero_browse = [b for b in group_breaks if b["browse_n"]==0]
print(f"   forms returning 0 in BROWSE (browse ignores group names): {len(zero_browse)}")
for b in zero_browse[:30]:
    print(f'      {b["group"]!r:34} typed {b["typed"]!r:24} picker={b["picker_n"]:3} browse={b["browse_n"]}')

json.dump({"punct_breaks":punct_breaks,"group_breaks":group_breaks},
          open(os.path.join(os.path.dirname(__file__),"punct_plural.json"),"w"), indent=1)
