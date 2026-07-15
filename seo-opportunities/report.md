# BloomsEye directory: programmatic SEO opportunities

**Date:** 2026-07-14
**Scope:** read-only investigation of `bloomseye-directory` (`main` @ `bc655e9`) against the live catalog.
**Nothing in the repo was changed.** Every fix named below is written down, not applied.

**Method.** All counts are computed from the live catalog (`plants.json`, 1,677 plants, fetched
2026-07-14) using the site's own faceting logic copied verbatim out of `src/lib/facets.ts` (the same
`colorName()` HSL bucketing, the same year-wrap-aware `bloomMonths()`, the same `slugify()`), so a
number here is the number of cards the page would actually render. Scripts and raw output sit alongside
this report: `analyze.mjs` / `counts.txt` (single facets, every 2-way and 3-way cross, at thresholds
8 / 12 / 15 / 20 / 30) and `analyze2.mjs` / `counts2.txt` (page weight, deep-intel derivations,
recommended families). Every headline number was independently re-derived a second time before
publication. Search-demand and risk claims come from a web-research pass that was then adversarially
fact-checked; corrected claims are stated in their corrected form and confidence is labelled.

---

## Summary: read this part first

**The brief asks which programmatic page families to build. The most important finding is that the
answer is already partly on the record, and the data contradicts it.**

`README.md` carries a section headed **"The site's job (decided 2026-07-02)"**. It says this site is a
**"conversion surface, not a traffic business"**, that AI Overviews have roughly halved clicks on
informational queries, and that:

> **Programmatic freshness:** the zone + month "what to plant now" pages (in the summer 2026 queue) are
> the growth surface, because timely, action-shaped queries resist zero-click far better than evergreen
> guides.

That has two consequences for this brief, and they point in opposite directions:

1. **Every facet cross the brief asks about (colour x month, trait x zone, colour x light, size, water x
   light) is evergreen informational content** - precisely the class the strategy deprioritised. They
   are all buildable, and section 4 gives the real page counts, but none of them is what the strategy
   said it wanted.
2. **The family the strategy names as *the* growth surface - "what to plant now" - is the planting
   calendar, and the catalog cannot currently support it.** There is no planting or sowing field
   anywhere, and the obvious key is wrong: USDA zone encodes winter minimum temperature, not frost
   timing. Pittsburgh PA and Bend OR are both zone 6b and their last-frost dates are two months apart.

**So the single most valuable thing this report can say is: the growth surface the team chose is the one
the data does not yet support, and the gap is a bounded, nameable data project (section 6).** That
should be the first item on the planning agenda, not the facet crosses.

Everything else, in order of value:

- **Something is broken right now.** `/plants/traits/deer-resistant/` contains **3 plants** (three
  daffodil cultivars) under the H1 "Deer-resistant plants", and `Footer.astro` links to it from **every
  page on the site**.
- **Five pairs of already-shipped Bloom Calendar pages are 100% identical to each other**, and the
  template deliberately cross-links them. This is Google's own doorway example ("substantially similar
  pages") in production today. Fix before replicating the pattern.
- **80% of the site is already thin**: 1,335 of 1,677 plant pages have no description, no photo, and no
  deep-intel record. Every new facet page is a grid of those cards.
- **Hub pages cannot convert and are not measured.** The strategy's metric is Studio handoffs, and
  `Cta.astro` on all ~1,826 catalog pages is a generic link with no `?add=` multi-slug handoff and no
  analytics event. The site's stated job is conversion, and the 98% of it that is catalog pages does
  not do it.
- **The best unbuilt family needs no new data**: 175 species-group comparison pages (section 4.1).
- **Pet safety is a data project, not a page project**, and the useful half (safety) is the half the
  data lacks (section 5).
- **Two ideas in the brief die on contact with the data.** Water x light: all 374 low-water plants are
  already tagged drought-tolerant, so the hub would be a 100% duplicate. And "tall plants for privacy":
  no growth-rate field, only 43 evergreen plants over 2 m, and a guide already exists.

---

## 1. The strategy already on the record

I did not have `bloomseye-studio/STRATEGY.md` section 6 - it is in the other repo and is not present on
this machine - and `README.md` says that document holds "the verdict, positioning, the three bets,
metrics, kill / continue criteria". **It must be pulled into the planning session**, because the rest of
this report is a supply-side analysis (what the data can support) and it needs to meet the demand-side
verdict already written down there.

What `README.md` does state, and what this report must be read against:

| The strategy says | This report finds |
|---|---|
| "A conversion surface, not a traffic business" | ~1,826 catalog pages have no conversion mechanism and no analytics event |
| "Raw sessions are a vanity metric" | Every facet cross in the brief is a raw-sessions play |
| "New guide topics are not written purely for traffic" | The same logic applies to a new *hub* topic; the report ranks accordingly |
| "Being the cited source ... to win the citation inside AI answers" | Favours per-plant depth and structured data over more list pages |
| Growth surface = zone + month **"what to plant now"** | That family needs a dataset the catalog does not have (section 6) |

**This is not an argument for doing nothing.** It is an argument for a different ordering than the brief
assumed: fix the conversion and quality holes, build the families that are *action-shaped* and that the
data genuinely supports, and treat the evergreen facet crosses as the lowest tier rather than the point.

---

## 2. Four things that are wrong today

Fix these before adding a single page. Three of the four make the existing site worse the more pages are
stacked on top of them.

### 2.1 A thin page, linked from every page on the site

The catalog's `deer resistant` tag is on **3 plants**: `daffodil`, `narcissus-dutch-master`,
`narcissus-mount-hood`. `tagFacets()` keeps the hub because `MIN_FACET` is 3 and it has exactly 3. So
the site publishes a page titled "Deer-resistant plants" whose entire content is three daffodils - one
species - and `Footer.astro` links to it from all ~1,826 pages.

**The data to fix it is already in this repo.** `src/data/deep-intel.json` asserts deer resistance, with
sources, for **108 species** (`extraFacts` labels: "Deer and rabbit resistant" x66, "Deer resistant"
x18, and variants). Propagated across their groups that is **475 plants**, and deer-resistant x zone then
clears 8 plants in all 10 zones (z3=185, z5=344, z7=384, z9=250).

The durable fix is upstream: the catalog's own tagging is what is broken ([HUNT-8]). The canonical
source the whole industry silently copies is the **Rutgers NJAES landscape-plant deer rating list**;
importing it as a Studio-side field would beat both. But three daffodils under that H1, footer-linked,
is a live liability today.

Three more hubs are borderline but defensible: `/plants/blooming-in/december/` (8 plants),
`/plants/blooming-in/january/` (10), `/plants/type/fern/` (10).

### 2.2 Five pairs of shipped Bloom Calendar pages are byte-for-byte identical lists

This is the finding that most changes the plan, because the Bloom Calendar is the precedent every
proposed family would copy.

I measured set overlap (Jaccard) between each shipped combo and its siblings, across all 97 live pages
(`analyze3.mjs` reproduces the page set exactly). **The zone axis is the problem; the month axis is
fine:**

| Sibling axis | Pairs | Median overlap | >= 80% identical | **100% identical** |
|---|---|---|---|---|
| **adjacent zone**, same month | 85 | **72%** | **37 (44%)** | **5** |
| adjacent month, same zone | 87 | 42% | 7 (8%) | 1 |

**Six pairs of live pages are the same list of plants on two URLs:**
`zone-5/november` == `zone-6/november` (24 plants), `zone-7/november` == `zone-8/november` (26),
`zone-7/january` == `zone-8/january` (10), `zone-7/december` == `zone-8/december` (8),
`zone-8/december` == `zone-9/december` (8), and `zone-2/august` == `zone-2/september` (20).

And `src/pages/bloom-calendar/[zoneslug]/[month].astro` (lines 52-55) **deliberately cross-links exactly
these siblings** - it pushes `zone-1`, `zone+1`, `month-1`, `month+1` chips onto every combo page. So the
site is hand-delivering Google a chain of near-duplicate pages that point at each other.

Google's doorway policy names this directly: *"Creating substantially similar pages that are closer to
search results than a clearly defined, browseable hierarchy."* The earlier analysis in this report (and,
as far as I can tell, the original Bloom Calendar design) only ever tested a cell against its **parents**.
Nobody tested a cell against its **siblings**, and that is where the duplication actually lives.

**Every count in section 4 should therefore carry a sibling-similarity gate**, not just an item-count
gate. A reasonable rule: reject or merge a cell whose Jaccard against an already-generated sibling
exceeds ~0.8. (That 0.8 is a judgement, not a Google-published number - no such number exists.)

The deeper lesson is about **which axis to cross on**. Zone is the worst possible choice, because adjacent
zones share almost all their plants: a zone-6 plant list is a zone-5 plant list. Month, colour, light and
height genuinely *partition* the catalog; zone merely *nests* it. **Six of the ten families in section 4
cross on zone.** Either collapse zone into bands (3-4 / 5-6 / 7-8 / 9-10, which would take
`trait x zone` from 60 pages to ~24 much stronger ones) or prefer the axes that actually divide the data.

### 2.3 80% of the plant pages are already thin

**1,335 of 1,677 plant pages (80%) have no description, no real photo, and no deep-intel record.** They
carry a name, an AI-illustrated card, a bloom strip and four spec chips - and their siblings in the same
species group differ from them by a name and a card colour.

That is the scaled-content exposure, live, today, at four fifths of the site. Two consequences:

- The defence "our facet pages differ from an AI Overview because they carry a real filtered grid and
  real photos" is **not true of the pages being proposed**. A `/plants/color/pink/zone-5/` page selects
  precisely for the rows that have no photo and no prose.
- **Only 135 of 1,677 plants have a real photo.** For the pet-safety family this is disqualifying on its
  own: you cannot ask someone to identify the plant their cat just ate from an AI illustration.

A photo-and-description push is plausibly a higher-leverage use of the same effort than any new page
family. That is a real question for the session, not a rhetorical one.

### 2.4 Hub pages cannot convert, and are not measured

The strategy's metric is Studio handoffs (`design_click`, `preview_click`, `guide_view` to PostHog via
`src/scripts/analytics.ts`). But:

- `Cta.astro` - the CTA on every hub page - is a single generic link. There is **no `designUrlMany()`
  multi-slug `?add=` handoff on any hub**, even though `site.ts` exports exactly that helper and the
  guides use it.
- **No hub event exists in the analytics dictionary.** The events are `guide_view`, `preview_click`,
  `design_click`, `studio_click`; nothing fires a hub view.

So ~1,826 pages - 98% of the site - are, by the strategy's own metric, unmeasurable and non-converting.
Shipping 300 more of them changes nothing about that.

**An "Add these 24 plants to a garden" CTA on `HubBody` is probably the single highest-leverage change
available.** It converts on the strategy's own metric, and - not incidentally - it gives each hub page a
*function* its parent hub does not have, which is exactly the differentiation Google's doorway self-test
asks for. Note the guard: 66 plants are `community: true` and the Studio's `?add=` resolver silently
drops them (`handoffSlug()` already handles this per-plant), so a hub multi-add must exclude them.

### 2.5 Page weight is the binding constraint (already logged as PERF-2)

At the documented figure (~4.45 MB for 1,677 cards) each card costs ~2.7 KB of HTML: four inline SVG
icons plus a 12-span bloom strip, per card. Today's hubs are enormous:

| Hub | Cards | Est. HTML |
|---|---|---|
| `/plants/light/full-sun/` | 1,273 | ~3.4 MB |
| `/plants/zone/8/` | 1,217 | ~3.2 MB |
| `/plants/blooming-in/july/` | 966 | ~2.6 MB |

**20 existing hub pages already carry 300+ cards.** PERF-2 is logged in `CLAUDE.md` as a
`/plants/index.html` problem; it is really a **hub-template** problem that every new family inherits, and
these are the pages you want to rank, on mobile, where a multi-megabyte document fails Core Web Vitals.
The `<symbol>` sprite plus gradient bloom strip, **plus a cap or pagination on cards per hub**, is a hard
prerequisite for any facet expansion, not a follow-up.

---

## 3. What exists today

| Page family | Count | Generated by |
|---|---|---|
| `/plants/<slug>/` | 1,677 | `[slug].astro`, one per catalog record |
| `/bloom-calendar/zone-<z>/<month>/` | 97 | `bloomCalendar.ts`, gate = 8 plants |
| `/plants/blooming-in/<month>/` | 12 | `monthFacets()`, gate = `MIN_FACET` (3) |
| `/plants/type/<category>/` | 11 | `categoryFacets()` |
| `/plants/zone/<z>/` | 10 | `zoneFacets()` |
| `/plants/traits/<tag>/` | 8 | `tagFacets()`, whitelist `HUB_TAGS` |
| `/plants/color/<colour>/` | 7 | `colorFacets()` |
| `/plants/light/<sun>/` | 4 | `sunFacets()` |
| `/guides/<slug>/` | 32 | `src/data/guides.ts` |
| **catalog-driven total** | **~1,826** | plus home, `/plants/`, `/guides/`, `/bloom-calendar/`, `/credits/`, `/privacy/`, `/terms/`, 404 |

**How a hub page is built.** Every hub goes through one component, `HubBody.astro`: breadcrumbs, an
eyebrow, an H1, **one generated sentence of lead copy**, a plant count, the full plant grid, a "Keep
exploring" chip row, and the generic CTA. The bloom-calendar combo is the only variation, and only
slightly: its lead names the first three plants. That one derived sentence is the entire unique-content
budget of a hub page, and any new family inherits it.

**Internal linking.** Header (every page): `/`, `/plants/`, `/guides/`. Footer (every page): those plus
`/bloom-calendar/`, `/credits/`, `/privacy/`, `/terms/`, and five "popular" hubs including the
three-plant `deer-resistant` one. Home links every colour, month, trait, zone and category hub as chips.
Hubs link to their plants, their sibling hubs, and `/plants/`. The zone hub additionally renders its
bloom-calendar combos through `HubBody`'s `<slot />`. Combos link to both parents, four neighbours
(guarded by `hasCombo`, so a chip never 404s) and the calendar hub. Plant pages emit `plantHubLinks()` -
every hub they qualify for - plus related plants and companions.

There are **no orphans and no `noindex` anywhere**; crawl depth from home to any combo is 2. The sitemap
is `@astrojs/sitemap` with no filtering. `Layout.astro` already accepts an unused `noindex` prop, which
is a ready-made lever for staging a family. Note also that `websiteLd()` declares a
`SearchAction` at `/plants/?q={search_term_string}`, and `/plants/index.astro` reads `location.search` -
so a query-parameter space is declared to Google while `robots.txt` allows everything. Worth hardening
before adding crawlable facet paths.

---

## 4. The facet crosses, answered

Every count below is real: it is what the generator would emit against today's catalog. **All of them are
evergreen informational pages** - see section 1 before committing to any of them.

**Recommended gate for any new family**, tightened from what the brief assumed and from what the Bloom
Calendar uses:

1. **>= 12-15 plants** (not 8). Live competitor facet pages ship 24 items; gardenia.net emits exactly 24
   `ListItem`s per facet page, and the intersection pages that rank are titled "30 Deer-Resistant Plants
   for USDA Zone 7". There is **no Google-published minimum** - every threshold anyone quotes, including
   these, is convention - but 8 is below what anyone who ranks is shipping.
2. **>= 5 distinct species groups**, because a page of 20 plants that is 20 cultivars of one tulip is
   thin at 20 items. (Good news: single-species dominance is rare - of 58 candidate colour x month pages,
   exactly **one** exceeds 40% single-species, white x February at 40% snowdrop.)
3. **Cap cultivars shown per species** (2-3, with a "see all 16" link to the species page).
4. **Sibling Jaccard < ~0.8** (section 2.2). This is the gate nobody applied, and it is the one that
   bites.

### 4.1 Species-group comparison pages - the best family, and it needs no new data

**Real page count: 175** (groups with 3+ cultivars). At a 5-cultivar gate: **155**. **147** of the 175
also show 2+ distinct bloom colours, so the table is worth reading.

The catalog is not 1,677 independent plants. It is **342 species groups** with colour cultivars beneath
them: `english-rose` (32 cultivars), `tulips` (18), `daffodils` (16), `dahlias` (16), `clematis` (16),
`daylilies` (16), `hostas` (16), `peonies` (16), `coneflowers` (16), `coral-bells` (15). Every cultivar
already carries bloom window, colour, height, spread, zones, sun and water. A page that puts them in one
sortable table ("18 Tulip Varieties Compared") is a real document, and it costs one template.

It also solves three logged problems for free:

- It gives each species group **one canonical page**, which is where the duplicate-cultivar-slug issue
  ([SEO-1/HUNT-4]) can be canonicalised.
- It is the natural home for `deep-intel.json`, which is keyed at **exactly this level** (276 of 342
  groups) and is currently rendered on only the single group-default plant page.
- It is the **cure for section 2.3**, not another instance of it: it turns 1,335 near-duplicate cultivar
  pages from a liability into the content of a page that has a reason to exist.

**Evidence:** gardenia.net runs this exact family at `/compare-plants/<group>` with a
`/compare-plants/directory` hub (verified live). **Caveat: search demand for this family was not directly
measured.** It is ranked first on data strength and on how well it fits the catalog's actual shape, not
on a demand number. Validate the "tulip varieties" / "types of hosta" phrasing before committing.

### 4.2 Trait x zone

**Real page count: 60** at 12 plants + 5 groups (66 at the 8-plant gate). Median page: 115 plants.
Biggest cells: `drought-tolerant x 8` (301), `fragrant x 7` (282).

**Demand evidence, the strongest of any cross:** Google autocomplete for `"deer resistant plants for
zone "` returns ten zone variants (6b, 6, 7, 4, 9, 6a, 5, 7b, 8b, 3), and every whitelisted trait
produces a comparable ladder. A suggestion only appears when that exact string is independently searched,
so a deep ladder is a strong *ordinal* signal. (Suggest caps at ten, so this is a deep ladder, not an
exhaustive one.) The SERP is held by ecommerce facet URLs built for precisely this cross
(`fast-growing-trees.com/collections/perennials/trait-deer-resistant/zone-5`).

**But apply section 2.2 hard.** This family crosses on zone, which is the axis where sibling pages
duplicate each other most. Consider **zone bands** rather than ten zones.

**Drop `native` from this cross.** A plant native to Georgia is not native to Oregon, though both have
zone-8 areas; the page would be botanically false. (`native x light` is the defensible native cross.)
**Handle half-zones:** searchers type 5b, 6a, 7a, which the catalog does not model. The page must say
"Zone 5 (5a and 5b)" or the sub-zone query is lost. And the `deer-resistant` cells depend on the fix in
section 2.1.

### 4.3 Colour x zone (66 pages) - the clearest content gap

66 pages at 12 plants + 5 groups (70 at 8). Median page: 151 plants; four exceed 300 cards.

Autocomplete for `"pink perennials for zone "` returns 5, 6, 3, 4, 7, 8, 9, 5b - but the SERP for "pink
perennials for zone 5" contains **no exact-match editorial page at all**, only shop facets and
half-matching listicles ("37 pink perennials") or zone-only pages. Google is currently stitching this
answer out of two half-matching page types. Same zone-sibling caveat as 4.2.

### 4.4 Type x zone (74 pages) - highest volume, lowest win rate

74 pages at 12 + 5 (83 at 8). Autocomplete gives a deep ladder for `"shrubs for zone "`, but page 1 for
"perennials for zone 4" is epicgardening, gardendesign, Brecks, White Flower Farm - every slot a large
brand or a transactional nursery. Cheap to ship and it feeds internal link equity to the plant pages, but
expect wins only in the long tail (zone 3 conifers, zone 9 climbers), not the head terms.

### 4.5 Groundcover / low-growing x light (~14 pages)

Base set: **351 plants / 89 groups** at height <= 0.3 m. `matureHeight` is present and non-zero on all
1,677 plants. Autocomplete for `"groundcover for "` returns *shade, full sun, shade zone 5, shady areas,
clay soil, sun, dry shade, wet areas, part shade* - the cross this family builds is literally what people
type. A `/guides/ground-cover-plants/` guide already exists, so this is hub-and-spoke, not a competitor.
The wider size family also works (size x zone = 45 pages, size x light = 16, size x colour = 35), and
**height partitions the catalog far better than zone does**, which makes it the safer cross axis under
section 2.2.

### 4.6 Colour x month (57 pages) - and colour x **season**

57 pages clear 12 + 5 (61 at 8). But demand is not spread evenly: autocomplete for `"purple flowers that
bloom in "` returns *spring, early spring, fall, may, winter, march, april, june*. **July, August,
September, October and November never appear** - which is the exact opposite of where the catalog's mass
sits (July = 966 plants). Build the ~35 cells autocomplete supports, and add **colour x season** pages,
which are the higher-volume phrasing and which the bloom windows compute exactly.

### 4.7 Demoted: long-blooming

This looked like a top-tier family and the data does not support the page it promises. The headline
number is real - **360 plants bloom for 5+ months** - but underneath it:

- **219 of the 360 are annuals.** Only **22 are perennials**, across **8 species**.
- **126 of the 360 have no hardiness zone at all.**
- Bloom duration is **quantised and capped**: 169 plants at exactly 5 months, **187 at exactly 6**, 3 at
  7, 1 at 8. You cannot rank a "longest blooming" list when 187 plants tie for first.
- So *"longest blooming perennials for zone 5"* - the exact query autocomplete surfaces - resolves to
  **18 plants from a handful of species**. That is a thin page.

A single generic `/plants/long-blooming/` page ("flowers that bloom all summer", 360 plants) is fine and
cheap. The crosses that the demand actually asks for collapse. And the durations are authored
month-granularity catalog values, not observed phenology, so "we can compute this better than anyone" does
not survive scrutiny either.

*(Note: if any bloom-duration maths does ship, [REL-5/HUNT-5] must be fixed first - the year-wrapping bug
would render a Nov-Feb window as "Jan-Dec". Zero live plants trigger it today, which is exactly why it is
cheap to fix now and dangerous to build on later.)*

### 4.8 Do not build

| Idea | Why not |
|---|---|
| **Water x light** | **Dead on arrival.** All **374** `water: "low"` plants also carry the `drought-tolerant` tag (377 total). A `/plants/water/low/` hub would be a ~100% duplicate of a hub that already exists: two page families competing for one intent. Autocomplete agrees - "drought tolerant plants for full sun" is an established SERP; "full sun plants that need little water" does not autocomplete. |
| **Trait x light (as a family)** | Arithmetically hollow. The catalog has **25 full-shade plants total** and 130 part-sun. "Trait x light" is really "trait x full-sun plus noise", and named cells like "deer-resistant plants for full shade" are impossible. Ship the two or three real cells (drought-tolerant x full-sun, shade x part-shade) as one-offs, not a family. |
| **Privacy / screening** | 292 plants are >= 2 m but only **43** are evergreen (13 groups). No growth-rate field (`yearsToMaturity` is a weak proxy), and every ranking privacy page leads with growth rate ("Thuja Green Giant, 3-5 ft/year"). A `/guides/privacy-screens/` guide already exists. Leave it there. |
| **Native x zone** | Botanically false. Native is a regional fact, not a zone fact. |
| **Type x month** | Mostly redundant with the existing month hubs. Fold in as an on-page filter. |
| **Any 3-way cross** | 497 `zone x month x colour` cells clear 8 plants, so it is tempting. Don't: a combinatorial explosion (up to 1,008 cells) on a 1,826-page site, with sibling duplication (2.2) compounding on two axes at once. |

### 4.9 Cannibalisation: there are 32 guides, and they already own most of this

"Pink perennials" would be targeted by **three** BloomsEye URLs at once: `/guides/pink-border/`,
`/plants/color/pink/`, and a new `/plants/color/pink/zone-5/`. The guides already cover shade,
deer-resistance, pollinators, drought, native, low-maintenance, full-sun perennials, fragrance, early
spring, fall bloom, white/pink/hot/cool/dark borders, cut flowers, cottage, hummingbirds, containers,
groundcover, butterflies, winter interest, foliage, clay soil, rain garden, beginners, small spaces,
slopes, privacy screens and fall colour.

**And the guides are the pages that convert** - they carry the `gardenPreview` cards and the `?add=`
handoffs. New facet pages would cannibalise them.

**A query-to-URL map ("one query, one page") is a prerequisite deliverable and does not exist.** For
several of these families the correct move is to deepen the existing guide, not to add a facet page
beside it.

---

## 5. Pet toxicity

### What data exists

There is **no toxicity field** anywhere - not in the catalog, not as a structured field in
`deep-intel.json`.

What exists is **prose**, and it is good prose: `deep-intel.json` carries a `safety` block for **124 of
the 342 species groups (36%)**, with `level: "mild" | "serious"` and real citations (ASPCA, Pet Poison
Helpline, NC State, Merck, *Frontiers in Veterinary Science*). **75 of the 124 name both cats and dogs
explicitly.** The lily record is exactly right: *"Every part is deadly to cats: eating a few bites,
licking pollen from fur, or drinking vase water can cause fatal kidney failure. Harmless to dogs."*

### The problem: the data records danger, not safety

| | species | plants after group expansion |
|---|---|---|
| Explicit **toxic** assertion | ~71 | ~473 |
| Explicit **non-toxic** assertion | **~32** | ~177 |
| **No safety data at all** | **218 of 342** | ~915 |

**Silence is not safety.** For 218 species the file says nothing, and a "safe for cats" page built by
treating absence as a pass would assert safety for two thirds of the catalog on no evidence. That is the
one failure mode here with real liability: a cat that eats a lily can die within ~3 days from a trace
exposure (groomed pollen, vase water).

### What a "safe for cats / toxic to dogs" page set would require

**Scope: 342 species, not 1,677 plants.** Toxicity is a conserved property of species chemistry (cardiac
glycosides in *Digitalis*, grayanotoxins in *Rhododendron*, tulipalin in *Tulipa*) and nobody breeds
ornamentals to remove it. Every plant has a `botanicalName`, so the join key exists for 100% of records.

1. **Source.** There is **no open, machine-readable pet-toxicity dataset.** GBIF, Wikidata and USDA
   PLANTS carry nothing usable; the FDA Poisonous Plant Database is public-domain but decommissioned and
   is a literature index, not a verdict table. Two sources can answer *"is this safe?"* rather than only
   *"is this dangerous?"*:
   - **NC State Extension Gardener Plant Toolbox** - the best joinable source. Plant pages are keyed by
     botanical name (`plants.ces.ncsu.edu/plants/lilium-lancifolium/`) and carry explicit per-animal tags:
     `#problem for cats`, `#non-toxic for dogs`, `#non-toxic for horses`. A public land-grant extension
     service, scriptable off `botanicalName`. (Verified live.)
   - **ASPCA** - the citable authority and the only other publisher of an explicit non-toxic list.
     **But its terms permit only "educational, informational, personal, noncommercial" use and expressly
     forbid copying "data".** BloomsEye is commercially monetised, so ASPCA is a source you **cite per
     plant and link out to**, never one you mirror. (Under *Feist v. Rural Telephone*, 499 U.S. 340, the
     toxicity *facts* are not copyrightable and effort alone creates no protection - so BloomsEye can
     independently state that a species is toxic. What is protected is broader than "selection and
     arrangement": ASPCA's descriptive prose is protected expression, so work from the fact, never lift
     the sentence. **Lay reading, not legal advice.** A reprint request is cheap and would remove the
     ambiguity entirely.)
   - Pet Poison Helpline / Cornell / Colorado State are toxic-only and livestock-skewed: a useful third
     check that flags danger when the others are silent, useless for asserting safety.

2. **Join on botanical name only, never on common name.** This is the failure mode that kills cats.
   "Lily" spans *Lilium* (acute kidney injury in cats), *Hemerocallis* (daylily, also nephrotoxic),
   *Spathiphyllum* (peace lily, an oxalate irritant) and *Zantedeschia*. "Jasmine" spans *Jasminum*
   (benign) and *Gelsemium* (highly toxic). No exact match after synonym normalisation = "no reliable
   data", never a guess.

3. **Three states, never two:** TOXIC (cited), LISTED NON-TOXIC (cited, ideally two sources), NO RELIABLE
   DATA (say so, link ASPCA's own search). Inherit *toxic* down to cultivars freely (a false warning costs
   a click); inherit *non-toxic* down only when the species-level assertion is explicit and corroborated.

4. **Never say "safe".** ASPCA's own framing is probabilistic and folds mild-GI-upset plants into the
   non-toxic bucket. Copy that posture: *"The ASPCA lists Lavandula angustifolia as non-toxic to cats
   (checked July 2026)"* plus *"non-toxic does not mean edible"*. A hub can be **"Plants listed as
   non-toxic to cats"** - accurate, still an excellent target, defensible. Never a bare "Pet-safe" badge.

5. **Effort:** ~342 NC State lookups (scriptable), ~342 ASPCA corroborations, reconciliation, stored as
   `{status_cat, status_dog, sources[], checked_at}` on the species group. A few focused days, the same
   class of work that produced `deep-intel.json`.

   **Run a 30-species coverage probe first.** The research set a bar of ~60% explicit-verdict coverage
   below which the hubs would be too sparse to justify. Note that `deep-intel` already gives ~36%, so the
   probe is really asking whether NC State closes the remaining gap.

### What to build, and what not to

**Build:** the garden-framed *safe* side - `/plants/non-toxic-to-cats/`, `/plants/non-toxic-to-dogs/`,
and the crosses. This SERP ("dog friendly garden plants", "pet safe perennials") is held by small nursery
collections and hand-written listicles, **none with zone / sun / height faceting** - the gap BloomsEye's
data fills. It is also **action- and shopping-shaped**, which fits the strategy's "conversion surface"
framing far better than any colour cross does: *"design a pet-safe garden"* is a natural `?add=` handoff.

A fact-check tempered the original optimism: the SERP is **not soft**. It is co-owned by high-authority
incumbents (Chewy, Rover, AKC, AAHA, Home Depot, The Sill). Winnable, but contested.

**Do not build** per-plant "is X toxic to dogs" pages. That SERP is a YMYL, medical-emergency fight
against ASPCA, PetMD, Pet Poison Helpline and vet clinics, and it is the losing half. Per-plant toxicity
belongs as a **cited module on the existing plant page** - which is exactly what `PlantIntel.astro`
already does for the 124 species that have a safety note.

**Two hard dependencies.** (a) **Photos.** Only 135 of 1,677 plants have one; identifying a plant your cat
ate from an AI illustration is not credible. (b) **E-E-A-T.** This is YMYL content on a site with 1,335
thin AI-illustrated pages. A `/pet-safety/` methodology page (in the mould of `/credits/`) naming the
sources, the join rule, the check date, the disclaimer and both poison-control numbers is part of the
**minimum shippable scope**, not a polish item.

**On the head term:** "plants safe for cats" is dominated by *houseplants* (spider plant, pothos,
monstera, parlor palm). The catalog has none of them and should not pretend to. The addressable slice is
the outdoor/garden qualifier set.

---

## 6. Planting calendar - the strategy's own growth surface

**This is the family `README.md` names as the growth surface ("what to plant now"). It is also the family
the data cannot currently support. Resolving that is the most important item in this report.**

### The data does not exist

No planting, sowing, or frost field appears anywhere in the catalog. `deep-intel.json` mentions
sowing/frost/planting in prose in ~100 of its 334 notes, but as unstructured text.

### Zone is the wrong key, and this is the important part

USDA hardiness zone encodes **average annual minimum winter temperature**. It says nothing about the
growing season. **Two cities in the same zone can have last-frost dates two months apart** - Pittsburgh PA
(6b) around 24 April; Bend OR (6b) around 26 June.

This is precisely why the existing Bloom Calendar is sound and a Planting Calendar on the same key would
not be: *bloom month is a plant property that zone legitimately modulates; a planting date is a **site**
property that zone does not determine.* Ship zone-keyed planting dates as dates and roughly half the
readers in a zone get advice three or more weeks wrong.

The cost of being wrong is asymmetric. A wrong bloom month disappoints. **A wrong planting date kills
plants the reader paid for** - and this is a site whose whole funnel depends on being trusted.

### What it would actually take

**Tier A - frost data (no per-plant authoring, and it is the piece that makes the family defensible).**
Every credible planting calendar keys on frost date via ZIP or weather station: the Old Farmer's Almanac
resolves a ZIP to the nearest station and uses the 30%-probability last-frost date. The source is free and
public-domain: **NOAA NCEI U.S. Climate Normals 1991-2020**, whose agricultural normals give
first/last-freeze probability dates (20F / 28F / 32F / 36F at 10-90% probability) plus growing-season
length for thousands of stations. A ZIP-centroid -> nearest-station -> frost-date lookup is a static JSON
the Astro build can ship. **This alone turns a static zone page into a tool**, which is the only version
that competes with almanac.com rather than with the SEO chaff.

**Tier B - per-species planting rules: ~342 rows x ~6 fields.**
`{plantingMode: sow-indoors | direct-sow | plant-bulb | nursery-stock | bare-root}`,
`{anchor: weeks-before-last-frost | after-last-frost | weeks-before-first-frost | dormant-season}`,
`{offsetWeeks}`, `{coldHardySow}`, `{source}`.

A rules table keyed on `category` alone gets trees, shrubs, conifers, roses, grasses and ferns essentially
right, and most bulbs right from `category` + bloom-start season. **It gets annuals wrong about half the
time** - larkspur and sweet pea are fall-sown hardy annuals; zinnia and marigold are strictly post-frost
tender annuals; both can show a June bloom start. It also mishandles the bulb edge cases readers actually
buy and kill (lilies, colchicum, tuberous begonia, dahlia). And the number the page exists to state -
*"sow indoors N weeks before last frost"* - is per-species and is **not derivable from any field the
catalog has**.

This is a bounded, ~2-4 week authoring project of the same class as `deep-intel.json` (which already
carries 276 genus-level sourced rows). **It is not free, and it cannot be faked with a rules table.**

### If it is built

- Keep zone as the **navigational** key (that is what people search) but **never as the date source**: H1
  keyed on zone, body states the zone's last-frost *range* with an explicit caveat, all timing expressed
  relative to frost ("sow indoors 6-8 weeks before your last frost"), never as a calendar date.
- **Differentiate it from the Bloom Calendar explicitly.** Both would key on (zone, month). One says "what
  blooms", one says "what to plant". Cross-link them or Google will pick one and drop the other.
- Reuse the item-count gate so empty months (December-January in cold zones) never generate pages.
- **Know the demand limit:** the "zone N planting calendar" head term is vegetable-led and owned by the
  Almanac's ZIP-level tool. BloomsEye has zero vegetables. The winnable niche is the *per-plant* form
  ("when to plant dahlias in zone 6"), which bulb retailers are already farming programmatically - and
  which concentrates on **bulbs** and a handful of famous ornamentals, not across 1,677 plants.

**Recommendation:** this is the strategy's chosen bet, so it deserves the data project rather than a
shrug - but **scope it to bulbs first** and **get the NOAA frost dataset before authoring anything**. A
bulb-only "when to plant" family is small, honest, matches where the demand demonstrably is, and is a real
test of the "action-shaped queries resist zero-click" thesis before 342 rows get authored.

---

## 7. Risk: does a new family read as scaled content?

**Confirmed Google policy.** *Scaled content abuse* targets "many pages generated for the primary purpose
of manipulating search rankings and not helping users" and is **method-agnostic** - programmatic
generation is not itself a violation. Danny Sullivan (April 2025): when content is scaled and
mass-produced primarily to rank, "it doesn't matter how you're doing this ... whether it's AI, automation,
or human beings."

The policy most directly on point for a facet family is **doorway abuse** (though Google is explicit that
its policies are not mutually exclusive and it "may act against any type of spam practice"). Its most
dangerous clause is Google's own 2015 self-test: *"Do the pages duplicate useful aggregations of items
that already exist on the site for the purpose of capturing more search traffic?"* **Section 2.2 shows the
site is already failing this test on five live pairs.**

Google's faceted-navigation doc (Dec 2024) frames the choice as binary: either the facet URLs are not
needed in the index (block them), or they are needed (clean static paths, fixed facet order, nothing
returned when a combination is empty). BloomsEye is on the right side of the *shape* - `/bloom-calendar/
zone-8/june/` is a clean static path and the >= 8-plant gate is a stricter version of Google's "404 when a
filter combination returns no results" rule. Keep that shape; fix the duplication inside it.

**What is NOT policy.** There is **no Google-published minimum item count, word count, or unique-content
percentage.** Every threshold in this report (8, 12, 24, the 0.8 Jaccard) is convention or my own
judgement. Do not present any of them internally as if Google mandated them. Claims circulating in 2026
that a core update "killed programmatic SEO" are marketing-blog folklore with no primary source - and
equally, there is no safe harbour.

**The one thing not to do.** Do not spin a 150-word AI-written intro per combo. The 2025 Quality Rater
Guidelines give the *lowest* rating to main content made with "little to no effort, originality, and added
value", and a templated paragraph is exactly that pattern: it adds risk, not safety. **The defensible
unique content here is the data, not prose** - the real filtered set, computed aggregates, and honest
cross-links. Ranking commerce facet pages carry only ~120-150 words total. Word count is not the moat; the
item set, the schema, the crawlable path and (per section 2.4) *a function the parent page does not have*
are.

**Two cheap wins nobody in this space is taking.** `FAQPage` schema built from templated questions answered
with **computed numbers** ("How many perennials bloom in July in zone 5?" -> the actual count); none of the
plant-directory competitors examined ships FAQPage on facet pages, and `seo.ts` already has `plantFaqLd()`
to generalise from. And `CollectionPage` + a complete `ItemList` (currently `itemListLd()` truncates at 60,
which is already more than the 24 gardenia ships).

**Staged launch.** Not required by policy, but it is the only way to get an interpretable signal. Put each
new family in **its own sitemap**, ship a first tranche, and watch, for that sitemap alone: indexed/
submitted ratio, the "Crawled - currently not indexed" count, and impressions per URL. **If tranche 1 lands
in "Crawled - currently not indexed", that is Google telling you the family is a duplicate aggregation** -
stop; do not ship the other 60 pages.

**Seasonality.** Gardening demand peaks roughly February to May. Two consequences: a family shipped now has
about six months to be crawled, indexed and matured before the peak, which argues for shipping *something*
soon rather than researching further; and **any read-out taken between August and November lands in the
trough and will produce a false negative**. Kill/continue thresholds must be year-on-year or seasonally
indexed, and the measurement window has to be agreed in advance.

---

## 8. Appendix: the full cross matrix

Pages generated, by threshold. "5+ groups" adds the species-diversity gate. **None of these numbers
includes the sibling-similarity gate from section 2.2, which would cut the zone-crossed families further.**
Full detail in `counts.txt`.

| Cross | Cells | >=8 | >=12 | >=15 | >=20 | >=30 | >=12 & 5+ groups |
|---|---|---|---|---|---|---|---|
| colour x zone | 84 | 70 | 66 | 63 | 63 | 62 | **66** |
| colour x month | 84 | 61 | 58 | 56 | 54 | 50 | **57** |
| colour x light | 28 | 21 | 21 | 20 | 17 | 14 | 21 |
| colour x type | 77 | 47 | 45 | 34 | 32 | 27 | 41 |
| trait x zone | 108 | 66 | 64 | 61 | 59 | 59 | **60** |
| trait x month | 108 | 53 | 49 | 45 | 41 | 37 | 45 |
| trait x light | 36 | 16 | 13 | 12 | 11 | 7 | 11 |
| trait x colour | 63 | 44 | 42 | 40 | 37 | 25 | 42 |
| trait x type | 99 | 32 | 28 | 25 | 21 | 17 | 24 |
| water x light | 12 | 9 | 8 | 8 | 7 | 6 | *do not build* |
| water x zone | 36 | 29 | 29 | 29 | 27 | 27 | 27 |
| light x zone | 48 | 35 | 33 | 29 | 27 | 26 | 33 |
| light x month | 48 | 33 | 28 | 24 | 24 | 22 | 25 |
| type x zone | 132 | 83 | 77 | 73 | 67 | 58 | **74** |
| type x month | 132 | 61 | 55 | 52 | 44 | 38 | 45 |
| size x zone | 72 | 56 | 54 | 52 | 50 | 47 | **45** |
| size x light | 24 | 18 | 17 | 17 | 13 | 12 | **16** |
| size x colour | 42 | 35 | 34 | 34 | 33 | 30 | 34 |
| size x trait | 54 | 31 | 26 | 25 | 23 | 15 | 26 |
| size x type | 66 | 29 | 25 | 20 | 17 | 15 | 23 |
| **zone x month x colour** | 1,008 | 497 | 454 | 431 | 407 | 342 | *do not build* |
| **zone x trait x light** | 432 | 114 | 90 | 75 | 67 | 57 | *do not build* |
| **zone x type x light** | 528 | 133 | 122 | 107 | 84 | 64 | *do not build* |

**Single-facet values** (plants / species groups). Categories: perennial 450/120, annual 422/61, bulb
231/29, shrub 228/31, rose 87/34, tree 84/17, climber 62/13, conifer 48/8, grass 33/10, herb 22/11, fern
10/10. Light: full-sun 1273/255, part-shade 249/57, part-sun 130/32, **full-shade 25/12**. Water: moderate
1178/234, low 374/85, high 125/28. Colours: pink 459/178, yellow 351/150, purple 316/127, white 311/162,
orange 293/132, red 284/123, blue 166/76. Zones: 8 -> 1217, 7 -> 1199, 6 -> 1118, 5 -> 1070, 9 -> 914,
4 -> 812, 10 -> 500, 3 -> 483, 11 -> 332, 2 -> 64.

**Field coverage / null rates** (this table did not exist and should have): `matureHeight`, `matureSpread`,
`sun`, `water`, `category`, `tags`, `botanicalName` are present on **100%** of records. `hardinessZones` is
empty on some annuals (172 of 422 annuals carry none). `description` is present on **66 of 1,677**. Real
photos on **135 of 1,677**. `deep-intel` on **276 of 342 species groups**. `community: true` on **66**.

**Untapped tags** (not hubs today, plants/groups): `foliage` 132/37, `groundcover` 47/15, `dwarf` 43/23,
`container` 31/8, `fall-color` 29/9, `edible` 25/15, `hedge` 11/3. Most are too small, or a guide already
covers them.

---

## For the planning session

### Findings

- **The strategy and the data disagree, and nobody has said so out loud.** `README.md` ("The site's job,
  decided 2026-07-02") makes this a **conversion surface, not a traffic business** and names the zone +
  month **"what to plant now"** pages as the growth surface. That family is the planting calendar, and the
  catalog has no planting field, no frost data, and a key (USDA zone) that does not determine planting
  dates. Meanwhile every facet cross in this brief is the *evergreen informational* content the same
  section deprioritised.
- **The site is already doing the thing the risk section warns about.** Five pairs of live Bloom Calendar
  pages are **100% identical lists on two URLs**; 44% of adjacent-zone sibling pairs are 80%+ identical;
  median sibling overlap is 72%. And the combo template deliberately cross-links those siblings. Nobody
  tested cell-versus-sibling duplication, only cell-versus-parent.
- **A live thin page is footer-linked site-wide.** `/plants/traits/deer-resistant/` = 3 daffodil cultivars.
  The fix (108 species, sourced) is already sitting in `src/data/deep-intel.json`.
- **98% of the site cannot convert and is not measured.** No `?add=` multi-slug CTA on any hub, no hub
  event in the analytics dictionary - on a site whose stated metric is Studio handoffs.
- **80% of the site is already thin.** 1,335 of 1,677 plant pages have no description, no photo, no intel.
  New facet pages are grids of exactly those cards.
- **The best new family needs no new data**: 175 species-group comparison pages, which also give the
  duplicate-cultivar-slug problem a canonical home and turn the 1,335-page liability into content.
- **Pet safety is a bounded data project** (~342 botanical-name lookups against NC State, corroborated
  against ASPCA), and it is the one *action-shaped, conversion-friendly* family in the whole report - which
  makes it the best fit for the stated strategy of anything here.
- **Long-blooming looked strong and is not.** 219 of the 360 long bloomers are annuals, 126 have no zone,
  and 187 tie at exactly 6 months, so "longest blooming perennials for zone 5" resolves to 18 plants.

### What it means

The brief asked "which facet crosses can we generate?" The answer is "about 450 of them" - and that is the
wrong question. **Generating them was never the constraint; justifying them is**, and the site currently
fails its own justification on pages it has already shipped.

The families that earn their place are the ones where BloomsEye holds something nobody else does - the
species-cultivar hierarchy (comparison pages) and, if the data project is done, a sourced toxicity verdict.
The families that merely re-slice two existing hubs on the zone axis are the ones that duplicate each other,
cannibalise the 32 guides, and read as doorways.

**The recommended order is: fix (section 2), then convert (2.4), then decide the strategy conflict (1 and
6), and only then build - one family, into its own sitemap, gated on Search Console.** Given seasonality,
something should ship in the next few weeks to have any chance of maturing before the February-May peak.

### Open questions

1. **What is the Bloom Calendar actually doing?** It is 97 live pages of exactly the shape being proposed,
   and no first-party data on it appears anywhere. **Every recommendation here should be gated on this
   answer.** Pull Search Console filtered to those URLs: indexed/submitted ratio, "Crawled - currently not
   indexed", impressions per URL. If those pages are unindexed or getting zero impressions, most of this
   report is moot and the effort belongs in the plant pages and the guides. **This is the first thing to
   look up.**
2. **Does STRATEGY.md section 6 still say what the README says?** It holds the verdict, the metrics and the
   kill/continue criteria, it was not available on this machine, and this whole report needs to meet it.
3. **Reconcile or overturn?** Is "what to plant now" still the bet? If yes, section 6 is the roadmap and the
   facet crosses are a distraction. If no, that decision needs to be written down, because the README
   currently says otherwise.
4. **Photos and descriptions, or new pages?** 135 photos and 66 descriptions across 1,677 plants. Is closing
   that a better use of the same effort than any new family? (It is also a hard dependency for pet safety.)
5. **Is there a keyword tool available?** No search-volume numbers were obtainable and none were invented.
   The demand ranking rests on autocomplete (ordinal, not cardinal), on who ranks, and on which crosses
   large retailers built as URLs. Verify before committing engineering time - especially the comparison-page
   phrasing ("tulip varieties", "types of hosta"), which is the one Tier-1 recommendation with no direct
   demand evidence at all.
6. **Do AI Overviews absorb these queries?** Every family here is list-shaped, which is the shape AI
   Overviews eat - and the README already says clicks on informational queries have roughly halved. This was
   unassessed (the research tools return links, not the rendered SERP) and it is the biggest single threat
   to the whole plan.
7. **Deer resistance: `deep-intel` or Rutgers?** Fast and already sourced (276 of 342 species) versus the
   list the competition silently copies, as a proper Studio-side field. Which?
8. **What happens to the 66 community plants?** They are indexable AI/user-contributed pages on a site being
   judged for scaled content, they sit inside the zone hubs any new family would cross, and a hub multi-add
   CTA would silently drop them. Noindex, exclude, or fix the Studio handoff?
9. **URL shape for any new family.** The Bloom Calendar took a new top-level namespace rather than nesting
   under `/plants/zone/6/`. That worked and gave the family its own hub. Nesting gives a better topical
   hierarchy. Decide once, for all families.
10. **Should ASPCA be asked for reprint permission?** A cheap email that removes the only real legal
    ambiguity in the pet-safety plan. (The reasoning in section 5 is a lay reading of *Feist*, not counsel.)
