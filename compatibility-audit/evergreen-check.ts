import { readFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));

// Which library plants sit in a genus the taxonomy flags evergreen, but are not?
const suspects = ["sedum", "euonymus", "hylotelephium", "ilex", "nandina", "vinca", "lavandula", "iberis"];
console.log("=== library plants in an evergreen-flagged genus ===");
for (const sp of Object.values(libraryCatalog) as any[]) {
  const g = String(sp.botanicalName ?? "").split(" ")[0].toLowerCase();
  if (!suspects.includes(g)) continue;
  console.log(`  ${String(sp.assetKey).padEnd(24)} ${String(sp.botanicalName).padEnd(34)} ${sp.category}`);
}

// Now: does any REASON call one of them evergreen?
console.log("\n=== pairings whose reason claims 'evergreen' about each of these ===");
const claim = new Map<string, { n: number; ex: string }>();
for (const set of Object.values(doc.plants) as any[]) {
  for (const c of set.companions) {
    if (!/evergreen/.test(c.reason)) continue;
    const e = claim.get(c.slug) ?? { n: 0, ex: c.reason };
    e.n++;
    claim.set(c.slug, e);
  }
}
for (const [slug, e] of [...claim.entries()].sort((a, b) => b[1].n - a[1].n)) {
  const sp = (Object.values(libraryCatalog) as any[]).find((s) => s.assetKey === slug);
  console.log(`  ${String(e.n).padStart(4)}x  ${slug.padEnd(24)} ${String(sp?.botanicalName).padEnd(32)} ${sp?.category}`);
}
