/**
 * reciprocity.ts - READ-ONLY. The mission asks: does A pair with B but not the reverse?
 * Measures directed-edge reciprocity AND the score asymmetry that causes it.
 * Writes only into this folder.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { scorePair, toCompatPlant, withPopularity, isArchetype, type CompatPlant } from "../../bloomseye-studio/src/garden/intel/compatibility";
import type { Species } from "../../bloomseye-studio/src/garden/schema";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));
const sets: Record<string, any> = doc.plants;

const pool: CompatPlant[] = withPopularity((Object.values(libraryCatalog) as Species[]).map(toCompatPlant));
const bySlug = new Map(pool.map((p) => [p.slug, p]));
const arch = new Set(pool.filter(isArchetype).map((p) => p.slug));

const has = new Set<string>();
for (const [s, set] of Object.entries(sets)) for (const c of set.companions) has.add(`${s}>${c.slug}`);

// Sharpest incoherence: A's #1 companion is B, but A is nowhere in B's list of 8.
const sharp: any[] = [];
for (const s of Object.keys(sets)) {
  if (!arch.has(s)) continue;
  const top = sets[s].companions[0];
  if (!top || !arch.has(top.slug)) continue;
  if (has.has(`${top.slug}>${s}`)) continue;
  const a = bySlug.get(s)!, b = bySlug.get(top.slug)!;
  const ab = scorePair(a, b).score, ba = scorePair(b, a).score;
  const bList = sets[top.slug].companions;
  sharp.push({
    a: sets[s].commonName, b: top.commonName,
    aToB: ab, bToA: ba, delta: +(ab - ba).toFixed(1),
    bWeakestShown: bList[bList.length - 1].commonName,
    bWeakestScore: bList[bList.length - 1].score,
    aBeatsBsWeakest: ba > bList[bList.length - 1].score,
  });
}
sharp.sort((x, y) => y.delta - x.delta);

// Score asymmetry across every archetype-archetype pair that appears in either list.
const seen = new Set<string>();
let n = 0, sum = 0, max = 0, maxPair = "";
const asym: any[] = [];
for (const s of Object.keys(sets)) {
  if (!arch.has(s)) continue;
  for (const c of sets[s].companions) {
    if (!arch.has(c.slug)) continue;
    const key = [s, c.slug].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const a = bySlug.get(s)!, b = bySlug.get(c.slug)!;
    const ab = scorePair(a, b).score, ba = scorePair(b, a).score;
    const d = Math.abs(ab - ba);
    n++; sum += d;
    if (d > max) { max = d; maxPair = `${a.commonName} -> ${b.commonName}: ${ab} vs ${ba}`; }
    if (d >= 10) asym.push({ a: a.commonName, b: b.commonName, aToB: ab, bToA: ba, delta: +d.toFixed(1) });
  }
}
asym.sort((x, y) => y.delta - x.delta);

console.log("=== reciprocity ===");
console.log(`A's TOP companion is B, but A is absent from B's whole list: ${sharp.length} of the 276 archetype lists`);
console.log(`of those, A would have OUT-SCORED the weakest plant B actually shows: ${sharp.filter((s) => s.aBeatsBsWeakest).length}`);
console.log(`\nmean |score(A,B) - score(B,A)| over ${n} distinct archetype pairs: ${(sum / n).toFixed(1)} points`);
console.log(`pairs whose two directions differ by 10+ points: ${asym.length}`);
console.log(`largest asymmetry: ${maxPair}`);
console.log("\nsharpest one-way top picks (A says B is its best companion; B never mentions A):");
for (const s of sharp.slice(0, 12)) {
  console.log(`  ${s.a.padEnd(22)} -> ${s.b.padEnd(22)} ${String(s.aToB).padStart(5)} one way, ${String(s.bToA).padStart(5)} the other` +
    (s.aBeatsBsWeakest ? `   (yet ${s.a} out-scores ${s.bWeakestShown} @ ${s.bWeakestScore}, which B DOES show)` : ""));
}
console.log("\nlargest score asymmetries (same two plants, scored both ways):");
for (const a of asym.slice(0, 10)) console.log(`  ${a.a.padEnd(22)} -> ${a.b.padEnd(22)} ${String(a.aToB).padStart(5)} vs ${String(a.bToA).padStart(5)}  (${a.delta})`);

writeFileSync(`${HERE}/data/reciprocity.json`, JSON.stringify({
  sharpOneWayTopPicks: sharp.length,
  sharpAndOutscores: sharp.filter((s) => s.aBeatsBsWeakest).length,
  meanAsymmetry: +(sum / n).toFixed(2),
  pairsAsym10Plus: asym.length,
  distinctArchetypePairs: n,
  sharp: sharp.slice(0, 40),
  asym: asym.slice(0, 40),
}, null, 2));
