import { libraryCatalog } from "../../bloomseye-studio/src/garden/plantLibrary";
const want = ["perennial-sunflower","rosemary","sneezeweed","fountain-grass","northern-sea-oats","joe-pye-weed","lilac","rock-cress","flowering-crabapple","aster","autumn-crocus","sea-thrift","maiden-grass","periwinkle","hosta","daylily","shrub-rose","butterfly-bush"];
for (const sp of Object.values(libraryCatalog) as any[]) {
  if (!want.includes(sp.assetKey)) continue;
  const z = sp.hardinessZones?.length ? `${Math.min(...sp.hardinessZones)}-${Math.max(...sp.hardinessZones)}` : "none";
  console.log(
    sp.assetKey.padEnd(20) + "| " + String(sp.botanicalName).padEnd(28) + "| " + String(sp.category).padEnd(9) +
    "| " + String(sp.sun).padEnd(10) + "| " + String(sp.water).padEnd(8) + "| z" + z.padEnd(6) +
    "| " + sp.matureHeight + "m | bloom " + (sp.bloom || []).map((b: any) => `${b.startMonth}-${b.endMonth}`).join(",") +
    " | " + (sp.tags || []).join(","),
  );
}
