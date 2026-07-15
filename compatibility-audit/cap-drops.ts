/**
 * cap-drops.ts - READ-ONLY. Replicate the engine's pick() exactly and attribute every
 * skipped-but-higher-scoring plant to the RULE that skipped it:
 *   - same-genus / same-group  (intentional, correct: one Rhododendron per list, and
 *     Azalea IS genus Rhododendron, so it legitimately blocks Rhododendron)
 *   - the 3-per-category soft cap (the one worth questioning)
 * Writes only into this folder.
 */
import { writeFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { coexistence, scorePair, toCompatPlant, withPopularity, isArchetype, type CompatPlant } from "../../bloomseye-studio/src/garden/intel/compatibility";
import type { Species } from "../../bloomseye-studio/src/garden/schema";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const MAX_COMPANIONS = 8;
const MAX_PER_CATEGORY = 3;

const pool: CompatPlant[] = withPopularity((Object.values(libraryCatalog) as Species[]).map(toCompatPlant));

// the engine's merit tie-break
const FORAGE_RANK: Record<string, number> = { high: 1, some: 0.5, none: 0, unknown: 0 };
const merit = (p: CompatPlant) => FORAGE_RANK[p.pollinator] * 4 + (p.native ? 2 : 0) + (p.evergreen ? 1 : 0);

interface Drop { subject: string; skipped: string; skippedCat: string; score: number; rank: number; rule: string; weakestKept: string; weakestKeptScore: number }
const drops: Drop[] = [];
let capDrops = 0, genusDrops = 0, pass2Ran = 0;
const capSubjects = new Set<string>();

for (const subject of pool) {
  const scored = pool
    .filter((o) => isArchetype(o) && coexistence(subject, o).ok)
    .map((o) => ({ p: o, s: scorePair(subject, o).score }))
    .sort((a, b) => b.s - a.s || merit(b.p) - merit(a.p) || a.p.slug.localeCompare(b.p.slug));

  // --- replicate pick(), recording why each candidate was skipped ---
  const chosen: { p: CompatPlant; s: number }[] = [];
  const genera = new Set<string>(), groups = new Set<string>(), perCat = new Map<string, number>();
  const skips: { p: CompatPlant; s: number; rank: number; rule: string }[] = [];

  scored.forEach((x, i) => {
    if (chosen.length >= MAX_COMPANIONS) return;
    const sameGenus = x.p.genus && genera.has(x.p.genus);
    const sameGroup = x.p.group && groups.has(x.p.group);
    if (sameGenus || sameGroup) {
      skips.push({ ...x, rank: i + 1, rule: sameGenus ? "same-genus" : "same-group" });
      return;
    }
    const cat = x.p.category ?? "?";
    if ((perCat.get(cat) ?? 0) >= MAX_PER_CATEGORY) {
      skips.push({ ...x, rank: i + 1, rule: "category-cap" });
      return;
    }
    chosen.push(x);
    if (x.p.genus) genera.add(x.p.genus);
    if (x.p.group) groups.add(x.p.group);
    perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
  });
  if (chosen.length < MAX_COMPANIONS) pass2Ran++;
  if (!chosen.length) continue;

  const weakest = chosen.reduce((a, b) => (a.s <= b.s ? a : b));
  for (const sk of skips) {
    if (sk.s <= weakest.s) continue; // it lost on merit, not on a rule
    if (sk.rule === "category-cap") { capDrops++; capSubjects.add(subject.slug); }
    else genusDrops++;
    drops.push({
      subject: subject.commonName, skipped: sk.p.commonName, skippedCat: String(sk.p.category),
      score: sk.s, rank: sk.rank, rule: sk.rule,
      weakestKept: weakest.p.commonName, weakestKeptScore: weakest.s,
    });
  }
}

const capOnly = drops.filter((d) => d.rule === "category-cap").sort((a, b) => (b.score - b.weakestKeptScore) - (a.score - a.weakestKeptScore));

console.log("=== why a higher-scoring plant was not shown ===");
console.log(`same-genus / same-group (intentional, correct): ${genusDrops} slot decisions`);
console.log(`3-per-category soft cap:                        ${capDrops} slot decisions, across ${capSubjects.size} of ${pool.length} subjects`);
console.log(`lists where the cap was RELAXED (pass two ran): ${pass2Ran}`);
console.log("\nworst 15 category-cap drops (a better plant hidden, a weaker one shown):");
for (const d of capOnly.slice(0, 15)) {
  console.log(`  ${d.subject.padEnd(22)} hid ${d.skipped.padEnd(20)} ${String(d.score).padStart(5)} (${d.skippedCat}, rank ${String(d.rank).padStart(2)})  showed ${d.weakestKept.padEnd(20)} ${d.weakestKeptScore}`);
}

// Which plants lose the most slots to the cap?
const loser = new Map<string, number>();
for (const d of capOnly) loser.set(d.skipped, (loser.get(d.skipped) ?? 0) + 1);
console.log("\nplants most often hidden by the category cap:");
for (const [n, c] of [...loser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(c).padStart(4)}x  ${n}`);

writeFileSync(`${HERE}/data/cap-drops.json`, JSON.stringify({
  genusDrops, capDrops, capSubjects: capSubjects.size, pass2Ran,
  worstCapDrops: capOnly.slice(0, 40),
  mostHidden: [...loser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
}, null, 2));
