import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const OUT = path.join(os.homedir(), "bloomseye-reports", "multicolor-audit");
const rows = JSON.parse(fs.readFileSync(path.join(OUT, "plants.json"), "utf8"));
const groups = JSON.parse(fs.readFileSync(path.join(OUT, "groups.json"), "utf8"));

// ---- ungrouped plants, full detail ----
const ungrouped = rows.filter((r) => !r.grouped);
console.log("=== UNGROUPED PLANTS (" + ungrouped.length + ") ===");
for (const r of ungrouped.sort((a, b) => a.cat.localeCompare(b.cat) || a.slug.localeCompare(b.slug))) {
  console.log(`[${r.cat}] ${r.slug} | ${r.name} | ${r.botanical} | genus=${r.genus} | blooms=${r.bloomColors || "(none)"} | foliage=${r.foliage || "-"} | tags=${(r.tags||[]).join(",")}`);
}

// ---- group sizes (member count per group), sorted ----
console.log("\n=== GROUP SIZES (" + groups.length + " groups) ===");
const sizes = groups.map((g) => ({ key: g.key, name: g.name, n: g.members.length })).sort((a, b) => a.n - b.n || a.key.localeCompare(b.key));
for (const s of sizes) console.log(`${String(s.n).padStart(3)}  ${s.key}  (${s.name})`);

// ---- write ungrouped CSV for the botanical pass ----
const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const header = ["slug","name","botanical","genus","cat","bloomColors","foliage","sun","water","zones","tags"];
const lines = [header.join(",")];
for (const r of ungrouped) lines.push([r.slug,r.name,r.botanical,r.genus,r.cat,r.bloomColors,r.foliage,r.sun,r.water,r.zones,(r.tags||[]).join(" ")].map(esc).join(","));
fs.writeFileSync(path.join(OUT, "ungrouped.csv"), lines.join("\n"));
fs.writeFileSync(path.join(OUT, "ungrouped.json"), JSON.stringify(ungrouped, null, 2));
