/**
 * extract.ts - READ-ONLY faithful export of the whole BloomsEye catalog.
 * Runs the actual build() expander over built-ins + the frozen community snapshot
 * (the same code paths publish-catalog.ts uses), then writes one flat JSON to the
 * report folder. Writes NOTHING into the repo. Run with:
 *   cd ~/Downloads/bloomseye-studio && node_modules/.bin/tsx ~/bloomseye-reports/data-quality-audit/extract.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { libraryCatalog, build, type Def } from "../../Downloads/bloomseye-studio/src/garden/plantLibrary";
import type { Species } from "../../Downloads/bloomseye-studio/src/garden/schema";

const OUT = path.join(process.env.HOME || ".", "bloomseye-reports", "data-quality-audit");

// Mirror publish-catalog.ts community expansion (kept faithful to its logic).
const CATS = new Set(["Perennial", "Annual", "Bulb", "Shrub", "Tree", "Conifer", "Fern", "Rose", "Climber", "Grass", "Herb"]);
const SUNS = new Set(["full-sun", "part-sun", "part-shade", "full-shade"]);
const WATERS = new Set(["low", "moderate", "high"]);
const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-fA-F]{3,8}$/.test(s);
const month = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 12 ? Math.round(n) : null);
const positive = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 100 ? n : null);

interface Row {
  slug: string; name: string; botanical: string | null; category: string;
  height_m: number; spread_m: number; years: number | null;
  bloom_start_month: number | null; bloom_end_month: number | null; bloom_color: string | null;
  sun: string; water: string; zone_min: number | null; zone_max: number | null;
  foliage_color: string | null; tags: string[] | null; description: string | null;
  image_url?: string | null; image_w?: number | null; image_h?: number | null;
  card_url?: string | null; card_w?: number | null; card_h?: number | null; status?: string | null;
}
function rowToDef(row: Partial<Row> | null | undefined): Def | null {
  if (!row) return null;
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const cat = typeof row.category === "string" ? row.category.trim() : "";
  const h = positive(row.height_m);
  const w = positive(row.spread_m);
  if (!slug || !name || !CATS.has(cat) || h == null || w == null) return null;
  const sun = typeof row.sun === "string" && SUNS.has(row.sun) ? row.sun : "full-sun";
  const water = typeof row.water === "string" && WATERS.has(row.water) ? row.water : "moderate";
  const bs = month(row.bloom_start_month);
  const be = month(row.bloom_end_month);
  const bloom: Def["bloom"] = bs != null && be != null && isHex(row.bloom_color) ? [[bs, be, row.bloom_color as string]] : undefined;
  const zmin = typeof row.zone_min === "number" ? Math.round(row.zone_min) : null;
  const zmax = typeof row.zone_max === "number" ? Math.round(row.zone_max) : null;
  const zones = zmin != null && zmax != null && zmin >= 1 && zmax <= 13 && zmin <= zmax ? `${zmin}-${zmax}` : undefined;
  const tags = Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string" && t.length > 0).slice(0, 24) : undefined;
  const years = typeof row.years === "number" && Number.isFinite(row.years) && row.years >= 1 && row.years <= 60 ? Math.round(row.years) : 3;
  return {
    slug, name,
    botanical: typeof row.botanical === "string" && row.botanical.trim() ? row.botanical.trim() : name,
    cat: cat as Def["cat"], h, w, years, bloom,
    sun: sun as Def["sun"], water: water as Def["water"], zones,
    foliage: isHex(row.foliage_color) ? (row.foliage_color as string) : undefined,
    tags,
  };
}

interface FlatPlant {
  id: string; slug: string; source: "builtin" | "community";
  commonName: string; botanicalName?: string; category?: string;
  bloom: { startMonth: number; endMonth: number; color: string }[];
  foliageColor: string; hardinessZones: number[];
  sun?: string; water?: string;
  matureHeight: number; matureSpread: number; yearsToMaturity: number;
  tags: string[]; description?: string;
  group?: string; groupName?: string; groupDefault?: boolean; community: boolean;
  hasImage: boolean;   // has a real cut-out (community only carries one inline)
  hasCard: boolean;
}

function flatten(sp: Species, source: "builtin" | "community"): FlatPlant {
  return {
    id: sp.id, slug: sp.assetKey ?? sp.id, source,
    commonName: sp.commonName, botanicalName: sp.botanicalName, category: sp.category,
    bloom: sp.bloom.map((b) => ({ startMonth: b.startMonth, endMonth: b.endMonth, color: b.color })),
    foliageColor: sp.foliageColor, hardinessZones: sp.hardinessZones,
    sun: sp.sun, water: sp.water,
    matureHeight: sp.matureHeight, matureSpread: sp.matureSpread, yearsToMaturity: sp.yearsToMaturity,
    tags: sp.tags, description: sp.description,
    group: sp.group, groupName: sp.groupName, groupDefault: sp.groupDefault,
    community: !!sp.community,
    hasImage: !!(sp.imageUrl || sp.assetKey),
    hasCard: !!(sp.cardUrl),
  };
}

async function main() {
  const repoData = path.join(process.cwd(), "src", "data", "community-snapshot.json");
  const communityRows = JSON.parse(await fs.readFile(repoData, "utf8")) as Partial<Row>[];

  const builtins = Object.values(libraryCatalog) as Species[];
  const builtinIds = new Set(builtins.map((s) => s.id));

  const flat: FlatPlant[] = builtins.map((s) => flatten(s, "builtin"));

  // Community: expand only rows that pass rowToDef, skip archived, and (as buildCatalog does)
  // drop any whose id already exists as a built-in.
  const communityFlat: FlatPlant[] = [];
  let communitySkippedArchived = 0, communitySkippedBadRow = 0, communityCollided = 0;
  for (const row of communityRows) {
    if ((row.status ?? "active") === "archived") { communitySkippedArchived++; continue; }
    const def = rowToDef(row);
    if (!def) { communitySkippedBadRow++; continue; }
    let sp: Species;
    try { sp = build(def); } catch { communitySkippedBadRow++; continue; }
    // carry description + inline image/card flags
    const merged: Species = {
      ...sp, community: true,
      description: typeof row.description === "string" && row.description.trim() ? row.description.trim() : sp.description,
      imageUrl: (typeof row.image_url === "string" && row.image_url) ? row.image_url : undefined,
      cardUrl: (typeof row.card_url === "string" && row.card_url) ? row.card_url : undefined,
    };
    if (builtinIds.has(sp.id)) { communityCollided++; continue; }
    communityFlat.push(flatten(merged, "community"));
  }

  const all = [...flat, ...communityFlat];
  await fs.writeFile(path.join(OUT, "catalog-flat.json"), JSON.stringify(all, null, 2));

  // Also dump the raw community rows (unexpanded) so we can audit fields build() drops.
  await fs.writeFile(path.join(OUT, "community-raw.json"), JSON.stringify(communityRows, null, 2));

  console.log(JSON.stringify({
    builtins: flat.length,
    communityRows: communityRows.length,
    communityPublished: communityFlat.length,
    communitySkippedArchived, communitySkippedBadRow, communityCollided,
    total: all.length,
  }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
