/**
 * photo-coverage.ts - READ-ONLY. For every catalog plant, resolve its photoSlug
 * (group-default aware, via the real photoSlugFor) and mark whether the live
 * photos.json has a real photo under that slug. Writes photo-coverage.json.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { photoSlugFor } from "../../Downloads/bloomseye-studio/src/garden/plantLibrary";

const OUT = path.join(process.env.HOME || ".", "bloomseye-reports", "data-quality-audit");

async function main() {
  const flat = JSON.parse(await fs.readFile(path.join(OUT, "catalog-flat.json"), "utf8")) as any[];
  const photosDoc = JSON.parse(await fs.readFile(path.join(OUT, "live-photos.json"), "utf8"));
  const photoMap: Record<string, any[]> = photosDoc.photos || {};
  const photoSlugs = new Set(Object.keys(photoMap));

  const rows = flat.map((p) => {
    const pslug = photoSlugFor(p.slug) ?? p.slug;
    const has = photoSlugs.has(pslug);
    return { slug: p.slug, photoSlug: pslug, source: p.source, category: p.category, hasRealPhoto: has, nPhotos: has ? (photoMap[pslug]?.length ?? 0) : 0 };
  });

  const withPhoto = rows.filter((r) => r.hasRealPhoto).length;
  await fs.writeFile(path.join(OUT, "photo-coverage.json"), JSON.stringify(rows, null, 2));

  // group-default plants (the representative cards actually surfaced) coverage
  const defaults = flat.filter((p) => !p.group || p.groupDefault);
  const defaultsWithPhoto = defaults.filter((p) => photoSlugs.has(photoSlugFor(p.slug) ?? p.slug)).length;

  console.log(JSON.stringify({
    totalPlants: rows.length,
    plantsWithRealPhoto: withPhoto,
    plantsWithoutRealPhoto: rows.length - withPhoto,
    coveragePct: +(100 * withPhoto / rows.length).toFixed(1),
    photoSlugsInManifest: photoSlugs.size,
    representativePlants: defaults.length,
    representativeWithPhoto: defaultsWithPhoto,
    representativeCoveragePct: +(100 * defaultsWithPhoto / defaults.length).toFixed(1),
    photoSlugsNotMatchingAnyPlant: [...photoSlugs].filter((s) => !flat.some((p) => (photoSlugFor(p.slug) ?? p.slug) === s)),
  }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
