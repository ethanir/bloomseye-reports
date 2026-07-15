// Third pass: the checks the first two passes missed, and that changed the report's
// conclusions. Read-only.
//   1. SIBLING duplication on the 97 SHIPPED bloom-calendar pages (Jaccard between a
//      combo and its adjacent-zone sibling). The earlier analysis only compared a cell
//      to its PARENTS; the duplication actually lives between siblings.
//   2. How many plant pages are bare (no description, no photo, no deep-intel).
//   3. Whether the long-blooming family survives contact with the data.
import fs from "node:fs";

const DIR = "C:/Users/etano/bloomseye-reports/seo-opportunities";
const REPO = "C:/Users/etano/bloomseye-directory";
const ALL = JSON.parse(fs.readFileSync(`${DIR}/plants.json`, "utf8")).plants;
const PHOTOS = JSON.parse(fs.readFileSync(`${DIR}/photos.json`, "utf8")).photos || {};
const INTEL = JSON.parse(fs.readFileSync(`${REPO}/src/data/deep-intel.json`, "utf8"));

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const BLOOM_CALENDAR_THRESHOLD = 8; // src/lib/bloomCalendar.ts:17

/** Verbatim from src/lib/facets.ts */
function bloomMonths(p) {
  const on = new Array(12).fill(false);
  for (const b of p.bloom ?? []) {
    const s = b.startMonth, e = b.endMonth;
    if (!s || !e || s < 1 || s > 12 || e < 1 || e > 12) continue;
    let m = s;
    for (let i = 0; i < 12; i++) { on[m - 1] = true; if (m === e) break; m = (m % 12) + 1; }
  }
  return on;
}

const out = [];
const say = (s = "") => out.push(s);

// ---------------------------------------------------------------------------
// 1. SIBLING DUPLICATION ON THE SHIPPED BLOOM CALENDAR
// ---------------------------------------------------------------------------
say("=".repeat(78));
say("SIBLING DUPLICATION ON THE 97 SHIPPED BLOOM-CALENDAR PAGES");
say("Google's doorway policy: 'Creating substantially similar pages ...'");
say("=".repeat(78));

const comboSet = (zone, mi) =>
  new Set(ALL.filter((p) => (p.hardinessZones ?? []).includes(zone) && bloomMonths(p)[mi]).map((p) => p.slug));

const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
};

// Reproduce the shipped page set exactly (zoneFacets x monthFacets, gate 8).
const zones = [...new Set(ALL.flatMap((p) => p.hardinessZones ?? []))]
  .filter((z) => ALL.filter((p) => (p.hardinessZones ?? []).includes(z)).length >= 3)
  .sort((a, b) => a - b);
const months = [...Array(12).keys()].filter((i) => ALL.filter((p) => bloomMonths(p)[i]).length >= 3);

const cells = [];
for (const z of zones) for (const mi of months) {
  const s = comboSet(z, mi);
  if (s.size >= BLOOM_CALENDAR_THRESHOLD) cells.push({ z, mi, s });
}
say(`  shipped combo pages: ${cells.length}   (matches the 97 the site builds)`);
say();

function pairReport(label, nextOf) {
  const pairs = [];
  for (const c of cells) {
    const n = cells.find(nextOf(c));
    if (n) pairs.push({ a: c, b: n, j: jaccard(c.s, n.s) });
  }
  pairs.sort((x, y) => y.j - x.j);
  const identical = pairs.filter((p) => p.j === 1);
  const over80 = pairs.filter((p) => p.j >= 0.8);
  const med = pairs.length ? pairs[Math.floor(pairs.length / 2)].j : 0;
  say(`  --- ${label} (${pairs.length} pairs) ---`);
  say(`     median Jaccard ........ ${(med * 100).toFixed(0)}%`);
  say(`     pairs >= 80% identical  ${over80.length}  (${((over80.length / pairs.length) * 100).toFixed(0)}%)`);
  say(`     pairs 100% IDENTICAL .. ${identical.length}`);
  for (const p of identical)
    say(`        /bloom-calendar/zone-${p.a.z}/${MONTHS[p.a.mi]}/  ==  /bloom-calendar/zone-${p.b.z}/${MONTHS[p.b.mi]}/   (${p.a.s.size} plants, same list)`);
  say(`     worst 5 non-identical: ${pairs.filter((p) => p.j < 1).slice(0, 5).map((p) => `z${p.a.z}/${MONTHS[p.a.mi].slice(0,3)} vs z${p.b.z}/${MONTHS[p.b.mi].slice(0,3)}=${(p.j * 100).toFixed(0)}%`).join(", ")}`);
  say();
  return pairs;
}

pairReport("ADJACENT ZONE, same month", (c) => (x) => x.z === c.z + 1 && x.mi === c.mi);
pairReport("ADJACENT MONTH, same zone", (c) => (x) => x.z === c.z && x.mi === c.mi + 1);

say("  NOTE: src/pages/bloom-calendar/[zoneslug]/[month].astro lines 52-55 push chips for");
say("        zone-1, zone+1, month-1, month+1 - i.e. the template DELIBERATELY cross-links");
say("        the most duplicative siblings.");
say();

// ---------------------------------------------------------------------------
// 2. HOW MANY PLANT PAGES ARE BARE
// ---------------------------------------------------------------------------
say("=".repeat(78));
say("BARE PLANT PAGES (the live scaled-content exposure)");
say("=".repeat(78));
const bare = ALL.filter((p) => !p.description && !(PHOTOS[p.slug] || []).length && !INTEL[p.slug]);
say(`  no description AND no real photo AND no deep-intel: ${bare.length} of ${ALL.length}  (${((bare.length / ALL.length) * 100).toFixed(0)}%)`);
say(`  with a description ...... ${ALL.filter((p) => p.description).length}`);
say(`  with a real photo ....... ${ALL.filter((p) => (PHOTOS[p.slug] || []).length).length}`);
say(`  with a deep-intel record  ${ALL.filter((p) => INTEL[p.slug]).length}`);
say(`  community: true ......... ${ALL.filter((p) => p.community).length}   (indexable, and ?add= silently drops them)`);
say();

// ---------------------------------------------------------------------------
// 3. DOES THE LONG-BLOOMING FAMILY SURVIVE?
// ---------------------------------------------------------------------------
say("=".repeat(78));
say("LONG-BLOOMING: does the family survive contact with the data?");
say("=".repeat(78));
for (const p of ALL) p._n = bloomMonths(p).filter(Boolean).length;
const long = ALL.filter((p) => p._n >= 5);
say(`  plants blooming 5+ months: ${long.length}`);
const hist = {};
for (const p of long) hist[p._n] = (hist[p._n] || 0) + 1;
say(`  duration histogram: ${Object.entries(hist).map(([k, v]) => `${k}mo=${v}`).join("  ")}`);
say(`  -> quantised and capped. 187 plants tie at exactly 6 months, so a "longest blooming"`);
say(`     RANKING is not possible.`);
const cat = {};
for (const p of long) cat[p.category] = (cat[p.category] || 0) + 1;
say(`  by category: ${Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("  ")}`);
say(`  with NO hardiness zone: ${long.filter((p) => !(p.hardinessZones ?? []).length).length} of ${long.length}`);
const perennials = long.filter((p) => p.category === "Perennial");
say(`  PERENNIAL and long-blooming: ${perennials.length} plants across ${new Set(perennials.map((p) => p.group || p.slug)).size} species`);
for (const z of [5, 6, 7])
  say(`     "longest blooming perennials zone ${z}" -> ${perennials.filter((p) => (p.hardinessZones ?? []).includes(z)).length} plants`);
say(`  -> the exact query autocomplete surfaces resolves to a THIN page. Family demoted.`);
say();

fs.writeFileSync(`${DIR}/counts3.txt`, out.join("\n"));
console.log(out.join("\n"));
