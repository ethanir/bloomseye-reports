/**
 * classify.ts - READ-ONLY. Puts every one of the 12,888 pairings into exactly one
 * bucket (solid / questionable / weak) under a stated, mechanical definition, so the
 * headline numbers in the report are reproducible rather than an impression.
 * Writes only into this folder.
 */
import { readFileSync, writeFileSync } from "node:fs";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));
const flags = JSON.parse(readFileSync(`${HERE}/data/flags.json`, "utf8"));

// Index the structural flags by pairing.
const flagsFor = new Map<string, Set<string>>();
for (const f of flags) {
  const k = `${f.subject}>${f.companion}`;
  const s = flagsFor.get(k) ?? new Set<string>();
  s.add(f.rule);
  flagsFor.set(k, s);
}

const TIER1 = new Set(["pampas-grass", "maiden-grass", "butterfly-bush", "periwinkle", "siberian-squill"]);
const TIER2 = new Set(["northern-sea-oats", "sweet-alyssum", "english-daisy", "cleome", "snow-in-summer"]);

interface P { subject: string; companion: string; score: number; reason: string; clauses: string[]; caution: boolean }
const pairings: P[] = [];
for (const [slug, set] of Object.entries(doc.plants) as [string, any][]) {
  for (const c of set.companions) {
    pairings.push({
      subject: slug, companion: c.slug, score: c.score, reason: c.reason,
      clauses: c.reasonParts.map((p: any) => p.key),
      caution: c.reasonParts.some((p: any) => p.key === "caution"),
    });
  }
}

const scores = pairings.map((p) => p.score).sort((a, b) => a - b);
const q = (f: number) => scores[Math.floor((scores.length - 1) * f)];

const bucket = { solid: 0, questionable: 0, weak: 0 };
const why = new Map<string, number>();
const bump = (k: string) => why.set(k, (why.get(k) ?? 0) + 1);
const rows: any[] = [];

for (const p of pairings) {
  const f = flagsFor.get(`${p.subject}>${p.companion}`) ?? new Set<string>();
  const factorClauses = p.clauses.filter((k) => !["conditions", "zones", "caution"].includes(k));

  // --- QUESTIONABLE: a horticulturist would change or caution this before shipping it
  const reasons: string[] = [];
  if (TIER1.has(p.companion) && !p.caution) reasons.push("recommends a regulated/invasive plant with no caution");
  if (TIER2.has(p.companion) && !p.caution) reasons.push("recommends an aggressive self-seeder with no caution");
  if (f.has("bog-vs-xeric")) reasons.push("moisture-obligate beside drought-obligate");
  if (f.has("soil-ph-conflict")) reasons.push("acid-obligate beside a lime-lover (pH not modelled)");
  if (f.has("xeric-vs-wetter")) reasons.push("a xeric plant put on a wetter plant's watering schedule");
  if (f.has("scale-near-cap")) reasons.push("height ratio over 10:1");

  // --- WEAK: it is shown as a recommendation but barely is one
  const weak: string[] = [];
  if (factorClauses.length === 0) weak.push("the reason names no benefit at all");
  else if (factorClauses.length === 1 && factorClauses[0] === "colour") weak.push("the only benefit named is flower colour");
  if (p.score < 45) weak.push("scores under 45/100 (the engine simply found nothing better)");
  if (f.has("canopy-wording")) weak.push('the reason says "carpet the ground beneath" a plant under 2 m');

  let verdict: "solid" | "questionable" | "weak";
  if (reasons.length) { verdict = "questionable"; for (const r of reasons) bump(r); }
  else if (weak.length) { verdict = "weak"; for (const w of weak) bump(w); }
  else verdict = "solid";
  bucket[verdict]++;
  if (verdict !== "solid") rows.push({ ...p, verdict, reasons: [...reasons, ...weak] });
}

const n = pairings.length;
const pc = (x: number) => `${((100 * x) / n).toFixed(1)}%`;
console.log(`=== all ${n} pairings the engine produces for the 1,611-plant library ===\n`);
console.log(`SOLID         ${String(bucket.solid).padStart(6)}  ${pc(bucket.solid)}   nothing in the audit flags them`);
console.log(`QUESTIONABLE  ${String(bucket.questionable).padStart(6)}  ${pc(bucket.questionable)}   a horticulturist would change or caution before shipping`);
console.log(`WEAK          ${String(bucket.weak).padStart(6)}  ${pc(bucket.weak)}   shown as a recommendation but barely is one`);
console.log(`\nscore distribution across all pairings:`);
console.log(`  min ${scores[0]}  p10 ${q(0.1)}  p25 ${q(0.25)}  median ${q(0.5)}  p75 ${q(0.75)}  p90 ${q(0.9)}  max ${scores[scores.length - 1]}`);
console.log(`  pairings scoring under 45/100: ${scores.filter((s) => s < 45).length} (${pc(scores.filter((s) => s < 45).length)})`);
console.log(`  pairings scoring under 55/100: ${scores.filter((s) => s < 55).length} (${pc(scores.filter((s) => s < 55).length)})`);
console.log(`\nwhy a pairing was bucketed (a pairing can trip several; first match sets the bucket):`);
for (const [k, v] of [...why.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(5)}  ${k}`);

writeFileSync(`${HERE}/data/classification.json`, JSON.stringify({
  total: n, bucket,
  pct: { solid: pc(bucket.solid), questionable: pc(bucket.questionable), weak: pc(bucket.weak) },
  scoreDistribution: { min: scores[0], p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: scores[scores.length - 1] },
  under45: scores.filter((s) => s < 45).length,
  under55: scores.filter((s) => s < 55).length,
  why: Object.fromEntries([...why.entries()].sort((a, b) => b[1] - a[1])),
  flagged: rows.slice(0, 500),
}, null, 2));
