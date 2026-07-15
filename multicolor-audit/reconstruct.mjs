// Rebuild the complete merged result from the workflow journal (all 58 agents),
// replicating the workflow's synthesis. Journal is source of truth.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const OUT = path.join(os.homedir(), "bloomseye-reports", "multicolor-audit");
const JOURNAL = "/Users/eirim/.claude/projects/-Users-eirim-Downloads-bloomseye-studio/9b490ebc-006b-43b4-9b21-4d033e49b5a9/subagents/workflows/wf_d885ce13-e76/journal.jsonl";

const ungroupedPayload = JSON.parse(fs.readFileSync(path.join(OUT, "payload-ungrouped.json"), "utf8"));
const bySlug = Object.fromEntries(ungroupedPayload.map((u) => [u.slug, u]));

const lines = fs.readFileSync(JOURNAL, "utf8").trim().split("\n");
// keep latest result per key (resume may append a re-run of the failed agent)
const resultByKey = {};
for (const ln of lines) {
  let o; try { o = JSON.parse(ln); } catch { continue; }
  if (o.type === "result" && o.result) resultByKey[o.key] = o.result;
}
const results = Object.values(resultByKey);

// classify each result
const ungroupedAssess = [];
const groupAssess = [];
const verifyAssess = [];
for (const r of results) {
  if (Array.isArray(r.plants)) ungroupedAssess.push(...r.plants);
  else if (Array.isArray(r.groups)) groupAssess.push(...r.groups);
  else if (typeof r.genuinelyMultiColor === "boolean" && r.slug) verifyAssess.push(r);
}
// dedup ungrouped/groups by slug/key (latest wins)
const uBySlug = {}; for (const p of ungroupedAssess) uBySlug[p.slug] = p;
const gByKey = {}; for (const g of groupAssess) gByKey[g.key] = g;
const vBySlug = {}; for (const v of verifyAssess) vBySlug[v.slug] = v;

// merge (same logic as workflow synth)
const merged = Object.values(uBySlug).map((p) => {
  const v = vBySlug[p.slug];
  const src = bySlug[p.slug] || {};
  let finalVerdict = p.verdict;
  if (v) {
    if (!v.genuinelyMultiColor) finalVerdict = "single-color";
    else if (v.gardenCenterCommon) finalVerdict = "clearly-multi";
    else finalVerdict = "probably-multi";
  }
  return {
    slug: p.slug, name: src.name, botanical: src.botanical, genus: src.genus, cat: src.cat,
    storedColor: src.storedColor, storedHex: src.storedHex,
    firstPassVerdict: p.verdict, finalVerdict,
    candidateColors: v && v.genuinelyMultiColor ? v.correctedColors : p.candidateColors,
    storedColorFair: p.storedColorFair,
    colorAffectsSizeOrCare: p.colorAffectsSizeOrCare,
    colorSizeCareNote: p.colorSizeCareNote || "",
    shopperRelevance: p.shopperRelevance,
    gardenCenterCommon: v ? v.gardenCenterCommon : null,
    confidence: v ? Math.min(p.confidence, v.confidence) : p.confidence,
    reasoning: p.reasoning,
    verifyCaveat: v ? v.caveat : "",
  };
});

const groups = Object.values(gByKey);
const out = {
  ungrouped: merged,
  groups,
  counts: {
    ungroupedTotal: ungroupedPayload.length,
    assessed: merged.length,
    clearlyMulti: merged.filter((m) => m.finalVerdict === "clearly-multi").length,
    probablyMulti: merged.filter((m) => m.finalVerdict === "probably-multi").length,
    singleColor: merged.filter((m) => m.finalVerdict === "single-color").length,
    foliage: merged.filter((m) => m.finalVerdict === "foliage-plant-na").length,
    colorAffectsSize: merged.filter((m) => m.colorAffectsSizeOrCare).length,
    verifyCount: Object.keys(vBySlug).length,
    groupsAssessed: groups.length,
    groupNotableGap: groups.filter((g) => g.colorGapSeverity === "notable").length,
    groupMinorGap: groups.filter((g) => g.colorGapSeverity === "minor").length,
    groupFormTypes: groups.filter((g) => g.groupType === "species-or-form-types").length,
    groupMixed: groups.filter((g) => g.groupType === "mixed").length,
  },
};
fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.counts, null, 2));
console.log("merged ungrouped:", merged.length, "| groups:", groups.length, "| verified:", Object.keys(vBySlug).length);
