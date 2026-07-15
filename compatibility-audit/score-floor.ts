/**
 * score-floor.ts - READ-ONLY. Two questions:
 *  1. Is there any score FLOOR? (What does the weakest shown companion score?)
 *  2. Does the 3-per-category cap silently drop higher-scoring plants? Prove it.
 * Writes only into this folder.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { coexistence, scorePair, toCompatPlant, withPopularity, isArchetype, companionsFor, type CompatPlant } from "../../bloomseye-studio/src/garden/intel/compatibility";
import type { Species } from "../../bloomseye-studio/src/garden/schema";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));
const sets: Record<string, any> = doc.plants;

const pool: CompatPlant[] = withPopularity((Object.values(libraryCatalog) as Species[]).map(toCompatPlant));
const bySlug = new Map(pool.map((p) => [p.slug, p]));

// ---- 1. the score floor (there is none in the code; what does that cost?) ----
const lasts: { slug: string; name: string; top: number; last: number; lastName: string; lastReason: string }[] = [];
for (const [slug, set] of Object.entries(sets)) {
  const cs = set.companions;
  if (!cs.length) continue;
  lasts.push({
    slug, name: set.commonName,
    top: cs[0].score,
    last: cs[cs.length - 1].score,
    lastName: cs[cs.length - 1].commonName,
    lastReason: cs[cs.length - 1].reason,
  });
}
lasts.sort((a, b) => a.last - b.last);
const scores = lasts.map((l) => l.last);
const pct = (p: number) => scores[Math.floor((scores.length - 1) * p)];
console.log("=== the WEAKEST companion each list still shows (no score floor exists in the engine) ===");
console.log(`min ${scores[0]}  p10 ${pct(0.1)}  median ${pct(0.5)}  p90 ${pct(0.9)}  max ${scores[scores.length - 1]}`);
console.log(`lists whose 8th companion scores < 40: ${scores.filter((s) => s < 40).length}`);
console.log(`lists whose 8th companion scores < 50: ${scores.filter((s) => s < 50).length}`);
console.log(`lists whose TOP companion scores < 55: ${lasts.filter((l) => l.top < 55).length}`);
console.log("\nworst 12 lists (the 8th plant a user is shown, and why):");
for (const l of lasts.slice(0, 12)) {
  console.log(`  ${l.name.padEnd(24)} top ${String(l.top).padStart(5)}  8th ${String(l.last).padStart(5)}  -> ${l.lastName}`);
  console.log(`      "${l.lastReason}"`);
}

// ---- 2. does the category cap drop a higher-scoring plant? ----
const MAX_PER_CATEGORY = 3;
const dropped: { subject: string; skipped: string; skippedScore: number; rank: number; takenInstead: string; takenScore: number }[] = [];
for (const subject of pool) {
  const scored = pool
    .filter((o) => isArchetype(o) && coexistence(subject, o).ok)
    .map((o) => ({ p: o, s: scorePair(subject, o).score }))
    .sort((a, b) => b.s - a.s || a.p.slug.localeCompare(b.p.slug));
  const shown = new Set(companionsFor(subject, pool).companions.map((c) => c.slug));
  if (shown.size === 0) continue;
  const lowestShown = Math.min(...[...shown].map((s) => scored.find((x) => x.p.slug === s)?.s ?? 0));
  // A plant that out-scores the weakest SHOWN companion, yet is not shown.
  scored.forEach((x, i) => {
    if (shown.has(x.p.slug)) return;
    if (x.s > lowestShown) {
      const worst = [...shown].map((s) => ({ s, v: scored.find((y) => y.p.slug === s)?.s ?? 0 })).sort((a, b) => a.v - b.v)[0];
      dropped.push({
        subject: subject.commonName, skipped: x.p.commonName, skippedScore: x.s, rank: i + 1,
        takenInstead: bySlug.get(worst.s)?.commonName ?? worst.s, takenScore: worst.v,
      });
    }
  });
}
dropped.sort((a, b) => (b.skippedScore - b.takenScore) - (a.skippedScore - a.takenScore));
console.log(`\n=== the 3-per-category cap drops a HIGHER-scoring plant in ${dropped.length} slot decisions ===`);
console.log("worst 12 (a better-scoring plant was not shown; a weaker one was):");
for (const d of dropped.slice(0, 12)) {
  console.log(`  ${d.subject.padEnd(22)} dropped ${d.skipped.padEnd(22)} (${d.skippedScore}, rank ${d.rank})  kept ${d.takenInstead.padEnd(20)} (${d.takenScore})`);
}
const subjectsAffected = new Set(dropped.map((d) => d.subject));
console.log(`subjects affected: ${subjectsAffected.size} of ${pool.length}`);

writeFileSync(`${HERE}/data/score-floor.json`, JSON.stringify({
  weakestShown: { min: scores[0], p10: pct(0.1), median: pct(0.5), p90: pct(0.9), max: scores[scores.length - 1],
    listsUnder40: scores.filter((s) => s < 40).length, listsUnder50: scores.filter((s) => s < 50).length },
  worstLists: lasts.slice(0, 30),
  categoryCapDrops: dropped.length,
  subjectsAffectedByCap: subjectsAffected.size,
  worstCapDrops: dropped.slice(0, 30),
}, null, 2));
