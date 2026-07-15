import { readFileSync, writeFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { colorName } from "../../bloomseye-studio/src/browse/plantFacets";
import { toCompatPlant, withPopularity, isArchetype } from "../../bloomseye-studio/src/garden/intel/compatibility";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));

const COLOR_WORDS = ["white", "yellow", "orange", "red", "pink", "purple", "blue"];
// A plant's own asserted colour, from its tags.
function tagColour(sp: any): string | null {
  for (const t of sp.tags ?? []) if (COLOR_WORDS.includes(String(t).toLowerCase())) return String(t).toLowerCase();
  return null;
}

const arch = new Set(withPopularity((Object.values(libraryCatalog) as any[]).map(toCompatPlant)).filter(isArchetype).map((p) => p.slug));

// Disagreements: the classifier's name for the bloom hex vs the plant's own colour tag.
const bad: any[] = [];
for (const sp of Object.values(libraryCatalog) as any[]) {
  const hex = sp.bloom?.[0]?.color;
  if (!hex) continue;
  const cn = colorName(hex);
  const tag = tagColour(sp);
  if (tag && cn && cn !== tag) {
    // ignore pink/red and blue/purple adjacencies (defensible)
    const adj = (a: string, b: string) => (a === "pink" && b === "red") || (a === "red" && b === "pink") || (a === "blue" && b === "purple") || (a === "purple" && b === "blue");
    bad.push({ slug: sp.assetKey, name: sp.commonName, hex, classified: cn, tag, archetype: arch.has(sp.assetKey), adjacent: adj(cn, tag) });
  }
}
const hard = bad.filter((b) => !b.adjacent);
console.log(`library plants whose bloom hex classifies to a DIFFERENT colour than their own tag: ${bad.length} (${hard.length} non-adjacent, i.e. a real clash)`);
console.log(`  of the non-adjacent clashes, ${hard.filter((b) => b.archetype).length} are archetypes (can be a companion and so print a colour clause about others)`);
console.log("\nnon-adjacent clashes (plant tag -> classifier says):");
for (const b of hard.sort((a, c) => Number(c.archetype) - Number(a.archetype))) {
  console.log(`  ${b.name.padEnd(24)} ${b.hex}  tag "${b.tag}" -> classified "${b.classified}"${b.archetype ? "  [archetype]" : ""}`);
}

// How many SHOWN reasons carry a colour clause built on one of these misclassified plants?
const misSlug = new Set(hard.map((b) => b.slug));
let reasonsColourClause = 0, reasonsMisColour = 0;
for (const set of Object.values(doc.plants) as any[]) {
  for (const c of set.companions) {
    const hasColour = (c.reasonParts ?? []).some((p: any) => p.key === "colour");
    if (hasColour) reasonsColourClause++;
    // the colour clause is about the SUBJECT's colour and the COMPANION's colour; flag if either end is misclassified
    if (hasColour && (misSlug.has(set.slug) || misSlug.has(c.slug))) reasonsMisColour++;
  }
}
console.log(`\ncolour clauses shown to users total: ${reasonsColourClause}`);
console.log(`... of which at least one plant is a non-adjacent colour misclassification: ${reasonsMisColour}`);
writeFileSync(`${HERE}/data/colour-clash.json`, JSON.stringify({ clashes: bad.length, nonAdjacent: hard.length, archetypeClashes: hard.filter((b) => b.archetype).length, reasonsColourClause, reasonsMisColour, hard }, null, 2));
