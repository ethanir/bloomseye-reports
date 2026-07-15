/**
 * why-orphans.ts - READ-ONLY. For every archetype, measure how often it CLEARS the
 * hard filters (is a candidate), its best rank in any list, and how far it sits from
 * the 8th slot. Separates "hard-filtered out" from "always out-scored".
 * Writes only into this folder.
 */
import { writeFileSync } from "node:fs";
import { libraryCatalog, PLANT_GROUPS } from "../../bloomseye-studio/src/garden/plantLibrary";
import {
  coexistence, scorePair, toCompatPlant, withPopularity, isArchetype, companionsFor,
  type CompatPlant,
} from "../../bloomseye-studio/src/garden/intel/compatibility";
import type { Species } from "../../bloomseye-studio/src/garden/schema";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const pool: CompatPlant[] = withPopularity((Object.values(libraryCatalog) as Species[]).map(toCompatPlant));
const arch = pool.filter(isArchetype);

console.log(`library species: ${pool.length}`);
console.log(`variant groups: ${PLANT_GROUPS.length}`);
console.log(`archetypes (can BE a companion): ${arch.length}`);
console.log(`group members that can never be a companion: ${pool.length - arch.length}`);

interface Row {
  slug: string; name: string; cat: string | null; sun?: string; water?: string; h: number;
  candidateIn: number;    // lists where it cleared the hard filters
  recommended: number;    // lists where it won a slot
  bestRank: number;       // best position in the scored order (1 = top)
  medianRank: number;
  bestScore: number;
  blockers: string;       // top blockers when it fails
}

const rows: Row[] = [];
for (const cand of arch) {
  let candidateIn = 0, recommended = 0, bestRank = Infinity, bestScore = 0;
  const ranks: number[] = [];
  const blockers = new Map<string, number>();

  for (const subject of pool) {
    const co = coexistence(subject, cand);
    if (!co.ok) {
      for (const b of co.blockers) if (b !== "self") blockers.set(b, (blockers.get(b) ?? 0) + 1);
      continue;
    }
    candidateIn++;
    // Where would it rank among all candidates for this subject?
    const scored = pool
      .filter((o) => isArchetype(o) && coexistence(subject, o).ok)
      .map((o) => ({ slug: o.slug, s: scorePair(subject, o).score }))
      .sort((a, b) => b.s - a.s || a.slug.localeCompare(b.slug));
    const rank = scored.findIndex((s) => s.slug === cand.slug) + 1;
    if (rank > 0) {
      ranks.push(rank);
      if (rank < bestRank) bestRank = rank;
      bestScore = Math.max(bestScore, scored[rank - 1].s);
    }
  }
  for (const subject of pool) {
    if (companionsFor(subject, pool).companions.some((c) => c.slug === cand.slug)) recommended++;
  }
  ranks.sort((a, b) => a - b);
  rows.push({
    slug: cand.slug, name: cand.commonName, cat: cand.category, sun: cand.sun, water: cand.water, h: cand.height,
    candidateIn, recommended,
    bestRank: Number.isFinite(bestRank) ? bestRank : -1,
    medianRank: ranks.length ? ranks[Math.floor(ranks.length / 2)] : -1,
    bestScore,
    blockers: [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(" "),
  });
}

rows.sort((a, b) => a.recommended - b.recommended || a.bestRank - b.bestRank);
writeFileSync(`${HERE}/data/archetype-standing.json`, JSON.stringify(rows, null, 2));

const orphans = rows.filter((r) => r.recommended === 0);
console.log(`\nORPHANS: ${orphans.length} of ${arch.length} archetypes never win a slot.\n`);
console.log("name                       cat        candidate-in  bestRank  medianRank  bestScore  top blockers");
for (const r of orphans) {
  console.log(
    r.name.padEnd(26) + String(r.cat).padEnd(11) +
    String(r.candidateIn).padStart(9) + String(r.bestRank).padStart(10) +
    String(r.medianRank).padStart(12) + String(r.bestScore).padStart(11) + "  " + r.blockers,
  );
}

// Category standing: who fills the lists?
const byCat = new Map<string, { n: number; recommended: number; orphans: number }>();
for (const r of rows) {
  const c = String(r.cat);
  const e = byCat.get(c) ?? { n: 0, recommended: 0, orphans: 0 };
  e.n++; e.recommended += r.recommended; if (r.recommended === 0) e.orphans++;
  byCat.set(c, e);
}
console.log("\n=== archetypes by category: how many slots each category wins across all 1,611 lists ===");
for (const [c, e] of [...byCat.entries()].sort((a, b) => b[1].recommended - a[1].recommended)) {
  console.log(`${c.padEnd(11)} archetypes ${String(e.n).padStart(3)}   slots won ${String(e.recommended).padStart(6)}   orphans ${e.orphans}`);
}
