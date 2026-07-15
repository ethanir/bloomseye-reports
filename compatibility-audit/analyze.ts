/**
 * analyze.ts - READ-ONLY structural audit of the generated companion sets.
 * Lives OUTSIDE the repo; imports the repo's engine and library read-only.
 * Writes only into this folder.
 *
 * Run from the repo root:
 *   npx tsx ../bloomseye-reports/compatibility-audit/analyze.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { coexistence, toCompatPlant, withPopularity, isArchetype, type CompatPlant } from "../../bloomseye-studio/src/garden/intel/compatibility";
import { genusOf } from "../../bloomseye-studio/src/garden/intel/taxonomy";
import type { Species } from "../../bloomseye-studio/src/garden/schema";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));
const sets: Record<string, any> = doc.plants;

// ---------------------------------------------------------------- library facts
const spBySlug = new Map<string, Species>();
for (const sp of Object.values(libraryCatalog) as Species[]) if (sp.assetKey) spBySlug.set(sp.assetKey, sp);

const pool: CompatPlant[] = withPopularity((Object.values(libraryCatalog) as Species[]).map(toCompatPlant));
const cpBySlug = new Map(pool.map((p) => [p.slug, p]));
const archetypes = new Set(pool.filter(isArchetype).map((p) => p.slug));

const zonesOf = (sp: Species) => {
  const z = sp.hardinessZones ?? [];
  return z.length ? { min: Math.min(...z), max: Math.max(...z) } : null;
};
const facts = (slug: string) => {
  const sp = spBySlug.get(slug)!;
  const z = zonesOf(sp);
  return {
    slug,
    name: sp.commonName,
    bot: sp.botanicalName ?? "",
    genus: genusOf(sp.botanicalName) ?? "",
    cat: sp.category,
    sun: sp.sun,
    water: sp.water,
    zones: z ? `${z.min}-${z.max}` : "none",
    zmin: z?.min ?? null,
    zmax: z?.max ?? null,
    h: sp.matureHeight,
    spread: sp.matureSpread,
    bloom: (sp.bloom ?? []).map((b: any) => `${b.startMonth}-${b.endMonth}`).join(","),
    tags: (sp.tags ?? []).join("|"),
    archetype: archetypes.has(slug),
  };
};

// --------------------------------------------------- curated risk lists (genus)
// Un-modelled dimensions the engine documents as out of scope. These only NARROW
// the field for botanical review; they assert nothing on their own.
const ACID = new Set(["rhododendron", "pieris", "kalmia", "vaccinium", "leucothoe", "enkianthus", "calluna", "erica", "gaultheria", "camellia", "gardenia", "clethra", "fothergilla", "itea", "hamamelis", "magnolia", "cornus", "styrax", "halesia", "oxydendrum", "franklinia", "illicium", "skimmia", "andromeda"]);
const ALKALINE_OK = new Set(["lavandula", "dianthus", "cistus", "santolina", "syringa", "clematis", "ceanothus", "echinops", "eryngium", "gypsophila", "aubrieta", "iberis", "aurinia", "helianthemum", "buxus", "thymus", "teucrium", "salvia", "rosmarinus", "perovskia", "achillea", "verbascum", "linaria", "campanula", "scabiosa", "nepeta", "origanum", "lonicera", "philadelphus", "kolkwitzia", "weigela", "deutzia", "forsythia"]);
const XERIC = new Set(["lavandula", "rosmarinus", "santolina", "cistus", "artemisia", "agave", "yucca", "sedum", "hylotelephium", "sempervivum", "echinops", "eryngium", "perovskia", "thymus", "teucrium", "helianthemum", "opuntia", "aloe", "delosperma", "gaillardia", "gaura", "oenothera", "verbascum", "stachys", "ballota", "phlomis", "euphorbia", "portulaca", "lampranthus", "dasylirion", "hesperaloe", "nolina", "cylindropuntia", "echeveria", "crassula", "kalanchoe", "senecio", "graptopetalum"]);
const WET = new Set(["ligularia", "rodgersia", "filipendula", "caltha", "chelone", "lobelia", "astilbe", "darmera", "gunnera", "iris", "taxodium", "salix", "cephalanthus", "clethra", "itea", "eupatorium", "eutrochium", "carex", "juncus", "acorus", "osmunda", "matteuccia", "hibiscus", "lysimachia", "myosotis", "primula", "trollius", "aruncus", "hosta"]);
// Species-level invasive concerns in much of the US (Northeast/Mid-Atlantic/Southeast).
const INVASIVE_BOT = [
  { m: /^Miscanthus sinensis/, why: "Miscanthus sinensis: self-seeds, listed invasive across much of the eastern US" },
  { m: /^Vinca minor/, why: "Vinca minor: invasive groundcover, escapes into woodlands" },
  { m: /^Wisteria floribunda|^Wisteria sinensis/, why: "Asian wisteria: severely invasive in the US Southeast/Mid-Atlantic" },
  { m: /^Nandina domestica/, why: "Nandina: invasive in the Southeast; berries toxic to cedar waxwings" },
  { m: /^Berberis thunbergii/, why: "Japanese barberry: invasive, banned in several states" },
  { m: /^Euonymus alatus/, why: "Burning bush: invasive, banned in several states" },
  { m: /^Buddleja davidii/, why: "Butterfly bush: invasive; noxious weed in Oregon/Washington" },
  { m: /^Lonicera japonica|^Lonicera maackii|^Lonicera tatarica/, why: "Asian bush/vine honeysuckle: invasive" },
  { m: /^Pyrus calleryana/, why: "Callery pear: invasive, banned in several states" },
  { m: /^Iris pseudacorus/, why: "Yellow flag iris: invasive wetland weed" },
  { m: /^Ligustrum/, why: "Privet: invasive in the Southeast" },
  { m: /^Hedera helix/, why: "English ivy: invasive" },
  { m: /^Ailanthus|^Celastrus orbiculatus|^Lythrum salicaria|^Aegopodium|^Houttuynia|^Elaeagnus|^Rosa multiflora|^Phalaris arundinacea/, why: "listed invasive in much of the US" },
];
const invasiveNote = (bot: string) => INVASIVE_BOT.find((i) => i.m.test(bot))?.why ?? null;

const SUN_LADDER = ["full-sun", "part-sun", "part-shade", "full-shade"];
const WATER_LADDER = ["low", "moderate", "high"];
const sunGap = (a: string, b: string) => Math.abs(SUN_LADDER.indexOf(a) - SUN_LADDER.indexOf(b));
const waterGap = (a: string, b: string) => Math.abs(WATER_LADDER.indexOf(a) - WATER_LADDER.indexOf(b));

// ---------------------------------------------------------------- walk the sets
interface Edge {
  subject: string; companion: string; score: number; reason: string;
  clauses: string[]; penalties: string[];
}
const edges: Edge[] = [];
const listSize = new Map<string, number>();
const candCount = new Map<string, number>();
const recCount = new Map<string, number>();       // how often a plant is recommended
const recCountArch = new Map<string, number>();   // ... in archetype-subject lists only

for (const [slug, set] of Object.entries(sets)) {
  listSize.set(slug, set.companions.length);
  candCount.set(slug, set.candidateCount);
  for (const c of set.companions) {
    edges.push({
      subject: slug, companion: c.slug, score: c.score, reason: c.reason,
      clauses: c.reasonParts.map((p: any) => p.key), penalties: c.penalties ?? [],
    });
    recCount.set(c.slug, (recCount.get(c.slug) ?? 0) + 1);
    if (archetypes.has(slug)) recCountArch.set(c.slug, (recCountArch.get(c.slug) ?? 0) + 1);
  }
}

const archSubjects = Object.keys(sets).filter((s) => archetypes.has(s));
const edgeKey = (a: string, b: string) => `${a}>${b}`;
const edgeSet = new Set(edges.map((e) => edgeKey(e.subject, e.companion)));

// ------------------------------------------------------------------ RECIPROCITY
// Only meaningful when BOTH ends are archetypes (a non-archetype can never BE a
// companion, so its edges are one-way by construction).
const archEdges = edges.filter((e) => archetypes.has(e.subject) && archetypes.has(e.companion));
const mutual = archEdges.filter((e) => edgeSet.has(edgeKey(e.companion, e.subject)));
const oneWay = archEdges.filter((e) => !edgeSet.has(edgeKey(e.companion, e.subject)));
const nonArchEdges = edges.filter((e) => !archetypes.has(e.subject));

// Top-slot reciprocity: is a plant's #1 companion mutual?
let topMutual = 0, topTotal = 0;
for (const s of archSubjects) {
  const top = sets[s].companions[0];
  if (!top || !archetypes.has(top.slug)) continue;
  topTotal++;
  if (edgeSet.has(edgeKey(top.slug, s))) topMutual++;
}

// ------------------------------------------------------------------ THIN LISTS
const thin = Object.keys(sets)
  .filter((s) => sets[s].companions.length < 6)
  .map((s) => {
    const subj = cpBySlug.get(s)!;
    // Why is the pool thin? Histogram the first blocker across the archetype pool.
    const blockers = new Map<string, number>();
    for (const other of pool) {
      if (!isArchetype(other)) continue;
      const co = coexistence(subj, other);
      if (co.ok) continue;
      for (const b of co.blockers) blockers.set(b, (blockers.get(b) ?? 0) + 1);
    }
    return {
      ...facts(s),
      companions: sets[s].companions.length,
      candidates: sets[s].candidateCount,
      blockers: [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(" "),
    };
  })
  .sort((a, b) => a.companions - b.companions || a.candidates - b.candidates);

// Archetypes NEVER recommended to anyone (orphan companions).
const orphans = [...archetypes].filter((s) => !recCount.has(s)).map(facts);

// -------------------------------------------------------------- STRUCTURAL FLAGS
type Flag = { rule: string; severity: string; subject: string; companion: string; detail: string; score: number; reason: string };
const flags: Flag[] = [];
const add = (rule: string, severity: string, e: Edge, detail: string) =>
  flags.push({ rule, severity, subject: e.subject, companion: e.companion, detail, score: e.score, reason: e.reason });

const dupReason = new Map<string, number>();

for (const e of edges) {
  const A = facts(e.subject), B = facts(e.companion);
  dupReason.set(e.reason, (dupReason.get(e.reason) ?? 0) + 1);

  // 1. water one rung apart, with a xeric plant on the dry end (rot risk in one bed)
  if (A.water && B.water && waterGap(A.water, B.water) === 1) {
    const dry = A.water === "low" ? A : B.water === "low" ? B : null;
    if (dry && (XERIC.has(A.genus) || XERIC.has(B.genus))) {
      const x = XERIC.has(dry.genus) ? dry : null;
      if (x) add("xeric-vs-wetter", "medium", e, `${x.name} (low water, ${x.genus}) paired with a moderate-water plant; a Mediterranean/succulent subject rots on the wetter plant's schedule`);
    }
  }
  // 2. soil pH: acid-obligate beside a lime-tolerant/alkaline-preferring plant (un-modelled)
  if ((ACID.has(A.genus) && ALKALINE_OK.has(B.genus)) || (ACID.has(B.genus) && ALKALINE_OK.has(A.genus))) {
    const acid = ACID.has(A.genus) ? A : B;
    const alk = ACID.has(A.genus) ? B : A;
    add("soil-ph-conflict", "medium", e, `${acid.name} (${acid.genus}, acid soil) with ${alk.name} (${alk.genus}, prefers/tolerates neutral-alkaline); pH is not modelled`);
  }
  // 3. wet-obligate vs xeric (both may sit one water rung apart and pass)
  if ((WET.has(A.genus) && XERIC.has(B.genus)) || (WET.has(B.genus) && XERIC.has(A.genus))) {
    add("bog-vs-xeric", "high", e, `${A.name} (${A.water}) with ${B.name} (${B.water}): a moisture-obligate genus beside a drought-obligate genus`);
  }
  // 4. narrow zone overlap
  if (A.zmin != null && B.zmin != null && A.cat !== "Annual" && B.cat !== "Annual") {
    const lo = Math.max(A.zmin, B.zmin), hi = Math.min(A.zmax!, B.zmax!);
    const w = hi - lo + 1;
    if (w >= 1 && w <= 2) add("narrow-zone", "low", e, `shares only zone(s) ${lo}${w > 1 ? `-${hi}` : ""} (${A.zones} vs ${B.zones})`);
  }
  // 5. zone check SKIPPED (an annual) yet the ranges do not actually overlap
  if ((A.cat === "Annual" || B.cat === "Annual") && A.zmin != null && B.zmin != null) {
    const lo = Math.max(A.zmin, B.zmin), hi = Math.min(A.zmax!, B.zmax!);
    if (hi < lo) add("annual-zone-skip", "info", e, `zone test skipped (annual): ${A.zones} vs ${B.zones} do not overlap`);
  }
  // 6. big scale gap
  const r = Math.max(A.h, B.h) / Math.min(A.h, B.h);
  if (r > 10) add("scale-near-cap", "low", e, `height ratio ${r.toFixed(1)}:1 (${A.h} m vs ${B.h} m), cap is 15:1`);
  // 7. invasive companion recommended
  const inv = invasiveNote(B.bot);
  if (inv) {
    const cautioned = e.clauses.includes("caution");
    add("invasive-companion", cautioned ? "low" : "high", e, `recommends ${B.name} (${B.bot}): ${inv}${cautioned ? " [a caution clause is present]" : " [NO caution in the reason]"}`);
  }
  // 8. reason quality
  const factorClauses = e.clauses.filter((k) => !["conditions", "zones", "caution"].includes(k));
  if (factorClauses.length === 0) add("reason-generic", "medium", e, `the reason states shared conditions and nothing else: "${e.reason}"`);
  else if (factorClauses.length === 1 && factorClauses[0] === "colour") add("reason-colour-only", "medium", e, `the only benefit named is colour: "${e.reason}"`);
  // 9. "carpet the ground beneath" under a plant that is not overhead structure
  if (/carpet the ground beneath/.test(e.reason)) {
    const tall = Math.max(A.h, B.h);
    if (tall < 2) add("canopy-wording", "low", e, `"carpet the ground beneath" but the taller plant is only ${tall} m`);
  }
  // 10. native claim -> queue for botanical checking (genus-level flags are coarse)
  if (/both are native plants/.test(e.reason)) {
    add("native-claim", "check", e, `claims "both are native plants": ${A.bot} + ${B.bot}`);
  }
  // 11. pollinator claim on a grass (wind-pollinated) or a foliage plant
  if (/pollinator|forage/.test(e.reason) && (A.cat === "Grass" || B.cat === "Grass" || A.cat === "Fern" || B.cat === "Fern")) {
    add("forage-claim-odd", "medium", e, `claims pollinator forage but one of the pair is a ${A.cat === "Grass" || A.cat === "Fern" ? A.cat : B.cat} (${A.cat === "Grass" || A.cat === "Fern" ? A.name : B.name})`);
  }
}

// -------------------------------------------------------------------- summaries
const clauseHist = new Map<string, number>();
for (const e of edges) for (const c of e.clauses) clauseHist.set(c, (clauseHist.get(c) ?? 0) + 1);
const factorClauseCount = new Map<number, number>();
for (const e of edges) {
  const n = e.clauses.filter((k) => !["conditions", "zones", "caution"].includes(k)).length;
  factorClauseCount.set(n, (factorClauseCount.get(n) ?? 0) + 1);
}
const byRule = new Map<string, number>();
for (const f of flags) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

const topRec = [...recCountArch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  .map(([s, n]) => ({ ...facts(s), lists: n, pct: +(100 * n / archSubjects.length).toFixed(1) }));

const dupTop = [...dupReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([r, n]) => ({ n, reason: r }));

const listSizeHist = new Map<number, number>();
for (const n of listSize.values()) listSizeHist.set(n, (listSizeHist.get(n) ?? 0) + 1);

const stats = {
  subjects: Object.keys(sets).length,
  archetypeSubjects: archSubjects.length,
  cultivarSubjects: Object.keys(sets).length - archSubjects.length,
  archetypesInPool: archetypes.size,
  totalPairings: edges.length,
  listSizeHistogram: Object.fromEntries([...listSizeHist.entries()].sort((a, b) => a[0] - b[0])),
  thinLists: thin.length,
  zeroCompanionLists: thin.filter((t) => t.companions === 0).length,
  orphanArchetypes: orphans.length,
  reciprocity: {
    archetypeToArchetypeEdges: archEdges.length,
    mutual: mutual.length,
    oneWay: oneWay.length,
    mutualPct: +(100 * mutual.length / archEdges.length).toFixed(1),
    topSlotMutualPct: +(100 * topMutual / topTotal).toFixed(1),
    structurallyOneWayEdges: nonArchEdges.length,
  },
  clauseHistogram: Object.fromEntries([...clauseHist.entries()].sort((a, b) => b[1] - a[1])),
  factorClausesPerReason: Object.fromEntries([...factorClauseCount.entries()].sort((a, b) => a[0] - b[0])),
  distinctReasons: dupReason.size,
  flagsByRule: Object.fromEntries([...byRule.entries()].sort((a, b) => b[1] - a[1])),
  mostRecommended: topRec,
  mostDuplicatedReasons: dupTop,
};

mkdirSync(`${HERE}/data`, { recursive: true });
writeFileSync(`${HERE}/data/stats.json`, JSON.stringify(stats, null, 2));
writeFileSync(`${HERE}/data/flags.json`, JSON.stringify(flags, null, 2));
writeFileSync(`${HERE}/data/thin-lists.json`, JSON.stringify(thin, null, 2));
writeFileSync(`${HERE}/data/orphans.json`, JSON.stringify(orphans, null, 2));

// Review packets: one compact record per ARCHETYPE subject, with full facts for
// both ends of every pairing, for botanical review by a human or an agent.
const packets = archSubjects.map((s) => ({
  subject: facts(s),
  candidates: sets[s].candidateCount,
  companions: sets[s].companions.map((c: any) => ({
    ...facts(c.slug),
    score: c.score,
    reason: c.reason,
    penalties: c.penalties,
  })),
}));
writeFileSync(`${HERE}/data/review-packets.json`, JSON.stringify(packets, null, 2));

console.log(JSON.stringify(stats, null, 2));
console.log(`\nflags: ${flags.length}  packets: ${packets.length}`);
