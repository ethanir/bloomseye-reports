// Consumes the workflow's structured result (result.json) + the raw payloads,
// emits candidates.csv. report.md is written by hand from the same data.
// Read-only w.r.t. the repo; writes only under the audit folder.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const OUT = path.join(os.homedir(), "bloomseye-reports", "multicolor-audit");

const res = JSON.parse(fs.readFileSync(path.join(OUT, "result.json"), "utf8"));
const groupsRaw = JSON.parse(fs.readFileSync(path.join(OUT, "payload-groupcolors.json"), "utf8"));
const groupByKey = Object.fromEntries(groupsRaw.map((g) => [g.key, g]));

const esc = (v) => {
  // House style: no U+2014 anywhere. Agents' prose sometimes uses it; normalize to " - ".
  const s = String(v ?? "").replace(/—/g, " - ").replace(/–/g, "-");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// ---- candidates.csv : one row per affected UNGROUPED plant ----
// "affected" = not single-color-and-fine and not pure foliage-NA with no flower interest.
const rows = res.ungrouped;
const header = ["slug", "name", "botanical", "genus", "category", "storedColor", "candidateTrueColors", "finalVerdict", "confidence", "shopperRelevance", "colorAffectsSizeOrCare", "notes"];
const lines = [header.join(",")];

const rank = { "clearly-multi": 0, "probably-multi": 1, "foliage-plant-na": 2, "single-color": 3 };
const relRank = { high: 0, medium: 1, low: 2 };
const sorted = [...rows].sort((a, b) =>
  (rank[a.finalVerdict] - rank[b.finalVerdict]) ||
  (relRank[a.shopperRelevance] - relRank[b.shopperRelevance]) ||
  (b.confidence - a.confidence) ||
  a.name.localeCompare(b.name)
);

for (const r of sorted) {
  const notes = [r.reasoning, r.colorSizeCareNote, r.verifyCaveat].filter(Boolean).join(" | ");
  lines.push([
    r.slug, r.name, r.botanical, r.genus, r.cat, r.storedColor,
    (r.candidateColors || []).join("; "),
    r.finalVerdict, (r.confidence ?? "").toString().slice(0, 4), r.shopperRelevance,
    r.colorAffectsSizeOrCare ? "YES" : "",
    notes,
  ].map(esc).join(","));
}
fs.writeFileSync(path.join(OUT, "candidates.csv"), lines.join("\n"));

// ---- groups gaps csv (secondary) ----
const gh = ["key", "groupName", "memberCount", "groupType", "colorGapSeverity", "missingColors", "note"];
const glines = [gh.join(",")];
const grank = { notable: 0, minor: 1, none: 2 };
const gsorted = [...res.groups].sort((a, b) => (grank[a.colorGapSeverity] - grank[b.colorGapSeverity]) || a.key.localeCompare(b.key));
for (const g of gsorted) {
  const raw = groupByKey[g.key] || {};
  glines.push([g.key, raw.name || "", raw.n || "", g.groupType, g.colorGapSeverity, (g.missingColors || []).join("; "), g.note].map(esc).join(","));
}
fs.writeFileSync(path.join(OUT, "group-gaps.csv"), glines.join("\n"));

// ---- print bucket summaries for the report ----
const bucket = (v) => sorted.filter((r) => r.finalVerdict === v);
console.log("COUNTS:", JSON.stringify(res.counts, null, 2));
console.log("\nCLEARLY-MULTI (" + bucket("clearly-multi").length + "):");
for (const r of bucket("clearly-multi")) console.log(`  ${r.name} [${r.slug}] stored=${r.storedColor} rel=${r.shopperRelevance} conf=${r.confidence} -> ${(r.candidateColors||[]).join(", ")}`);
console.log("\nPROBABLY-MULTI (" + bucket("probably-multi").length + "):");
for (const r of bucket("probably-multi")) console.log(`  ${r.name} [${r.slug}] stored=${r.storedColor} rel=${r.shopperRelevance} conf=${r.confidence} -> ${(r.candidateColors||[]).join(", ")}`);
console.log("\nFOLIAGE-NA (" + bucket("foliage-plant-na").length + "):");
for (const r of bucket("foliage-plant-na")) console.log(`  ${r.name} [${r.slug}]`);
console.log("\nSINGLE-COLOR (" + bucket("single-color").length + "):");
for (const r of bucket("single-color")) console.log(`  ${r.name} [${r.slug}] stored=${r.storedColor}`);
console.log("\nCOLOR-AFFECTS-SIZE/CARE:");
for (const r of sorted.filter((r) => r.colorAffectsSizeOrCare)) console.log(`  ${r.name} [${r.slug}]: ${r.colorSizeCareNote}`);
console.log("\nGROUPS notable gap:");
for (const g of gsorted.filter((g) => g.colorGapSeverity === "notable")) console.log(`  ${g.key} (${(groupByKey[g.key]||{}).name}) type=${g.groupType} missing=${(g.missingColors||[]).join(", ")} :: ${g.note}`);
console.log("\nGROUPS species/form-type (not color variants):");
for (const g of res.groups.filter((g) => g.groupType === "species-or-form-types")) console.log(`  ${g.key}: missing=${(g.missingColors||[]).join(", ")} gap=${g.colorGapSeverity}`);
