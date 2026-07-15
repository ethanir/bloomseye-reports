# Companion-pairing audit ("Pairs well with")

**Date:** 2026-07-14
**Task:** sanity-check the species-level companion data for correctness and quality. Read-only; nothing in the repo was changed.

## The one-paragraph version

The companion engine is unusually well-built: the model is sound, the reasons are template-assembled from factors that actually scored, and the repo's own independent verifier passes all 1,611 sets. **Every finding here is something that verifier structurally cannot see.** The ones that matter: **845 recommendations of invasive or thuggish plants, none cautioned, most praised for the very trait that spreads them**; **only 210 of the library's 1,611 plants can ever be recommended** (hosta, daylily, tulip, daffodil, rose and marigold are never suggested to anyone); **no score floor**, so every list is padded to exactly 8 however bad the 8th is; a **spreader-caution logic gap** that silences the warning when both plants run; two of the **most poisonous plants in the catalog recommended with cheerful, caution-free reasons**; and a **bloom-colour classifier bug** that mislabels 335 plants, corrupting 43% of all colour clauses.

**How this was checked (all reproducible, all in this folder):**
1. Regenerated the full data with the repo's own script (`scripts/generate-compatibility.ts --all`): 1,611 sets, 12,888 pairings, 22.6 MB.
2. Ran the repo's own verifier against it: **1,611/1,611 PASS, 0 warnings** (`verify-output.txt`).
3. Structural analysis in code (the `*.ts` scripts here, each read-only over the repo): coverage, reciprocity, score floor, the category cap, colour classification.
4. A 37-agent botanical review over all 276 recommendable plants plus 9 targeted lenses, every finding put through 3 independent adversarial verifiers; only findings that survived ≥2 of 3 are reported.

---

## 1. Where the data is, and how a pairing is built

There is **no hand-written pairing table**. Pairings are **computed live in the browser**.

| Piece | File | Role |
|---|---|---|
| The engine | `src/garden/intel/compatibility.ts` (1,425 lines) | Scores every pair, picks 6-8, writes the reason |
| Curated traits | `src/garden/intel/taxonomy.ts` | 286 genus rows + 60 slug overrides: pollinator, native, spreader, evergreen, juglone |
| The UI | `src/browse/PlantCompanions.tsx` | Calls `companionsFor()` live on modal open (premium, reveal-gated) |
| Generator | `scripts/generate-compatibility.ts` | Writes `compatibility.json` (gitignored local artifact; publishes nothing) |
| Gate | `scripts/verify-compatibility.ts` | A **second, independent** implementation of the hard filters |
| Design doc | `docs/PLANT-COMPATIBILITY.md` | Sources and calibration, honestly labelled |

Two stages:

1. **Coexistence (hard filters).** Light within one rung of `full-sun > part-sun > part-shade > full-shade`; water within one rung of `low > moderate > high`; a non-empty USDA zone intersection (**skipped when either plant is an Annual**); mature height ratio ≤ **15:1**; never the same genus or variant group; no aggressive spreader beside a plant it would smother.
2. **Complementarity (soft score, 0-100).** Succession 30, bulb-cover 26, layering 22, pollinator 20, winter structure 15, native 8, colour 5. Penalties: spreader ×0.8, narrow zone ×0.7/0.85, water-differs ×0.92, over-recommended (variety) up to ×0.83.

**The reason** is assembled from templates: shared conditions first, then up to three clauses for factors that scored above a floor, then zones and a caution if applicable. The verifier re-checks every clause against the library and runs a "number tripwire". **That machinery works** - I found no reason that fabricates a fact, and no false "evergreen" claim in 12,888 pairings. What follows are failures of the *inputs* and the *rules*, which the verifier is not designed to catch.

---

## 2. Summary statistics

All 12,888 pairings, bucketed under a mechanical definition (exclusive; "questionable" beats "weak"):

| Bucket | Count | Share | Definition |
|---|---|---|---|
| **Solid** | 8,280 | **64.2%** | Nothing in this audit flags them |
| **Questionable** | 2,537 | **19.7%** | A horticulturist would change or caution it before shipping |
| **Weak** | 2,071 | **16.1%** | Shown as a recommendation, but barely is one |

**Score distribution:** min 24.4, p10 43.6, median **56.4**, p90 71.1, max 91.3. **42.8% of all pairings score under 55/100**, and the user is shown no score.

**Coverage:** every one of 1,611 subjects has a full list of exactly 8. Zero thin or empty lists - which sounds healthy and, per F2 and F3, is the opposite.

**Botanical review yield:** 239 candidate findings raised, each put through 3 independent adversarial verifiers. **89 passed** (≥2 of 3 verifiers upheld them); 15 were correctly killed (e.g. one claimed cardinal flower is a wet-soil obligate; it is a facultative-wetland plant that grows fine in a border, and the verifier caught the overreach). The rest went unverified when a usage limit interrupted the run twice. This does not weaken the report: **verification converged** - all 89 confirmed findings fall inside the 17 clusters below, and the unverified remainder are, by their titles, more instances of the same clusters (more pampas-grass pairings, more "carpet beneath" wording, more water mismatches). The finding set is saturated, not truncated.

---

## 3. Ranked findings

### F1 (HIGH) - 845 recommendations of an invasive or thuggish plant, none cautioned, most *praised* for the trait that spreads them

The engine has a spreader flag and a caution clause; neither fires here, because the caution only triggers when the neighbour is soft herbaceous. Recommend a runner **under a shrub or tree and the engine says nothing**.

| Plant | Recommended in | Cautioned | Reason praises the invasive trait |
|---|---|---|---|
| **Pampas Grass** (*Cortaderia selloana*) | **191** | 0 | 191 |
| **Northern Sea Oats** (*Chasmanthium latifolium*) | 213 | 7 | 211 |
| **Sweet Alyssum** (*Lobularia maritima*) | 97 | 0 | 94 |
| **English Daisy** (*Bellis perennis*) | 84 | 0 | 70 |
| **Cleome** (*Cleome hassleriana*) | 74 | 0 | 2 |
| **Snow-in-Summer** (*Cerastium tomentosum*) | 72 | 0 | 72 |
| **Maiden Grass** (*Miscanthus sinensis*) | 68 | 0 | 68 |
| **Butterfly Bush** (*Buddleia davidii*) | 42 | 0 | 6 |
| **Periwinkle** (*Vinca minor*) | 4 | 0 | 4 |

Regulated/widely-listed invasive: **305 recommendations, 0 cautioned.** Aggressive self-seeders: 540 more.

Pampas grass is recommended 191 times with *"...**its seed heads stand through winter, for structure and the birds**..."* - the plumes *are* the dispersal mechanism (each female plume carries on the order of 100,000 wind-borne seeds); Cal-IPC rates it High, it is a Hawaii noxious weed, and it naturalises across California, Texas and the Southeast. Its leaf margins also cut skin, which matters for the north-star user specifically. Butterfly bush - a Class B noxious weed in Washington, illegal to sell in Oregon without a sterility certificate - is recommended 42 times as *"both are strong pollinator plants"* (nectar for adult butterflies, larval host for nothing native: the half-truth the plant is mis-sold on). Wisteria appears as a genus-level entry that includes the severely invasive Asian species.

**Fix:** an `invasive`/`reseeds` flag in `taxonomy.ts`, then either exclude those plants from being companions or fire the caution on the flag regardless of the neighbour's category. Note a subtlety a naive fix misses: setting `spreader: true` alone would *hard-block* pampas from short neighbours (via `spreaderSmothers`) yet still recommend it, uncautioned, to tall and woody ones. The dedicated flag is the correct lever.

### F2 (HIGH) - only 210 of 1,611 plants can ever be recommended, and the missing ones are the famous ones

Two restrictions compound:

- **Only "archetypes" can be a companion** (a group's default, or an ungrouped plant): **276 of 1,611**. Deliberate, right, and documented.
- **66 of those 276 never win a single slot in any of the 1,611 lists.** Not documented, not intended.

So **210 plants (13% of the library) carry every recommendation.** Never recommended to anyone:

> **Hosta, Daylily, Tulip, Daffodil, Shrub Rose, Hybrid Tea Rose, Floribunda Rose, Astilbe, Coral Bells, Japanese Maple, Yarrow, Sea Holly, Marigold, Petunia, Snapdragon, Begonia, Japanese Painted Fern, Trillium, Balloon Flower, Veronica, Anise Hyssop, Sugar Maple, Ginkgo, Brunnera, Toad Lily** (and 41 more).

Roses are the extreme: **5 rose archetypes win 4 slots total** across all 1,611 lists, from a library of 59 roses. Open a peony; the engine will never suggest a rose.

They are **not filtered out** - they are always out-scored. Daylily clears the hard filters in **1,278** of 1,611 lists and is never shown once. The mechanism is a **data-poverty penalty**: 43 of the 100 soft points (pollinator 20, winter structure 15, native 8) come from *curated flags on the companion itself*. `rosa`, `hosta`, `hemerocallis`, `heuchera`, `tulipa`, `narcissus`, `paeonia` carry none, so they forfeit those points against any plant that does. Hosta's ceiling across the whole library is 46.5/100 - it cannot win anywhere. (Compounding it: the library records **no bloom window for Hosta at all**, so the 30-point succession factor is dead for it too; hostas do flower, and bees work them.)

**Fix:** stop treating an absent flag as a hard zero in the *ranking* (it is correct to keep it out of the *reason*). The engine already renormalises the score over measurable factors for bloom; doing the same for the ecological factors would let a hosta compete on succession and layering instead of losing 43 points for having no curated row.

### F3 (HIGH) - there is no score floor: the list is always exactly 8, however bad the 8th is

`companionsFor` takes the top 8 with no quality gate. `MIN_COMPANIONS = 6` is never enforced as a floor.

- **1,604 pairings (12.4%) score under 45/100.**
- **214 lists show an 8th companion scoring under 40.** The worst shown pairing in the product scores **24.4**.
- **228 lists have a *top* companion under 55** - the best the engine can do is mediocre, and it says so nowhere.

Boston Ivy's 8th companion (29.4) is Obedient Plant, justified with the whole sentence *"Takes full sun to part sun and moderate water."* The UI shows **no score and no ranking signal** - eight cards, all equal-looking, behind "Show all 8 companions". For the taste of a paid tier, the 8th card tells the gardener the whole thing is guesswork.

**Fix:** a score floor (≈50) and let short lists be short - the UI already handles any length, and the generator already reports thin lists.

### F4 (HIGH) - the spreader caution cancels itself when both plants run

`isVulnerableTo` (`compatibility.ts:504`) returns false the moment the neighbour is itself a spreader ("equal vigour, let them fight"), and `spreaderNeedsWatching`'s soft test also excludes spreaders. So when **two aggressive runners are paired, no filter and no caution fire at all** - the pairing looks clean.

- **Bugleweed (Ajuga) → Mint:** two of the most notorious runners in the shade palette, recommended together with no warning.
- **Bee Balm → Trumpet Vine** (and **Eastern White Pine / Douglas Fir → Trumpet Vine**): *Campsis radicans* is an 8 m woody vine that suckers metres from the crown and resprouts from cut roots - the plant extension services most often tell home gardeners to keep away from beds - recommended with zero caution because both ends carry the spreader flag.

**Fix:** in `reasonFor`, emit the caution whenever *either* plant is a spreader, not only when the penalty fires; never let a shared spreader flag mean "no warning", especially when one side is a woody vine.

### F5 (HIGH) - two of the most poisonous plants in the catalog are recommended with cheerful, caution-free reasons

The repo's own deep-intel rates **Colchicum** (Autumn Crocus) *"High poison severity; ingestion of any part can be fatal to humans and animals; a medical emergency; no clinically available antidote; one case series reported 25% mortality"*, and its file explicitly warns not to confuse it with edible-looking spring crocus. **Monkshood (Aconitum)** is comparably toxic (aconitine, absorbed through skin). Both are recommended as companions with benefit-only reasons (*"...its seed heads stand through winter..."*) and **no safety note** - to a product whose north-star user is a beginner who will handle what she plants.

**Fix:** carry the toxicity flag that already exists in `deepIntel` through to the companion card, and append a short caution ("all parts are toxic; wear gloves") for any high-toxicity companion.

### F6 (MEDIUM-HIGH) - the "soft" 3-per-category cap is hard in practice, and it hides better plants than it shows

`MAX_PER_CATEGORY = 3` is documented as soft (pass two relaxes it). **Pass two runs in 6 of 1,611 lists.** In the other 1,605 the cap is absolute. Replaying `pick()` and attributing each skip to its cause:

- same-genus / same-group skips: **581** (intentional, correct - Azalea legitimately blocks Rhododendron; they are one genus).
- **category-cap skips: 15,138 slot decisions, across 1,373 of 1,611 subjects (85%)** - each one withheld a *higher-scoring* plant and showed a lower-scoring one instead.

Worst cases: Gladiator allium hides Purple Coneflower (81.2) to show Hyacinth (62.4); Crater Lake Blue hides Globe Thistle (79.6) to show Crocosmia (60.3). The plants it hides most are the prairie backbone: **Blazing Star (762×), Ironweed (678×), Aster (667×), Purple Coneflower (658×), Goldenrod (640×), Black-Eyed Susan (635×)** - 98 perennial archetypes fighting for 3 slots while 10 grasses get their own 3.

**Fix:** make the cap a tie-break or soft penalty (down-weight the 4th of a category) rather than a hard skip, so a 20-point-better plant still wins its slot.

### F7 (MEDIUM) - the bloom-colour classifier mislabels 335 plants, corrupting 43% of all colour clauses

`colorName()` (`plantFacets.ts:83`) has two boundary bugs:

- **Saturated yellows read as orange.** `#f4b400` is hue 43.6°, and the rule is `h < 45 → "orange"`. So **Black-Eyed Susan, Sunflower, Yarrow, False Sunflower, Perennial Sunflower, Witch Hazel, Globeflower, Ligularia** - every classic yellow - are classified orange.
- **Off-whites read as their residual hue.** The white test `l >= 0.82 && s < 0.25` fails for near-whites because saturation is numerically unstable near white (Gardenia `#fbfbf5` computes s ≈ 0.43 at l 0.97). So **Gardenia, Jasmine, Mock Orange, Moonflower, Solomon's Seal** read "yellow"; **Calla Lily, Climbing Hydrangea, Goatsbeard** read "orange"; **Summersweet, Foam Flower, Ninebark** read "pink".

**335 library plants** classify to a colour that contradicts their own tag (32 are archetypes). The result reaches the user: **1,127 of the 2,644 colour clauses shown (43%)** are built on a misclassified plant - *"its white flowers settle the orange"* for a plant with no orange, *"echoes the pink"* for a scarlet cigar plant. Scoring is barely affected (colour weight is 5 and near-whites hit the neutral branch), but the printed sentence, which is what the user reads, is wrong.

**Fix:** widen the white test to `l >= 0.9` regardless of saturation, and lift the yellow/orange cutoff so saturated yellows around hue 44° read yellow.

### F8 (MEDIUM) - the layering clause tells full-sun plants to grow under a canopy, and calls 1 m perennials "canopies"

The wording asserts a spatial relationship the pair does not have:

- **"carpet the ground beneath" a plant under 2 m: 1,222 pairings** (267 under a 1-1.2 m plant). Nobody carpets the ground beneath a 1 m perennial.
- **"a canopy to plant beneath" told to full-sun, drought-loving plants:** Ageratum, Aloe, Gazania, Gaura told to sit under a lilac or a crabapple - dry shade where they will not grow.
- **"an understory layer" / "the layer behind it" for climbers and vines:** Arborvitae → Climbing Rose and Clematis (the vine climbs *into* the arborvitae); Aster → Passionflower called *"height without the footprint"* - backwards for a vine that needs a support and casts a footprint of shade.
- **Colchicum described as the low carpeting layer** though its recorded 0.15 m is its leafless autumn flower; its spring leaf clump is twice that and then it is bare ground.

**Fix:** raise the shelter test from 0.9 m to the 3 m `STRUCTURE_TIER_M` the file already defines; suppress the "beneath a canopy" phrasing when the shorter plant needs full sun; and never call a climber an understory or a "footprint-free" layer.

### F9 (MEDIUM) - 557 pairings put a moisture-mismatched plant on one watering schedule

The water ladder allows one rung (low + moderate, or moderate + high) for a ×0.92 penalty. For a plant whose *failure mode is its water regime*, the rung is the whole plant:

- **539** pairings put a drought-adapted plant (lavender, rosemary, artemisia, agave, echeveria) on a moderate-water neighbour's schedule - wet feet, not drought, is what kills them.
- **18** cross a moisture-obligate genus with a drought-obligate one. Verified species-level cases: **Agave with Tropical Hibiscus** (the agave rots), **Elephant Ear - a marginal aquatic the repo's own intel says grows in standing water - with Calibrachoa, Scaevola and Gardenia** (all documented to fail in constant wet), **Crocosmia with bog-plant Globeflower** (the corms rot).

**Fix:** treat a documented wet/bog plant or a sharp-drainage xeric plant as its own class - make water-differs a hard filter, not a soft penalty, when one side tolerates standing water and the other needs sharp drainage.

### F10 (MEDIUM) - the bulb-cover clause credits evergreen succulents with "leafing out to hide" bulb foliage

Bulb-cover is the second-heaviest factor (26 points) and its clause asserts a seasonal behaviour: a herbaceous neighbour that pushes up leaves in late spring to screen a bulb's yellowing foliage. **Agave and Aloe** - evergreen, spine-tipped succulent rosettes (the library sets `evergreen: true`) - are credited with *"leafing out to hide the ripening bulb foliage"* of Amaryllis. They do not leaf out; they hold one rosette year-round, and a spined rosette over a bulb is a hazard, not a cover.

**Fix:** exclude evergreen succulents/rosettes from `COVER_CATEGORIES` eligibility.

### F11 (MEDIUM) - the 15:1 scale cap still admits a shade tree as a "bed companion"

1,289 pairings exceed 10:1. At the cap: **Colorado Blue Spruce (15 m) recommended for Garden Phlox (1 m)**, reason in full: *"Shares full sun and moderate water."* More broadly, **18 m conifers recommend full-sun roses, lilacs and hollyhocks as "an understory layer"** - dry shade under a mature conifer, where none of them will grow. This is both the clearest scale defect and the clearest illustration of F3 (a 44-point pairing with nothing to say, shown as one of eight).

### F12 (MEDIUM) - library-data errors that silently corrupt whole lists

A wrong field on one plant poisons every pairing it appears in. Verified, with locations:

| Plant | Field | Current | Should be | Effect |
|---|---|---|---|---|
| **Basil** | zones | 10-11 (survival) | grown as annual everywhere | Filed `Herb` not `Annual`, so the zone filter is *not* skipped; its whole list is forced to zone-10/11 tropicals (*"they only overlap in zones 10 to 11"*) |
| **Hosta** | bloom | none | ~Jul (lilac/white) | No succession score; a top-tier shade plant is never recommended (F2) |
| **Coral Bells** | bloom | none | ~May-Jul | All 8 pairings degrade to a content-free sentence |
| **Canterbury Bells** | category | Annual, 1 yr | biennial, 2 yr | Promises first-season flowers the plant cannot give; also switches off the zone filter |
| **Colchicum** | height | 0.15 m (flower) | ~0.30 m (spring foliage) | Wrongly qualifies as a "carpet" / front-of-border plant |
| **Lamium maculatum** | spreader flag | absent | should be `spreader: true` | A running groundcover recommended over ferns and short plants with no smother filter and no caution (compounds F4) |
| **Japanese Forest Grass** | seed heads | inferred `true` | false (foliage grass) | Credited with *"seed heads stand through winter"* it does not hold - see below |
| **Gardenia, Blue Oat Grass, +333** | bloom hex | see F7 | neutral/true hue | Wrong colour clause |

A subtlety worth naming: the Japanese Forest Grass case is one the repo's own verifier **cannot** catch, because it shares the engine's assumption. Both compute `seedheads = (category === "Grass")`, so both agree that *Hakonechloa macra* - a clump grown purely for cascading foliage and cut to the ground in winter - "holds seed heads through winter." The engine was careful to hand-curate `WINTER_SEEDHEAD_GENERA` for the daisy family (and explicitly excluded English daisy from a similar over-claim); the blanket `category === "Grass"` never got the same discipline. The fix is to gate the grass seed-head claim on the plant not being a foliage-tagged grass.

### F13 (MEDIUM) - reasons that state no benefit (44), or nothing but colour (6)

44 pairings render as bare conditions - *"Shares full sun and moderate water."* - because every factor fell below its floor. This is the engine being honest, and it is exactly the signal the pairing should not have been shown (F3). 6 more offer only a colour clause (which, per F7, is often the wrong colour).

### F14 (MEDIUM) - reciprocity is mostly legitimate, with a hard core that is not

- **10,680 of 12,888 pairings (83%) are structurally one-way**: the subject is a cultivar, which can never *be* a companion (F2).
- Of the 2,208 archetype-to-archetype edges, **572 are mutual (25.9%)**; 1,636 are one-way.
- **170 of the 276 archetype lists have a #1 companion that does not reciprocate.** Most is fine (B has eight better options; mean score asymmetry between the two directions is only 3.1 points). The defect is the residue: **in 30 of those 170, the subject would have out-scored a plant the companion's list actually shows** - that is the category cap (F6), nothing else.

### F15 (LOW) - the reasons repeat

**3,052 distinct reason sentences across 12,888 pairings.** The most common single sentence appears **104 times**; the top 20 cover over 1,200 pairings. A user who reveals three or four plants sees the same sentence twice, which reads as generated - the one thing a premium panel cannot afford.

### F16 (LOW) - soil pH is unmodelled; 32 pairings cross an acid-lover with a lime-lover

pH is documented as out of scope, so this is only the worst instances: an ericaceous acid-obligate (rhododendron, azalea, camellia, gardenia) recommended as a bed companion for lavender or dianthus asks a gardener to satisfy two incompatible soils in one spot (chlorosis, slow decline).

### F17 (LOW, latent) - the juglone flag exists and the engine never reads it

`taxonomy.ts` flags `juglans` and `carya` as juglone sources and `spatial.ts` uses it, but **`compatibility.ts` never does.** No black walnut or hickory is in the built-in library, so nothing breaks today - but the engine runs live on whatever species the user opens, including community and AI-imported plants. Import a black walnut and the panel will recommend eight juglone-sensitive companions for it.

---

## 4. What is genuinely solid (do not touch)

- **The two-stage model is right**, and cultural-fit-before-aesthetics is the correct order.
- **The reason machinery does not lie about facts.** Every clause is grounded in a factor that scored; the number tripwire blocks invented figures; the verifier is a genuinely independent second implementation. **No fabricated claim in 12,888 reasons, and no false evergreen claim.**
- **The evidence stance is honest** - folklore is excluded by design, and judgment calls are labelled as judgment calls rather than dressed as sourced.
- **The variety down-weight works** (the most-recommended plant fell from ~39% of lists to 25%).
- **Botanical naming discipline prevents real errors** (Autumn Joy is filed `Hylotelephium`, not `Sedum`, which is why no reason falsely calls it evergreen).
- **The adversarial verifiers earned their keep**: they killed 10 finder claims that overreached (e.g. calling facultative-wetland ferns "bog obligates"), so the surviving findings are the defensible ones.

---

## 5. For the planning session

**The findings, in one breath.** The engine is a genuinely good piece of work with a well-built honesty gate, and that gate is exactly why the problems are invisible from inside it. Three failure classes, in priority order:

1. **Advice that is unsafe or irresponsible to give a beginner** (F1 invasive praise, F4 silenced spreader warnings, F5 poisonous plants with cheerful reasons). These are the ones that can hurt a user or a habitat, and they are the north-star user's blind spots exactly.
2. **The recommendation surface is narrow and self-narrowing** (F2 only 210 plants ever recommended, F3 no score floor, F6 the category cap hiding better plants). The famous plants a beginner searches for first - hosta, daylily, rose - are the ones the engine has nothing to say about, and it pads every list to eight regardless.
3. **The reasons are wrong in ways the user can see** (F7 colour, F8 layering wording, F10 bulb-cover, F12 library data). Individually small; collectively they are what makes a premium panel read as generated.

**What it means.** Most of this is not an engine rewrite - it is **data and thresholds**. An `invasive` flag and a toxicity pass-through (F1, F5) are small, high-leverage additions. Fixing the data-poverty penalty and the score floor (F2, F3) would change *which* plants get recommended far more than any weight tuning. The colour and layering-wording bugs (F7, F8) are localized. The single highest-value move is probably **an `invasive`/`toxic` flag in `taxonomy.ts` that both suppresses bad recommendations and drives a caution clause** - it closes F1, F4 and F5 at once.

**Open questions for the founder:**
- **Should a listed-invasive plant be recommendable at all?** Excluding them is safest; keeping them with a caution respects a gardener who wants one deliberately. This is a values call, not a technical one.
- **Is a shorter, honest list acceptable?** F3's fix trades "always 8" for "as many as are actually good." For a premium feature, six strong companions probably beat eight with two fillers - but confirm.
- **How much curated data is in budget?** F2 is partly fixable in the ranking, but the deeper fix is giving hosta, daylily and the roses the pollinator/native/bloom data they are missing. That is catalog work, not engine work.
- **The feature is premium and reveal-gated today.** Every defect here is currently seen by few users, which is the good news and the deadline: these are cheapest to fix before the paywall makes the panel a headline feature.

*All figures reproducible from the scripts in this folder over an unmodified checkout; `compatibility.json` is the repo's own `--all` output; the repo's own verifier passes it 1,611/1,611.*
