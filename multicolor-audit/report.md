# BloomsEye catalog: the "one color per plant" audit

**Date:** 2026-07-14
**Scope:** read-only investigation. Nothing in the repo was changed. All findings and any suggested fixes live in this folder only.
**Question:** which plants in the catalog come, in botanical reality, in several colors but are stored with a single color?

**Method:** extracted all 1,611 library entries and the 176 variant groups from `src/garden/plantLibrary.ts`, then ran a botanist assessment over every ungrouped single-entry plant and every existing group, with an independent adversarial second-opinion pass on every plant flagged multi-color (40 verifications). Confidence and caveats in `candidates.csv`. Raw data: `plants.json`, `result.json`, `groups.json`.

---

## The headline (read this first)

**Color lives in one place.** Each catalog entry (`Def` in `plantLibrary.ts`) stores its flower color as `bloom: [startMonth, endMonth, "#hex"][]` plus a `foliageColor`. One flower color per entry, validated by Zod (`BloomWindow.color`, `src/garden/schema.ts`). There is no "colors" array. A plant that comes in five colors is represented by **five separate entries**.

**The catalog already solves multi-color for the famous cases.** There is a mature 176-group variant system (`PLANT_GROUPS`) that covers **1,511 of the 1,611 entries**. Roses, tulips, hydrangeas, dahlias, coneflowers, lantana, peonies, daylilies, chrysanthemums, petunias, zinnias and ~165 more genera are each already split into per-color entries that collapse into one picker card. So the brief's premise ("hydrangeas, roses, tulips, dahlias, coneflowers, lantana come in several") is real, but the app has already built entries for those colors. The author even handled the hard case: trailing purple lantana (`Lantana montevidensis`, a smaller, different-habit species) is split from the upright multicolor `L. camara`.

**So the actual gap is two-sided and much smaller than the raw premise suggests:**

1. **100 ungrouped single-entry plants**, each stored as one color. Of these, **39 genuinely come in multiple garden colors** (36 clearly, 3 probably) and are stored as one, **9 of those are the rare "color signals a different plant" cases**, while **61 are correctly single-color or are foliage plants** where flower color is not the point.
2. **22 existing groups under-cover color** (8 notably, 14 minor). Some are grouped by *form/species* rather than color (hydrangea by mophead/panicle/oakleaf, iris by bearded/Siberian/Dutch) and so miss the color range shoppers expect; a few color-variant groups are simply thin (the small rose groups have no red or white).

Everything below is ranked by how common and shopper-relevant the plant is.

---

## Bucket 1: Clearly multi-color, stored as one color, trivial to note (36 plants)

These are single catalog entries whose genus/species is unambiguously sold in several colors at ordinary garden centers. The stored color is usually a fair default; it just is not the only color. Ranked by shopper relevance then confidence.

### High shopper relevance (14) - the ones a beginner actively picks by color

| Plant | Botanical | Stored | Real garden colors | Conf |
|---|---|---|---|---|
| **Primrose** | *Primula* (polyanthus/acaulis) | yellow | yellow, red, pink, purple, blue, white, orange | 0.97 |
| **Carnation** | *Dianthus caryophyllus* | pink | pink, red, white, yellow, salmon, purple, picotee | 0.95 |
| **Climbing Rose** (generic entry) | *Rosa* | pink | red, pink, white, yellow, apricot, bicolor | 0.95 |
| **Salvia (Annual)** | *Salvia splendens* | red | red, purple, white, salmon, lavender, burgundy, coral | 0.95 |
| **Sweet William** | *Dianthus barbatus* | pink | pink, red, white, purple, maroon, bicolor | 0.95 |
| **Cyclamen** | *Cyclamen* (florist) | pink | pink, white, red, magenta, purple, salmon | 0.93 |
| **Japanese Anemone** | *Anemone hupehensis / x hybrida* | pink | pink, white, deep rose | 0.92 |
| **Butterfly Weed** | *Asclepias tuberosa* | orange | orange, yellow, red | 0.90 |
| **Penstemon** | *Penstemon* (genus entry) | magenta/pink | red, purple, pink, white, coral, lavender-blue | 0.90 |
| **Pincushion Flower** | *Scabiosa* | blue | lavender-blue, pink, white, burgundy | 0.90 |
| **Rock Cress** | *Aubrieta* | purple | purple, blue, red, pink, white | 0.90 |
| **Anise Hyssop** | *Agastache* | purple | purple, blue, orange, coral, peach, pink, yellow | 0.85 |
| **Creeping Sedum** | *Sedum* (stonecrop) | yellow | yellow, white, pink, red | 0.85 |
| **Lungwort** | *Pulmonaria* | purple | blue, pink, purple, white, coral | 0.85 |

Notes worth carrying forward:
- **Climbing Rose** is a *generic* `Rosa` entry that sits **outside** the existing 10-member `climbing-roses` group. It is effectively a duplicate/placeholder (see the data-hygiene note at the end). If it stays, it should join the group, not sprout its own color set.
- **Penstemon** and **Anise Hyssop** are genus-level entries and also appear in Bucket 3 (color maps to a genuinely different plant), so treat them carefully.
- The adversarial pass trimmed several ranges to what is honestly sold: carnation's "blue/green" are dyed, not natural; annual salvia's "blue" is a different species (*S. farinacea*); Japanese anemone has **no** blue/red/purple (that is the unrelated spring *Anemone coronaria*). Details per row in `candidates.csv`.

### Medium shopper relevance (23)

English Daisy (*Bellis*, white/pink/red), Red Hot Poker (*Kniphofia*, red/orange/yellow/coral/cream), Sneezeweed (*Helenium*, yellow/orange/red/bronze), Barrenwort (*Epimedium*, yellow/red/purple/pink/white/orange), Bergenia (pink/white/magenta), Gaura (white/pink), Mullein (*Verbascum*, yellow/apricot/pink/purple/white), Periwinkle (*Vinca minor*, blue/white/burgundy), Spiderwort (*Tradescantia*, blue/purple/magenta/pink/white), Ice Plant (*Delosperma*, magenta/pink/yellow/orange/red/purple/white), Blazing Star (*Liatris*, purple/white), Dead Nettle (*Lamium*, magenta/white/purple), Globeflower (*Trollius*, yellow/orange/cream), Obedient Plant (*Physostegia*, pink/white), Sea Thrift (*Armeria*, pink/white/rose), Aloe (orange/red/yellow/coral), Meadow Rue (*Thalictrum*, purple/white/yellow), Thyme (*Thymus*, purple/pink/magenta/white), Monkshood (*Aconitum*, blue/purple/white), Turtlehead (*Chelone*, pink/white), Ligularia (yellow/orange), Jacob's Ladder (*Polemonium*, blue/white/pink).

(Sea Holly, *Eryngium*, was clearly-multi on the first pass but the verifier flagged that its multiple colors track different species with different lifespans, so it sits in Bucket 2 / Bucket 3 below.)

Several of these are genuinely just two colors (a default plus a white or a second shade): Liatris, Turtlehead, Obedient Plant, Gaura, Sea Thrift, Jacob's Ladder. Cheap to represent, low urgency.

Full per-plant reasoning, corrected color lists, confidence, and verifier caveats: **`candidates.csv`** (sorted with this bucket first).

---

## Bucket 2: Probably multi-color (3 plants)

- **Sea Holly** (*Eryngium*) - stored blue; blue, silvery-white and green all exist, but the verifier judged the silver form less universally stocked and (see Bucket 3) tied to a different species/lifespan. Conf 0.80. Also flagged color-affects-size.
- **Toad Lily** (*Tricyrtis*) - stored purple; white and yellow species-forms exist but availability is a shade-plant-specialist affair. Conf 0.70.
- **Trillium** - stored white; the genus spans white (*T. grandiflorum*), maroon (*T. erectum/sessile*), and yellow (*T. luteum*), but they are largely different species sold separately and shopper relevance is low. Conf 0.85.

---

## Bucket 3: The rare cases where color signals a genuinely different plant (9)

**This is the bucket to read most carefully.** Here a specific color does not just repaint the same plant: it correlates with a different species, mature size, habit, hardiness, or care need. A plain "add a color swatch" fix would be botanically wrong; these likely deserve their **own catalog entry** with their own size/zone/water values. This is the same reasoning the author already applied to trailing lantana.

| Plant | The color-to-plant split |
|---|---|
| **Penstemon** | Red/orange tubular types (*P. pinifolius*, *P. eatonii/barbatus*) are compact xeric Western natives wanting lean, sharp-drained, low-water soil. The large-flowered purple/pink border hybrids (*P. hartwegii/gloxinioides*) are bigger, shorter-lived, and want richer, evenly moist soil. A "red penstemon" and a "purple penstemon" are effectively different plants. |
| **Anise Hyssop** (*Agastache*) | Warm-toned "hummingbird mint" hybrids (orange/coral/pink, from *A. aurantiaca/rupestris/cana*) are shorter, xeric, need sharp drainage, resent winter wet, less cold-hardy. Blue-purple *A. foeniculum* is a tall, moisture-tolerant, self-seeding zone-4 upright. |
| **Ice Plant** (*Delosperma*) | Yellow ice plant is usually *D. nubigenum/congestum*: a flatter, tighter mat, notably hardier (about zone 4) than the taller, wider, less hardy magenta *D. cooperi*. |
| **Thyme** (*Thymus*) | Upright culinary thyme (*T. vulgaris*, ~12 in, pale lilac, grown for leaves) versus mat-forming creeping thyme (*T. serpyllum/praecox*, 2 to 5 in groundcover) whose signature magenta/red ('Coccineus') and white ('Albus') colors *are* the stored value. A magenta thyme is almost certainly the trailing groundcover, a different plant. |
| **Ligularia** | Orange-yellow daisy types (*L. dentata*, ~3 to 4 ft, bold dark leaves) versus bright-yellow spike types (*L. przewalskii/stenocephala* 'The Rocket', 5 to 6 ft, cut leaves). Color loosely maps to a real size/form split. |
| **Spiderwort** (*Tradescantia*) | The purple "spiderwort" many shoppers picture (*T. pallida* 'Purple Heart', *T. zebrina*) is a tender trailing foliage houseplant, wholly different in size and care from the hardy upright perennial garden spiderwort. |
| **Sea Holly** (*Eryngium*) | The silver-white type (*E. giganteum*, 'Miss Willmott's Ghost') is a taller monocarpic biennial that dies after flowering and self-sows, unlike the perennial steely-blue *E. planum/x zabelii*. |
| **Barrenwort** (*Epimedium*) | Yellow forms are the vigorous evergreen dry-shade spreaders (*E. x perralchicum* 'Frohnleiten', *E. pinnatum colchicum*); red/pink/white forms are daintier, often deciduous, slower clumpers (*E. grandiflorum*, *E. x rubrum*). |
| **Douglas Fir** (*Pseudotsuga*, a conifer) | The blue-green Rocky Mountain form (var. *glauca*) is hardier (about zone 4), slower, more compact; the green coastal form (var. *menziesii*) is a massive fast timber tree hardy only to about zone 6. Foliage color tracks provenance, not a flower. |

Note the overlap: Penstemon, Anise Hyssop, Ice Plant, Thyme, Ligularia, Spiderwort, Barrenwort also appear in Bucket 1 and Sea Holly in Bucket 2 (they are genuinely multi-color) but the split matters more than the swatch.

---

## Bucket 4: Existing groups that under-cover color (22)

The variant system exists, but some groups do not span the color range a shopper expects. Two flavors: **color-variant groups that are just thin**, and **form/species groups** that were built around plant type and never covered color. Full list in `group-gaps.csv`.

### Notable gaps (8) - a shopper would be visibly stuck

| Group | Members | Type | Missing (and why it stings) |
|---|---|---|---|
| **Hybrid Tea & Grandiflora Roses** | 5 | color | white, orange, apricot/peach - the iconic cut-flower rose, missing white and orange |
| **Shrub & Landscape Roses** | 8 | color | yellow ('Sunny Knock Out'), white, apricot/coral (Drift, Oso Easy) |
| **Floribunda Roses** | 3 | color | red (Europeana), orange, coral - only pink/white/yellow, no red |
| **Fuchsia** | 7 | color | purple, white - all members are pink/red; fuchsia's signature is the purple corolla |
| **Hydrangeas** | 4 | form | **pink** - grouped by mophead/panicle/oakleaf/smooth; only blue and white. Half of bigleaf hydrangeas are pink. This is the textbook grouped-by-form-but-missing-the-color case. |
| **Irises** | 3 | form | yellow, white, pink - "iris" means rainbow; stored only blue/purple |
| **Salvia** (perennial) | 12 | mixed | **red**, coral/salmon - entirely cool-toned; scarlet salvia is one of the most iconic |
| **Sedum** | 9 | mixed | yellow, white - members are all the tall pink/red border sedums; the whole creeping-stonecrop half (yellow *S. acre*, white *S. album*) is absent |

The three rose groups are surprising: the app has thorough rose coverage elsewhere (32-member English roses, 16 hybrid-tea-adjacent, etc.), yet these three specific small groups miss primary colors. Likely just under-populated, easy to extend.

### Minor gaps (14)

allium (blue), amaranth (gold/bronze, burgundy), black-eyed-susan-vine (white), clematis (yellow), climbing-roses (white), dianthus (purple/lavender), geraniums (salmon/coral), hollyhock (apricot/peach), lilies (yellow), lobelia (red), rhododendrons (orange), snapdragons (purple), star-of-bethlehem (yellow), windflower (red, purple). Low urgency; each is one missing shade in an otherwise well-covered group.

### Group-type context (all 176)

103 groups are true color-variant sets (well covered), 30 are mixed, 43 are species/form-type groups (conifers, grasses, ferns-like, magnolias, Japanese maples, hostas) where flower color is not the axis and "no gap" is correct. The form/species groups that *also* carry a real color expectation are the ones surfaced above (hydrangea, iris, lily).

---

## Bucket 5: Single-color and fine, or not about flowers (61)

Leave these alone. Confirmed by the adversarial pass.

**Genuinely one color in cultivation (32):** Goldenrod (yellow), Lily of the Valley (white), Russian Sage (*Salvia yangii*, blue-violet only), Globe Thistle (*Echinops*, steel-blue), Bluestar (*Amsonia*, pale blue), Perennial/False Sunflower (yellow), Cardinal Flower (*Lobelia cardinalis*, red), Ironweed (*Vernonia*, iron-purple), Joe Pye Weed (mauve-pink), Candytuft (perennial *Iberis*, white), Snow-in-Summer (white), Sweet Woodruff (white), Goatsbeard (cream), Solomon's Seal (white), Moonflower (white), Climbing Hydrangea (white), Lady's Mantle (chartreuse), Basket of Gold (yellow), Virginia Bluebells (blue), Queen of the Prairie (pink), Foam Flower (white/pinkish), Pachysandra (white, groundcover), Bugleweed (*Ajuga*, blue, grown for foliage), Tulip Tree (green-yellow), and the culinary herbs whose flowers are incidental (chives, dill, mint, sage, rosemary, oregano). Each has at most a rare off-color a normal shopper never sees; the stored color is the honest default.

**Foliage plants / flower color not the point (29):** all 10 ferns, the shade/street trees (red maple, sugar maple, river birch, ginkgo, weeping willow, honeylocust, linden), Douglas fir, the succulents grown for rosette color (agave, echeveria, hens-and-chicks), and the silver/variegated-leaf perennials (dusty miller, lamb's ear, brunnera, foamy bells, wild ginger, blue oat grass), plus culinary basil/parsley/lemon balm. For several of these the real variation is **foliage**, not bloom: hens-and-chicks and echeveria (rosette color), brunnera and foamy bells and lamb's ear (leaf pattern), ginkgo and the maples (fall color). If the app ever wants a "foliage color" axis, these are the candidates, but that is a different feature from the flower-color question and out of scope here.

---

## Distribution at a glance

- Total library entries: **1,611**; already in variant groups: **1,511** (176 groups); ungrouped single entries: **100**.
- Ungrouped verdicts: clearly multi-color **36**, probably multi-color **3**, single-color-and-fine **32**, foliage/not-flower **29**.
- Of the 39 multi-color, **9** are the "color signals a different plant" cases (Bucket 3).
- Existing groups with a color gap: **8 notable + 14 minor = 22** of 176.
- Adversarial verifications run: **40** (every clearly/probably-multi candidate).

---

## For the planning session

**What we found.** The catalog stores exactly one flower color per entry and has already built a large, well-designed variant-group system (176 groups, 1,511 entries) that is the app's answer to multi-color plants. The famous multi-color genera the brief named are already handled. The remaining work is a **long tail**, not a systemic hole:

1. **39 ungrouped plants** that truly come in multiple colors are stored as one (Buckets 1 and 2). The 14 high-relevance ones (primrose, carnation, annual salvia, cyclamen, Japanese anemone, sweet william, penstemon, agastache, pincushion flower, rock cress, creeping sedum, lungwort, plus the generic climbing rose) are where a beginner would most notice the miss.
2. **9 of those** are not simple color variants: the color maps to a different species/size/hardiness/care (Bucket 3). These want their own entries, not a swatch.
3. **22 existing groups under-cover color** (Bucket 4), including three surprising rose groups missing primary colors and the form-grouped hydrangea/iris/lily/sedum/salvia sets missing whole color families.

**What it means.** The pattern the app already uses (one entry per color, tied together by a `PLANT_GROUPS` row) is the right mechanism and it scales. Closing the gap is data entry in the existing shape, plus a judgment call on the 9 "different plant" cases. There is no schema change implied by any of this; the schema already supports exactly what is needed.

**Open questions a fresh AI should decide (not decided here):**

1. **Scope and priority.** Do we chase the full 39, just the 14 high-relevance, or fold this into a broader catalog-expansion pass? The 3 thin rose groups and hydrangea-pink are arguably higher shopper value than half the ungrouped tail.
2. **The 9 "different plant" cases.** For each (penstemon, agastache, ice plant, thyme, ligularia, spiderwort, sea holly, epimedium, douglas fir): one entry with a color note, or split into separate entries with distinct size/zone/water? The author's lantana precedent argues for splitting when habit/hardiness genuinely differ. Someone must decide the threshold.
3. **Which color becomes the group default** for each newly grouped plant (the variant shown on the picker card). The stored color is usually a fair default; confirm per plant.
4. **Do form-grouped genera get a color axis at all?** Hydrangea and iris are grouped by form today. Adding color means either more members in the same group or a rethink of how one card presents both form and color. This is a UI question, not just data.
5. **Foliage color.** ~29 plants (and several existing "groups") vary by leaf, not bloom. Is a foliage-color axis ever in scope? If not, confirm these stay single-entry and we stop surfacing them.
6. **The generic `climbing-rose` entry.** It duplicates the `climbing-roses` group with a lone pink `Rosa`. Decide whether to retire it, fold it into the group, or leave it as the group's generic representative. (Data-hygiene, flagged below.)

**Data-hygiene note (incidental, not a color finding):** `climbing-rose` (singular slug, generic *Rosa*, pink) exists as an ungrouped entry alongside the 10-member `climbing-roses` group whose default is `new-dawn-rose`. It reads like a leftover placeholder. Worth a look while this area is open, but it is not part of the color question.

---

*Companion files in this folder: `candidates.csv` (one row per ungrouped plant, ranked, with corrected colors, confidence, size/care flag, and reasoning), `group-gaps.csv` (all 176 groups with type and color-gap severity), `result.json` (full structured data), `plants.json` / `groups.json` (raw extract). All generated read-only from `src/garden/plantLibrary.ts`; the repo was not modified.*
