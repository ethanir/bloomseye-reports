// Throwaway analysis script for the SEO-opportunity investigation.
// Read-only: reads the live catalog snapshot (plants.json, photos.json) and the
// repo's deep-intel.json, and prints combination counts. Writes nothing but stdout.
// Faceting logic is copied VERBATIM from src/lib/facets.ts so counts match the site.
import fs from "node:fs";

const DIR = "C:/Users/etano/bloomseye-reports/seo-opportunities";
const REPO = "C:/Users/etano/bloomseye-directory";

const raw = JSON.parse(fs.readFileSync(`${DIR}/plants.json`, "utf8"));
const ALL = Array.isArray(raw) ? raw : raw.plants;
const PHOTOS = JSON.parse(fs.readFileSync(`${DIR}/photos.json`, "utf8")).photos || {};
const INTEL = JSON.parse(fs.readFileSync(`${REPO}/src/data/deep-intel.json`, "utf8"));

// ---- facets.ts, verbatim ---------------------------------------------------
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SLUGS = MONTHS_LONG.map((m) => m.toLowerCase());
const MIN_FACET = 3;
const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = (((g - b) / d) % 6);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
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
const sunSlug = (sun) => (sun || "").trim().toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const HUB_TAGS = {
  pollinator: "Pollinator-friendly", native: "Native", "drought-tolerant": "Drought-tolerant",
  fragrant: "Fragrant", "deer-resistant": "Deer-resistant", shade: "Good for shade",
  evergreen: "Evergreen", "cut-flower": "Cut flowers", "low-maintenance": "Low-maintenance",
};
const isFoliage = (p) => !bloomMonths(p).some(Boolean);

// ---- derived per-plant dimensions ------------------------------------------
for (const p of ALL) {
  p._colors = plantColors(p);
  p._months = bloomMonths(p);
  p._nMonths = p._months.filter(Boolean).length;
  p._sun = sunSlug(p.sun);
  p._cat = p.category ? slugify(p.category) : "";
  p._tags = (p.tags ?? []).map(slugify);
  p._hubTags = p._tags.filter((t) => HUB_TAGS[t]);
  p._zones = p.hardinessZones ?? [];
  p._grp = p.group || p.slug; // ungrouped plants are their own group
  p._photos = (PHOTOS[p.slug] || []).length;
  p._foliage = isFoliage(p);
}

const out = [];
const say = (s = "") => out.push(s);

// ============================================================================
say("=".repeat(78));
say("BLOOMSEYE CATALOG - SEO FACET ANALYSIS   (catalog snapshot: live plants.json)");
say("=".repeat(78));
say(`total plants ............ ${ALL.length}`);
say(`distinct groups ......... ${new Set(ALL.map((p) => p._grp)).size}`);
say(`grouped (has .group) .... ${ALL.filter((p) => p.group).length}`);
say(`groupDefault=true ....... ${ALL.filter((p) => p.groupDefault).length}`);
say(`community=true .......... ${ALL.filter((p) => p.community).length}`);
say(`with real photos ........ ${ALL.filter((p) => p._photos > 0).length}`);
say(`with description ........ ${ALL.filter((p) => p.description).length}`);
say(`foliage only (no bloom) . ${ALL.filter((p) => p._foliage).length}`);
say(`deep-intel records ...... ${Object.keys(INTEL).length}`);
say();

// ---- single-facet inventory -------------------------------------------------
function hist(label, keyFn) {
  const m = new Map();
  for (const p of ALL) for (const k of [].concat(keyFn(p))) {
    if (k === "" || k == null) continue;
    if (!m.has(k)) m.set(k, { n: 0, g: new Set() });
    m.get(k).n++; m.get(k).g.add(p._grp);
  }
  say(`--- ${label} ---`);
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1].n - a[1].n))
    say(`  ${String(k).padEnd(28)} plants=${String(v.n).padStart(5)}  groups=${String(v.g.size).padStart(4)}${v.n < MIN_FACET ? "   (below MIN_FACET=3)" : ""}`);
  say();
  return m;
}
hist("CATEGORY (/plants/type/)", (p) => p._cat);
hist("SUN (/plants/light/)", (p) => p._sun);
hist("WATER (no hub today)", (p) => p.water || "");
hist("ZONE (/plants/zone/)", (p) => p._zones.map(String));
hist("BLOOM COLOR (/plants/color/)", (p) => p._colors);
hist("BLOOM MONTH (/plants/blooming-in/)", (p) => p._months.map((on, i) => (on ? MONTH_SLUGS[i] : "")).filter(Boolean));
hist("HUB TAGS (/plants/traits/) - the 9 whitelisted", (p) => p._hubTags);

// full tag histogram: what ELSE is in the data that is not a hub today
{
  const m = new Map();
  for (const p of ALL) for (const t of p._tags) {
    if (!m.has(t)) m.set(t, { n: 0, g: new Set() });
    m.get(t).n++; m.get(t).g.add(p._grp);
  }
  say("--- ALL TAGS in the catalog (raw slugified), >=8 plants, marking hub status ---");
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1].n - a[1].n)) {
    if (v.n < 8) continue;
    const isHub = HUB_TAGS[k] ? "HUB" : (COLOR_NAMES.includes(k) ? "color" : "-");
    say(`  ${k.padEnd(28)} plants=${String(v.n).padStart(5)}  groups=${String(v.g.size).padStart(4)}   ${isHub}`);
  }
  say();
  say("--- tag long tail (<8 plants): count of distinct tags ---");
  const tail = [...m.entries()].filter(([, v]) => v.n < 8);
  say(`  ${tail.length} distinct tags below 8 plants; e.g. ${tail.slice(0, 25).map(([k, v]) => `${k}(${v.n})`).join(", ")}`);
  say();
}

// ---- size buckets -----------------------------------------------------------
{
  const hs = ALL.map((p) => p.matureHeight).filter((x) => typeof x === "number");
  const ss = ALL.map((p) => p.matureSpread).filter((x) => typeof x === "number");
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * p)]; };
  say("--- SIZE distribution (matureHeight / matureSpread, metres) ---");
  say(`  height  n=${hs.length}  min=${Math.min(...hs)}  p10=${q(hs,.1)}  p25=${q(hs,.25)}  median=${q(hs,.5)}  p75=${q(hs,.75)}  p90=${q(hs,.9)}  p99=${q(hs,.99)}  max=${Math.max(...hs)}`);
  say(`  spread  n=${ss.length}  min=${Math.min(...ss)}  p10=${q(ss,.1)}  p25=${q(ss,.25)}  median=${q(ss,.5)}  p75=${q(ss,.75)}  p90=${q(ss,.9)}  p99=${q(ss,.99)}  max=${Math.max(...ss)}`);
  const zeroH = ALL.filter((p) => !p.matureHeight).length, zeroS = ALL.filter((p) => !p.matureSpread).length;
  say(`  missing/zero height=${zeroH}  spread=${zeroS}`);
  say();
}

const SIZE_BUCKETS = [
  ["groundcover", (p) => p.matureHeight > 0 && p.matureHeight <= 0.3, "<= 0.3 m (edging / groundcover)"],
  ["short", (p) => p.matureHeight > 0.3 && p.matureHeight <= 0.6, "0.3-0.6 m (front of border)"],
  ["mid", (p) => p.matureHeight > 0.6 && p.matureHeight <= 1.2, "0.6-1.2 m (mid border)"],
  ["tall", (p) => p.matureHeight > 1.2 && p.matureHeight < 3, "1.2-3 m (back of border)"],
  ["screening", (p) => p.matureHeight >= 3 && p.matureHeight < 8, "3-8 m (privacy screen / hedge)"],
  ["tree", (p) => p.matureHeight >= 8, ">= 8 m (tree)"],
];
{
  say("--- SIZE BUCKETS ---");
  for (const [k, f, desc] of SIZE_BUCKETS) {
    const ps = ALL.filter(f);
    say(`  ${k.padEnd(14)} plants=${String(ps.length).padStart(5)}  groups=${String(new Set(ps.map((p) => p._grp)).size).padStart(4)}   ${desc}`);
  }
  // privacy-specific: tall AND wide-ish AND (evergreen | shrub/tree category)
  const priv = ALL.filter((p) => p.matureHeight >= 2);
  const privEver = priv.filter((p) => p._tags.includes("evergreen"));
  say(`  privacy (h>=2m)  plants=${priv.length}  groups=${new Set(priv.map((p) => p._grp)).size}`);
  say(`  privacy + evergreen tag  plants=${privEver.length}  groups=${new Set(privEver.map((p) => p._grp)).size}`);
  say();
}

// ---- BLOOM DURATION ---------------------------------------------------------
{
  say("--- BLOOM DURATION (months in flower) ---");
  const m = new Map();
  for (const p of ALL) m.set(p._nMonths, (m.get(p._nMonths) || 0) + 1);
  for (const k of [...m.keys()].sort((a, b) => a - b)) say(`  ${k} month(s): ${m.get(k)} plants`);
  const long = ALL.filter((p) => p._nMonths >= 5);
  const veryLong = ALL.filter((p) => p._nMonths >= 6);
  say(`  "long blooming" (>=5 months): plants=${long.length}  groups=${new Set(long.map((p) => p._grp)).size}`);
  say(`  "very long"      (>=6 months): plants=${veryLong.length}  groups=${new Set(veryLong.map((p) => p._grp)).size}`);
  say();
}

// ---- generic cross machinery ------------------------------------------------
const DIMS = {
  color:  { label: "color",  values: () => COLOR_NAMES, has: (p, v) => p._colors.includes(v) },
  month:  { label: "month",  values: () => MONTH_SLUGS, has: (p, v) => p._months[MONTH_SLUGS.indexOf(v)] },
  zone:   { label: "zone",   values: () => [...new Set(ALL.flatMap((p) => p._zones))].sort((a, b) => a - b).map(String), has: (p, v) => p._zones.includes(Number(v)) },
  light:  { label: "light",  values: () => [...new Set(ALL.map((p) => p._sun).filter(Boolean))], has: (p, v) => p._sun === v },
  water:  { label: "water",  values: () => [...new Set(ALL.map((p) => p.water).filter(Boolean))], has: (p, v) => p.water === v },
  type:   { label: "type",   values: () => [...new Set(ALL.map((p) => p._cat).filter(Boolean))], has: (p, v) => p._cat === v },
  trait:  { label: "trait",  values: () => Object.keys(HUB_TAGS), has: (p, v) => p._tags.includes(v) },
  size:   { label: "size",   values: () => SIZE_BUCKETS.map((b) => b[0]), has: (p, v) => SIZE_BUCKETS.find((b) => b[0] === v)[1](p) },
};

const THRESHOLDS = [8, 12, 15, 20, 30];

function cross(dimA, dimB, dimC) {
  const A = DIMS[dimA], B = DIMS[dimB], C = dimC ? DIMS[dimC] : null;
  const combos = [];
  for (const a of A.values()) {
    const inA = ALL.filter((p) => A.has(p, a));
    for (const b of B.values()) {
      const inAB = inA.filter((p) => B.has(p, b));
      if (!C) { combos.push({ key: `${a} x ${b}`, plants: inAB }); continue; }
      for (const c of C.values()) {
        const inABC = inAB.filter((p) => C.has(p, c));
        combos.push({ key: `${a} x ${b} x ${c}`, plants: inABC });
      }
    }
  }
  return combos;
}

function reportCross(name, dimA, dimB, dimC) {
  const combos = cross(dimA, dimB, dimC);
  const maxCells = combos.length;
  say(`--- CROSS: ${name}  (${maxCells} possible cells) ---`);
  const rows = [];
  for (const t of THRESHOLDS) {
    const kept = combos.filter((c) => c.plants.length >= t);
    // group-diversity quality gate: also require >= 5 distinct groups (not 20 cultivars of one tulip)
    const keptG = kept.filter((c) => new Set(c.plants.map((p) => p._grp)).size >= 5);
    rows.push(`  >=${String(t).padStart(2)} plants: ${String(kept.length).padStart(4)} pages   (also >=5 distinct groups: ${String(keptG.length).padStart(4)})`);
  }
  say(rows.join("\n"));
  const top = combos.filter((c) => c.plants.length >= 8).sort((a, b) => b.plants.length - a.plants.length);
  if (top.length) {
    say(`  biggest: ${top.slice(0, 5).map((c) => `${c.key}=${c.plants.length}`).join(", ")}`);
    say(`  smallest kept (>=8): ${top.slice(-5).map((c) => `${c.key}=${c.plants.length}`).join(", ")}`);
    const med = top[Math.floor(top.length / 2)];
    say(`  median kept page size (>=8): ${med.plants.length} plants`);
    const grpsOk = top.filter((c) => new Set(c.plants.map((p) => p._grp)).size >= 5).length;
    say(`  of the ${top.length} pages at >=8, ${grpsOk} also have >=5 distinct plant groups`);
  }
  say();
  return combos;
}

say("#".repeat(78));
say("# TWO-WAY CROSSES");
say("#".repeat(78));
say();
reportCross("COLOR x MONTH   /plants/color/<c>/blooming-in/<m>/", "color", "month");
reportCross("COLOR x ZONE", "color", "zone");
reportCross("COLOR x LIGHT", "color", "light");
reportCross("COLOR x TYPE", "color", "type");
reportCross("TRAIT x ZONE    /plants/traits/<t>/zone/<z>/", "trait", "zone");
reportCross("TRAIT x MONTH", "trait", "month");
reportCross("TRAIT x LIGHT", "trait", "light");
reportCross("TRAIT x COLOR", "trait", "color");
reportCross("TRAIT x TYPE", "trait", "type");
reportCross("WATER x LIGHT", "water", "light");
reportCross("WATER x ZONE", "water", "zone");
reportCross("WATER x TYPE", "water", "type");
reportCross("LIGHT x ZONE", "light", "zone");
reportCross("LIGHT x MONTH", "light", "month");
reportCross("LIGHT x TYPE", "light", "type");
reportCross("TYPE x ZONE", "type", "zone");
reportCross("TYPE x MONTH", "type", "month");
reportCross("SIZE x LIGHT", "size", "light");
reportCross("SIZE x ZONE", "size", "zone");
reportCross("SIZE x TYPE", "size", "type");
reportCross("SIZE x TRAIT", "size", "trait");
reportCross("SIZE x COLOR", "size", "color");
reportCross("SIZE x WATER", "size", "water");

say("#".repeat(78));
say("# THREE-WAY CROSSES (thin-page risk is high; checking whether any survive)");
say("#".repeat(78));
say();
reportCross("ZONE x MONTH x COLOR (extends the bloom calendar)", "zone", "month", "color");
reportCross("ZONE x TRAIT x LIGHT", "zone", "trait", "light");
reportCross("ZONE x TYPE x LIGHT", "zone", "type", "light");
reportCross("TRAIT x LIGHT x SIZE", "trait", "light", "size");

// ---- existing page inventory ------------------------------------------------
say("#".repeat(78));
say("# EXISTING PAGE COUNTS (what the site generates today)");
say("#".repeat(78));
say();
{
  const zoneVals = DIMS.zone.values().filter((z) => ALL.filter((p) => DIMS.zone.has(p, z)).length >= MIN_FACET);
  const monthVals = MONTH_SLUGS.filter((m) => ALL.filter((p) => DIMS.month.has(p, m)).length >= MIN_FACET);
  const colorVals = COLOR_NAMES.filter((c) => ALL.filter((p) => DIMS.color.has(p, c)).length >= MIN_FACET);
  const lightVals = DIMS.light.values().filter((s) => ALL.filter((p) => DIMS.light.has(p, s)).length >= MIN_FACET);
  const typeVals = DIMS.type.values().filter((t) => ALL.filter((p) => DIMS.type.has(p, t)).length >= MIN_FACET);
  const traitVals = Object.keys(HUB_TAGS).filter((t) => ALL.filter((p) => DIMS.trait.has(p, t)).length >= MIN_FACET);
  say(`  /plants/<slug>/ ............. ${ALL.length}`);
  say(`  /plants/zone/<z>/ ........... ${zoneVals.length}   (${zoneVals.join(",")})`);
  say(`  /plants/blooming-in/<m>/ .... ${monthVals.length}`);
  say(`  /plants/color/<c>/ .......... ${colorVals.length}   (${colorVals.join(",")})`);
  say(`  /plants/light/<s>/ .......... ${lightVals.length}   (${lightVals.join(",")})`);
  say(`  /plants/type/<c>/ ........... ${typeVals.length}   (${typeVals.join(",")})`);
  say(`  /plants/traits/<t>/ ......... ${traitVals.length}   (${traitVals.join(",")})`);
  let bc = 0;
  for (const z of zoneVals) for (const m of monthVals) {
    const n = ALL.filter((p) => DIMS.zone.has(p, z) && DIMS.month.has(p, m)).length;
    if (n >= 8) bc++;
  }
  say(`  /bloom-calendar/zone-<z>/<m>/ ${bc}   (threshold 8)`);
  const total = ALL.length + zoneVals.length + monthVals.length + colorVals.length + lightVals.length + typeVals.length + traitVals.length + bc;
  say(`  ------------------------------------`);
  say(`  catalog-driven pages today .. ${total}  (+ home, /plants/, /guides/, guide pages, /bloom-calendar/, /credits/, /privacy/, /terms/, 404)`);
  say();
}

// ---- PET TOXICITY -----------------------------------------------------------
say("#".repeat(78));
say("# PET TOXICITY / SAFETY DATA");
say("#".repeat(78));
say();
{
  const bySlug = new Map(ALL.map((p) => [p.slug, p]));
  const intelSlugs = Object.keys(INTEL);
  const matched = intelSlugs.filter((s) => bySlug.has(s));
  const withSafety = intelSlugs.filter((s) => INTEL[s].safety);
  const safetyMatched = withSafety.filter((s) => bySlug.has(s));
  say(`  deep-intel records .................. ${intelSlugs.length}`);
  say(`  ... that match a live catalog slug .. ${matched.length}`);
  say(`  ... carrying a safety block ......... ${withSafety.length}  (matched: ${safetyMatched.length})`);
  const mild = safetyMatched.filter((s) => INTEL[s].safety.level === "mild").length;
  const serious = safetyMatched.filter((s) => INTEL[s].safety.level === "serious").length;
  say(`      level=mild ${mild}   level=serious ${serious}`);

  // group expansion: a species-level safety fact applies to its whole group
  const groupsWithSafety = new Set();
  for (const s of safetyMatched) groupsWithSafety.add(bySlug.get(s)._grp);
  const covered = ALL.filter((p) => groupsWithSafety.has(p._grp));
  say(`  distinct groups with a safety block . ${groupsWithSafety.size}`);
  say(`  plants covered IF expanded by group . ${covered.length}  (${(covered.length / ALL.length * 100).toFixed(1)}% of the catalog)`);
  say(`  plants with NO safety data .......... ${ALL.length - covered.length}`);

  // Does the safety text actually say cat / dog?
  const cls = { toxicPet: [], safePet: [], pplOnly: [], unclear: [] };
  for (const s of safetyMatched) {
    const t = INTEL[s].safety.text.toLowerCase();
    const mentionsPet = /\b(cat|cats|dog|dogs|pet|pets|feline|canine)\b/.test(t);
    const negated = /\b(non-?toxic|not toxic|no( known)? (risk|toxicity)|safe (around|for)|low risk to pets)\b/.test(t);
    if (!mentionsPet) cls.pplOnly.push(s);
    else if (negated && !/toxic to (dogs|cats)/.test(t)) cls.safePet.push(s);
    else if (/toxic to|poisonous to|harmful to|dangerous to/.test(t)) cls.toxicPet.push(s);
    else cls.unclear.push(s);
  }
  say();
  say(`  safety text mentions pets and reads TOXIC ....... ${cls.toxicPet.length}`);
  say(`  safety text mentions pets and reads NON-TOXIC ... ${cls.safePet.length}`);
  say(`  safety text is about people/livestock only ...... ${cls.pplOnly.length}`);
  say(`  ambiguous (needs a human read) ................. ${cls.unclear.length}`);
  say(`  NOTE: this is a regex sniff of prose, not a field. There is no structured`);
  say(`        toxicity field anywhere in the catalog or in deep-intel.`);
  const safeGroups = new Set(cls.safePet.map((s) => bySlug.get(s)._grp));
  const toxGroups = new Set(cls.toxicPet.map((s) => bySlug.get(s)._grp));
  const safeCovered = ALL.filter((p) => safeGroups.has(p._grp));
  const toxCovered = ALL.filter((p) => toxGroups.has(p._grp));
  say();
  say(`  "Pet-safe plants" page would list ..... ${cls.safePet.length} species / ${safeCovered.length} plants after group expansion`);
  say(`  "Toxic to pets" page would list ....... ${cls.toxicPet.length} species / ${toxCovered.length} plants after group expansion`);
  // extraFacts "Safe around pets" / "Non-toxic to pets"
  let facts = 0;
  for (const s of intelSlugs) for (const f of (INTEL[s].extraFacts || [])) if (/pets?/i.test(f.label)) facts++;
  say(`  extraFacts labelled about pets ........ ${facts}`);
  say();
  // cross a pet-safe set with zones/light to see if sub-pages could ever be non-thin
  say("  If pet-safe were a trait, could it cross with anything?");
  for (const [dn, d] of Object.entries({ zone: DIMS.zone, light: DIMS.light, type: DIMS.type })) {
    const cells = d.values().map((v) => safeCovered.filter((p) => d.has(p, v)).length).filter((n) => n >= 8);
    say(`    pet-safe x ${dn}: ${cells.length} cells >= 8 plants  (of ${d.values().length} possible)`);
  }
  const toxCells = DIMS.zone.values().map((v) => toxCovered.filter((p) => DIMS.zone.has(p, v)).length).filter((n) => n >= 8);
  say(`    toxic x zone: ${toxCells.length} cells >= 8 plants`);
  say();
}

// ---- PLANTING CALENDAR ------------------------------------------------------
say("#".repeat(78));
say("# PLANTING / SOWING CALENDAR - what data exists");
say("#".repeat(78));
say();
{
  const fields = new Set();
  for (const p of ALL) for (const k of Object.keys(p)) fields.add(k);
  say(`  catalog fields: ${[...fields].sort().join(", ")}`);
  const plantingish = [...fields].filter((f) => /sow|plant(ing)?|seed|germ|frost|transplant|harvest|divide|prune/i.test(f));
  say(`  fields that could carry planting/sowing timing: ${plantingish.length ? plantingish.join(", ") : "NONE"}`);
  // tags that hint at planting timing
  const tagHints = new Set();
  for (const p of ALL) for (const t of p._tags) if (/sow|seed|bulb|spring|fall|autumn|winter|summer|frost/.test(t)) tagHints.add(t);
  say(`  tags that hint at seasonality: ${[...tagHints].sort().join(", ") || "none"}`);
  // deep-intel notes/facts mentioning planting timing
  let noteHits = 0, factHits = 0; const noteEx = [];
  for (const s of Object.keys(INTEL)) {
    for (const n of (INTEL[s].notes || [])) if (/plant|sow|seed|frost|divide/i.test(n.topic + " " + n.text)) { noteHits++; if (noteEx.length < 6) noteEx.push(`${s}: "${n.topic}"`); }
    for (const f of (INTEL[s].extraFacts || [])) if (/plant|sow|seed|frost/i.test(f.label + " " + f.value)) factHits++;
  }
  say(`  deep-intel notes touching planting/sowing/frost: ${noteHits} (of ${Object.values(INTEL).reduce((n, r) => n + (r.notes || []).length, 0)} notes)`);
  say(`  deep-intel extraFacts touching the same: ${factHits}`);
  say(`  examples: ${noteEx.join(" | ")}`);
  say();
  // What a planting calendar page set would look like IF derived from zone x category
  say("  Hypothetical /planting-calendar/zone-<z>/<month>/: the cell population would have");
  say("  to be DERIVED (sow date = f(zone last-frost, category, bloom start)), because no");
  say("  planting-date field exists. Sizes of the derivable buckets, per zone:");
  const zoneVals = DIMS.zone.values();
  const catVals = DIMS.type.values();
  say(`    zones present: ${zoneVals.join(", ")}`);
  say(`    categories: ${catVals.map((c) => `${c}(${ALL.filter((p) => p._cat === c).length})`).join(", ")}`);
  say();
}

// ---- companion / compatibility ---------------------------------------------
say("#".repeat(78));
say("# COMPANION DATA (src/data/compatibility.json)");
say("#".repeat(78));
say();
{
  try {
    const comp = JSON.parse(fs.readFileSync(`${REPO}/src/data/compatibility.json`, "utf8"));
    const keys = Object.keys(comp);
    say(`  top-level keys: ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? " ..." : ""}`);
    say(`  entries: ${keys.length}`);
    say(`  sample: ${JSON.stringify(comp[keys[0]]).slice(0, 300)}`);
  } catch (e) { say(`  (could not read: ${e.message})`); }
  say();
}

fs.writeFileSync(`${DIR}/counts.txt`, out.join("\n"));
console.log(out.join("\n"));
