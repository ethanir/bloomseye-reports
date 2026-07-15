/**
 * analyze.mjs - READ-ONLY comprehensive data-quality analysis of the whole
 * BloomsEye catalog. Reads the extracted flat catalog + raw community rows +
 * live photo coverage and emits findings.json + prints a summary.
 * Writes ONLY into the report folder. Changes nothing in the repo.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(process.env.HOME, "Downloads", "bloomseye-studio");
const read = async (p) => JSON.parse(await fs.readFile(path.join(OUT, p), "utf8"));

const flat = await read("catalog-flat.json");
const raw = await read("community-raw.json");
const coverage = await read("photo-coverage.json");
const src = await fs.readFile(path.join(REPO, "src", "garden", "plantLibrary.ts"), "utf8");
const groups = await read("plant-groups.json");

const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const findings = {};
const ex = (arr, n = 12) => arr.slice(0, n);

// ===========================================================================
// 0. RAW-SOURCE DUPLICATE SLUG CHECK (pre-dedup; catches silently dropped Defs)
// ===========================================================================
{
  const slugRe = /\{\s*slug:\s*"([^"]+)"/g;
  const slugs = [];
  let m;
  while ((m = slugRe.exec(src))) slugs.push(m[1]);
  const seen = new Map();
  for (const s of slugs) seen.set(s, (seen.get(s) || 0) + 1);
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  findings.rawSourceSlugLiterals = slugs.length;
  findings.duplicateSourceSlugs = dups.map(([s, c]) => ({ slug: s, count: c }));
}

// ===========================================================================
// 1. FIELD COMPLETENESS  (by source + category)
// ===========================================================================
const bloomExpected = new Set(["Annual", "Perennial", "Bulb", "Rose", "Climber", "Herb", "Shrub"]);
const missing = { bloom: [], zones: [], description: [], botanical: [], sun: [], water: [], foliageDefault: [] };
for (const p of flat) {
  if (!p.bloom || p.bloom.length === 0) missing.bloom.push(p);
  if (!p.hardinessZones || p.hardinessZones.length === 0) missing.zones.push(p);
  if (!p.description) missing.description.push(p);
  if (!p.botanicalName) missing.botanical.push(p);
  if (!p.sun) missing.sun.push(p);
  if (!p.water) missing.water.push(p);
}
const catBreakdown = (list) => {
  const b = {};
  for (const p of list) b[p.category || "(none)"] = (b[p.category || "(none)"] || 0) + 1;
  return b;
};
findings.missingBloom = {
  total: missing.bloom.length,
  byCategory: catBreakdown(missing.bloom),
  inBloomExpectedCategories: missing.bloom.filter((p) => bloomExpected.has(p.category)).length,
  examplesExpected: ex(missing.bloom.filter((p) => bloomExpected.has(p.category)).map((p) => `${p.slug} (${p.category}) ${p.commonName}`)),
};
findings.missingZones = {
  total: missing.zones.length, byCategory: catBreakdown(missing.zones), bySource: catBreakdown(missing.zones.map((p) => ({ category: p.source }))),
  examples: ex(missing.zones.map((p) => `${p.slug} [${p.source}/${p.category}] ${p.commonName}`)),
};
findings.missingDescription = {
  total: missing.description.length, builtin: missing.description.filter((p) => p.source === "builtin").length,
  community: missing.description.filter((p) => p.source === "community").length,
  communityExamples: ex(missing.description.filter((p) => p.source === "community").map((p) => `${p.slug} ${p.commonName}`)),
};
findings.missingBotanical = { total: missing.botanical.length, examples: ex(missing.botanical.map((p) => `${p.slug} ${p.commonName}`)) };
findings.missingSun = { total: missing.sun.length };
findings.missingWater = { total: missing.water.length };

// ===========================================================================
// 2. BLOOM PLAUSIBILITY (deterministic)
// ===========================================================================
const GREEN_DEFAULT = "#3f7d3f";
function hexToRgb(h) { const s = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); }
function isGreenish([r, g, b]) { return g > r + 20 && g > b + 20 && g > 60; }
function bloomLen(w) { let n = 0, m = w.startMonth; for (let i = 0; i < 12; i++) { n++; if (m === w.endMonth) break; m = (m % 12) + 1; } return n; }

const bloomGreen = [], bloomYearRound = [], bloomWeird = [], bloomDupWindows = [];
for (const p of flat) {
  for (const w of p.bloom) {
    if (w.color.toLowerCase() === GREEN_DEFAULT || isGreenish(hexToRgb(w.color))) bloomGreen.push({ p, w });
    const len = bloomLen(w);
    if (len >= 10) bloomYearRound.push({ p, w, len });
    if (w.startMonth < 1 || w.startMonth > 12 || w.endMonth < 1 || w.endMonth > 12) bloomWeird.push({ p, w });
  }
  // duplicate windows
  const seen = new Set();
  for (const w of p.bloom) { const k = `${w.startMonth}-${w.endMonth}-${w.color}`; if (seen.has(k)) bloomDupWindows.push(p); seen.add(k); }
}
findings.bloomForestGreenColor = { total: bloomGreen.length, note: "bloom colour is green/near-foliage - a flower rendered as green foliage", examples: ex(bloomGreen.map(({ p, w }) => `${p.slug} bloom=${w.color} ${p.commonName}`)) };
findings.bloomNearYearRound = { total: bloomYearRound.length, note: ">=10-month bloom window (placeholder smell)", examples: ex(bloomYearRound.map(({ p, w, len }) => `${p.slug} ${w.startMonth}->${w.endMonth} (${len}mo) ${p.commonName}`)) };
findings.bloomOutOfRange = { total: bloomWeird.length, examples: ex(bloomWeird.map(({ p, w }) => `${p.slug} ${w.startMonth}->${w.endMonth}`)) };
findings.bloomDuplicateWindows = { total: bloomDupWindows.length, examples: ex(bloomDupWindows.map((p) => p.slug)) };

// ===========================================================================
// 3. HARDINESS ZONES
// ===========================================================================
const zoneBad = [], zoneSingle = [], zoneVeryWide = [], zoneNonContig = [];
for (const p of flat) {
  const z = p.hardinessZones;
  if (!z.length) continue;
  if (z.some((v) => v < 1 || v > 13)) zoneBad.push(p);
  if (z.length === 1) zoneSingle.push(p);
  if (z.length >= 11) zoneVeryWide.push(p); // e.g. 1-13 or wider than 11 zones
  for (let i = 1; i < z.length; i++) if (z[i] !== z[i - 1] + 1) { zoneNonContig.push(p); break; }
}
findings.zonesOutOfRange = { total: zoneBad.length, examples: ex(zoneBad.map((p) => `${p.slug} [${p.hardinessZones.join(",")}]`)) };
findings.zonesSingle = { total: zoneSingle.length, note: "single-zone hardiness (usually a range in reality)", byCategory: catBreakdown(zoneSingle), examples: ex(zoneSingle.map((p) => `${p.slug} z${p.hardinessZones[0]} [${p.source}/${p.category}] ${p.commonName}`)) };
findings.zonesVeryWide = { total: zoneVeryWide.length, note: ">=11 zones (1-13-ish, placeholder smell)", examples: ex(zoneVeryWide.map((p) => `${p.slug} [${p.hardinessZones[0]}-${p.hardinessZones.at(-1)}] ${p.commonName}`)) };
findings.zonesNonContiguous = { total: zoneNonContig.length, examples: ex(zoneNonContig.map((p) => `${p.slug} [${p.hardinessZones.join(",")}]`)) };

// ===========================================================================
// 4. SIZE OUTLIERS
// ===========================================================================
function quantiles(vals) {
  const a = [...vals].sort((x, y) => x - y); const q = (p) => { const i = (a.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  return { q1: q(0.25), med: q(0.5), q3: q(0.75), min: a[0], max: a.at(-1) };
}
const byCat = {};
for (const p of flat) (byCat[p.category] = byCat[p.category] || []).push(p);
const sizeOutliers = [];
for (const [cat, list] of Object.entries(byCat)) {
  for (const dim of ["matureHeight", "matureSpread"]) {
    const vals = list.map((p) => p[dim]);
    const { q1, q3 } = quantiles(vals); const iqr = q3 - q1;
    const hiFence = q3 + 3 * iqr, loFence = q1 - 3 * iqr;
    for (const p of list) {
      if (iqr > 0 && (p[dim] > hiFence || p[dim] < loFence)) sizeOutliers.push({ slug: p.slug, source: p.source, cat, dim, val: p[dim], q1: +q1.toFixed(2), q3: +q3.toFixed(2), commonName: p.commonName });
    }
  }
}
// Hard-rule violations
const RULES = [
  (p) => p.category === "Tree" && p.matureHeight < 2.0 && `Tree height ${p.matureHeight}m < 2m (likely mis-categorised)`,
  (p) => p.category === "Bulb" && p.matureHeight > 2.5 && `Bulb height ${p.matureHeight}m > 2.5m`,
  (p) => p.category === "Bulb" && p.matureSpread > 1.5 && `Bulb spread ${p.matureSpread}m > 1.5m`,
  (p) => p.category === "Perennial" && p.matureHeight > 4.0 && `Perennial height ${p.matureHeight}m > 4m`,
  (p) => p.category === "Annual" && p.matureHeight > 4.0 && `Annual height ${p.matureHeight}m > 4m`,
  (p) => p.category === "Herb" && p.matureHeight > 3.0 && `Herb height ${p.matureHeight}m > 3m`,
  (p) => p.category === "Grass" && p.matureHeight > 5.0 && `Grass height ${p.matureHeight}m > 5m`,
  (p) => p.matureHeight > 0 && p.matureSpread > 0 && (p.matureSpread / p.matureHeight) > 20 && `spread/height ratio ${(p.matureSpread / p.matureHeight).toFixed(0)} (mat-like)`,
  (p) => p.matureHeight > 0 && p.matureSpread > 0 && (p.matureHeight / p.matureSpread) > 40 && `height/spread ratio ${(p.matureHeight / p.matureSpread).toFixed(0)} (needle-like)`,
  (p) => p.matureHeight < 0.03 && `height ${p.matureHeight}m < 3cm`,
  (p) => p.matureSpread < 0.03 && `spread ${p.matureSpread}m < 3cm`,
  (p) => p.matureHeight > 60 && `height ${p.matureHeight}m > 60m`,
  (p) => p.matureSpread > 25 && `spread ${p.matureSpread}m > 25m`,
];
const hardSize = [];
for (const p of flat) for (const r of RULES) { const msg = r(p); if (msg) hardSize.push(`${p.slug} [${p.source}/${p.category}] ${msg} - ${p.commonName}`); }
findings.sizeHardRuleViolations = { total: hardSize.length, examples: ex(hardSize, 40) };
findings.sizeStatisticalOutliers = { total: sizeOutliers.length, note: "beyond Q3+3*IQR or Q1-3*IQR within its category", examples: ex(sizeOutliers.map((o) => `${o.slug} [${o.source}/${o.cat}] ${o.dim}=${o.val}m (cat Q1-Q3 ${o.q1}-${o.q3}) ${o.commonName}`), 40) };

// ===========================================================================
// 5. DUPLICATE / CONFLICTING CULTIVARS
// ===========================================================================
const byBot = new Map(), byCommon = new Map();
for (const p of flat) {
  const b = norm(p.botanicalName); if (b) (byBot.get(b) || byBot.set(b, []).get(b)).push(p);
  const c = norm(p.commonName); if (c) (byCommon.get(c) || byCommon.set(c, []).get(c)).push(p);
}
const dupBot = [...byBot.entries()].filter(([, a]) => a.length > 1);
const dupCommon = [...byCommon.entries()].filter(([, a]) => a.length > 1);
const aiDupOfBuiltin = dupBot.filter(([, a]) => a.some((p) => p.source === "community") && a.some((p) => p.source === "builtin"));
findings.duplicateBotanical = {
  total: dupBot.length,
  aiDuplicatesOfBuiltin: aiDupOfBuiltin.length,
  aiDupExamples: ex(aiDupOfBuiltin.map(([b, a]) => `${b}: ${a.map((p) => `${p.source}:${p.slug}`).join(" | ")}`)),
  allExamples: ex(dupBot.map(([b, a]) => `${b}: ${a.map((p) => `${p.source}:${p.slug}`).join(" | ")}`), 40),
};
findings.duplicateCommonName = {
  total: dupCommon.length,
  examples: ex(dupCommon.map(([c, a]) => `"${c}": ${a.map((p) => `${p.source}:${p.slug} [${p.botanicalName}]`).join(" | ")}`), 40),
};

// ===========================================================================
// 6. TAG INCONSISTENCIES
// ===========================================================================
const tagCount = {};
for (const p of flat) for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
const tags = Object.keys(tagCount);
const tnorm = (t) => t.toLowerCase().replace(/[-\s]+/g, " ").trim();
const byTNorm = {};
for (const t of tags) (byTNorm[tnorm(t)] = byTNorm[tnorm(t)] || []).push(t);
const tagCollisions = Object.entries(byTNorm).filter(([, a]) => a.length > 1);
// fragment tags: 2-token with a 1-2 letter trailing fragment
const fragTags = tags.filter((t) => /^[a-z]+ [a-z]{1,2}$/.test(t));
// singular/plural
const pluralPairs = [];
for (const t of tags) if (tags.includes(t + "s") && t.length > 3) pluralPairs.push([t, t + "s"]);
findings.tagPunctuationCollisions = { total: tagCollisions.length, note: "same tag spelled spaced vs hyphenated", examples: tagCollisions.map(([n, a]) => `[${n}] ${a.map((t) => `"${t}"(${tagCount[t]})`).join(" vs ")}`) };
findings.tagFragments = { total: fragTags.length, note: "truncated/garbage tags (community snapshot)", detail: fragTags.map((t) => `"${t}"(${tagCount[t]})`), affectedPlants: ex(flat.filter((p) => p.tags.some((t) => fragTags.includes(t))).map((p) => `${p.slug} -> ${p.tags.filter((t) => fragTags.includes(t)).join(",")}`), 30) };
findings.tagSingularPlural = { total: pluralPairs.length, examples: pluralPairs.map(([a, b]) => `"${a}"(${tagCount[a]}) vs "${b}"(${tagCount[b]})`) };
findings.tagVocabularySize = tags.length;

// ===========================================================================
// 7. INTERNAL CONTRADICTIONS
// ===========================================================================
// 7a. groupDefault integrity (from catalog)
const groupMembers = {};
for (const p of flat) if (p.group) (groupMembers[p.group] = groupMembers[p.group] || []).push(p);
const groupDefaultIssues = [];
for (const [key, members] of Object.entries(groupMembers)) {
  const defs = members.filter((p) => p.groupDefault);
  if (defs.length !== 1) groupDefaultIssues.push(`group "${key}": ${defs.length} defaults among ${members.length} members (${members.map((p) => p.slug).join(", ")})`);
}
// 7b. PLANT_GROUPS table vs catalog
const catalogSlugs = new Set(flat.map((p) => p.slug));
const groupTableIssues = [];
const slugToGroups = {};
for (const g of groups) {
  if (!g.members.includes(g.default)) groupTableIssues.push(`group "${g.key}": default "${g.default}" not in members`);
  for (const s of g.members) {
    if (!catalogSlugs.has(s)) groupTableIssues.push(`group "${g.key}": member slug "${s}" not in catalog`);
    (slugToGroups[s] = slugToGroups[s] || []).push(g.key);
  }
}
const dupGroupKeys = Object.entries(groups.reduce((m, g) => ((m[g.key] = (m[g.key] || 0) + 1), m), {})).filter(([, c]) => c > 1);
const slugInMultiGroups = Object.entries(slugToGroups).filter(([, a]) => a.length > 1);
findings.groupDefaultIssues = { total: groupDefaultIssues.length, examples: ex(groupDefaultIssues, 30) };
findings.groupTableIssues = { total: groupTableIssues.length, duplicateKeys: dupGroupKeys.map(([k, c]) => `${k} x${c}`), slugInMultipleGroups: slugInMultiGroups.map(([s, a]) => `${s}: ${a.join(",")}`), examples: ex(groupTableIssues, 30) };

// 7c. sun enum vs sun-word tags
const SUN_WORDS = { "full sun": "full-sun", "partial sun": "part-sun", "part shade": "part-shade", "shade": "full-shade" };
const sunContradict = [];
for (const p of flat) {
  const present = p.tags.filter((t) => t in SUN_WORDS);
  const enumTag = { "full-sun": "full sun", "part-sun": "partial sun", "part-shade": "part shade", "full-shade": "shade" }[p.sun];
  // contradiction: has a sun word whose bucket is opposite end (full sun vs shade)
  const opp = (a, b) => (a === "full-sun" && b === "full-shade") || (a === "full-shade" && b === "full-sun");
  for (const t of present) if (opp(p.sun, SUN_WORDS[t])) sunContradict.push(`${p.slug} sun=${p.sun} but tag "${t}"`);
}
// 7d. water vs tags
const waterContradict = [];
const WET_WORDS = ["bog", "moist", "wet", "pond", "aquatic", "waterside", "marsh"];
for (const p of flat) {
  if (p.water === "high" && p.tags.includes("drought tolerant")) waterContradict.push(`${p.slug} water=high but "drought tolerant" tag`);
  if (p.water === "low" && p.tags.some((t) => WET_WORDS.includes(t))) waterContradict.push(`${p.slug} water=low but wet-loving tag`);
}
findings.sunTagContradictions = { total: sunContradict.length, examples: ex(sunContradict, 30) };
findings.waterTagContradictions = { total: waterContradict.length, examples: ex(waterContradict, 30) };

// 7e. foliage default green but foliage-color descriptor tags present
const FOLIAGE_DESCR = ["variegated", "silver foliage", "silver", "chartreuse", "purple foliage", "red foliage", "blue foliage", "gold foliage", "burgundy foliage", "golden foliage", "bronze foliage"];
const foliageContra = [];
for (const p of flat) {
  if (p.foliageColor.toLowerCase() === GREEN_DEFAULT) {
    const hit = p.tags.filter((t) => FOLIAGE_DESCR.includes(t));
    if (hit.length) foliageContra.push(`${p.slug} foliage=default-green but tags ${JSON.stringify(hit)} - ${p.commonName}`);
  }
}
findings.foliageColorContradictions = { total: foliageContra.length, note: "3D/preview renders default green while a tag names a coloured leaf", examples: ex(foliageContra, 30) };

// 7f. years vs category
const yearsWeird = [];
for (const p of flat) {
  if ((p.category === "Bulb" || p.category === "Annual") && p.yearsToMaturity > 3) yearsWeird.push(`${p.slug} [${p.category}] years=${p.yearsToMaturity}`);
  if ((p.category === "Tree" || p.category === "Conifer") && p.yearsToMaturity < 2) yearsWeird.push(`${p.slug} [${p.category}] years=${p.yearsToMaturity} (tree matures <2y?)`);
}
findings.yearsToMaturityWeird = { total: yearsWeird.length, examples: ex(yearsWeird, 30) };

// ===========================================================================
// 8. COMMUNITY SILENT DATA-LOSS (raw vs published)
// ===========================================================================
const flatBySlug = new Map(flat.map((p) => [p.slug, p]));
const droppedBloom = [], droppedZones = [], slicedTags = [], rawNoDesc = [];
for (const r of raw) {
  const p = flatBySlug.get(r.slug);
  if (!p) continue;
  const rawHasBloom = r.bloom_start_month != null && r.bloom_end_month != null && r.bloom_color;
  if (rawHasBloom && (!p.bloom || p.bloom.length === 0)) droppedBloom.push(`${r.slug} raw bloom ${r.bloom_start_month}->${r.bloom_end_month} ${r.bloom_color} dropped`);
  const rawHasZones = r.zone_min != null && r.zone_max != null;
  if (rawHasZones && (!p.hardinessZones || p.hardinessZones.length === 0)) droppedZones.push(`${r.slug} raw zones ${r.zone_min}-${r.zone_max} dropped`);
  if (Array.isArray(r.tags) && r.tags.length > 24) slicedTags.push(`${r.slug} raw ${r.tags.length} tags -> sliced to 24`);
  if (!r.description || !String(r.description).trim()) rawNoDesc.push(r.slug);
}
findings.communityDroppedBloom = { total: droppedBloom.length, examples: ex(droppedBloom, 30) };
findings.communityDroppedZones = { total: droppedZones.length, examples: ex(droppedZones, 30) };
findings.communitySlicedTags = { total: slicedTags.length, examples: ex(slicedTags, 30) };
findings.communityNoDescription = { total: rawNoDesc.length, examples: ex(rawNoDesc, 30) };

// ===========================================================================
// 9. PHOTO COVERAGE
// ===========================================================================
const noPhoto = coverage.filter((r) => !r.hasRealPhoto);
findings.photoCoverage = {
  total: coverage.length,
  withRealPhoto: coverage.length - noPhoto.length,
  withoutRealPhoto: noPhoto.length,
  coveragePct: +(100 * (coverage.length - noPhoto.length) / coverage.length).toFixed(1),
  noPhotoByCategory: catBreakdown(noPhoto),
  representativesWithout: coverage.filter((r) => (!r.hasRealPhoto)).length,
};

// ===========================================================================
await fs.writeFile(path.join(OUT, "findings.json"), JSON.stringify(findings, null, 2));

// Print compact summary
const S = (k, v) => console.log(`${k.padEnd(34)} ${v}`);
console.log("=".repeat(70));
console.log("BLOOMSEYE CATALOG DATA-QUALITY  -  deterministic findings");
console.log("=".repeat(70));
S("total plants", flat.length + `  (${flat.filter(p=>p.source==="builtin").length} builtin / ${flat.filter(p=>p.source==="community").length} community)`);
S("raw source slug literals", findings.rawSourceSlugLiterals);
S("duplicate source slugs", findings.duplicateSourceSlugs.length);
console.log("-".repeat(70));
S("missing bloom (total)", `${findings.missingBloom.total}  (${findings.missingBloom.inBloomExpectedCategories} in bloom-expected cats)`);
S("missing zones", `${findings.missingZones.total}`);
S("missing description", `${findings.missingDescription.total}  (community: ${findings.missingDescription.community})`);
S("missing botanical", findings.missingBotanical.total);
S("missing sun / water", `${findings.missingSun.total} / ${findings.missingWater.total}`);
console.log("-".repeat(70));
S("bloom green/foliage colour", findings.bloomForestGreenColor.total);
S("bloom near year-round(>=10mo)", findings.bloomNearYearRound.total);
S("bloom out of range", findings.bloomOutOfRange.total);
S("bloom duplicate windows", findings.bloomDuplicateWindows.total);
console.log("-".repeat(70));
S("zones out of range", findings.zonesOutOfRange.total);
S("zones single", findings.zonesSingle.total);
S("zones very wide (>=11)", findings.zonesVeryWide.total);
S("zones non-contiguous", findings.zonesNonContiguous.total);
console.log("-".repeat(70));
S("size hard-rule violations", findings.sizeHardRuleViolations.total);
S("size statistical outliers", findings.sizeStatisticalOutliers.total);
console.log("-".repeat(70));
S("duplicate botanical names", `${findings.duplicateBotanical.total}  (AI-dup-of-builtin: ${findings.duplicateBotanical.aiDuplicatesOfBuiltin})`);
S("duplicate common names", findings.duplicateCommonName.total);
console.log("-".repeat(70));
S("tag punctuation collisions", findings.tagPunctuationCollisions.total);
S("tag fragments (garbage)", findings.tagFragments.total);
S("tag singular/plural pairs", findings.tagSingularPlural.total);
S("tag vocabulary size", findings.tagVocabularySize);
console.log("-".repeat(70));
S("group default issues", findings.groupDefaultIssues.total);
S("group table issues", findings.groupTableIssues.total);
S("sun/tag contradictions", findings.sunTagContradictions.total);
S("water/tag contradictions", findings.waterTagContradictions.total);
S("foliage colour contradictions", findings.foliageColorContradictions.total);
S("years-to-maturity weird", findings.yearsToMaturityWeird.total);
console.log("-".repeat(70));
S("community dropped bloom", findings.communityDroppedBloom.total);
S("community dropped zones", findings.communityDroppedZones.total);
S("community sliced tags", findings.communitySlicedTags.total);
S("community no description", findings.communityNoDescription.total);
console.log("-".repeat(70));
S("photo coverage", `${findings.photoCoverage.coveragePct}%  (${findings.photoCoverage.withoutRealPhoto} without a real photo)`);
console.log("=".repeat(70));
console.log("findings.json written.");
