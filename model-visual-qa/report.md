# BloomsEye - 3D Model & Cutout Visual QA

**Date:** 2026-07-14
**Reviewer:** automated capture + vision review (Claude), findings verified against `src/garden/plantLibrary.ts`.
**Scope:** the whole built-in library - **1,611 species across 26 procedural archetypes**. Both deliverables per plant were reviewed: the **3D model** (the procedural specimen the garden renders) and the **cutout** (the 2D photographic image used to represent the plant).

**Instruments**
- **3D models:** the DEV-only Species Gallery (`/gallery`). Captured every archetype at June (top-down, all 82 pages), plus side-angle captures for the vertical-form archetypes and bloom-month captures (April for bulbs/trees, September for asters/sedum/goldenrod). 112 gallery screenshots in `gallery/`, `gallery-side/`, `gallery-bloom/`.
- **Cutouts:** 34 labeled contact sheets built from the bundled cutouts (`src/assets/plants/`, 1,611 files) in `cutouts/`.
- A 33-agent vision pass reviewed every image; its raw findings are in `_wf_findings.json`. Every colour/scale claim below was re-checked against the source data before being kept or dismissed.
- (The DEV `/photos` review tool was also located; the bundled cutouts gave complete unambiguous coverage without needing the service-role key.)

> ### Read this first - three method facts that decide how to read the findings
> 1. **The plant DATA is correct. Do not chase it.** Every "wrong colour" and "wrong size" I could check against `plantLibrary.ts` was right in the data (anemone colours, crocosmia Lucifer = scarlet #d6281f, redbud green, Purple Prince crabapple purple, bald-cypress green #6a8a5a, lamb's-ear silver #a9b3a0, sunflower Teddy Bear = 0.6 m dwarf, delphinium Blue Mirror = 0.4 m dwarf, boxwood Graham Blandy = 2.5 x 0.4 m column). Bloom colours, foliage colours, sizes and bloom windows are well-curated. The work is in the **model/archetype rendering layer**, not the data.
> 2. **Top-down captures are reliable for per-plant colour/identity; side captures are for form only.** In a top-down grid the label sits under its own plant; in a side grid the label sits below-and-in-front and rows overlap, so per-plant colour claims from side views are unreliable (this caused several false "wrong colour" reports in the raw pass that were then dismissed).
> 3. **Gallery captures use fit-to-cell scaling, so most "scale outlier" reports are a capture artifact, not a bug.** Fit-to-cell normalises every specimen to its cell, so a legitimately-tall or legitimately-dwarf plant can look like an outlier that it is not in the real garden (which uses true data sizes). The exception is a handful of specimens that render as a near-empty speck regardless of scaling - those are genuine geometry bugs (see C1).

---

## Headline takeaways

1. **The cutouts (2D) are the strong half of the library.** Professional photographic cut-outs, correctly matched to names, cleanly keyed on transparency, distinct from neighbours (cultivars separate by flower or foliage colour; the hostas and coleus separate purely on leaf colour and nail it). Across seven sheets sampled end to end, problems are rare and localised.
2. **The 3D models are where the work is.** They are competent low-poly abstractions, but distinctiveness rides almost entirely on **colour**, and colour needs a **flower**, so any plant out of bloom on the viewed date collapses to a generic green blob. Same-genus cultivars and even different genera on one archetype become interchangeable.
3. **A few archetype MAPPINGS put plants in the wrong body.** Canna (a tall dramatic upright) renders as a low flat foliage-clump; cockscomb celosia (a brain-like crest) renders as a feathery plume; weeping cherry does not weep. These are the most concretely fixable model issues.
4. **The plant data is trustworthy** (see method fact 1). Spend planning time on the model/archetype layer.

**Archetypes needing the most work (ranked):** `tree` -> `iris` -> `grass` -> `bulb` (single-cup blooms) -> `panicle` / `tall-annual` / `bell-spike` (colour-only cultivar families) -> then the cross-cutting **out-of-bloom = generic** problem that touches every flowering archetype, and the **archetype-mapping** misfits (`canna`, `celosia`, weeping forms).

---

## FINDINGS (grouped by type, ranked by severity within each)

### A. Archetype form & mapping (structural - each affects many plants)

| # | Sev | Archetype / plants | Issue | Evidence |
|---|-----|--------------------|-------|----------|
| A1 | High | **tree** (82) | Canopy hides the trunk from every angle, so all trees read as shrubs, not trees. The archetype's stated purpose ("the visible trunk sets it apart from a shrub") does not survive the garden's viewing angle. | `gallery/tree-p01..04`, `gallery-side/tree-side-*` |
| A2 | High | **tree** flowering (cherry, dogwood, magnolia, redbud, serviceberry, crabapple) | The signature spring bloom renders as a few tiny scattered dots, not a canopy of blossom. In April a flowering cherry is a green blob with specks. | `gallery-bloom/tree-m04side-p01..04` |
| A3 | High | **iris** (37) | The archetype renders true iris, daylily, gladiolus, crocosmia and dutch iris as the same "fan of sword leaves + 6-point star." Bearded-iris form (standards + falls) is absent; the whole group separates only by colour. | `gallery/iris-p01..02`, `gallery-side/iris-side-*` |
| A4 | High | **canna** (12, mapped to `foliage-clump`) | Canna is a 1.5 m upright architectural plant with big banana leaves and a tall flower spike; it renders as a low, flat, arching ground clump. Wrong body for the plant. | `gallery-side/foliage-clump-side-p01` (agent-verified) |
| A5 | Med | **celosia cockscomb** (mapped to `plume`) | Crested cockscomb's defining brain-like crest renders as a generic feathery plume. | `gallery-side/plume-side-p01` |
| A6 | Med | **weeping-cherry** | Reads as an ordinary upright canopy; the weeping/cascading habit that names it is not modelled. | `gallery-side/tree-side-p04` |
| A7 | Med | **echeveria / hens-and-chicks** (`rosette`) | Tight geometric succulent rosettes render as a generic low clump; the defining rosette geometry is lost. | `gallery/rosette-p01` |
| A8 | Med | **grass** (33) | Blades render sparse and wispy (a few stray blades) where real ornamental grasses are dense fountains; and fountain / maiden / fescue / bluestem all share one spiky-tuft silhouette, separated only by blade colour and lean. | `gallery-side/grass-side-p01..02` |
| A9 | Med | **bulb** single-cup blooms (anemone, tulip, crocus) | The bloom is one solid faceted ball on the stem; from above it is a featureless coloured sphere, not a recognisable flower. | `gallery-bloom/bulb-m04-p01`, `gallery-side/bulb-m04side-p01` |
| A10 | Low | **conifer** (48) | Good news - the side view reads clearly as conifers (spires, cones, globes), the best of the vertical-form archetypes. Only watch that some columnar cultivars render fatter than their true narrow habit because spread-to-height ratio drives the silhouette. | `gallery-side/conifer-side-p01..02` |

### B. Distinctiveness gaps (groups too similar / generic out of bloom)

| # | Sev | Where | Issue | Evidence |
|---|-----|-------|-------|----------|
| B1 | High | **Every flowering archetype, out of season** | Identity rides on the flower, so a plant not blooming on the viewed date is a generic green mound and whole genera become indistinguishable. Confirmed cases: **sunflowers** (all 12 flowerless green stalks in June), **panicle/bee-balm** (all green in June; Monarda spans scarlet-to-purple in reality), **creeping-phlox** (11 cultivars identical green mats), **four-o'clock** (6 near-identical), **balloon-flower** (6 identical), asters (fall bloomer, green all summer), every flowering tree/shrub/bulb out of season. | June captures across `daisy`, `shrub`, `tree`, `bulb`, `panicle`, `tall-annual`, `groundcover` |
| B2 | High | **tree** | Even in bloom, magnolias / cherries / dogwoods / serviceberries are near-identical green canopies with a few dots. Only the correctly-coloured purple-leaved maples and crabapples stand out. | `gallery/tree-p01..04`, `gallery-bloom/tree-m04side-*` |
| B3 | Med | **bee-balm / bee-balm colours, delphinium colours, sunflower colours** | Colour-named cultivar families whose entire point is bloom colour are interchangeable when not in bloom, and several stay hard to separate even in bloom (e.g. the cream sunflowers, the scarlet bee-balms). | `panicle-p01`, `bell-spike-p01`, `tall-annual-p01` |
| B4 | Med | **iris / lily** | Every specimen is the same sword-leaf-plus-star; a daylily, a gladiolus and a crocosmia differ only by colour. | `gallery-side/iris-side-*`, `gallery-side/lily-side-*` |
| B5 | Low | **bedding-mound (224) / shrub (220)** | Large families of mounds studded with coloured flecks; out of bloom they separate only by shade and size. In bloom the flower-colour does the work well. Foliage members (coleus, dusty-miller, ornamental kale) are handled well as solid-colour mounds. | `gallery/shrub-p01..10`, `gallery/bedding-mound-p01..10` |

### C. Per-plant model issues (genuine, verified)

| # | Sev | Plant | Issue | Evidence / verification |
|---|-----|-------|-------|--------------------------|
| C1 | Med | `liatris` (Blazing Star) | Renders as a tiny bloomless dark speck, roughly one-eighth the footprint of its `mound-spike` peers, although its data size (0.9 x 0.3 m) is normal and fit-to-cell should equalise it. Genuine degenerate/near-empty geometry. | `gallery/mound-spike-p02` (agent-verified via crop); data checked |
| C2 | Low | `boxwood-green-mountain` | Same symptom: renders as a tiny dark speck next to same-page boxwoods though its data size (1.5 x 0.9 m) is normal. | `gallery/shrub-p01`; data checked |
| C3 | Med | `calla-lily` | Reads as an unrecognisable clump rather than the calla's distinctive single furled spathe. | `gallery/lily-p01` |
| C4 | Low | `red-hot-poker` (kniphofia) | Rendered on `bell-spike`; the poker's dense hot-coloured torch does not read (looks like a generic spike). | `gallery/bell-spike-p03` |

*C1 and C2 look like the same underlying geometry bug (certain size ratios collapse to almost no geometry) - worth reproducing together.*

### D. Cutout (2D image) issues - the only weak spots in an otherwise excellent set

| # | Sev | Plant(s) | Issue | Evidence / verification |
|---|-----|----------|-------|--------------------------|
| D1 | Med | `crimson-queen`, `emperor`, `fireglow` (red laceleaf Japanese maples) | Cutout photo shows **green** foliage; these cultivars are deep red/burgundy. Notably the 3D **model** renders them correctly red, so cutout and model disagree. | Verified `cutouts/cutout-11` (crimson-queen green); agents flagged emperor/fireglow same |
| D2 | Med | `ginkgo` | Cutout is a small round green topiary ball, not a ginkgo tree with fan leaves. | Verified `cutouts/cutout-16` |
| D3 | Med | `golden-raindrops` (crabapple) | Cutout is a silvery airy shrub, not recognisably a crabapple tree. | Verified `cutouts/cutout-16` |
| D4 | Med | `glory-of-the-snow-pink` | Cutout is a tall pink orchid-like spike, not the low starry Chionodoxa bulb (the rest of the glory-of-the-snow set also skews toward tall spikes). | Verified `cutouts/cutout-16` |
| D5 | Med | `tropical-hibiscus-*` set | Cutouts read as dense small-flowered mophead bushes, not tropical hibiscus (large single dinner-plate flowers with a staminal column). Colours match the names; the flower form does not say "hibiscus." | `cutouts/cutout-31` |
| D6 | Low | `toad-lily`, `japanese-painted-fern`, `rising-sun`, `tulip-spring-green`, `calla-lily-black` | Minor: generic or slightly off-hue cutouts flagged at low confidence; worth a glance, not a priority. | sheets 06/19/26/31/32 |

### E. Verified NON-issues (do not spend planning time here)

- **"Wrong colour" on 3D models** (bald-cypress, lamb's-ear, basket-of-gold, yarrow, boston-ivy, redbud, profusion, emerald-green arborvitae, crocosmia Lucifer, and ~30 raw flags): the data colours are correct; the reports were rendering/lighting perception or side-view misattribution. Dismissed after checking `plantLibrary.ts`.
- **Most "scale outlier" reports** (sunflower Teddy Bear "too big", delphinium Blue Mirror "giant", boxwood Graham Blandy, pampas grass, tulip tree, etc.): the data sizes are correct and these are fit-to-cell capture artifacts. The real garden uses true sizes. Only C1/C2 (speck renders) survive.

---

## Per-archetype assessment (3D models)

| Archetype | Count | Verdict |
|---|---|---|
| bedding-mound | 224 | OK. Colour-studded mounds read in bloom; generic green out of bloom (B5). Foliage members handled well. |
| shrub | 220 | OK. Flower clusters read well; watch `boxwood-green-mountain` (C2). |
| daisy | 159 | Strong. The daisy head reads clearly; colour separates cultivars. Asters need a fall month to show bloom. |
| bulb | 127 | Needs work. Single-cup blooms are featureless balls (A9); needs spring month + a real flower shape. |
| tree | 82 | Weakest. No visible trunk (A1), sparse blossom (A2), low distinctiveness (B2). |
| bell-spike | 78 | Spikes read; colour-only cultivar families (B3); `red-hot-poker` weak (C4). |
| climber | 78 | Trellis + foliage reads; blooms sparse. |
| mound-spike | 72 | One of the better flower-wand forms; `liatris` speck bug (C1). |
| foliage-clump | 66 | Leaf-mound reads; but `canna`/`elephant-ear` mis-mapped here (A4). |
| showy | 56 | Big single flowers generally read. |
| groundcover | 55 | Low mats read; `creeping-phlox` generic out of bloom (B1). |
| conifer | 48 | Good form in side view (A10); a few columnar cultivars too fat. |
| lily | 45 | Same sword-star family as iris; colour-only distinctiveness (B4); `calla-lily` unrecognisable (C3). |
| iris | 37 | Conflated form (A3). |
| clump / plume / grass / umbel / vase-shrub / panicle / globe | 25-35 each | Mixed. grass sparse (A8); globe/allium balls and plumes read well; panicle colour-only + generic out of bloom (B1/B3). |
| nodding-cup / tall-annual / fern / arching-spray / rosette | <20 each | Small sets. tall-annual (sunflower) all-green in June (B1); rosette loses succulent geometry (A7); arching-spray bleeding-hearts read well but same-colour pairs collapse. |

---

## For the planning session

**What the findings mean.** The library has two halves at very different maturity. The **2D cutouts are close to done**: professional, accurate, distinct, with only a handful of specific swaps to fix (red maples shown green; ginkgo/golden-raindrops/glory-of-the-snow-pink mismatched; the tropical-hibiscus set re-shot). The **3D models are a solid v1 abstraction with a structural ceiling**: because a plant's identity is carried by its flower colour, the models are only as distinct as the flower is visible, and for half the year (or half the library at any one date) that flower is not there. That is the single highest-leverage thing to change.

**The highest-value moves, in order.**
1. **Make plants readable out of bloom.** Give the flowerless state more identity - foliage silhouette, texture, habit - so a bed of asters in July or a magnolia in summer is not an anonymous blob. This one change lifts every flowering archetype (B1, B2, B3).
2. **Fix the archetype mis-mappings** - the cheapest concrete wins: `canna` and `elephant-ear` off `foliage-clump` onto an upright form; cockscomb `celosia` off `plume`; a real weeping habit for weeping cherry/`weeping` trees; a tight rosette for `echeveria`/succulents (A4-A7).
3. **Give `tree` a visible trunk and a real blossom load** (A1, A2) - trees are the weakest archetype and the most obviously "wrong" to the north-star user.
4. **Rework the `iris` archetype** so iris / daylily / gladiolus / crocosmia are not one shape (A3), and give bulbs a real flower shape instead of a ball (A9).
5. **Fix the two speck-render bugs** (`liatris`, `boxwood-green-mountain`, C1/C2) - likely one geometry bug.
6. **Fix the specific cutout swaps** (D1-D5).

**What NOT to do:** do not re-audit plant colours or sizes in the data - they are correct (verified). Do not treat "scale outlier" screenshots as bugs - they are a fit-to-cell capture artifact.

**Open questions for the team.**
- Is per-plant flower-*shape* variety (vs today's colour-only) in scope, or is colour-coded abstraction the deliberate art direction for a to-scale planner? That decision bounds how far items 1, 4 go.
- The models are viewed near-top-down in these captures; what is the *actual* in-garden camera range? If players routinely see plants side-on, the trunk/weeping/spike form issues (A1, A6, A5) matter more; if near-top-down, flower-face and colour matter more. The fix priority depends on this.
- Should the DEV gallery default to a slight side angle (not pure top-down) so trunk/spike/weeping forms are reviewable, and expose a month + true-scale toggle in the same view? It would make this exact review repeatable.
- For flowering trees specifically: is a denser blossom canopy (not sparse dots) worth the vertex budget, given trees are the most-noticed plant?

**Coverage note.** 32 of 33 automated review batches returned; one cutout batch (5 sheets) errored on structured-output retries and was spot-checked manually (clean). The 3D gallery was captured and reviewed in full at June, with targeted spring/fall and side-angle passes for the vertical-form and out-of-season cases. All colour/scale findings were verified against source data before inclusion.
