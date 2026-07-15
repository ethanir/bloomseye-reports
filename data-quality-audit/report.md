# BloomsEye catalog: data-quality audit

**Date:** 2026-07-14
**Scope:** every plant in the published catalog, all fields at once
**Result set:** 1,677 plants (1,611 curated built-ins + 66 frozen community/AI plants), matching the live `catalog/plants.json` exactly (regenerated 2026-07-14 16:21 UTC, count 1677).
**Mode:** read-only. Nothing in the repo was changed, created, or deleted. All scripts and outputs live in `~/bloomseye-reports/data-quality-audit/` (outside the repo).

## How this was produced (so it is reproducible)

The canonical catalog is not a JSON file in the repo; it is code. It is assembled at build time from:

- `src/garden/plantLibrary.ts` -> `DEFS_A/B/C` (1,611 built-ins), expanded through `build()`.
- `src/data/community-snapshot.json` (66 rows), expanded the same way `scripts/publish-catalog.ts` does.

To audit exactly what ships, I ran the *real* `build()` / `photoSlugFor()` expanders (via `tsx`) over both sources and flattened them to `catalog-flat.json`, then cross-checked against the live `catalog/plants.json` and `catalog/photos.json` fetched from Supabase (public, read-only). Real-photo coverage was computed with the actual group-default resolution (`photoSlugFor`), not a naive slug match.

Artifacts in this folder: `catalog-flat.json` (the flattened catalog), `community-raw.json`, `photo-coverage.json`, `findings.json` (all machine counts), `plant-groups.json`, plus the scripts (`extract.ts`, `photo-coverage.ts`, `analyze.mjs`, `dump-groups.ts`) and the botanical-review workflow (`botanical-workflow.js` + `chunks/`).

## Headline

The catalog is **structurally very clean**. Every plant has a sun value, a water value, and a botanical name; zero bloom windows are out of range; zero hardiness values are outside 1-13; there are no duplicate slugs or UUID collisions (`LIBRARY_COUNT` 1611 == deduped catalog 1611); no absolute size is impossible. The real defects are a small number of **genuine duplicate plants with conflicting data**, a set of **tag hygiene problems** (garbage fragments, spaced-vs-hyphenated splits, a semantics collision on the word "shade"), and one large **content gap** (real photos + built-in descriptions). A separate multi-agent botanical review of every plant's specific values (Section D) confirmed just **2 implausible values** out of 1,677 - most notably the Autumn Flowering Cherry whose bloom is set to spring only.

**Findings at a glance:**

| Severity | Finding | Count |
|---|---|---|
| Breaks | Same plant, two slugs, conflicting data (Anemone blanda, tuberous begonia) | 2 families |
| Breaks | Autumn Flowering Cherry bloom set to spring only (D1) | 1 |
| Breaks | Full-sun trees tagged "shade" (mis-filtered) | 8 |
| Breaks | Garbage/truncated AI tags in community rows | 6 tags / 23 plants |
| Misleading | Cream rose 'Patience' tagged "red" (D2) | 1 |
| Misleading | Tag spelled spaced vs hyphenated (split filter) | 5 pairs |
| Misleading | Re-bloom tag sprawl (uncontrolled vocabulary) | ~19 variants |
| Misleading | Identical picker labels (cultivar epithet reused) | ~21 |
| Misleading | Genus-only botanical on distinct plants | handful |
| Cosmetic | No real photo | 975 / 1,677 (58%) |
| Cosmetic | No description (all built-ins) | 1,611 |
| Cosmetic | Crape myrtle 7 m filed as Shrub (category) | 2 |
| Clean | missing sun / water / botanical; out-of-range bloom/zones; duplicate slugs; impossible sizes; community data-loss on expansion | 0 each |

---

# A. Breaks something (wrong or duplicated data reaches the user)

### A1. The same plant shipped twice, under two slugs, with conflicting data
**Count: 2 species families (Anemone blanda across 3 cultivars = 6 slugs; Begonia × tuberhybrida = up to 9 slugs).**

Two plants exist in the catalog under two different slugs *and two different picker groups*, and the two copies disagree on size, hardiness, and bloom colour. A shopper browsing sees the plant twice; whichever card she picks changes the 3D size and the bloom/hardiness forecast for what is the identical plant.

- **Anemone blanda** (windflower) - three cultivars each duplicated:
  - `anemone-blanda-blue` (group `anemone`): spread 0.12 m, zones 5-9, bloom `#6a7ad0`
  - `windflower-blue-shades` (group `windflower`): spread 0.10 m, zones 4-8, bloom `#5a6fc8`
  - same conflict for `anemone-blanda-white` vs `windflower-white-splendour`, and `anemone-blanda-pink` vs `windflower-pink-star`. "Windflower" *is* the common name for Anemone blanda, so these are the same plant.
- **Tuberous begonia** (Begonia × tuberhybrida) - represented twice:
  - group `tuberous-begonia`: `tuberous-begonia` + red/orange/yellow/white/apricot, zones **9-11**
  - group `begonia` (a catch-all also holding wax, dragon-wing, bonfire, big): `begonia-tuberous-yellow/orange/red/apricot`, zones **empty**
  - so e.g. `begonia-tuberous-yellow` and `tuberous-begonia-yellow` are the same plant in two cards with different hardiness data.

**Detect again:** group `catalog-flat.json` by normalized `botanicalName`; for each cluster of a full binomial (genus + species/cultivar) spanning more than one `group` key, diff `matureSpread` / `hardinessZones` / `bloom`. `analyze.mjs` prints these as "split/conflicting families."

### A2. Full-sun shade *trees* are tagged "shade" (mis-filtered as shade plants)
**Count: 8** (`red-maple`, `sugar-maple`, `river-birch`, `ginkgo`, `tulip-tree`, `weeping-willow`, `honeylocust`, `linden`).

The word "shade" carries two meanings in the tag vocabulary: the derived light-requirement tag (a `full-shade` plant becomes tag "shade") **and** "shade tree" (a big tree that *casts* shade). These eight are `sun: full-sun` but carry tag "shade," so a "shade plants" filter returns full-sun trees. Wrong results, not just noise.

**Detect again:** flag any plant whose `sun` maps to a light-requirement tag at the opposite end of the scale from a light-word tag it also carries (`analyze.mjs` -> `sunTagContradictions`). Longer-term: never reuse "shade" for "shade tree"; use a distinct tag such as "shade tree."

### A3. Garbage / truncated tags pollute the community rows
**Count: 6 distinct fragment tags across 23 community plants.**

The frozen community snapshot carries meaningless truncated tokens that were baked in by the retired AI finder: `"rosa d"`, `"rosa da"`, `"rosa de"`, `"rosa f"`, `"california k"`, `"california ke"`. They are genus-plus-initial fragments (e.g. Dorothy/Dublin/Duchess roses all got "rosa d"; Fantin/Felicia/Fragrant/Frau all got "rosa f"). They are real, stored tag strings (they pass straight through `build()`), so they appear in search facets as junk. Affected: all `rosa-*` old-rose entries, the California natives (`california-fuchsia`, `california-lilac`, `california-poppy-*`, `california-flannel-bush-*`), etc.

**Detect again:** flag tags matching `/^[a-z]+ [a-z]{1,2}$/` (a word followed by a 1-2 letter fragment). `analyze.mjs` -> `tagFragments`. Fix is a one-time edit to `src/data/community-snapshot.json`.

---

# B. Misleading (confusing or ambiguous, but a knowledgeable user is not misinformed)

### B1. Tag concept split across spaced vs hyphenated spellings
**Count: 5 pairs.** A filter on one spelling silently misses the plants tagged the other way.

| concept | spellings (counts) |
|---|---|
| repeat blooming | `repeat blooming` (11) vs `repeat-blooming` (2) |
| repeat flowering | `repeat flowering` (7) vs `repeat-flowering` (2) |
| disease resistant | `disease resistant` (4) vs `disease-resistant` (3) |
| once flowering | `once flowering` (1) vs `once-flowering` (1) |
| low growing | `low growing` (1) vs `low-growing` (1) |

**Detect again:** normalize every tag to `lowercase, hyphens->spaces` and flag any normalized key with more than one raw spelling. `analyze.mjs` -> `tagPunctuationCollisions`.

### B2. Semantic tag sprawl for re-bloom / bloom-timing
**Count: ~19 near-synonymous variants** describing the same handful of ideas: `repeat blooming` / `repeat-blooming` / `reblooming` / `repeat flowering` / `repeat-flowering` / `repeat bloomer`; `once blooming` / `once flowering` / `once-flowering`; `long blooming`; `late blooming` / `late summer bloomer`; `spring bloomer` / `fall blooming`. Users cannot filter reliably because the vocabulary is not controlled.

**Detect again:** cluster tags containing `bloom`/`flower` (excluding colour/`cut flower`) and eyeball the family; longer-term keep a controlled tag list. `analyze.mjs` -> printed as the rebloom family.

### B3. Ambiguous picker labels: cultivar-epithet-only common names reused across genera
**Count: ~21 shared short names** (excluding the true duplicates in A1). The `commonName` for a variant is often just the cultivar epithet, and epithets repeat across unrelated plants, so the picker shows two cards with the identical label:

- "Tricolor" = Crocus sieberi 'Tricolor' **and** Ipomoea batatas 'Tricolor'
- "Lucifer" = Canna 'Lucifer' **and** Crocosmia 'Lucifer'
- "President", "Gipsy Queen", "Marmalade", "Snowflake", "Black Knight", "Blue Bird", "Primrose", "Minerva", "Natchez", "Profusion", "Veitchii", ... each on two unrelated plants.

Not a data error (the botanicals differ), but for the north-star user two identical labels are a clarity problem - which "Lucifer"? This is exactly the "clarity beats minimalism" call in CLAUDE.md.

**Detect again:** group by normalized `commonName`; flag any label on more than one distinct `botanicalName`. `analyze.mjs` -> `duplicateCommonName`. Fix pattern: label variants as "Genus 'Cultivar'" or "Common 'Cultivar'."

### B4. Genus-only botanicals where the genus holds distinct plants
**Count: a handful within 145 genus-only entries.** Most genus-only botanicals are honest generic representatives ("Tulip" = Tulipa, "Hosta" = Hosta). The misleading ones are where genuinely different plants share a bare genus:

- `Lilium` on `lily-asiatic`, `oriental-lily`, `trumpet-lily` (three distinct lily types, no species/division)
- `Rosa` on `rose-shrub`, `climbing-rose`, `hybrid-tea-rose`, `floribunda-rose`
- `Rhododendron` on `azalea` and `rhododendron`

**Detect again:** flag plants whose `botanicalName` is a single word yet whose genus is shared by 2+ differently-named plants. (The existing `scripts/audit-plants.mjs` also surfaces "named after the genus.")

---

# C. Cosmetic / expected-state (polish and content gaps, not defects)

### C1. Real-photo coverage is 41.9%
**975 of 1,677 plants have no real photo** (702 inherit one via group-default resolution; 135 distinct photo slugs, 352 photos total in the live `photos.json`). This is the in-progress harvest, not a bug - but it is the single biggest visible gap. Note: this is far below the "1,609 approved" figure in an earlier working note; the live published `photos.json` regenerated today is the ground truth. Worth confirming the harvest/publish pipeline is doing what was expected.

**Detect again:** `photo-coverage.ts` (resolves each plant's `photoSlugFor` against `photos.json`).

### C2. Built-in plants carry no description
**1,611 of 1,611 built-ins have `description: undefined`** (only the 66 community plants have descriptions, all 135-254 chars, good quality). This is by design in the schema, but functionally the detail view shows no prose for any curated plant. A content gap to decide on, not an error.

**Detect again:** count `description == null` by `source`. `analyze.mjs` -> `missingDescription`.

### C3. "Missing" bloom is correct: every bloom-less plant is a foliage plant
**172 plants have no bloom window,** and on inspection this is *right*, not a gap: 48 conifers, 10 ferns, 20 foliage trees (Japanese maples etc.), plus foliage cultivars - all 34 "perennials" are Heuchera (coral bells); all 35 bloom-less "annuals" are coleus / caladium / ornamental kale / rex begonia / sweet-potato vine / dusty miller; all 8 bloom-less shrubs are boxwood; all 7 bloom-less bulbs are elephant-ear; the 3 climbers are Boston ivy. The one arguable call is Heuchera, which does throw modest flower spikes a bloom-calendar could show.

**Detect again:** list `bloom == []` bucketed by category, then eyeball the foliage categories. `analyze.mjs` -> `missingBloom`.

### C4. "Missing" zones is the annual convention
**172 plants have no hardiness zones:** 166 annuals (grown as annuals, zone-agnostic by the library's convention) + 6 morning-glory climbers (which are also grown as annuals but filed under Climber - the only zone-less climbers). Consistent, not broken; the 6 morning glories are the only mild inconsistency.

**Detect again:** `analyze.mjs` -> `missingZones` (byCategory).

### C5. Size outliers are real large cultivars, not errors
**71 statistical outliers, 0 hard-rule violations.** The outliers are legitimately large members of a category dominated by small ones: giant hostas (1.5 m spread), mammoth sunflowers (3 m), climbing sweet peas (1.8 m), David Austin climbing roses (3-3.5 m), elephant ears. Per-category height ranges are all botanically sane (Bulb 0.1-1.8, Tree 2-20, Climber 2.5-12, Conifer 0.15-18). One category question: **crape myrtle** (`crape-myrtle-natchez`, `crape-myrtle-muskogee`) is filed as **Shrub** at **7 m** (tree height) - reclassify as Tree or accept it as a large shrub.

**Detect again:** per-category IQR fences on height and spread + absolute-bound rules. `analyze.mjs` -> `sizeStatisticalOutliers` / `sizeHardRuleViolations`.

---

# D. Botanical plausibility of specific values (multi-agent review)

Deterministic rules can prove a value is *out of range* but cannot judge whether a specific in-range value is *botanically wrong for that species* (a spring bulb blooming in autumn, a shade plant listed full-sun, a size off by 2x). A 53-chunk, category-grouped multi-agent pass reviewed all 1,677 plants for clear implausibilities, and every flag was re-checked by an independent adversarial verifier (default: reject unless clearly wrong) to keep precision high.

**Coverage:** 53 finder agents (one per category chunk) reviewed all 1,677 plants; each flag was checked by an independent adversarial verifier. **51 of 53 chunks found nothing implausible.** Total raised: **2. Both survived verification (0 rejected).** That near-empty result is itself a finding: the specific bloom months, zones, sun/water and sizes are, plant by plant, botanically sound. The two that failed are precise and worth fixing:

### D1. `autumn-cherry` blooms in autumn, but the data only lists spring (breaks the bloom forecast)
`autumn-cherry` = *Prunus subhirtella 'Autumnalis'*, "Autumn Flowering Cherry" - the winter/autumn-flowering cherry, grown specifically for its flush of pale flowers from roughly **November through March** in mild spells, plus a spring display. The catalog bloom is **Mar-Apr only** (`[[3, 4, "#f0dce4"]]`, `plantLibrary.ts:2731`). So the app's year-scrubber shows this plant flowering *only in spring* - contradicting its own name and hiding the exact trait people plant it for. This is a functional error in the flagship feature, not an approximation. **Expected:** a window spanning the autumn/winter flush (e.g. Nov-Mar) alongside spring. _(medium confidence, verify-confirmed against RHS / Missouri Botanical Garden.)_

### D2. `rosa-patience` is a cream rose tagged "red" (colour-search misfile)
`rosa-patience` (community, David Austin's 'Patience' / Auspastor) is a creamy blush-to-apricot English rose - correctly stored with a cream hex `#f5f0e1` - yet its tags include **"red"**. The colour tag contradicts the record's own bloom colour and would return this cream rose in a "red" colour search. **Expected:** a cream / blush / apricot colour tag. _(medium confidence, verify-confirmed.)_ This is the same failure mode as the community tag-hygiene issues in A3.

Full machine output: `botanical-findings.json` in this folder (both findings with the verifier's reasoning).

---

# For the planning session

**What we found.** The catalog's *structure* is in excellent shape: no missing sun/water/botanical, no out-of-range bloom or zones, no duplicate slugs, no impossible sizes, and community rows lose no data on expansion. A plant-by-plant botanical review of all 1,677 (with adversarial verification) confirmed only 2 wrong values. The real issues are narrow and fixable:

1. **A tiny set of true duplicate plants with conflicting data** (Anemone blanda ×3, tuberous begonia) - the only findings that make the product show one plant as two, with different sizes/hardiness. Highest priority.
2. **One flagship-feature bloom error:** the Autumn Flowering Cherry (`autumn-cherry`) is set to bloom Mar-Apr, hiding the autumn/winter flush it is named for. One-line fix to the bloom window; high value because bloom timing is the product's core promise.
3. **Tag hygiene** - garbage AI fragments (`"rosa d"`, `"california k"`), the "shade" double-meaning that mis-files 8 sun-loving trees, spaced-vs-hyphenated splits, and one wrong colour tag ('Patience' cream rose tagged "red"). These quietly break search/filter results.
4. **Two content gaps** - 58% of plants have no real photo yet, and no built-in has a description. Both are decisions, not bugs.

**What it means.** Nothing here corrupts a saved garden or breaks the slug->UUID contract; there is no schema risk. The duplicate-with-conflict entries and the autumn-cherry bloom window are the only items that produce *wrong* data the product will actually show; both are small, surgical edits (a bloom array, a group merge). Everything else is search/label clarity or content coverage - important for the north-star user (clarity over cleverness) but low-risk to change. The near-empty botanical review is a genuine confidence signal: the curated values hold up.

**Open questions for the planning session.**

- **Duplicates:** retire `windflower-*` in favour of `anemone-blanda-*` (or vice-versa), and collapse the two tuberous-begonia representations into one group? Retiring a slug must keep any saved garden that references it resolving (the slug->UUID contract) - so prefer merging/aliasing over deletion. Which slug is canonical?
- **The "begonia" catch-all group** mixes wax, tuberous, dragon-wing, bonfire and big begonias under one card. Split into true species groups?
- **Photos:** is 41.9% the expected current coverage, or did the last publish drop rows? (Earlier note said ~1,609 approved; live `photos.json` has 352.) Confirm the harvest/approve/publish path.
- **Descriptions:** ship built-in descriptions (they are the one thing the community plants have that the curated 1,611 do not), or leave the detail view prose-free?
- **Tag vocabulary:** adopt a controlled tag list (fix the 5 punctuation splits, the rebloom sprawl, and the "shade" collision) before the library grows further?
- **Heuchera bloom + crape-myrtle category:** show coral-bells flower spikes in the calendar? Reclassify 7 m crape myrtles as trees?
