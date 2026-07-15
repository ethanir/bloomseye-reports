#!/usr/bin/env python3
"""Split the catalog into generation slices, one file per agent assignment."""
import json, os
OUT = "/Users/eirim/bloomseye-reports/naming-audit"
SL = os.path.join(OUT, "slices"); os.makedirs(SL, exist_ok=True)
cats = json.load(open(os.path.join(OUT, "categories.json")))

def fmt(items):
    return "\n".join(f'{p["commonName"]} | {p["botanical"]} | {p.get("group") or ""}' for p in items)

def write(name, items):
    open(os.path.join(SL, name + ".txt"), "w").write(fmt(items))
    return len(items)

def half(cat):
    items = sorted(cats[cat], key=lambda x: x["commonName"].lower())
    mid = len(items)//2
    return items[:mid], items[mid:]

slices = {}
p1, p2 = half("Perennial"); slices["perennial-1"]=write("perennial-1",p1); slices["perennial-2"]=write("perennial-2",p2)
a1, a2 = half("Annual");    slices["annual-1"]=write("annual-1",a1);    slices["annual-2"]=write("annual-2",a2)
s1, s2 = half("Shrub");     slices["shrub-1"]=write("shrub-1",s1);      slices["shrub-2"]=write("shrub-2",s2)
slices["bulb"]=write("bulb", cats["Bulb"])
slices["rose"]=write("rose", cats["Rose"])
slices["tree"]=write("tree", cats["Tree"])
slices["climber"]=write("climber", cats["Climber"])
slices["conifer"]=write("conifer", cats["Conifer"])
slices["grass-herb-fern"]=write("grass-herb-fern", cats["Grass"]+cats["Herb"]+cats["Fern"])
print(json.dumps(slices, indent=1))
print("total covered:", sum(slices.values()))
