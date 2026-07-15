// Read-only extraction of the BloomsEye plant library.
// Parses DEFS_A/B/C + PLANT_GROUPS from plantLibrary.ts into JSON + CSV.
// Writes ONLY to ~/bloomseye-reports/multicolor-audit/. Touches nothing in the repo.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "/Users/eirim/Downloads/bloomseye-studio";
const OUT = path.join(os.homedir(), "bloomseye-reports", "multicolor-audit");
const src = fs.readFileSync(path.join(REPO, "src/garden/plantLibrary.ts"), "utf8");

// --- slice out an array literal body by its "const NAME ... = [" ... "];" ---
function sliceArray(marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error("marker not found: " + marker);
  const eq = src.indexOf("= [", start); // anchor on the assignment, not the Def[] type
  if (eq < 0) throw new Error("assignment not found: " + marker);
  const bracket = eq + 2;
  // find the matching closing "];" for THIS top-level array by depth counting
  let depth = 0, i = bracket;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(bracket, i); // includes outer [ ... ]
}

function evalArray(body) {
  // Def / group literals are pure JS data (unquoted keys, // comments ok).
  // eslint-disable-next-line no-new-func
  return Function('"use strict"; return (' + body + ");")();
}

const defsA = evalArray(sliceArray("const DEFS_A: Def[] = "));
const defsB = evalArray(sliceArray("const DEFS_B: Def[] = "));
const defsC = evalArray(sliceArray("const DEFS_C: Def[] = "));
const groups = evalArray(sliceArray("export const PLANT_GROUPS: PlantGroup[] = "));

const defs = [...defsA, ...defsB, ...defsC];

// group membership
const groupBySlug = {};
for (const g of groups) for (const m of g.members) groupBySlug[m] = { key: g.key, name: g.name, isDefault: m === g.default };
// inline groups on defs
for (const d of defs) if (d.group && d.groupName) groupBySlug[d.slug] = groupBySlug[d.slug] ?? { key: d.group, name: d.groupName, isDefault: !!d.groupDefault };

// genus from botanical name (first token)
function genusOf(botanical) {
  if (!botanical) return "";
  const t = botanical.trim().split(/\s+/)[0];
  return /^[A-Z]/.test(t) ? t : "";
}

const rows = defs.map((d) => {
  const grp = groupBySlug[d.slug];
  const blooms = (d.bloom ?? []).map((b) => ({ start: b[0], end: b[1], color: b[2] }));
  return {
    slug: d.slug,
    name: d.name,
    botanical: d.botanical ?? "",
    genus: genusOf(d.botanical),
    cat: d.cat,
    h: d.h, w: d.w, years: d.years,
    sun: d.sun, water: d.water, zones: d.zones ?? "",
    foliage: d.foliage ?? "",
    bloomCount: blooms.length,
    bloomColors: blooms.map((b) => b.color).join("|"),
    blooms,
    tags: d.tags ?? [],
    group: grp ? grp.key : "",
    groupName: grp ? grp.name : "",
    groupDefault: grp ? !!grp.isDefault : false,
    grouped: !!grp,
  };
});

// ---- group-level rollup: how many members per group, and the ungrouped set ----
const byGroup = {};
for (const r of rows) {
  const k = r.group || `__ungrouped__:${r.slug}`;
  (byGroup[k] ??= { key: r.group, name: r.groupName, members: [] }).members.push(r);
}

// ---- genus rollup for the ungrouped plants ----
const ungrouped = rows.filter((r) => !r.grouped);
const byGenusUngrouped = {};
for (const r of ungrouped) {
  const k = r.genus || "(no genus)";
  (byGenusUngrouped[k] ??= []).push(r);
}

fs.writeFileSync(path.join(OUT, "plants.json"), JSON.stringify(rows, null, 2));
fs.writeFileSync(path.join(OUT, "groups.json"), JSON.stringify(groups, null, 2));

// summary
const summary = {
  totalDefs: defs.length,
  totalGroups: groups.length,
  groupedDefs: rows.filter((r) => r.grouped).length,
  ungroupedDefs: ungrouped.length,
  ungroupedWithBloom: ungrouped.filter((r) => r.bloomCount > 0).length,
  ungroupedNoBloom: ungrouped.filter((r) => r.bloomCount === 0).length,
  byCat: Object.fromEntries(Object.entries(rows.reduce((a, r) => ((a[r.cat] = (a[r.cat] || 0) + 1), a), {})).sort()),
};
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));

// ungrouped-by-genus table (the candidate pool)
const genusRows = Object.entries(byGenusUngrouped)
  .map(([genus, rs]) => ({ genus, count: rs.length, slugs: rs.map((r) => r.slug), names: rs.map((r) => r.name) }))
  .sort((a, b) => b.count - a.count || a.genus.localeCompare(b.genus));
fs.writeFileSync(path.join(OUT, "ungrouped-by-genus.json"), JSON.stringify(genusRows, null, 2));

// CSV of all defs (for downstream botanical pass)
const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const header = ["slug", "name", "botanical", "genus", "cat", "grouped", "group", "groupDefault", "bloomCount", "bloomColors", "foliage", "sun", "water", "zones", "tags"];
const lines = [header.join(",")];
for (const r of rows) {
  lines.push([r.slug, r.name, r.botanical, r.genus, r.cat, r.grouped, r.group, r.groupDefault, r.bloomCount, r.bloomColors, r.foliage, r.sun, r.water, r.zones, (r.tags || []).join(" ")].map(esc).join(","));
}
fs.writeFileSync(path.join(OUT, "all-plants.csv"), lines.join("\n"));

console.log(JSON.stringify(summary, null, 2));
console.log("\nGroups:", groups.length);
console.log("Ungrouped genera with >1 member:");
for (const g of genusRows.filter((x) => x.count > 1 && x.genus !== "(no genus)")) console.log(`  ${g.genus}: ${g.count}  [${g.slugs.slice(0, 6).join(", ")}${g.slugs.length > 6 ? ", ..." : ""}]`);
