import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
import { toCompatPlant, withPopularity, isArchetype } from "../../bloomseye-studio/src/garden/intel/compatibility";
const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));
const rec = new Map<string, number>();
for (const set of Object.values(doc.plants) as any[]) for (const c of set.companions) rec.set(c.slug, (rec.get(c.slug) ?? 0) + 1);

const pool = withPopularity((Object.values(libraryCatalog) as any[]).map(toCompatPlant));
const rows = pool.filter(isArchetype).map((p) => {
  const sp = (Object.values(libraryCatalog) as any[]).find((s) => s.assetKey === p.slug);
  return { slug: p.slug, name: p.commonName, bot: sp?.botanicalName ?? "", cat: p.category, lists: rec.get(p.slug) ?? 0 };
}).sort((a, b) => b.lists - a.lists);
writeFileSync(`${HERE}/data/archetypes.json`, JSON.stringify(rows, null, 2));
for (const r of rows) console.log(String(r.lists).padStart(5) + "  " + r.name.padEnd(26) + String(r.bot).padEnd(32) + r.cat);
