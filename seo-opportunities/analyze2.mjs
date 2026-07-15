// Second pass: page-weight gates, deep-intel derived traits (deer resistance, pet
// safety) after group expansion, guide inventory, and the exact page lists for the
// families the report will recommend. Read-only.
import fs from "node:fs";

const DIR = "C:/Users/etano/bloomseye-reports/seo-opportunities";
const REPO = "C:/Users/etano/bloomseye-directory";
const raw = JSON.parse(fs.readFileSync(`${DIR}/plants.json`, "utf8"));
const ALL = Array.isArray(raw) ? raw : raw.plants;
const INTEL = JSON.parse(fs.readFileSync(`${REPO}/src/data/deep-intel.json`, "utf8"));
const COMPAT = JSON.parse(fs.readFileSync(`${REPO}/src/data/compatibility.json`, "utf8"));

const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SLUGS = MONTHS_LONG.map((m) => m.toLowerCase());
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
function hexToHsl(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || "").trim()); if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) { if (max === r) h = (((g - b) / d) % 6); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  const l = (max + min) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
}
const COLOR_NAMES = ["white","yellow","orange","red","pink","purple","blue"];
function colorName(hex) {
  const hsl = hexToHsl(hex); if (!hsl) return null;
  const [h, s, l] = hsl;
  if (l >= 0.82 && s < 0.25) return "white";
  if (s < 0.12) return null;
  if (h < 16 || h >= 330) return l > 0.55 ? "pink" : "red";
  if (h < 45) return "orange";
  if (h < 66) return "yellow";
  if (h < 170) return null;
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return l > 0.6 ? "pink" : "purple";
}
function plantColors(p) {
  const set = new Set();
  for (const b of p.bloom ?? []) { const c = colorName(b.color || ""); if (c) set.add(c); }
  for (const t of p.tags ?? []) { const lc = t.toLowerCase(); if (COLOR_NAMES.includes(lc)) set.add(lc); }
  return [...set];
}
const sunSlug = (s) => (s || "").trim().toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

for (const p of ALL) {
  p._colors = plantColors(p); p._months = bloomMonths(p);
  p._nMonths = p._months.filter(Boolean).length;
  p._sun = sunSlug(p.sun); p._cat = p.category ? slugify(p.category) : "";
  p._tags = (p.tags ?? []).map(slugify); p._zones = p.hardinessZones ?? [];
  p._grp = p.group || p.slug;
}
const byGroup = new Map();
for (const p of ALL) { if (!byGroup.has(p._grp)) byGroup.set(p._grp, []); byGroup.get(p._grp).push(p); }
const bySlug = new Map(ALL.map((p) => [p.slug, p]));

const out = [];
const say = (s = "") => out.push(s);

// ---------------------------------------------------------------- PAGE WEIGHT
// CLAUDE.md records /plants/index.html at ~4.45 MB raw for 1,677 cards.
// That is ~2.65 KB of HTML per card (inline SVG icons + 12-span bloom strip).
const KB_PER_CARD = 4.45 * 1024 / 1677;
say("=".repeat(78));
say("PAGE-WEIGHT GATE  (per-card HTML ~ " + KB_PER_CARD.toFixed(2) + " KB, from the documented 4.45 MB / 1,677 cards)");
say("=".repeat(78));
const weigh = (n) => `${n} plants ~ ${((n * KB_PER_CARD) / 1024).toFixed(2)} MB`;
for (const n of [50, 100, 200, 300, 500, 800, 900]) say(`  ${weigh(n)}`);
say();
say("Existing hub pages by size (the biggest are ALREADY heavy):");
{
  const rows = [];
  const push = (label, n) => rows.push([label, n]);
  for (const z of [2,3,4,5,6,7,8,9,10,11]) push(`/plants/zone/${z}/`, ALL.filter((p) => p._zones.includes(z)).length);
  for (const s of ["full-sun","part-shade","part-sun","full-shade"]) push(`/plants/light/${s}/`, ALL.filter((p) => p._sun === s).length);
  for (let i = 0; i < 12; i++) push(`/plants/blooming-in/${MONTH_SLUGS[i]}/`, ALL.filter((p) => p._months[i]).length);
  for (const c of COLOR_NAMES) push(`/plants/color/${c}/`, ALL.filter((p) => p._colors.includes(c)).length);
  rows.sort((a, b) => b[1] - a[1]);
  for (const [l, n] of rows.slice(0, 12)) say(`  ${l.padEnd(34)} ${String(n).padStart(4)} plants  ~${((n * KB_PER_CARD) / 1024).toFixed(2)} MB`);
  const over = rows.filter(([, n]) => n >= 300).length;
  say(`  ... ${over} existing hub pages already carry >= 300 cards (>= ~0.8 MB of HTML).`);
}
say();

// --------------------------------------------- DEEP-INTEL DERIVED TRAIT: DEER
say("=".repeat(78));
say("DEER RESISTANCE - the live hub is thin, but deep-intel knows better");
say("=".repeat(78));
{
  const tagged = ALL.filter((p) => p._tags.includes("deer-resistant"));
  say(`  /plants/traits/deer-resistant/ TODAY: ${tagged.length} plants (${new Set(tagged.map((p) => p._grp)).size} group) - ${tagged.map((p) => p.slug).join(", ")}`);
  say(`  (tagFacets keeps it because MIN_FACET is 3 and it has exactly 3. It is a live thin page.)`);
  // deep-intel: extraFacts labelled about deer, or notes about deer
  const deerSlugs = new Set();
  const deerNegative = new Set(); // "not deer-proof" style caveats
  for (const s of Object.keys(INTEL)) {
    const r = INTEL[s];
    for (const f of (r.extraFacts || [])) {
      const t = `${f.label} ${f.value}`.toLowerCase();
      if (/\bdeer\b/.test(t)) {
        if (/(not deer-?proof|deer will|browse|damage|eat it|not resistant|no plant is)/.test(t) && !/resistant|leave it alone|avoid/.test(f.label.toLowerCase())) deerNegative.add(s);
        else deerSlugs.add(s);
      }
    }
    for (const n of (r.notes || [])) {
      const t = `${n.topic} ${n.text}`.toLowerCase();
      if (/\bdeer\b/.test(t)) deerSlugs.add(s);
    }
  }
  const matched = [...deerSlugs].filter((s) => bySlug.has(s));
  const groups = new Set(matched.map((s) => bySlug.get(s)._grp));
  const expanded = ALL.filter((p) => groups.has(p._grp));
  say();
  say(`  deep-intel records that say something about deer .. ${deerSlugs.size} (${matched.length} match a live slug)`);
  say(`  distinct groups ................................... ${groups.size}`);
  say(`  plants after group expansion ...................... ${expanded.length}`);
  // only the ones whose extraFact LABEL asserts resistance
  const assert = new Set();
  for (const s of Object.keys(INTEL)) for (const f of (INTEL[s].extraFacts || []))
    if (/^(deer|deer and rabbit)[\s-]*(resistant|leave it alone|proof)/i.test(f.label) || /deer.*(resistant|leave it alone)/i.test(f.label)) assert.add(s);
  const aMatched = [...assert].filter((s) => bySlug.has(s));
  const aGroups = new Set(aMatched.map((s) => bySlug.get(s)._grp));
  const aExpanded = ALL.filter((p) => aGroups.has(p._grp));
  say(`  records whose extraFact LABEL asserts deer resistance: ${assert.size} species`);
  say(`  -> after group expansion: ${aExpanded.length} plants across ${aGroups.size} groups`);
  say(`  -> /plants/traits/deer-resistant/ could go from 3 plants to ~${aExpanded.length}`);
  // cross with zone
  const cells = [];
  for (const z of [2,3,4,5,6,7,8,9,10,11]) {
    const n = aExpanded.filter((p) => p._zones.includes(z)).length;
    cells.push([z, n]);
  }
  say(`  deer-resistant x zone cells >= 8 plants: ${cells.filter(([, n]) => n >= 8).length} of 10  -> ${cells.map(([z, n]) => `z${z}=${n}`).join(" ")}`);
  say(`  NOTE: deep-intel is a REPO file (curated, 276 species). The catalog's own`);
  say(`        "deer resistant" tagging is what is broken. The durable fix is upstream.`);
}
say();

// ------------------------------------------------------------- PET SAFETY DEEP
say("=".repeat(78));
say("PET SAFETY - what a page set would actually have to stand on");
say("=".repeat(78));
{
  const safety = Object.keys(INTEL).filter((s) => INTEL[s].safety);
  say(`  species with a prose safety note ......... ${safety.length} of ${Object.keys(INTEL).length} deep-intel records`);
  say(`  species in the catalog with NO deep-intel  ${new Set(ALL.map((p) => p._grp)).size - Object.keys(INTEL).length} of 342 groups`);
  // Explicit non-toxic assertions, from extraFacts labels (more reliable than the prose sniff)
  const safeFacts = new Set(), toxFacts = new Set();
  for (const s of Object.keys(INTEL)) {
    for (const f of (INTEL[s].extraFacts || [])) {
      const l = f.label.toLowerCase();
      if (/safe around pets|non-?toxic to pets|non-?toxic to pets and people|pet-?safe/.test(l)) safeFacts.add(s);
      if (/toxic|poison/.test(l) && !/non-?toxic/.test(l)) toxFacts.add(s);
    }
    const r = INTEL[s];
    if (r.safety) {
      const t = r.safety.text.toLowerCase();
      if (/^non-?toxic|is non-?toxic|not toxic to (dogs|cats|pets)|safe (around|for) (pets|cats|dogs)/.test(t)) safeFacts.add(s);
    }
  }
  const expand = (set) => {
    const gs = new Set([...set].filter((s) => bySlug.has(s)).map((s) => bySlug.get(s)._grp));
    return { species: gs.size, plants: ALL.filter((p) => gs.has(p._grp)).length };
  };
  const safeX = expand(safeFacts), toxX = expand(toxFacts);
  say();
  say(`  Explicit NON-TOXIC assertions (extraFact label or safety prose):`);
  say(`     ${safeFacts.size} species -> ${safeX.plants} plants after group expansion`);
  say(`  Explicit TOXIC assertions:`);
  say(`     ${toxFacts.size} species -> ${toxX.plants} plants after group expansion`);
  say();
  say(`  A "/plants/safe-for-cats/" hub built ONLY from what exists today would list`);
  say(`  ${safeX.plants} plants. A "/plants/toxic-to-dogs/" hub would list ${toxX.plants}.`);
  say(`  The asymmetry is the whole story: the data records DANGER, not SAFETY.`);
  say();
  say(`  To fill it: 342 species have a botanicalName (100% of the catalog), so a`);
  say(`  join key exists. The gap is a toxic/non-toxic SOURCE covering all 342.`);
  const noIntel = [...byGroup.keys()].filter((g) => !INTEL[g]);
  say(`  species groups with no deep-intel record at all: ${noIntel.length}`);
  say(`  e.g. ${noIntel.slice(0, 15).join(", ")}`);
}
say();

// ------------------------------------------------------ LONG BLOOM / PRIVACY
say("=".repeat(78));
say("TWO 'USE-CASE' SETS THE DATA ALREADY SUPPORTS");
say("=".repeat(78));
{
  const long = ALL.filter((p) => p._nMonths >= 5);
  say(`  LONG-BLOOMING (>=5 months in flower): ${long.length} plants, ${new Set(long.map((p) => p._grp)).size} groups`);
  const lz = [2,3,4,5,6,7,8,9,10,11].map((z) => [z, long.filter((p) => p._zones.includes(z)).length]);
  say(`    x zone (>=8): ${lz.filter(([, n]) => n >= 8).length} of 10 cells -> ${lz.map(([z, n]) => `z${z}=${n}`).join(" ")}`);
  const lc = COLOR_NAMES.map((c) => [c, long.filter((p) => p._colors.includes(c)).length]);
  say(`    x colour (>=8): ${lc.filter(([, n]) => n >= 8).length} of 7 cells -> ${lc.map(([c, n]) => `${c}=${n}`).join(" ")}`);
  const ls = ["full-sun","part-sun","part-shade","full-shade"].map((s) => [s, long.filter((p) => p._sun === s).length]);
  say(`    x light (>=8): ${ls.filter(([, n]) => n >= 8).length} of 4 cells -> ${ls.map(([s, n]) => `${s}=${n}`).join(" ")}`);
  say();
  const screen = ALL.filter((p) => p.matureHeight >= 2);
  say(`  PRIVACY / SCREENING (mature height >= 2 m): ${screen.length} plants, ${new Set(screen.map((p) => p._grp)).size} groups`);
  const sz = [2,3,4,5,6,7,8,9,10,11].map((z) => [z, screen.filter((p) => p._zones.includes(z)).length]);
  say(`    x zone (>=8): ${sz.filter(([, n]) => n >= 8).length} of 10 cells -> ${sz.map(([z, n]) => `z${z}=${n}`).join(" ")}`);
  const st = ["shrub","tree","conifer","climber","grass"].map((t) => [t, screen.filter((p) => p._cat === t).length]);
  say(`    x type: ${st.map(([t, n]) => `${t}=${n}`).join(" ")}`);
  const evergreenScreen = screen.filter((p) => p._tags.includes("evergreen"));
  say(`    evergreen subset ("year-round privacy"): ${evergreenScreen.length} plants, ${new Set(evergreenScreen.map((p) => p._grp)).size} groups`);
  say();
  const gc = ALL.filter((p) => p.matureHeight <= 0.3);
  say(`  GROUNDCOVER / EDGING (height <= 0.3 m): ${gc.length} plants, ${new Set(gc.map((p) => p._grp)).size} groups`);
  const gz = [2,3,4,5,6,7,8,9,10,11].map((z) => [z, gc.filter((p) => p._zones.includes(z)).length]);
  say(`    x zone (>=8): ${gz.filter(([, n]) => n >= 8).length} of 10 -> ${gz.map(([z, n]) => `z${z}=${n}`).join(" ")}`);
  const gl = ["full-sun","part-sun","part-shade","full-shade"].map((s) => [s, gc.filter((p) => p._sun === s).length]);
  say(`    x light (>=8): ${gl.filter(([, n]) => n >= 8).length} of 4 -> ${gl.map(([s, n]) => `${s}=${n}`).join(" ")}`);
}
say();

// ------------------------------------------------------------------- WATER HUB
say("=".repeat(78));
say("WATER - a single-facet hub that does NOT exist yet");
say("=".repeat(78));
{
  for (const w of ["low","moderate","high"]) {
    const ps = ALL.filter((p) => p.water === w);
    say(`  water=${w.padEnd(9)} ${String(ps.length).padStart(4)} plants, ${String(new Set(ps.map((p) => p._grp)).size).padStart(3)} groups   -> ~${((ps.length * KB_PER_CARD) / 1024).toFixed(2)} MB page`);
  }
  const low = ALL.filter((p) => p.water === "low");
  const dro = ALL.filter((p) => p._tags.includes("drought-tolerant"));
  const both = ALL.filter((p) => p.water === "low" && p._tags.includes("drought-tolerant"));
  say(`  OVERLAP: water=low (${low.length}) vs tag drought-tolerant (${dro.length}) share ${both.length} plants.`);
  say(`  -> A /plants/water/low/ hub would be ${((both.length / low.length) * 100).toFixed(0)}% the same list as the existing`);
  say(`     /plants/traits/drought-tolerant/ hub. That is a cannibalisation risk, not an opportunity.`);
  const high = ALL.filter((p) => p.water === "high");
  say(`  water=high (${high.length} plants, ${new Set(high.map((p) => p._grp)).size} groups) has NO existing hub and no overlapping guide`);
  say(`     except /guides/rain-garden/. "Plants for wet soil / boggy ground" is the real query.`);
}
say();

// ---------------------------------------------------------------- COMPANIONS
say("=".repeat(78));
say("COMPANION DATA");
say("=".repeat(78));
{
  const keys = Object.keys(COMPAT);
  const matched = keys.filter((k) => bySlug.has(k));
  const counts = keys.map((k) => (COMPAT[k].companions || []).length);
  say(`  compatibility.json records: ${keys.length} (${matched.length} match a live slug)`);
  say(`  companions per record: min=${Math.min(...counts)} median=${counts.sort((a,b)=>a-b)[Math.floor(counts.length/2)]} max=${Math.max(...counts)}`);
  say(`  They are already rendered on the plant page (PlantCompanions.astro), so a`);
  say(`  separate "/companions/<slug>/" page would duplicate an existing page's section.`);
  const gs = new Set(matched.map((k) => bySlug.get(k)._grp));
  say(`  covered groups: ${gs.size} of 342`);
}
say();

// ------------------------------------------------------- RECOMMENDED PAGE LISTS
say("=".repeat(78));
say("EXACT PAGE COUNTS FOR THE RECOMMENDED FAMILIES (threshold noted per family)");
say("=".repeat(78));
function cells(name, aVals, aHas, bVals, bHas, threshold, minGroups) {
  let kept = 0, weighty = 0, plantsSum = 0;
  const list = [];
  for (const a of aVals) for (const b of bVals) {
    const ps = ALL.filter((p) => aHas(p, a) && bHas(p, b));
    const gs = new Set(ps.map((p) => p._grp)).size;
    if (ps.length >= threshold && gs >= minGroups) {
      kept++; plantsSum += ps.length; if (ps.length >= 300) weighty++;
      list.push(`${a}/${b}=${ps.length}`);
    }
  }
  say(`  ${name}`);
  say(`     pages: ${kept}   (threshold >=${threshold} plants AND >=${minGroups} distinct species groups)`);
  say(`     median page: ${plantsSum && kept ? Math.round(plantsSum / kept) : 0} plants;  ${weighty} page(s) would exceed 300 cards (~0.8 MB) and need a cap or pagination`);
  return kept;
}
const ZONES = [2,3,4,5,6,7,8,9,10,11];
const LIGHTS = ["full-sun","part-sun","part-shade","full-shade"];
const TYPES = ["annual","bulb","climber","conifer","fern","grass","herb","perennial","rose","shrub","tree"];
const TRAITS = ["pollinator","native","drought-tolerant","fragrant","shade","evergreen","cut-flower"];
const SIZES = [["groundcover",(p)=>p.matureHeight<=0.3],["short",(p)=>p.matureHeight>0.3&&p.matureHeight<=0.6],["mid",(p)=>p.matureHeight>0.6&&p.matureHeight<=1.2],["tall",(p)=>p.matureHeight>1.2&&p.matureHeight<3],["screening",(p)=>p.matureHeight>=3]];
const hasZ = (p, z) => p._zones.includes(Number(z));
const hasC = (p, c) => p._colors.includes(c);
const hasM = (p, m) => p._months[MONTH_SLUGS.indexOf(m)];
const hasL = (p, l) => p._sun === l;
const hasT = (p, t) => p._cat === t;
const hasTr = (p, t) => p._tags.includes(t);
const hasS = (p, s) => SIZES.find((x) => x[0] === s)[1](p);

let total = 0;
total += cells("COLOUR x ZONE     /plants/color/<c>/zone/<z>/", COLOR_NAMES, hasC, ZONES, hasZ, 12, 5);
total += cells("COLOUR x MONTH    /plants/color/<c>/blooming-in/<m>/", COLOR_NAMES, hasC, MONTH_SLUGS, hasM, 12, 5);
total += cells("TYPE x ZONE       /plants/type/<t>/zone/<z>/", TYPES, hasT, ZONES, hasZ, 12, 5);
total += cells("TRAIT x ZONE      /plants/traits/<t>/zone/<z>/", TRAITS, hasTr, ZONES, hasZ, 12, 5);
total += cells("SIZE x ZONE       /plants/size/<s>/zone/<z>/", SIZES.map((s) => s[0]), hasS, ZONES, hasZ, 12, 5);
total += cells("COLOUR x LIGHT    /plants/color/<c>/light/<l>/", COLOR_NAMES, hasC, LIGHTS, hasL, 12, 5);
total += cells("TRAIT x LIGHT     /plants/traits/<t>/light/<l>/", TRAITS, hasTr, LIGHTS, hasL, 12, 5);
total += cells("TYPE x MONTH      /plants/type/<t>/blooming-in/<m>/", TYPES, hasT, MONTH_SLUGS, hasM, 12, 5);
total += cells("SIZE x LIGHT      /plants/size/<s>/light/<l>/", SIZES.map((s) => s[0]), hasS, LIGHTS, hasL, 12, 5);
total += cells("TRAIT x COLOUR    /plants/traits/<t>/color/<c>/", TRAITS, hasTr, COLOR_NAMES, hasC, 12, 5);
say();
say(`  SUM of all the above families at >=12 plants and >=5 groups: ${total} new pages`);
say(`  (the site has ~1,826 catalog-driven pages today, so this would be a ${(total / 1826 * 100).toFixed(0)}% increase)`);
say();

fs.writeFileSync(`${DIR}/counts2.txt`, out.join("\n"));
console.log(out.join("\n"));
