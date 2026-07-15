# Garden Coach: current-state map and recommendation-dimension catalogue

Read-only investigation. Nothing in the repo was modified. Output lives outside the
repo in `C:\Users\etano\bloomseye-reports\garden-coach-map\`.

- **Repo:** `C:\Users\etano\bloomseye` (the Next app is in `garden-forecast-web/`).
- **Date:** 2026-07-14.
- **Catalogue ground-truth:** the live published `plants.json` (fetched read-only from
  the public Supabase CDN, 1,677 plants, `generatedAt` 2026-07-14T16:21Z) plus
  `lib/compatibility.json` (276 records). All counts below were computed from those files.
- **Method:** direct reading of `lib/coach.ts`, `lib/coachLock.ts`, `lib/pairRail.ts`,
  `lib/snapshot.ts`, `lib/plantCatalog.ts`, `lib/compatibility.ts`, and the `CoachCard` /
  `MonthSheet` render paths in `app/page.tsx`, then an independent four-agent verification
  pass (control-flow re-derivation, dimension enumeration, data-quality audit, completeness
  critic). Every load-bearing number was re-run against `plants.json`.

House style honoured: no long-dash character anywhere in this file.

---

## Part 1 - How the Garden Coach works today

### 1.1 Where it lives

| Concern | Location |
| --- | --- |
| Coach logic (pure, derive-only, no API) | `lib/coach.ts` |
| Free/premium slicing for the coach | `lib/coachLock.ts` |
| Free/premium slicing for the companion rail | `lib/pairRail.ts` |
| Entitlement flag (`usePremium`) | `lib/premium.tsx` |
| Calendar/gaps/bloom math | `lib/snapshot.ts` (`buildCalendar`, `GROWING`, `monthsInBloom`) |
| Catalog + resolution | `lib/plantCatalog.ts` (`CatalogPlant`, `catalogToSnapshotPlant`) |
| UI | `app/page.tsx` `CoachCard` (about lines 1377-1610) |
| Mount point | `app/page.tsx:1900`, in the **Overview** tab, between the year chart and the "Blooming now" rail |
| Shared recommender | `rankMonthCandidates` drives **both** the coach hero and the `MonthSheet` grid (`app/page.tsx:1088`) |

The coach is computed once per garden render: `computeCoach(cal, rsnap, bySlug, favs)` in a
`useMemo` (`app/page.tsx:1400`). It reads the resolved calendar, the resolved snapshot, the
loaded catalog, and the user's saved-plant set. It writes nothing.

### 1.2 The three insight kinds (and there are only three)

`computeCoach` (`lib/coach.ts:225-304`) can emit **at most three** insights, one of each
fixed kind, in this order. The kind universe is pinned by the union type
`InsightKind = "gap" | "pollinator" | "evergreen"` (`coach.ts:68`); no other kind is
constructible.

**1) `gap` - "Fill your {season} gap" (the hero).** Fires when `cal.gaps.length > 0`
(`coach.ts:255`). `cal.gaps` is the set of **GROWING** months (`GROWING = [3..10]`, i.e.
Mar to Oct) with zero plants in bloom (`snapshot.ts:284`). Picks are `rankMonthCandidates`
run for the **earliest** bare growing month (`cal.gaps[0]`), hardy plants preferred, with an
out-of-zone fallback, top three (`coach.ts:255-275`). This is the only insight tied to a
month, so it is the only one that offers a "More for {Month}" jump into the month sheet.

**2) `pollinator` - "Invite pollinators".** Fires only when the garden has **no**
pollinator plant (`!hasPollinator`, `coach.ts:278`) **and** the catalog yields at least one
qualifying pick. `hasPollinator` is set by resolving each garden plant to its catalog record
by slug and testing that record's tags against `POLLINATOR_HINTS = ["pollinat","butterfl",
"nectar","hummingbird"]` (`coach.ts:244-247`).

**3) `evergreen` - "Add evergreen structure".** Fires only when the garden has no evergreen
plant (`!hasEvergreen`, `coach.ts:291`) and the catalog yields a qualifying pick.
`EVERGREEN_HINTS = ["evergreen"]` (`coach.ts:112`).

`return { insights: insights.slice(0,3), perfect: insights.length === 0 }` (`coach.ts:303`).

### 1.3 How picks are ranked (`rankMonthCandidates`, `coach.ts:46-66`)

For each catalog plant that blooms in the target month and is not already in the garden:

- `score += 2` for every **bare growing** month the plant would cover, `+1` for every bare
  non-growing month. Note: the scoring `bare` set (`coach.ts:238`) is **all 12** zero-bloom
  months, wider than the gating `cal.gaps` set which is growing-only.
- `score += 100` if the plant's slug is a saved favourite.
- `ooz` (out of zone) is true when the garden zone is known and the plant's hardiness range
  excludes it. A plant with an **empty** zone range is never flagged out of zone.

Sort order: hardy plants first, then score descending, then common name. So a zone-guarded
view lists what you can grow before the warmer-zone stretches.

The wildlife/structure picks use a parallel scorer, `tagPicks` (`coach.ts:189-217`), which
additionally drops out-of-zone plants outright (`if (ooz) continue`) and, for pollinators
only, requires a bloom in a growing month (`needsGrowingBloom` true).

### 1.4 What is free vs behind the premium tease

`usePremium()` ships **false** for every real user (`DEFAULT_IS_PREMIUM`, `premium.tsx:24`),
billing is inert without keys, and every lock opens a waitlist sheet, never a price. **So
today every user sees the free path.** `computeCoach` returns the identical object for both
tiers; the lock is purely presentational, decided by `coachLockModel(pickCount, insightCount,
isPremium)` (`coachLock.ts:14-23`):

- **Premium:** nothing locked. Every insight renders as a full "combo": glyph, headline,
  honest detail, an "Add all N" button that plants the set in one write, and a scrollable
  rail of pick cards each carrying its derived match reason (`app/page.tsx:1561-1608`).
- **Free:** `lockedPicks = max(0, heroPicks - 1)`, `lockedInsights = max(0, insights - 1)`.
  The free user sees (`app/page.tsx:1494-1551`):
  - the hero's real headline and detail;
  - the hero's **first pick** as a genuine, tappable card;
  - **one** designed "N more picks" locked tile (opens the waitlist);
  - every **further** insight as a locked **teaser row** showing only its headline (no
    detail, no picks), which opens the waitlist.
  - The header "Premium" chip appears only when something is actually locked. A one-pick,
    one-insight garden shows no lock and no premium framing at all.

Consequence for the mission's "which types are free": for a free user the gap hero is
effectively the only insight shown in full. **Pollinator and evergreen, when present, are
almost always rendered as headline-only locked teaser rows**, because they are `insights[1]`
and `insights[2]`. This compounds their apparent inconsistency (Section 1.6).

### 1.5 The exact "nothing left to fill" dead-end

The terminal state is `computeCoach` returning `{ insights: [], perfect: true }`, which the
UI renders as the "A year in color" award (`app/page.tsx:1463-1490`): laurels, the logo disc,
a band of twelve honest month dots (non-blooming months render as dimmed stubs), the copy
"Every growing month has a bloom. There is nothing left to fill.", and a single "Browse
{current month} blooms" button into the free month sheet.

Exact path to reach it:

1. `buildCalendar` finds no bare growing month, so `cal.gaps = []` (`snapshot.ts:284`, with
   `GROWING = [3..10]`).
2. `coach.ts:255` `if (cal.gaps.length)` is false, so no gap insight.
3. The garden already contains at least one plant whose catalog tags match a pollinator hint,
   so `hasPollinator` is true and `coach.ts:278` is skipped.
4. The garden already contains an evergreen-tagged plant, so `hasEvergreen` is true and
   `coach.ts:291` is skipped.
5. `insights` is empty, so `perfect` is true (`coach.ts:303`), and `app/page.tsx:1463`
   renders the award.

The deeper structural cause is the **insight ceiling**: the coach has three ideas total, and
**two of them are one-shot**. The gap insight is the only recurring one (it reappears
whenever any growing month goes bare). The moment the garden acquires any pollinator-tagged
plant, "Invite pollinators" never returns; likewise evergreen. So a maturing garden
**monotonically drains the coach**: once you have covered Mar to Oct and own one pollinator
and one evergreen plant, the coach has nothing left to say, by construction, no matter how
much the garden could still be improved.

### 1.6 Why "Invite pollinators" appears inconsistently

Its appearance is governed by these independent gates (`coach.ts`), any of which can differ
between two gardens:

1. **Does the garden already contain a pollinator-tagged plant?** (`!hasPollinator`,
   `coach.ts:278`.) This is the dominant driver, and it is **one-shot**: adding a single
   pollinator-tagged plant removes the insight permanently.
2. **Zone.** `tagPicks` drops out-of-zone candidates (`coach.ts:201-202`). A garden whose
   zone has few in-zone pollinator plants sees fewer picks; a **zoneless** garden never flags
   anything out of zone and so sees the most.
3. **Growing-season bloom.** Pollinator picks must bloom in a Mar-to-Oct month
   (`needsGrowingBloom` true, `coach.ts:204`).
4. **Not already in the garden** (`coach.ts:199`).

**Correction from verification:** the mission's intuition that all four factors vary
independently is only **partly** right. For the pollinator kind specifically, factor 4 cannot
independently flip the outcome: any in-garden plant excluded by the "not already in garden"
filter also carries a pollinator hint and therefore already set `hasPollinator` (same slug,
same `POLLINATOR_HINTS`), which had already closed gate 1. And because the catalog holds 236
pollinator-hinted plants (172 of them zoneless and therefore always hardy), the "no
qualifying picks" path is practically unreachable. **In practice the insight's presence is
governed almost entirely by gate 1 (does the garden already have one pollinator plant), with
zone as a secondary modifier.** That is why it looks random across gardens: it is a binary
one-shot that flips off the instant a bee plant is added, and it is invisible to a free user
except as a locked teaser row unless it happens to be the hero.

### 1.7 Data facts that already bound the coach

- **Winter is deliberately excluded.** `GROWING` is Mar to Oct because the catalog can barely
  fill winter: only 8 plants bloom in Dec, 10 in Jan, 26 in Nov, 45 in Feb, versus 925 in Jun
  and 966 in Jul. A literal "winter bloom gap" recommender would draw from an almost empty,
  mostly non-hardy pool. The award copy is carefully written to say "growing month", so it
  does not lie when Nov to Feb are bare, but a user may still read "A year in color" as
  overstating.
- **Tags are uncurated free text.** The coach reads them by substring on purpose, and each
  tag insight is self-validating (no qualifying plant, no insight). This is robust but it also
  means the coach can only ever surface concepts the tag vocabulary happens to encode.
- **Colour is already structured and partly built.** Every bloom window carries a hex colour
  (1,505 windows, 932 distinct hexes, zero blank), and `app/page.tsx:2816` already buckets any
  hex into one of eight colour families (`hueFamily`/`familiesOf`). This powers the library
  and month-sheet colour filters but is not yet a coach recommendation.

### 1.8 Things worth fixing (reported, not fixed, per the task rules)

These are robustness gaps found during the trace. They are noted for the planning session;
no code was changed.

1. **Slug-less gardens make the one-shot insights recurring.** `hasPollinator`/`hasEvergreen`
   are detected only from the **catalog** record looked up by slug (`coach.ts:245`,
   `if (!c) continue`). `SnapshotPlant.slug` is optional (`snapshot.ts:16`). A legacy or
   hand-built snapshot whose plants lack resolvable slugs never sets these flags, so "Invite
   pollinators" and "Add evergreen structure" keep re-firing forever even after the user adds
   qualifying plants. Note the snapshot itself may carry `tags`, but `computeCoach` ignores
   `p.tags` for this check and reads only `c.tags`.
2. **172 zoneless plants are recommended into any zone with no warning.** In
   `rankMonthCandidates` and `tagPicks`, `ooz` is false whenever the plant's zone list is
   empty, so any of the 172 zoneless catalog plants can be offered as a hardy pick to any
   garden with no "Not hardy here" badge. Any redesign that leans harder on zone fit must
   decide how to treat unknown zones (they are silently "compatible" today).
3. **The "perfect" award can, in the abstract, fire over a real gap.** The gap insight
   requires not just `cal.gaps.length` but also a non-empty pick pool (`coach.ts:260`). If a
   garden contained every catalog plant that blooms in its earliest bare month (plus a
   pollinator and an evergreen), `perfect` would be true while a bare growing month exists,
   and the sentence "there is nothing left to fill" would be wrong. This is astronomically
   unreachable (every growing month has 146 to 966 catalog bloomers), and the twelve-dot band
   stays honest regardless, so this is a logical edge, not a live bug.

---

## Part 2 - Catalogue of possible recommendation dimensions

**Governing rule (adopt for any redesign).** Prefer bloom-derived and 100%-coverage
structured fields. Treat every free-text-tag dimension as a self-validating **floor** gated
behind a minimum-support check and a tag-canonicalization map (the tag vocabulary is messy;
see Part 3). Never surface "native" (no region signal exists) or a winter "bloom gap" (the
Nov-to-Feb pool is 8 to 45 plants, mostly non-hardy) as if they were fillable like a summer
gap.

Availability legend: **structured** = a first-class field present on ~100% of plants;
**derived** = computable from structured fields (bloom windows, height, etc.);
**tag** = free-text tag only; **partial** = a real field/tag but sparse or lossy;
**absent** = not in the app's data at all.

"App data" means, precisely, the published `plants.json`, `lib/compatibility.json`, and the
resolved garden snapshot. The app keeps no other plant library.

### 2.1 Master table (ranked by data-readiness x user value)

| # | Dimension | Data it needs | Availability | Coverage in the catalogue | Coach uses it? |
| --- | --- | --- | --- | --- | --- |
| **Tier 1 - bloom-derived, verifiable, ~100% coverage, mostly unbuilt** |
| 1 | Bare bloom months (in-season gaps) | Bloom windows + calendar; growing months with 0 bloom | derived | `cal.gaps`; every blooming plant colored | **Yes (hero)** |
| 2 | Thin bloom months (sparse, not zero) | Per-month count of in-garden bloomers | derived | `cal.cells[m].blooming.length` already computed | No |
| 3 | Missing colour families | Bloom hex bucketed to family; which of 8 the garden lacks | derived | `hueFamily`/`familiesOf` built; 8 families, 932 hexes | Filter only |
| 4 | Season balance + peak month | Bloom windows mapped to season; richest month | derived | `seasonWord` + `cal.cells` counts | Headline only |
| 5 | Long-blooming / window length | Span length of the bloom window | derived | `bloomRange` already measures it | No |
| 6 | Bloom succession and overlap | Bloom windows sequenced for hand-offs | derived | 1,505 single windows | No |
| **Tier 2 - clean 100%-coverage structured fields, high value, no coach angle yet** |
| 7 | Garden permanence / annual churn | `category` + `yearsToMaturity` | structured | Annual 422; `yearsToMaturity=1` on 674 | No |
| 8 | Category / type mix and diversity | `category` | structured | 11 values, 100% present | Filter only |
| 9 | Height / vertical layering | `matureHeight` | structured | 100%; tiers <0.3m 201, 0.3-1m 829, 1-3m 434, >=3m 213 | Detail only |
| 10 | Water hydrozoning (fuse with drought) | `water` | structured | moderate 1178, low 374, high 125 | Detail only |
| 11 | Sun / shade grouping | `sun` | structured | full-sun 1273, part-shade 249, part-sun 130, full-shade 25 | Detail only |
| 12 | Zone-appropriateness / out-of-zone flag | `hardinessZones` + garden zone | structured | 1,505 zoned, 172 zoneless | **Yes** (has soft spots) |
| 13 | Speed to maturity (fast colour) | `yearsToMaturity` | structured | 100%; 1yr 674 down to 25yr 3 | No |
| 14 | Companion-driven suggestions | `compatibility.json` pairings | structured | 276 records x 8; 166 plants have no group | Detail rail only |
| **Tier 3 - large clean self-validating tag pools (behave like today's pollinator/evergreen)** |
| 15 | Pollinator support | tag `pollinat*` | tag | 236 plants | **Yes** |
| 16 | Evergreen / off-season structure | tag `evergreen` | tag | 85 plants | **Yes** |
| 17 | Fragrance | tag `fragrant` | tag | 316 plants | No |
| 18 | Cut-flower / cutting patch | tag `cut flower` | tag | 162 plants | No |
| 19 | Drought / xeric | tag `drought tolerant` (or `water=low`) | tag | 377 (tag), 374 (water=low), overlapping | No |
| **Tier 4 - defer or avoid: sparse, garbled, or structurally absent** |
| 20 | Winter interest (structure/berries, not bloom) | tag `winter` + windows | tag/partial | tag 53; only 71 plants bloom any winter month | No |
| 21 | Native plants | tag `native` | tag (no region) | 113 tagged, only ~7 with any region hint | No |
| 22 | Deer resistance | tag `deer-resistant` | partial | **3 plants, all daffodils** | No |
| 23 | Berries / wildlife food | tag `berries` | partial | 24 plants; `bird` tag on 1 | No |
| 24 | Fall colour (leaf) | tag `fall color` | partial | 30 plants (do not conflate with `fall`=bloom season) | No |
| 25 | Edible / culinary | tag `edible` + category Herb | partial | edible ~25 to 37 union; Herb 22 | No |
| 26 | Repeat / rebloom | tag or multi-window | partial | tag ~34; **0 plants have 2+ windows** | No |
| 27 | Groundcover / edging | tag or low height | tag/derived | tag 47; derived height <0.3m = 201 | No |
| 28 | Hedge / screen | tag or (Shrub/Conifer + tall) | partial | tag 14; derived Shrub 228 + Conifer 48 | No |
| 29 | Foliage colour / texture / silver | `foliageColor` hex + tags | partial | hex 100% but mostly green; silver 14, variegated 14 | Fallback swatch |
| 30 | Mature-spread spacing / density | `matureSpread` + placement | structured (limited) | spread 100%, but snapshot has counts, no coordinates | Plan tab |
| 31 | Vertical / columnar / weeping form | tags | tag (sparse) | columnar/vertical 23, weeping/trailing 59 | No |
| 32 | Architectural / specimen / focal | tags | tag (sparse) | union ~67 | No |
| 33 | Heat / container / coastal niche | tags | partial | heat 47, container 31; salt/coastal ~1 each | No |
| 34 | Self-seeding / naturalizing | tags | partial | ~3 to 5 total | No |
| 35 | Cultivar consolidation (dedupe picks) | `group`/`groupDefault` | structured | group 1,511; groupDefault 176 | Pairing key only |
| 36 | Educational / descriptive copy | `description` | partial | **66 of 1,677** | Detail only |
| **Absent - name them so the session does not chase them** |
| A1 | Toxicity / pet and child safety | a toxicity field or tag | absent | no field, no usable tag (verified) | No |
| A2 | Soil / site-moisture (clay, bog, rain garden) | soil signal | absent | `water` is hydrozoning only; no soil data | No |
| A3 | Invasive / weediness | an invasive field | absent | `community` flag is provenance (66), not safety | No |
| A4 | Low-maintenance / easy-care | tag `easy` | absent-ish | tag `easy` on 26 (self-validates to nearly nothing) | No |

### 2.2 Notes on the notable dimensions

**Tier 1 is the redesign's real headroom.** All six are derived from data the coach already
holds, are fully verifiable, and (except the hero) are unconsumed:

- **Thin bloom months (#2).** The coach reacts only to zero. `cal.cells[m].blooming.length`
  already exists for all twelve months, so "your July carries the garden; your February hangs
  on a single plant" is free. Because catalog bloom is so summer-skewed, thin shoulder and
  winter months are near-universal and honest.
- **Missing colour families (#3).** The single highest-delight, lowest-risk win. The hex-to-
  family bucketing is already written and every window is coloured, so "you have no blue or
  white" or "your whole May is pink" is a promotion of existing code from filter to insight.
  Blue and true-green blooms are the scarcest families catalog-wide.
- **Season balance and peak (#4).** Distinct from bare-month gaps: "your garden is a June
  firework, then quiet" is a shape observation, not a hole. Trivially derived.
- **Long-blooming (#5).** "These earn their space, months of bloom" is derivable from window
  length (`bloomRange` already computes the longest window) and is far more reliable than the
  near-absent "long blooming" tag.
- **Succession and overlap (#6).** Fully derivable, with one hard caveat: **no plant has more
  than one bloom window** (`{0:172, 1:1505}`). Succession and hand-offs are computable, but a
  reblooming or two-season plant is not represented structurally, so any "rebloom" angle
  (#26) cannot be derived, only read from a sparse, inconsistent tag.

**Tier 2, the strongest new idea (#7, permanence / annual churn).** This is the one clean,
high-value dimension that was missing from the first-pass catalogue. `category` and
`yearsToMaturity` are both 100% present; 422 plants are annuals and 674 have
`yearsToMaturity=1`. "Five of your seven plants are annuals you will replant every spring;
add a shrub or perennial backbone that returns on its own" is exactly the derive-only,
self-verifying shape the coach is built for, and the woody/perennial candidate pool
(Perennial 450, Shrub 228, Tree 84, Conifer 48, Rose 87) is large and zone-checkable.

**Tier 2, companion-driven suggestions (#14).** `compatibility.json` is the richest existing
reasoning asset: 276 archetype records, eight companions each, and prose reasons that already
encode water (2,208 of 2,208 reasons), sun (1,850), bloom succession (1,214), pollinator
(1,000), structure (557), height/layering (534), shade (538), evergreen (499), native (133),
and colour contrast (82). It powers the detail-sheet companions rail but is **not** a coach
angle. Two caveats: 166 catalog plants have no group and 66 resolve to no companion strip at
all; and the reason prose contains **zero** mentions of fragrance, deer, or drought, so those
angles would have to be recomputed, not read from the file.

**Tier 3 behaves exactly like today's pollinator/evergreen insights.** Fragrance (316),
cut-flower (162), and drought (377) are large, clean, self-validating tag pools. They are the
safest tag dimensions to add, and drought is corroborated by the structured `water=low` field
(374), so it can straddle Tier 2 and Tier 3.

**Tier 4 and Absent, why they are parked.** Deer resistance (#22) is the cautionary tale:
three tagged plants, all daffodil cultivars, so a "deer-resistant garden" angle would
recommend the same three daffodils to everyone. Native (#21) is horticulturally meaningless
without a region, and the app has only lat/lng/zip/zone, no ecoregion, so it could suggest a
California native to a New England garden. Winter bloom (#20) hits the near-empty pool.
Repeat/rebloom (#26) is structurally underivable. Toxicity (A1), soil (A2), and invasiveness
(A3) are genuinely absent from the data and were verified by direct tag scans: do not build
them, and do not let the session assume they are derivable.

---

## Part 3 - The data model at a glance (reference)

### 3.1 Per-plant fields in `plants.json` (1,677 plants)

Present on **100%**: `id`, `slug`, `commonName`, `botanicalName`, `category`, `bloom`
(windows, each with a hex colour), `foliageColor`, `hardinessZones` (empty on 172), `sun`,
`water`, `matureHeight` (metres), `matureSpread` (metres), `yearsToMaturity`, `tags`,
`community`, `image`, `card`, `cardSm`. Present on **1,511**: `group`, `groupName`. On
**176**: `groupDefault`. On **66**: `description`.

- `category`: Perennial 450, Annual 422, Bulb 231, Shrub 228, Rose 87, Tree 84, Climber 62,
  Conifer 48, Grass 33, Herb 22, Fern 10.
- `sun`: full-sun 1273, part-shade 249, part-sun 130, full-shade 25.
- `water`: moderate 1178, low 374, high 125.
- `matureHeight`: median 0.7 m, range 0.1 to 20 m.
- `yearsToMaturity`: 1yr 674, 2yr 461, 3yr 233, 4yr 108, 5yr 60, then a woody tail to 25yr.
- Bloom windows per plant: 0 windows on 172 plants (foliage only), exactly 1 window on the
  other 1,505. **No plant has 2 or more windows.**
- Plants in bloom by month: Jan 10, Feb 45, Mar 146, Apr 297, May 637, Jun 925, Jul 966,
  Aug 892, Sep 776, Oct 397, Nov 26, Dec 8.
- The 172 foliage-only plants and the 172 zoneless plants are **disjoint** sets (zero
  overlap): the coincident count is a coincidence, not the same plants.

Note on future-proofing: `sanitizePlant` forwards unknown producer fields verbatim via a
`...p` spread (`plantCatalog.ts:149`). **Verified: the current published catalog carries no
field beyond the ~22 named above**, so this is a forward-looking hardening detail, not a
hidden data source to mine today. Any field a redesign depends on should be validated
explicitly rather than trusted through the spread.

### 3.2 Tag vocabulary (291 distinct tags)

The tags are the only encoding for the "soft" dimensions (fragrance, native, deer, cut
flower, etc.), and they are **messy**. A redesign that reads tags must canonicalize first.
Documented issues:

- **Garbled / truncated tags** from names split on spaces: `rosa da` (5, from Rosa
  damascena), `rosa de`, `rosa d`, `rosa f`, `california k`, `california ke`, `flannel bush`,
  `de meaux`, `de rescht`. These are fragments, not concepts.
- **Genus names used as tags**, duplicating `botanicalName`: `agastache` (7), `hemerocallis`,
  `eschscholzia`, `alcea`, `hollyhock`, `echinacea`, `fremontia`, etc.
- **Extreme long tail:** of 291 tags, 105 occur exactly once and about 144 occur at most
  twice; only around 30 tags exceed 40 plants.
- **Same concept split across forms:** pollinator vs "attracts pollinators" vs "pollinator
  friendly" vs "bee friendly"; "drought tolerant" vs "drought"; "cut flower" vs "cut
  flowers"; "disease resistant" vs "disease-resistant"; several repeat-bloom spellings. Exact
  match under-counts a concept; the coach only survives this today because it substring-
  matches "pollinat" and "evergreen".
- **Redundancy and conflict with structured fields:** colour-word tags on 1,629 plants
  duplicate the bloom hex; category tags (tag `rose` 124 versus category Rose 87) can even
  disagree; season tags (summer 1170, spring 789, fall 790, winter 53) mostly denote bloom
  season and disagree with the actual windows (the "winter" tag is on 53, but only 71 plants
  bloom in any winter month). Derive type from `category`, colour from bloom hex, and season
  from computed `monthsInBloom`, never from these tags.

### 3.3 `compatibility.json`

276 records keyed by species archetype slug, each with 8 companions of
`{ slug, commonName, score, reason }`, best score first, 2,208 entries total. A cultivar
resolves to its archetype via `companionKeyFor` (own slug, else the group default, else the
group key). Reason prose already encodes water, sun, bloom succession, pollinator, structure,
height/layering, shade, evergreen, native, and colour contrast, but never fragrance, deer, or
drought.

### 3.4 Garden snapshot (per garden)

`location` (lat, lng, zip, usdaZone) and `plants` (each with bloom, foliage colour, zone
min/max, optional `tags`, `sun`, `water`, `matureHeight`, `matureSpread`, `plantedOn`,
`maturity`, and a per-species `count`). Crucially, the snapshot carries **counts, not
coordinates**, so true spacing/density and per-bed light or soil are not computable from it.
`slug` is optional on a snapshot plant, which is what enables the slug-less recurrence issue
in Section 1.8.

---

## For the planning session

### Findings

1. **The coach is a three-idea engine and two of the ideas are one-shot.** Only the bloom-gap
   hero recurs. Pollinator and evergreen each fire once and never again once the garden owns a
   single qualifying plant. That, plus the fact that gaps are defined only over Mar to Oct, is
   the entire reason a full garden dead-ends at the "nothing left to fill" award. The dead-end
   is structural, not a bug.
2. **"Invite pollinators" looks random because it is a one-shot binary keyed on gate 1** (does
   the garden already contain one pollinator-tagged plant), lightly modified by zone, and,
   for a free user, usually shown only as a locked teaser row. It is not four independent
   dice; it is one latch that flips off the instant a bee plant is added.
3. **The data supports far more than three dimensions.** Six Tier-1 recommendations are
   derivable from data the coach already holds (thin months, missing colours, season balance,
   peak reinforcement, long-bloomers, succession), and the colour-family and window-length
   machinery is already written. Another clean set (permanence/annual churn, category
   diversity, height layering, hydrozoning, sun grouping, speed to maturity, companion-driven
   picks) sits on 100%-coverage structured fields the coach ignores.
4. **The tag vocabulary is the ceiling for the "soft" dimensions and it is dirty.** Fragrance
   (316), cut-flower (162), and drought (377) are the only large, clean tag pools. Deer (3),
   berries (24), fall colour (30), native-with-region (~7), and rebloom (0 structural) are too
   thin or too lossy to recommend on honestly.
5. **Three code robustness gaps** were found (slug-less gardens make the one-shot insights
   recurring; 172 zoneless plants are recommended into any zone unguarded; the "perfect" award
   can in the abstract fire over a real gap). None were fixed, per the task rules.

### What it means for a redesign

- The fix for the dead-end is **more recurring, gradeable dimensions**, not a smarter version
  of the same three. Replace two one-shot binaries with a scored, always-something-to-improve
  model whose insights come off derived bloom shape (Tier 1) and clean structured fields
  (Tier 2). A garden should always have a next best improvement until it is genuinely
  excellent on many axes, not just three.
- The highest-value, lowest-risk first moves: **missing colour families**, **thin bloom
  months**, **season balance / peak**, **permanence (annual churn)**, and **fragrance**. The
  first three are pure promotions of existing computation; permanence and fragrance are one
  clean field each.
- Any tag-based dimension needs a **canonicalization map plus a minimum-support gate**, and
  the coach should keep its self-validating "no qualifying plant, no insight" discipline.
- Winter and native need **reframing, not filling**: winter as evergreen/structure/berries
  (never a fillable bloom gap), native only if a region signal is added to the data and the
  location model.

### Open questions for the room

1. **Premium framing.** Today a free user effectively sees one insight in full and the rest as
   locked teaser rows. If the redesign adds five to eight dimensions, does free get one strong
   insight and premium gets the graded rest, or does the split change entirely? The dead-end
   feels worse under the current one-visible model.
2. **Zone and slug hardening.** Do we want to keep silently treating unknown zones and
   slug-less plants as "compatible / no pollinator", or fix them before leaning harder on
   zone fit and one-shot latches? (See Section 1.8.)
3. **Placement.** The snapshot has counts, not coordinates, so spacing, per-bed light, and soil
   are out of reach. Is there appetite to bring even coarse placement or bed metadata across
   from the Studio, or do we commit to garden-wide (not per-bed) advice?
4. **Rebloom.** No plant has more than one bloom window, so rebloom and two-season plants are
   invisible to succession logic. Is that a catalogue limitation the Studio can fix, or a
   permanent constraint the coach must design around?
5. **Native region.** Is adding an ecoregion or native-range signal (to plants and/or to the
   garden location) in scope? Without it, "native" cannot be offered responsibly.
6. **Winter positioning.** Given the catalogue's winter scarcity, do we lean into evergreen and
   structure as the winter story, or keep winter out of the coach's promises entirely?
