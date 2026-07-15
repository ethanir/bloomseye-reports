export const meta = {
  name: 'bloomseye-naming-gen',
  description: 'Generate shopper-typed plant name candidates (aliases, brands, misspellings) for the BloomsEye catalog',
  phases: [
    { title: 'Generate', detail: 'category slices + specialists produce candidate name->plant mappings' },
  ],
}

const DIR = '/Users/eirim/bloomseye-reports/naming-audit'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['query', 'targets', 'bucket', 'freq', 'ambiguous', 'note'],
        properties: {
          query: { type: 'string', description: 'exactly what a shopper would type into search, lowercase' },
          targets: { type: 'array', items: { type: 'string' }, description: 'commonName(s) from the catalog this query should reach' },
          bucket: { type: 'string', enum: ['alt-common-name','brand-series','cultivar-trade','misspelling','plural-format','regional','botanical-genus','other'] },
          freq: { type: 'string', enum: ['high','med','low'], description: 'how often a real shopper types this' },
          ambiguous: { type: 'boolean', description: 'true if this name commonly refers to 2+ UNRELATED plant types (e.g. a Sedum AND a Heuchera)' },
          note: { type: 'string', description: 'one short line: why this maps here / why ambiguous' },
        },
      },
    },
  },
}

const MECHANICS = `
HOW BLOOMSEYE SEARCH WORKS TODAY (this is why names fail):
- The in-editor "Add plant" picker matches a query as a single CONTIGUOUS SUBSTRING of
  (commonName + " " + botanicalName + " " + category + " " + tags joined by space), lowercased.
- The Browse tab matches per-WORD (AND): every whitespace token must appear as a substring of
  (commonName + " " + botanicalName) ONLY - Browse ignores category and tags.
- There is NO alias table, NO synonym list, NO fuzzy matching, NO stemming. Punctuation is literal
  (a hyphen in "black-eyed" means the query "black eyed susan" fails the picker's substring test).
So a shopper name RESOLVES today only if that exact text already appears in the plant's name/botanical
(or, for the picker only, its tags). Alternate common names, retail/trademark brand names, and
misspellings are NOT in the data, so they return nothing even when we DO carry the plant.
`

const COMMON = `
${MECHANICS}

You are a horticultural + garden-retail naming expert improving search findability for BloomsEye,
a garden-design app whose north-star user is a non-expert home gardener (the founder's mother).

YOUR JOB: produce candidate shopper-typed search queries that SHOULD reach a plant WE ALREADY CARRY,
but that today's literal substring search would likely MISS because the text isn't in the plant's
name/botanical/tags.

GROUND RULES (critical - fabrication ruins this):
1. Every 'targets' entry MUST be a commonName that literally appears in the catalog. The full catalog is
   at ${DIR}/catalog_compact.txt (format: "commonName | botanical | category | group"). The genus index
   (genus -> commonNames we carry) is ${DIR}/genus_index.json. READ THEM to confirm a plant exists before
   you map to it. If we do NOT carry the plant at all, do NOT invent a mapping - skip it.
2. Only propose REAL names people actually use: established alternate/vernacular common names, real
   registered retail/trademark SERIES (e.g. Knock Out, Endless Summer, Wave, Supertunia, Drift, Encore,
   Proven Winners lines), widely-used cultivar/trade names, common plural/format variants, and genuine
   high-frequency MISSPELLINGS. Do not manufacture plausible-sounding names. When unsure a name is real,
   drop it or mark freq "low" with a note.
3. Focus on HIGH-TRAFFIC plants first (the ones a garden-centre shopper actually buys). Depth on common
   plants beats breadth on obscure ones.
4. 'query' = what the shopper types, lowercased, as they'd type it (include the natural spacing/plural).
5. Set ambiguous=true when the SAME name is commonly a different, UNRELATED plant too (e.g. "cherry
   truffle" is both a Sedum and a Heuchera; "black-eyed susan" is both Rudbeckia and the Thunbergia vine).
   Put ALL the distinct real targets you know in 'targets' and explain in 'note'.
6. Prefer names that today return NOTHING or the WRONG thing. You don't have the search tool; use the
   mechanics above to judge whether the text is already present. When in doubt, include it - it will be
   verified downstream.

Return ONLY the structured candidates. Aim for thorough coverage of your assignment; hundreds of
candidates across the catalog is expected, but every one must be a real name mapped to a real plant.
`

const CAT_SLICES = [
  'perennial-1','perennial-2','annual-1','annual-2','shrub-1','shrub-2',
  'bulb','rose','tree','climber','conifer','grass-herb-fern',
]

const catAgent = (slice) => agent(
  `${COMMON}

YOUR ASSIGNMENT: the plants in ${DIR}/slices/${slice}.txt (format "commonName | botanical | group").
These are the plants you are finding shopper names FOR. For each, think: what ELSE would a real shopper
type to find this plant? Cover alternate common/vernacular names, real retail/trademark series names,
widely-used cultivar/trade names, plural/format variants, and high-frequency misspellings. Cross-check
the full catalog + genus index so a name that spans several of our plants lists them all in 'targets'.`,
  { label: `gen:${slice}`, phase: 'Generate', effort: 'high', schema: SCHEMA }
)

const brandsAgent = () => agent(
  `${COMMON}

YOUR ASSIGNMENT (SPECIALIST - RETAIL BRANDS & TRADEMARK SERIES): sweep the WHOLE catalog
(${DIR}/catalog_compact.txt) and map popular garden-centre BRAND / TRADEMARK / SERIES names to the
genus or specific plants we carry. Think of what's on the plant TAG at Home Depot / Lowe's / a nursery:
  - Roses: Knock Out, Double Knock Out, Drift, Oso Easy, Flower Carpet, At Last, David Austin (English roses).
  - Hydrangea: Endless Summer, Limelight, Little Lime, Annabelle, Incrediball, Bobo, Vanilla Strawberry,
    Quick Fire, Pinky Winky, Let's Dance, Invincibelle.
  - Petunia: Wave, Supertunia, Surfinia; Calibrachoa: Superbells, Million Bells; Verbena: Superbena.
  - Proven Winners lines broadly (Supertunia, Superbells, Rockin', Sunsatia, Lo & Behold, etc.).
  - Lilac: Bloomerang; Azalea/Rhododendron: Encore, Bloom-A-Thon; Weigela: Wine & Roses, Sonic Bloom;
    Spirea: Double Play; Ninebark: Diabolo, Tiny Wine; Nandina; Buddleia: Lo & Behold, Pugster.
  - Coneflower: Cheyenne Spirit, PowWow, Sombrero, Double Scoop; Coreopsis: Big Bang; Heuchera: Dolce,
    ColorSplash; Hosta trade names; Daylily: Stella de Oro, Rainbow Rhythm; Salvia: Color Spires.
  - Any other real trademark series you know that maps onto a genus we carry.
Only map to plants that actually exist in the catalog (verify). If we carry the GENUS but not that exact
series/cultivar, still propose the brand name mapped to the genus's plants (freq per real popularity),
and note "series not carried; maps to genus". Mark ambiguous where a brand name spans unrelated genera.`,
  { label: 'gen:brands', phase: 'Generate', effort: 'high', schema: SCHEMA }
)

const misspellAgent = () => agent(
  `${COMMON}

YOUR ASSIGNMENT (SPECIALIST - MISSPELLINGS & TYPOS): for the HIGHEST-TRAFFIC plants in the catalog
(${DIR}/catalog_compact.txt) - the common genera and common names a shopper types most - produce the
common REAL misspellings, phonetic spellings, and typos people actually enter. Examples of the kind of
thing (verify the correct plant exists before mapping):
  hydrangea->hydrangia/hydrangea/hidrangea, echinacea->echinacia/echinacea, fuchsia->fuschia,
  clematis->clamatis, chrysanthemum->crysanthemum, rhododendron->rhododendrun/rhodadendron,
  peony->peonie/peaony, dahlia->dalia/dahila, petunia->petunya, geranium->geranuim,
  begonia->begonya, lavender->lavendar/lavander, gardenia, hibiscus->hibiscous, delphinium->delphenium,
  marigold, zinnia->zinia, gladiolus->gladiola/gladiolas, wisteria->wisteria/westeria,
  forsythia, hollyhock, snapdragon, columbine->columbein, coreopsis, gaillardia, ranunculus->ranunculas.
Also plural/format issues shoppers type: peonies, mums, hostas, daylilies, lilies, iris(es).
Focus on plants we CARRY. Set freq by how common both the plant AND the misspelling are.`,
  { label: 'gen:misspell', phase: 'Generate', effort: 'high', schema: SCHEMA }
)

const regionalAgent = () => agent(
  `${COMMON}

YOUR ASSIGNMENT (SPECIALIST - ALTERNATE & REGIONAL COMMON NAMES): sweep the WHOLE catalog
(${DIR}/catalog_compact.txt + ${DIR}/genus_index.json) and map established ALTERNATE/VERNACULAR common
names to the plant we carry under a DIFFERENT name. This is the core "stonecrop -> Sedum" case. Examples
of the pattern (verify each target exists):
  stonecrop->Sedum, cranesbill->hardy Geranium, tickseed->Coreopsis, lamb's ear->Stachys,
  coral bells->Heuchera, foamflower->Tiarella, bee balm/bergamot->Monarda, blanket flower->Gaillardia,
  pincushion flower->Scabiosa, obedient plant->Physostegia, Joe Pye weed->Eutrochium/Eupatorium,
  false indigo->Baptisia, blazing star/gayfeather->Liatris, spiderwort->Tradescantia,
  masterwort->Astrantia, meadow rue->Thalictrum, sneezeweed->Helenium, turtlehead->Chelone,
  bugbane/black cohosh->Actaea/Cimicifuga, catmint->Nepeta, hens and chicks->Sempervivum,
  Solomon's seal->Polygonatum, lungwort->Pulmonaria, mums->Chrysanthemum, cotton lavender->Santolina,
  Russian sage->Perovskia/Salvia, mona lavender->Plectranthus, busy lizzie->Impatiens,
  Michaelmas daisy->aster/Symphyotrichum, sweet william->Dianthus, granny's bonnet->Aquilegia,
  poker/torch lily->Kniphofia, montbretia->Crocosmia, naked ladies/surprise lily->Lycoris,
  service berry/juneberry/shadbush->Amelanchier, ninebark->Physocarpus, smoke bush/tree->Cotinus,
  rose of sharon->Hibiscus syriacus, mock orange->Philadelphus, butterfly bush->Buddleia,
  beautyberry->Callicarpa, snowball bush->Viburnum, mophead/lacecap->Hydrangea, quaking aspen->Populus.
Include British-vs-American name splits and other genuine vernacular. Mark ambiguous where a common name
spans unrelated plants (e.g. "geranium" = hardy Geranium AND annual Pelargonium; "dusty miller",
"snow on the mountain", "money plant", "ice plant", "mock orange", "cedar").`,
  { label: 'gen:regional', phase: 'Generate', effort: 'high', schema: SCHEMA }
)

phase('Generate')
const results = await parallel([
  ...CAT_SLICES.map((s) => () => catAgent(s)),
  brandsAgent,
  misspellAgent,
  regionalAgent,
])

const all = []
results.filter(Boolean).forEach((r) => { if (r && Array.isArray(r.candidates)) all.push(...r.candidates) })
log(`collected ${all.length} raw candidates from ${results.filter(Boolean).length} agents`)
return { candidates: all, agents: results.filter(Boolean).length }
