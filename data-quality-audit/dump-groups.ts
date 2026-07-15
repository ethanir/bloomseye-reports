import { promises as fs } from "node:fs";
import path from "node:path";
import { PLANT_GROUPS, LIBRARY_COUNT, libraryCatalog } from "../../Downloads/bloomseye-studio/src/garden/plantLibrary";
const OUT = path.join(process.env.HOME || ".", "bloomseye-reports", "data-quality-audit");
async function main(){
  await fs.writeFile(path.join(OUT,"plant-groups.json"), JSON.stringify(PLANT_GROUPS,null,2));
  console.log(JSON.stringify({ LIBRARY_COUNT, dedupedCatalogSize: Object.keys(libraryCatalog).length, groups: PLANT_GROUPS.length }, null, 2));
}
main().catch(e=>{console.error(e);process.exit(1);});
