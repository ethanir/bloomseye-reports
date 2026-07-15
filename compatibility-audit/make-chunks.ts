/**
 * make-chunks.ts - READ-ONLY. Split the review packets into per-agent chunks and
 * cut the per-lens flag files. Writes only into this folder.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const packets = JSON.parse(readFileSync(`${HERE}/data/review-packets.json`, "utf8"));
const flags = JSON.parse(readFileSync(`${HERE}/data/flags.json`, "utf8"));

mkdirSync(`${HERE}/data/chunks`, { recursive: true });
mkdirSync(`${HERE}/data/lenses`, { recursive: true });

const PER = 10;
const n = Math.ceil(packets.length / PER);
for (let i = 0; i < n; i++) {
  const slice = packets.slice(i * PER, (i + 1) * PER);
  writeFileSync(`${HERE}/data/chunks/chunk-${String(i + 1).padStart(2, "0")}.json`, JSON.stringify(slice, null, 2));
}
console.log(`${n} chunks of up to ${PER} archetype subjects each`);

// Per-lens flag files. Dedupe by (rule, subject-genus, companion) where a whole
// variant group repeats the same pairing, so a lens sees the SHAPE not 18 copies.
const byRule = new Map<string, any[]>();
for (const f of flags) {
  const list = byRule.get(f.rule) ?? [];
  list.push(f);
  byRule.set(f.rule, list);
}
for (const [rule, list] of byRule) {
  writeFileSync(`${HERE}/data/lenses/${rule}.json`, JSON.stringify(list, null, 2));
  console.log(`${rule}: ${list.length}`);
}
