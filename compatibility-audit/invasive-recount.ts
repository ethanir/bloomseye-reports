/**
 * invasive-recount.ts - READ-ONLY. The first pass used a regex that missed the
 * library's spelling ("Buddleia", not "Buddleja") and never looked for pampas grass.
 * This recount is by SLUG, over the 276 plants that can actually be recommended.
 * Tier 1 = regulated / widely-listed invasive. Tier 2 = aggressive self-seeder or
 * garden thug that a beginner should be warned about. Writes only into this folder.
 */
import { readFileSync, writeFileSync } from "node:fs";

const HERE = "C:/Users/etano/bloomseye-reports/compatibility-audit";
const doc = JSON.parse(readFileSync(`${HERE}/compatibility.json`, "utf8"));

const CONCERN: Record<string, { tier: 1 | 2; bot: string; why: string }> = {
  "pampas-grass": { tier: 1, bot: "Cortaderia selloana", why: "Invasive in CA, HI, TX and the Southeast; a listed noxious weed in several counties. Also physically hazardous: the leaf margins cut skin." },
  "maiden-grass": { tier: 1, bot: "Miscanthus sinensis", why: "Self-seeds into wild land; listed invasive across much of the eastern US; regulated in several states." },
  "butterfly-bush": { tier: 1, bot: "Buddleia davidii", why: "Class B noxious weed in Washington and a quarantine-listed noxious weed in Oregon; invasive in the PNW and parts of the East." },
  "periwinkle": { tier: 1, bot: "Vinca minor", why: "Escapes into woodland and forms monocultures; listed invasive in much of the eastern US." },
  "siberian-squill": { tier: 1, bot: "Scilla siberica", why: "Naturalises aggressively into woodland and lawns; increasingly listed invasive in the Upper Midwest and Northeast." },
  "english-daisy": { tier: 2, bot: "Bellis perennis", why: "Invasive in the Pacific Northwest; a lawn and meadow weed." },
  "sweet-alyssum": { tier: 2, bot: "Lobularia maritima", why: "Naturalised and invasive in coastal California." },
  "northern-sea-oats": { tier: 2, bot: "Chasmanthium latifolium", why: "Native, but reseeds prolifically; extension guides warn it becomes a weed in a small garden." },
  "cleome": { tier: 2, bot: "Cleome hassleriana", why: "Self-seeds heavily; volunteers everywhere the next year." },
  "snow-in-summer": { tier: 2, bot: "Cerastium tomentosum", why: "Can run and swamp neighbours in a rock garden." },
};

interface Row { slug: string; tier: number; bot: string; why: string; lists: number; cautioned: number; praised: number; sampleReason: string; praisePhrase: string }
const rows: Row[] = [];

for (const [slug, meta] of Object.entries(CONCERN)) {
  let lists = 0, cautioned = 0, praised = 0, sampleReason = "", praisePhrase = "";
  for (const set of Object.values(doc.plants) as any[]) {
    for (const c of set.companions) {
      if (c.slug !== slug) continue;
      lists++;
      const hasCaution = (c.reasonParts ?? []).some((p: any) => p.key === "caution");
      if (hasCaution) cautioned++;
      const m = /its seed heads stand through winter[^;.]*|evergreen, so the bed keeps its shape through winter|to carpet the ground beneath[^;.]*|blooms in [a-z ]+, extending the bed's season/.exec(c.reason);
      if (m) { praised++; if (!praisePhrase) praisePhrase = m[0]; }
      if (!sampleReason) sampleReason = c.reason;
    }
  }
  rows.push({ slug, tier: meta.tier, bot: meta.bot, why: meta.why, lists, cautioned, praised, sampleReason, praisePhrase });
}
rows.sort((a, b) => a.tier - b.tier || b.lists - a.lists);

let t1 = 0, t2 = 0, t1c = 0;
for (const r of rows) { if (r.tier === 1) { t1 += r.lists; t1c += r.cautioned; } else t2 += r.lists; }

console.log("=== plants of concern that the engine RECOMMENDS, by how many of the 1,611 lists they appear in ===\n");
console.log("tier  plant                  botanical                 lists  cautioned  reason-praises-the-trait");
for (const r of rows) {
  console.log(
    `  ${r.tier}   ${r.slug.padEnd(20)} ${r.bot.padEnd(24)} ${String(r.lists).padStart(5)} ${String(r.cautioned).padStart(10)} ${String(r.praised).padStart(12)}`,
  );
}
console.log(`\nTIER 1 (regulated / widely-listed invasive): ${t1} recommendations across the catalog, ${t1c} of them cautioned.`);
console.log(`TIER 2 (aggressive self-seeder / thug):      ${t2} recommendations.`);
console.log(`TOTAL:                                       ${t1 + t2} recommendations of a plant a beginner should be warned about.\n`);
for (const r of rows.filter((x) => x.lists > 0)) {
  console.log(`--- ${r.bot} (${r.lists} lists, tier ${r.tier})`);
  console.log(`    ${r.why}`);
  console.log(`    a reason the user is shown: "${r.sampleReason}"`);
  if (r.praisePhrase) console.log(`    the reason PRAISES: "${r.praisePhrase}"`);
}

writeFileSync(`${HERE}/data/invasive-recount.json`, JSON.stringify({ tier1Recommendations: t1, tier1Cautioned: t1c, tier2Recommendations: t2, total: t1 + t2, rows }, null, 2));
