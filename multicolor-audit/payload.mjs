import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const OUT = path.join(os.homedir(), "bloomseye-reports", "multicolor-audit");
const rows = JSON.parse(fs.readFileSync(path.join(OUT, "plants.json"), "utf8"));
const groups = JSON.parse(fs.readFileSync(path.join(OUT, "groups.json"), "utf8"));
const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

// rough hex -> color-name so botanist agents read colors, not hex
function hexName(hex) {
  if (!hex) return "";
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d < 22 && l > 225) return "white";
  if (d < 22 && l > 150) return "silver/grey";
  if (d < 22) return "grey";
  let h = 0;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60); if (h < 0) h += 360;
  const sat = l > 200 && d < 60 ? "pale " : "";
  let base;
  if (h < 15 || h >= 345) base = "red";
  else if (h < 40) base = "orange";
  else if (h < 65) base = "yellow";
  else if (h < 150) base = "green";
  else if (h < 200) base = "teal";
  else if (h < 255) base = "blue";
  else if (h < 290) base = "purple";
  else if (h < 330) base = "magenta/pink";
  else base = "pink";
  return sat + base;
}

const ungrouped = rows.filter((r) => !r.grouped).map((r) => ({
  slug: r.slug,
  name: r.name,
  botanical: r.botanical,
  genus: r.genus,
  cat: r.cat,
  storedHex: r.bloomColors || (r.foliage ? r.foliage + " (foliage)" : ""),
  storedColor: r.bloomCount ? r.blooms.map((b) => hexName(b.color)).join("+") : (r.foliage ? hexName(r.foliage) + " foliage" : "no bloom"),
  hasBloom: r.bloomCount > 0,
  tags: r.tags,
}));

// grouped genera color coverage
const groupColors = groups.map((g) => {
  const members = g.members.map((s) => bySlug[s]).filter(Boolean);
  const colorSet = new Set();
  for (const m of members) for (const b of (m.blooms || [])) colorSet.add(hexName(b.color));
  return {
    key: g.key,
    name: g.name,
    n: g.members.length,
    resolvedMembers: members.length,
    distinctColors: [...colorSet].sort(),
    memberNames: members.map((m) => m.name),
  };
}).sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(OUT, "payload-ungrouped.json"), JSON.stringify(ungrouped, null, 2));
fs.writeFileSync(path.join(OUT, "payload-groupcolors.json"), JSON.stringify(groupColors, null, 2));
console.log("ungrouped:", ungrouped.length, "| grouped genera:", groupColors.length);
console.log("ungrouped payload bytes:", JSON.stringify(ungrouped).length);
console.log("groupcolors payload bytes:", JSON.stringify(groupColors).length);
// quick preview of stored color names
console.log("\nSample ungrouped colors:");
for (const u of ungrouped.slice(0, 12)) console.log(`  ${u.slug}: ${u.storedColor}  (${u.storedHex})`);
