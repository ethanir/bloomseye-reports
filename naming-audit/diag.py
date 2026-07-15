#!/usr/bin/env python3
import json, os
from search_sim import picker_search, browse_search, PLANTS

def by_name(sub):
    return [p for p in PLANTS if sub.lower() in p["commonName"].lower()]

print("### Does groupName drive picker plural hits? peony/hosta/daylily group names:")
for want in ["Peony","Hosta","Daylily","Garden Mum","Chrysanthemum"]:
    ps = [p for p in PLANTS if p["commonName"]==want]
    for p in ps:
        print(f'   {p["commonName"]!r:16} group={p.get("groupName")!r} botanical={p["botanicalName"]!r}')

print("\n### 'peonies' picker results (why 16):")
for p in picker_search("peonies")[:6]:
    print(f'   {p["commonName"]!r:20} group={p.get("groupName")!r}')

print("\n### what 'limelight' actually returns:")
for p in picker_search("limelight"):
    print(f'   {p["commonName"]!r:24} | {p["botanicalName"]!r} | tags={p["tags"][:5]}')
print("\n### what 'annabelle' actually returns:")
for p in picker_search("annabelle"):
    print(f'   {p["commonName"]!r:24} | {p["botanicalName"]!r} | group={p.get("groupName")!r}')

print("\n### Hydrangea plants we carry (commonName | botanical | group):")
for p in PLANTS:
    if "hydrangea" in (p["botanicalName"] or "").lower() or "hydrangea" in p["commonName"].lower():
        print(f'   {p["commonName"]!r:26} | {p["botanicalName"]!r:34} | {p.get("groupName")!r}')

print("\n### exact commonNames containing: lavender, sedum, coreopsis, geranium(hardy):")
for kw in ["Lavender","Sedum","Coreopsis"]:
    print(f'  -- {kw}:', [p["commonName"] for p in by_name(kw)][:8])

print("\n### 'coral bells' browse noise - full result set:")
for p in browse_search("coral bells"):
    print(f'   {p["commonName"]!r:22} | {p["botanicalName"]!r}')
