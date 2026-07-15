# BloomsEye Directory: Accessibility and Performance Audit

**Read-only audit. Nothing in the repo was modified.** Every finding below is a recommendation
for the planning session, not an applied change.

- **Date:** 2026-07-14
- **Commit audited:** `bc655e9` (branch `main`, clean working tree)
- **Build:** `npm run build` with network access, so the live catalog loaded (1,677 plants,
  135 with real photos, 1,866 pages, zero build warnings).
- **Scope requested:** color-contrast and other a11y violations; Core Web Vitals; the heavy
  plants-index page weight and its cause; image optimization gaps; obvious meta and
  structured-data gaps.
- **House style:** no long-dash character (U+2014) anywhere in this report.

## Method

Everything was measured, not guessed. The build output in `dist/` was served from a local
static origin that mimics production (brotli quality 5 negotiation plus the real
`public/_headers` rules replayed), so transfer sizes and cache policy match Cloudflare. Then:

- **axe-core 4.12** over 12 page types x 2 themes (dark and light) plus the interactive states
  that only exist after JS runs (open custom-select listbox, "Has photos" filter on, open
  lightbox): 30 scans total. Tags: WCAG 2.0/2.1/2.2 A + AA plus best-practice.
- **Lighthouse 13.4** (mobile + desktop, simulated 4x-CPU / slow-4G throttling on mobile) over
  the home page, plants index, a plant detail page, a trait hub, a zone hub, a bloom-calendar
  combo, and a guide: 14 runs. Full reports are in `raw/lighthouse/`.
- **Static byte and DOM forensics** on the built HTML (`raw/static-analysis.json`), plus a
  JS-disabled progressive-enhancement pass, a 360px mobile-reflow pass, and live header checks
  against `bloomseye.com` and the Supabase image origin.
- **Analysis:** six specialist auditors (page-weight, images, SEO/meta, a11y-source,
  runtime-perf, CSS/code-health) read the source and the artifacts, and every finding was put
  through adversarial verification (three independent refuters per finding) plus a
  completeness sweep. Raw artifacts are in `raw/`.

**Verification result (honest disclosure):** all 71 auditor findings completed and were put
through adversarial verification (three independent refuters each). Final tally: **64
confirmed, 5 contested, 2 refuted** (69 survivors). The 2 refuted findings are **kept in this
report with their impact corrected and a "Verification note"** (F-IMG-2 was downgraded high to
medium; F-CH-1's "CLS bug" claim was withdrawn) rather than deleted, because in both cases the
*facts* verified true and only the *severity/framing* was overstated. The highest-impact
findings (the hero-tile LCP bug, the community-JPEG gap, the page-weight reframing, the axe
violations, the bare-epithet H1s, progressive enhancement) were **also verified by hand**
against the built output. The one part that did not run is the automated completeness critic
(it hit a session limit at the very end); its job, checking for unaudited page types and missed
issue classes, was substantially done by hand instead (mobile reflow, JS-disabled pass, bf-cache,
404, page-type coverage), with the residual gaps listed honestly at the end of this report.

**What the local harness cannot answer:** real Cloudflare TTFB and real field INP (the local
origin reports a 0 to 20 ms TTFB that says nothing about the CDN), and how social scrapers
(LinkedIn, Facebook, Pinterest) render a `.webp` og:image. These are called out in the open
questions.

---

## Headline

The site is in genuinely good shape. Accessibility is strong (five real axe violations across
30 scans, all fixable, none catastrophic), CLS is essentially perfect everywhere, desktop
Core Web Vitals are all green, progressive enhancement holds, and the SEO plumbing (canonicals,
sitemap, breadcrumbs, JSON-LD escaping) is correct. Most of what follows is refinement, not
repair.

Three things rise above the rest:

1. **The home page is the worst page on the site, and the cause is a self-defeating
   optimization.** Mobile LCP is 4,954 ms (the only page in Google's "poor" band) because the
   hero tile that gets `loading="eager"` + `fetchpriority="high"` is a ~102 KB community JPEG,
   while the tile that actually becomes the LCP element is a small lazy WebP with no priority
   hint. The one hint on the page is spent on the wrong, heaviest image. **Trivial fix, biggest
   single win.**

2. **The "4.45 MB plants page" is a main-thread problem, not a bandwidth problem, and it is not
   one page.** Brotli takes `/plants/` to 133 KB over the wire (a 33x ratio), so transfer is
   fine. What hurts is ~1.0 s of mobile main-thread parse time to build 89,370 DOM nodes, on
   *every* card-grid page (hubs, zone/light/trait listings, all 97 bloom-calendar combos), i.e.
   nearly the entire SEO surface. Reframe the goal as "cut raw HTML bytes and DOM nodes," not
   "cut transfer."

3. **66 community plants (4% of the library) have no small-image derivative,** so a ~107 KB
   JPEG is served everywhere a 13 KB WebP should be: into 88px home-hero tiles, into 217px card
   thumbnails on every grid, and as the LCP hero on their own detail pages. This is the top line
   item in Lighthouse's image-delivery insight on every single page. The fix is Studio-side (one
   derivative per plant); no directory code changes.

---

## Core Web Vitals snapshot (Lighthouse 13.4)

Mobile is throttled (4x CPU, slow 4G); desktop is not. LCP good <= 2,500 ms, needs-improvement
<= 4,000 ms, poor > 4,000 ms. CLS good <= 0.1. TBT is a lab proxy for INP; > 200 ms warns.

| Page | FF | Perf | A11y | BP | SEO | LCP ms | CLS | TBT ms | DOM nodes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **home** | **mobile** | **82** | 95 | 100 | 100 | **4954** | 0 | 0 | 1,158 |
| home | desktop | 100 | 95 | 100 | 100 | 603 | 0 | 0 | 1,158 |
| plants-index | mobile | 88 | null* | 100 | null* | 3303 | 0.003 | 201 | 89,370 |
| plants-index | desktop | 100 | null* | 100 | null* | 524 | 0 | 24 | 89,370 |
| plant-detail | mobile | 98 | 96 | 100 | 100 | 2329 | 0 | 0 | 837 |
| plant-detail | desktop | 100 | 96 | 100 | 100 | 483 | 0 | 0 | 837 |
| hub-trait | mobile | 99 | 100 | 100 | 100 | 2028 | 0 | 0 | 20,105 |
| hub-zone | mobile | 97 | 100 | 100 | 100 | 2556 | 0 | 0 | 56,960 |
| bloom-combo | mobile | 99 | 100 | 100 | 100 | 2178 | 0 | 0 | 27,615 |
| guide | mobile | 96 | 100 | 100 | 100 | 2703 | 0 | 0 | 1,066 |

*`plants-index` a11y and SEO are **null, not zero**: Lighthouse's accessibility gatherer hit
`PROTOCOL_TIMEOUT` on the 89,370-node page in both form factors. That is itself a signal: the
page is too large for the tooling. Do not read it as a score of zero.

**Reading of the table:** every CWV problem on this site is **mobile-only** (desktop is 100
across the board). The home page is the only "poor" LCP; `plants-index` and `hub-zone` are in
the "needs improvement" band purely from DOM weight (no image or network is involved in their
LCP, which is the intro text paragraph). CLS is functionally perfect everywhere (the single
0.0026 shift on `plants-index` mobile is 38x inside budget).

## axe-core result (30 scans, both themes)

Five distinct violations. All are listed as findings below with fixes.

| Rule | Impact | Where | Nodes |
|---|---|---|---|
| `aria-required-children` | **critical** | home hero tiles (`role="list"` with a non-listitem child) | 2 |
| `aria-allowed-role` | minor | home hero tiles (`role="listitem"` on `<a href>`) | 38 |
| `link-in-text-block` | serious | `/credits/` link in gallery note + credits mailto (color-only + 1.19:1) | 4 |
| `scrollable-region-focusable` | serious | open custom-select listbox (APG false positive, see F-A11Y-9) | 2 |
| `color-contrast` | serious | open custom-select, **light theme**, selected option 4.45:1 | 1 |

652 `color-contrast` nodes came back **incomplete** (axe could not resolve the background): all
are the translucent "Foliage" badge over a photo (see F-A11Y-6). 8 `aria-valid-attr-value`
incompletes are the four custom-select triggers pointing at a hidden listbox (not a defect,
F-A11Y-10).

---

# Prioritized findings

Each finding carries a severity, a category, an **owner** (who can fix it: `directory` = this
repo, `studio` = the upstream catalog/producer, `cloudflare-config` = the Pages dashboard), an
effort estimate, and whether CLAUDE.md already tracks it. Fixes are described, not applied.

Severity means: **critical** = broken for a class of users / breaks tooling; **high** = clear
user or SEO cost, worth this planning round; **medium** = real but bounded; **low** = polish;
**info** = record so it is not re-litigated.

## Critical

### F-IMG-1. 66 community plants ship a full-size JPEG everywhere a thumbnail belongs
- **Severity:** critical | **Category:** images | **Owner:** studio | **Effort:** medium (upstream) | **Known:** no
- **Evidence:** `PlantCard.astro:8` and `HeroTiles.astro:15` resolve the image as
  `plant.cardSm?.url || plant.card?.url || ...`. For the 66 plants whose card lives under
  `cards/community/`, `cardSm` does not exist (confirmed: every `cards-sm/<slug>.webp` for
  those slugs returns HTTP 400 from Supabase), so the full `cards/community/<slug>.jpg` is
  used. Measured transfer: community JPEGs mean **106,623 B** (min 81,593, max 129,071) versus
  a `cards-sm` WebP mean of **13,536 B**. These 66 files are referenced by **3,165 `<img>`
  tags** across the build. Lighthouse `image-delivery-insight` lists them as the top waste item
  on every page (home mobile: `giant-coneflower.jpg` 101,711 B, 94,761 B wasted, decoded into
  an 88x88 tile).
- **Impact:** ~24% of the image bytes of a full `/plants/` scroll come from 4% of the cards.
  These are the largest image objects on the home page, every hub, every bloom-calendar combo,
  the companion strips, and (F-PERF-2 below) the LCP hero of their own 66 detail pages. On the
  home page the eager hero tile is one of them.
- **Fix:** Studio publishes a `cards-sm/<slug>.webp` 640x360 derivative for the 66 community
  plants, exactly as it already does for the other 1,611. **No directory code change:** the
  existing fallback chain picks `cardSm` automatically the moment it exists, which also resolves
  F-PERF-2 and part of F-PERF-1. There is no in-repo fix short of an edge image resizer (see
  F-IMG-7). *Verified by hand: byte counts and the HTTP 400 on all sampled community slugs.*

## High

### F-PERF-1. Home mobile LCP (4,954 ms) is a lazy hero tile; the priority hint is on the wrong image
- **Severity:** high | **Category:** performance | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `lighthouse/home.mobile.json`: perf 82 (worst on the site), LCP 4,954 ms,
  `lcp-discovery-insight` score 0 with checklist `priorityHinted: false`,
  `eagerlyLoaded: false`. The LCP node is `div.hero-tiles > a.ht-tile > img`, DOM path tile
  index **1** (`alt="Sea Holly"`, `loading="lazy"`, no `fetchpriority`, a 12,250 B WebP).
  `HeroTiles.astro:31-32` hardcodes `loading={i === 0 ? "eager" : "lazy"}` and
  `fetchpriority={i === 0 ? "high" : undefined}` on the assumption (stated in the comment at
  `:4-5`) that tile 0 is the LCP. Tile 0 is `giant-coneflower.jpg`, a **101,711 B** community
  JPEG (per F-IMG-1). All 20 tiles are equal-size squares (`global.css:458 aspect-ratio: 1`),
  so any first-row tile can win LCP; equal-area candidates do not replace one another, so the
  small lazy WebP paints first and claims LCP while the one priority hint is spent on the
  heaviest image on the page.
- **Impact:** The site's front door and most likely organic landing page is the only page in
  the LCP "poor" band. LCP is a confirmed Google ranking signal, so this lands directly on the
  SEO-first mission.
- **Fix:** In `HeroTiles.astro:31-32`, make the whole first row eager rather than only tile 0,
  since all tiles are equal-area: `loading={i < 5 ? "eager" : "lazy"}` (5 = the desktop column
  count at `global.css:457`, and it covers the 4-column phone row at `:509`). Keep
  `fetchpriority="high"` on `i === 0` only, or drop it. `PlantGrid` already does this correctly
  (`plants/index.astro:58`, `eagerCount={4}`) and is the model. Fix the false comment at
  `:4-5`. **Best paired with F-IMG-1**: together they are the single biggest perf win.
  *Verified by hand: Lighthouse names tile 1, and the tile-0 vs tile-1 byte gap (101,711 vs
  12,250) was measured live.*

### F-PERF-2. Card-grid page weight: a main-thread problem, on every grid page, not just /plants/
- **Severity:** high | **Category:** performance | **Owner:** directory | **Effort:** medium | **Known:** partially (CLAUDE.md PERF-2/HUNT-9, but mis-framed)
- **Evidence:** `/plants/index.html` is 4,411 KB raw but **133 KB over the wire** (brotli q5,
  33x; the site is confirmed served at brotli q5). Lighthouse `resource-summary` for
  `/plants/` mobile: of 566 KB transferred, the HTML document is only 137 KB (24%), *less than
  the images and about the same as the fonts*. What costs the user is main thread: parseHTML
  scales at ~112 ms per raw MB (R^2 0.999 across the 7 audited pages), total main thread
  ~215 ms/MB; `/plants/` mobile spends ~485 ms parseHTML + ~506 ms DOM construction = ~1.0 s
  turning 4.4 MB of HTML into 89,370 nodes. This is **uniform per card** (~2,690 raw bytes and
  ~53 DOM nodes each) so it hits every card-grid page: 5 pages exceed 3 MB raw, 40 are 1 to
  3 MB, 35 are 500 KB to 1 MB. `hub-zone` (2,556 ms LCP) and `plants-index` (3,303 ms) are in
  the "needs improvement" band from DOM weight alone, and the 89k-node page times out
  Lighthouse's a11y gatherer.
- **Impact:** CLAUDE.md frames this as "`/plants/index.html` is heavy, ~4.45 MB raw," which
  points at bytes and at one page. The runtime data reframes it twice: it is not a transfer
  problem, and it is not one page, it is the whole card-grid SEO surface. The real cost is
  parse/style time landing on LCP and FCP, the two metrics Google ranks on.
- **Fix (a byte/node budget, not a single change):** the non-overlapping segmentation of
  `/plants/index.html` is: spec icon SVG markup **34.1%**, bloom-strip cells 16.6%, spec
  wrappers + text 11.0%, the 8 `data-*` card attrs 8.6%, the month-letter row 8.1%, thumb+img
  8.1%. The attackable levers, in value order, are itemized as F-PERF-3 through F-PERF-6 below.
  The fix must land in the **shared card component** so all grid pages benefit, not scoped to
  `/plants/`. *Verified by hand: the 133 KB brotli figure and the parseHTML regression were
  reproduced.*

### F-PERF-3. Two card attributes have zero consumers and dominate the compressed page
- **Severity:** high | **Category:** performance | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `PlantCard.astro:57` emits `data-tags` and `data-cat` on all 1,677 cards.
  Grep across `src/` finds **no reader** (no script, no CSS selector; the only `data-*`
  selector in the CSS is `.card[data-name] .body` at `global.css:239`). On
  `/plants/index.html`: `data-tags` is 110,361 raw bytes, `data-cat` 30,517. Deleting the two
  takes brotli from 132.7 KB to **117.5 KB (-11.4%)** because `data-tags` is high-entropy free
  text ("shrub full sun summer fall white drought tolerant") that brotli cannot dedupe. This is
  the **single largest wire win on the whole site**, and the cheapest.
- **Fix:** Delete `data-tags={tagsAttr}` and `data-cat={catAttr}` from `PlantCard.astro:57` and
  the now-unused `tagsAttr`/`catAttr` consts (`:13`, `:15`). If they are a reserved hook for a
  future tag filter, keep them but gate them behind the `filterable` prop from F-PERF-4 rather
  than shipping them on every page by default. *Verified by hand: grep for consumers, byte
  measurement.*

### F-PERF-4. Hub and bloom-calendar pages ship all 8 filter attributes but have no filter
- **Severity:** high | **Category:** performance | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** `plants/index.astro` is the only page that ships the client-side filter, but
  every hub and every bloom-calendar combo renders cards through
  `HubBody -> PlantGrid -> PlantCard`, which unconditionally emits all 8 `data-*` filter attrs.
  On `/plants/zone/5/`: 1,070 `data-tags` + 1,070 `data-months` etc., with nothing that reads
  them. Stripping the seven non-`data-name` attrs from that page: brotli 85.7 KB to **68.7 KB
  (-19.8%)**. That is ~98 pages, the pages a search engine is most likely to land a user on.
- **Fix:** Add an opt-in `filterable?: boolean` prop (default false) to `PlantCard.astro` and a
  pass-through on `PlantGrid.astro`; emit the filter `data-*` only when set; always emit
  `data-name` (`global.css:239` needs it). Set `filterable` only from `plants/index.astro:58`.
  Purely additive; no hub markup shifts except the attribute drop. *Verified by hand.*

### F-PERF-5. The month-letter row: 22.6% of the DOM, aria-hidden, identical on every card
- **Severity:** high | **Category:** performance | **Owner:** directory | **Effort:** medium | **Known:** no (the CLAUDE.md sprite/gradient note misses this)
- **Evidence:** `BloomStrip.astro:19,26` render 12 single-letter `<span>`s per card,
  byte-identical on all 1,677 cards and already `aria-hidden="true"` (the bloom range is in the
  strip's `aria-label`). On `/plants/index.html` that is 367,263 raw bytes and **20,124
  elements**. Replacing the row with one element: raw -6.2%, **elements -22.6%**, brotli
  neutral. That is a *larger* DOM saving than the gradient bloom strip and 12x the sprite, at
  zero wire cost and zero accessibility cost.
- **Fix:** No zero-risk one-liner; pick deliberately. (a) Paint the letters from a single
  element via a data-URI SVG `mask-image` with the letters outlined to paths (a data-URI SVG
  cannot load the page webfont), aligned to `grid-template-columns: repeat(12, 1fr)`
  (`global.css:176`); medium effort, needs a screenshot. (b) Drop the compact month row on card
  grids entirely (keep it on the plant-detail "full" variant); trivial, but sighted users lose
  the month scale under the mini strip, so it is a design call.

### F-PERF-6 (context). The sprite and gradient-strip fixes: what they actually buy
- **Severity:** high (part of F-PERF-2) | **Category:** performance | **Owner:** directory | **Effort:** small to medium | **Known:** yes (CLAUDE.md PERF-2)
- **Evidence (simulated on the real built HTML):** The `<symbol>` **sprite** for the four spec
  icons (34.1% of the page, 6,704 SVGs) is a **parse-cost fix**: raw -24.8% (~-122 ms mobile
  parseHTML) but **brotli only -1.5% and DOM only -1.9%** (a `<use>` still creates 2 nodes).
  The **gradient bloom strip** cuts DOM (-20.7% elements) but **makes transfer worse (+2.0%
  brotli)** and would flatten the light-theme per-cell styling. With sprite + month-row + dead
  attrs combined: 89,233 to 67,447 elements (-24%), raw -34%, brotli -13.5%, ~-350 ms mobile
  main thread.
- **Impact / honest expectation-setting:** even with **every** proposed markup fix applied,
  `/plants/` is still ~49k to 67k DOM nodes, i.e. 35x Lighthouse's 1,400-node warning line. The
  markup package meaningfully improves LCP/FCP/parse time but will **not** bring the a11y score
  back from null. Anyone expecting that will be disappointed. Dropping the DOM further means a
  design change (e.g. removing the 4-fact spec block from listing cards, or pagination), which
  the CSS comments at `global.css:196-202` deliberately rule out for SEO. Free micro-win: 14,999
  of 20,124 bloom cells carry an **empty** `style=""` attribute (`BloomStrip.astro:17,24`);
  emitting no attribute saves ~90 KB raw for nothing.
- **Fix:** Do the sprite (inlined, not external: the icons use `currentColor` and
  `global.css:222` colors them, and cross-document `<use>` does not reliably inherit that) and
  F-PERF-5. Treat the gradient strip as a DOM-only trade the plan can decline. *Verified by
  hand: all three simulated on the real HTML.*

### F-IMG-2. Card thumbnails are oversized for the render size, and cropped 17.8% by an aspect mismatch
- **Severity:** medium | **Category:** images | **Owner:** studio (bytes) + directory (crop) | **Effort:** medium | **Known:** partially (the oversizing is the already-known cardSm ~20 KB waste)
- **Verification note:** adversarial verification **downgraded this from high to medium** and
  split it into two distinct issues that the original framing conflated. Every cited number is
  accurate; the severity and the "directory can recover bytes" claim were overstated.
- **Evidence:** `global.css:204` `.card .thumb { aspect-ratio: 16 / 11 }` + `:205`
  `object-fit: cover`, but the `cardSm` rail is 16:9 (640x360), so ~17.8% of each image is
  cropped horizontally for display (Lighthouse effective source 526x360 vs 640; same crop on
  the detail hero at `:279`). Separately, Lighthouse attributes the actual byte waste to the
  source being **oversized for the render size**: `potentilla-abbotswood.webp` "larger than it
  needs to be (526x360) for displayed dimensions (384x216)", 19,194 B wasted; the 640x360 rail
  is ~2x the linear size the ~192x108 (mobile CSS) / ~279x157 (desktop) box needs. Per-page
  cardSm waste: home mobile 197,691 B over 20 images; plants-index desktop 315,901 B over 28.
  No card thumb carries `srcset`.
- **Impact (corrected):** These are two things. The **crop** is display-only: `object-fit:
  cover` downloads and decodes the full 640x360 regardless of the box, so the crop wastes no
  bytes, it only hides ~18% of each image (and centered cutouts survive it well, which is why
  it was a deliberate proportion). The **oversizing** is the real byte cost (~197 to 316 KB per
  card-grid page), but it is Studio-owned and is the same "cardSm ~20 KB oversize" already known
  from the image-delivery insight.
- **Fix:** (a) **Crop (directory, recovers no bytes):** if the cropped pixels matter visually,
  change `.card .thumb` / `.detail-media` to `aspect-ratio: 16 / 9`; this un-crops but changes
  every card's proportions and saves zero transfer, so it is a design call, not a perf fix.
  (b) **Bytes (Studio, the real win):** publish a smaller card rail (~360 to 440w) and/or a
  16:11 rail so the directory can emit `srcset`/`sizes` on `PlantCard.astro:64-66`. Do not add
  `srcset` with the existing 640/1280 rails (nothing between them to select). *Verified by hand:
  CSS aspect-ratio mismatch and the per-page LH waste figures.*

### F-IMG-3. Real-photo gallery thumbnails are overweight (0.31 bytes/px) and cropped 44%
- **Severity:** high | **Category:** images | **Owner:** studio | **Effort:** small | **Known:** no
- **Evidence:** gallery `_t.webp` thumbs are natural **300x400** at 31.7 to 40.7 KB each
  (0.31 bytes/px), shown at ~200x150 (a 4:3 box, so 44% of each 3:4 image is cropped). On
  `/plants/aster/` the four thumbs are 149 KB total, **4.7x the LCP hero** (31.9 KB). They are
  correctly below the fold and lazy (so no LCP impact), but a scrolling reader still pays 100 to
  220 KB for images rendered small. Note `PlantGallery.astro:26` declares the *full* photo's
  768x1024 on the *thumb* `<img>`, not the thumb's own size.
- **Impact:** On the 135 gallery pages, the thumbnail strip is the heaviest block on the page.
- **Fix:** Studio re-encodes `_t.webp` at the aspect it is shown (4:3, e.g. 400x300) at ~q75
  (~10 KB, 0.10 bytes/px) instead of 300x400 at 0.31 bytes/px. Directory-side, then correct
  `PlantGallery.astro:26` to declare the thumb's real intrinsic size (carry the full photo's
  w/h on a `data-` attr for the lightbox, which reads it at `:80-84`).

### F-SEO-1. Half the plant library has a bare cultivar epithet as its H1, title, and JSON-LD name
- **Severity:** high | **Category:** SEO | **Owner:** directory (or studio) | **Effort:** small | **Known:** no
- **Evidence:** `plants/[slug].astro:125` (`<h1>{plant.commonName}</h1>`) and `seo.ts:100`
  (`name: p.commonName`). Independently measured over the built output: **799 of 1,677 plant
  pages (47.6%)** have an H1 that is exactly the quoted epithet of their own botanical name
  (Midnight Blue / *Agapanthus* 'Midnight Blue'; Gladiator / *Allium* 'Gladiator'; Purity /
  *Cosmos* 'Purity'; Angelique / *Tulip* 'Angelique'). The auditor counted 834 with a slightly
  broader method; either way it is roughly half the library. This also drives **24 duplicate-H1
  collisions across 49 pages** (e.g. "Snowflake" on three unrelated plants).
- **Impact:** Half the site gives Google and AI answer engines no entity name to attach the
  page to. "Peter Pan" and "Gladiator" match no gardening query and no plant entity, yet
  `seo.ts:76` says the JSON-LD exists "for comprehension + AI answer engines." The primary
  `name` it hands them is meaningless on 50% of the library.
- **Fix:** Compose a display name once and use it for the H1, title, `Thing.name`, and card
  label. `groupName` is already in the `Plant` type (`types.ts:44`), normalized at build
  (`loadPlants.ts:113`), populated on 1,511/1,677 records, and read **nowhere** in `src/`. It
  composes a real name for 830 of the 834. Two guards, both verified: (a) 137 records have
  `commonName === groupName`, so only prepend when the commonName does not already contain it
  (else "Agapanthus Agapanthus"); (b) 4 bare records have no groupName and need the genus from
  `botanicalName`. Some groupNames read awkwardly prepended ("English (David Austin) Roses"), so
  the composition needs a look at the distinct list. **Fix together with F-SEO-2** (same
  composition site). Could alternatively be pushed upstream. *Verified by hand: 799/1,677 and
  the 24 collisions re-counted independently.*

### F-A11Y-1. Home hero tiles: a critical malformed-list violation plus an invalid role
- **Severity:** high | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `HeroTiles.astro:13` `<div class="hero-tiles" role="list">`, `:20`
  `role="listitem"` on each `<a href>`, but `:39` the final "+N more" `<a>` has no role. axe:
  `aria-required-children` (**critical**, 2 nodes) "Element has children which are not allowed:
  a[aria-label]", plus `aria-allowed-role` (minor, 38 nodes) "role listitem is not allowed for
  given element". This is the only critical-impact axe violation on the site.
- **Impact:** The container claims `role="list"` but contains a non-listitem child, so screen
  readers either drop the list semantics or announce a wrong item count, on the most-visited
  page.
- **Fix:** One change kills both: delete `role="list"` (`:13`) and `role="listitem"` (`:20`).
  The anchors already carry self-describing `aria-label`s ("Sea Holly, flowering, view plant"),
  so nothing is lost. If the group label is worth keeping, use real `<ul>`/`<li>` markup around
  the anchors rather than ARIA roles on `<a>`. *Verified: axe nodes.*

### F-A11Y-2. In-prose links rely on color alone (WCAG 1.4.1), site-wide
- **Severity:** high | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `global.css:101` sets `a { text-decoration: none }` globally; the underline is
  restored only for guide prose (`:571-573`). So a link in body prose anywhere else is
  distinguished by color alone. axe `link-in-text-block` (serious, WCAG 1.4.1) fired on the
  `/credits/` link in the gallery note (`#6fcf8e` vs surrounding `#a1b09b` = **1.19:1**, needs
  3:1) and the credits mailto. Beyond axe's 12-page sample the pattern is on all 135 gallery
  pages plus `/credits/`, `/privacy/`, `/terms/` (~140 pages), i.e. the legal and attribution
  pages where the link is the remedy the page promises.
- **Fix:** Extend the existing underline rule at `global.css:571-573` to cover prose links
  outside `.guide-body`: add `.photo-gallery-note a`, `.article p a`, and the legal/credits
  wrappers (check each page's actual wrapper element first). Reuse the same declaration
  (underline + 2px offset). *Verified: axe gave the exact 1.19:1.*

### F-A11Y-3. The custom-select keyboard cursor is invisible (1.08:1)
- **Severity:** high | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `global.css:719` `.fs-opt.fs-active { background: var(--bs-surface-3) }` is the
  only indicator of the roving `aria-activedescendant` cursor in the filter listboxes, over a
  `--bs-surface-2` popup: **light 1.08:1, dark 1.09:1** (WCAG 1.4.11 wants 3:1). The DOM focus
  is on the `<ul>` (no ring of its own), so a sighted keyboard user pressing ArrowDown through
  the 13-month / 12-color / 10-zone listboxes sees essentially nothing move. axe cannot catch
  this (it only checks text contrast). This is the real barrier behind the
  `scrollable-region-focusable` false positive (F-A11Y-9) and the same root as the 4.45:1
  selected-option contrast (F-A11Y-8).
- **Fix:** Give `.fs-opt.fs-active` a real indicator:
  `background: var(--bs-accent-weak); box-shadow: inset 0 0 0 2px var(--bs-accent);`
  (`--bs-accent` clears 3:1 in both themes). This also fixes F-A11Y-8, since the selected
  label no longer sits on `--bs-surface-3`. Do **not** "fix" F-A11Y-9 by adding `tabindex="0"`
  to the `<ul>` (that adds a bogus tab stop). *Verified by hand: token math.*

### F-A11Y-4. Bloom-strip filled cells are indistinguishable from empty for pale blooms
- **Severity:** high | **Category:** a11y | **Owner:** directory | **Effort:** small | **Known:** no | **Confidence:** likely
- **Evidence:** On card grids the bloom strip is the only visual conveyance of bloom months
  (the cards never state a bloom range in text). Filled vs empty is a pure fill-color
  difference (`BloomStrip.astro:17,24` inline `background`). Measured over the 1,505 cards on
  `/plants/index.html`: **light theme, 1,088 cards (72%)** have every filled cell under 3:1
  against the track (`#D2DBC3`); worst `#f4f2ea` at 1.28:1, `#fbfbfb` at 1.38:1. Dark theme,
  406 cards (27%) under 3:1. The `box-shadow` inset ring at `global.css:183` does not help: its
  selector outlines filled and empty cells identically. Screen-reader users are covered (the
  strip has `role="img"` + a spelled-out `aria-label`), so this is a sighted-low-vision gap
  (WCAG 1.4.11).
- **Impact:** A low-vision or color-blind sighted user cannot read which months a white, cream,
  pale-pink, or pale-yellow plant blooms in, on `/plants/`, every hub, every bloom-calendar
  combo, and the home grid. It is the site's signature element.
- **Fix:** Make filled-vs-empty a difference of form, not just fill. Filled cells are exactly
  the ones carrying an inline `style`, so scope a strong ring to them:
  `.bloomstrip .cell[style] { box-shadow: inset 0 0 0 1px rgba(21,32,25,.55); }` and leave empty
  cells flat. Add a matching dark-theme rule. Verify against a white-bloom plant in both themes.

## Medium

### F-PERF-7. The plant-detail hero srcset is inverted vs its own comment
- **Severity:** medium | **Category:** performance | **Owner:** directory (comment) + studio (rail) | **Effort:** small | **Known:** no
- **Evidence:** `plants/[slug].astro:29-36` comment says "phones get the 640 small card...
  desktop at 2x DPR still gets the full card." Measured: plant-detail **mobile fetched the
  1280 rail** (31,856 B), **desktop fetched the 640 rail** (13,035 B), the exact opposite.
  Cause: `sizes="(max-width: 860px) 100vw, 560px"` means a 412 CSS-px slot; 412 x 1.75 DPR =
  721 > 640, so Chrome picks the 1280w candidate; real phones at DPR 2 to 3 always take 1280.
  Desktop needs 560 x 1 = 560, so 640w wins.
- **Impact:** The LCP image on the 1,611 non-community plant pages is ~19 KB heavier on mobile
  than the code believes. LCP is still 2,329 ms and discovery passes, so it is a byte problem,
  not a discovery one, but the comment will mislead the next change.
- **Fix:** (a) Fix the comment now. (b) The real fix is a rail between 640w and 1280w (a ~960w
  derivative from the Studio) added to the srcset; changing `sizes` alone would force phones
  onto a rail too small for their DPR. *Verified by hand: LH network requests.*

### F-PERF-8. 66 community plant detail pages serve a ~107 KB JPEG as their LCP hero, no srcset
- **Severity:** medium | **Category:** performance | **Owner:** studio | **Effort:** medium | **Known:** no
- **Evidence:** `plants/[slug].astro:33-35` only builds `heroSrcset` when a `cardSm` exists;
  community plants have none, so `:122` emits a bare `<img src fetchpriority="high">` with a
  ~107 KB JPEG as the LCP element. This is the `srcsetPresent=1611` number (1,677 minus 66).
- **Fix:** Resolved automatically once the Studio publishes `cardSm` for community plants
  (F-IMG-1); `:33-35` then produces a srcset like every other plant. No directory change.

### F-PERF-9. 140 KB of fonts load at High priority ahead of the LCP image; a third face loads unpreloaded
- **Severity:** medium | **Category:** performance | **Owner:** directory | **Effort:** small | **Known:** no | **Confidence:** likely
- **Evidence:** `resource-summary` shows 3 fonts, 140,087 B, identical on all 14 runs. Home
  mobile network: Fraunces (68 KB, High), Hanken normal (35.5 KB, High), Hanken **italic**
  (36.4 KB, VeryHigh). Only the first two are preloaded (`Layout.astro:80-81`); the comment at
  `:79` says "the rest lazy-load by unicode-range," but the italic face is in the same latin
  range and loads on every page. First-visit only (fonts are cached immutable for a year), but
  an SEO directory's organic traffic is overwhelmingly first-visit, which is exactly the LCP
  Google measures.
- **Fix:** (a) Correct the false comment (three latin faces load, not two). (b) Byte lever:
  Fraunces is only ever rendered at weight 600, so pin the `wght` axis and re-subset (keep the
  `opsz` axis, which is used). Verify the woff2 axes with a subsetter first; do not add a third
  preload.

### F-IMG-4. The guide preview JPEG is 127 KB serving a 660x400 box; one is planned per guide
- **Severity:** medium | **Category:** images | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** `public/previews/cool-border.jpg` is 127,141 B, 1280x776, shown at 660x400
  (`guides/[slug].astro:138`). Lighthouse: 90,803 B wasted on mobile. It is the 4th-largest
  non-HTML asset in `dist`. Lazy and below the intro, so no LCP impact (guide mobile LCP is the
  guide hero, 2,703 ms, see F-IMG-5). The declared `height="720"` also disagrees with the file's
  776 (harmless today because `global.css:542` forces 16:9).
- **Fix:** Re-export as WebP at the shown size (~25 to 40 KB) and correct the height. Add the
  target dimensions to the hand-compose workflow so the next guide (hot border) does not repeat
  it.

### F-IMG-5. Guide hero image bytes put guides in the "needs improvement" band on mobile
- **Severity:** medium | **Category:** images | **Owner:** directory + studio | **Effort:** small | **Known:** no
- **Evidence:** guide mobile LCP 2,703 ms, and the LCP breakdown is 94% image download
  (`resourceLoadDuration` 432 ms) with correct eager+priority hints (unlike home). The hero is
  a full-size `cards/delphinium.webp` where a `cardSm` would do.
- **Impact:** Guides are the conversion funnel (guide_view -> preview_click -> design_click).
  Markup and hints are already correct, so this is a clean byte-only win.
- **Fix:** Use the `cardSm` rail for the guide hero where one exists; same root cause as F-IMG-1
  for community plants.

### F-SEO-2. 1,605 of 1,677 plant titles exceed 60 characters, truncating the keyword suffix
- **Severity:** medium | **Category:** SEO | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** `plants/[slug].astro:70` builds
  `${commonName} (${botanicalName}) · Bloom Time, Zones & Care` then Layout appends
  ` | BloomsEye`. Measured: plant titles median 78, max 127 chars. Google truncates around 60,
  so the 38-char "· Bloom Time, Zones & Care | BloomsEye" suffix, added to win those keywords,
  is cut off on the majority of pages.
- **Fix:** Fix with F-SEO-1: once the H1/name is a composed display name ("Agapanthus 'Midnight
  Blue'"), the title no longer needs the botanical name in parens, removing most of the length.
  Consider a shorter suffix and a clamp.

### F-SEO-3. Duplicate cultivar pages: 3 pairs, identical titles, conflicting facts
- **Severity:** medium | **Category:** SEO | **Owner:** studio (data) + directory (301) | **Effort:** trivial | **Known:** yes (SEO-1/HUNT-4)
- **Evidence:** Exactly 3 groups, 6 pages, all *Anemone blanda*:
  `/plants/anemone-blanda-blue/` vs `/plants/windflower-blue-shades/` (identical `<title>`),
  same for Pink Star and White Splendour. The facts **disagree**: anemone-blanda-* say "Zones
  5-9, part shade," windflower-* say "Zones 4-8, part sun." These are the only 3 duplicate
  `<title>` groups on the entire site, so CLAUDE.md's open-ended phrasing overstates the scope.
- **Fix:** Directory stopgap: three 301s in `public/_redirects`. But a 301 does not fix the
  conflicting data, only the duplication (and on Pages a redirect stops the target being served
  at all). Durable fix is Studio-side dedupe. Open question: which slug is canonical.

### F-SD-1. Plant pages emit 3 to 4 disconnected JSON-LD blocks with no @id or @graph
- **Severity:** medium | **Category:** structured-data | **Owner:** directory | **Effort:** medium | **Known:** no
- **Evidence:** A plant page emits BreadcrumbList + Thing + companions ItemList (+ FAQPage on
  61 pages) as separate top-level blocks, none with an `@id`. Across the site, 4,093 JSON-LD
  blocks, **zero with `@id`**. Nothing says the FAQ is about the Thing, or that the companions
  belong to it, or which node is the page's mainEntity. This is exactly the comprehension the
  `seo.ts:76` comment aims for.
- **Fix:** Wrap the per-page nodes in one `@graph` with stable `@id`s: a WebPage node with
  `breadcrumb` and `mainEntity` pointing at the Thing, and the FAQ/companions referencing it.
  All core schema.org, zero rich-result risk. Changes `seo.ts` + `Layout.astro` (the `jsonLd`
  prop shape). Fold F-SD-3 (PropertyValue units) into the same pass.

### F-SD-2. itemListLd declares the full count but lists only 60 items, on 111 pages
- **Severity:** medium | **Category:** structured-data | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `seo.ts:161-162` sets `numberOfItems: plants.length` but
  `itemListElement: plants.slice(0, 60)`. 111 pages assert a count the markup does not contain
  (`/plants/` says 1,677, lists 60; the 60 are just an alphabetical prefix, not a curated
  top-N).
- **Fix:** Set `numberOfItems` to the number actually emitted (one line at `seo.ts:156-169`),
  or raise the cap only for the small hubs. Do not emit 1,677 ListItems on `/plants/`: it is
  already 89k nodes.

### F-A11Y-5. The universal :focus-visible rule overwrites border-radius on buttons, cards, chips
- **Severity:** medium | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `global.css:327` `:focus-visible { outline: ...; border-radius: 4px; }`. That
  `border-radius` is a property of the element, and `:focus-visible` (specificity 0,1,0)
  matches `.btn`/`.icon-btn`/`.card`/`.chip` and comes later in source, so it wins. Confirmed
  in the shipped CSS bundle. Every keyboard user watching focus move sees pill-shaped controls
  snap into 4px rectangles.
- **Fix:** Delete `border-radius: 4px` from `:focus-visible`. All three engines draw `outline`
  following the element's own radius, so it buys nothing and costs the four rules. *Verified by
  hand: byte offsets in the bundle.*

### F-A11Y-6. The "Foliage" badge can fall below AA over pale photos (the 652 incomplete nodes)
- **Severity:** medium | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no | **Confidence:** likely
- **Evidence:** The 652 axe `color-contrast` incompletes match the `foliage-badge` counts
  exactly per page (172 on `/plants/`, 125 on zone-5, etc.). The badge is
  `color: var(--bs-muted)` at 11.6px/600 over `color-mix(80% surface, transparent)` on the card
  photo, so axe cannot resolve the background. Computing worst case (80% surface + 20% photo):
  it can fall to ~3.5:1 light. Which cards fail depends on the photo behind each badge, which is
  why axe abstains.
- **Fix:** Take the photo out of the equation: set `.foliage-badge { color: var(--bs-text); }`
  (`global.css:206`), which yields 9.28:1 light / 7.79:1 dark worst-case, clearing AA
  regardless of the photo.

### F-A11Y-7. Home hero tiles delete the site focus ring and substitute a 2:1 border tint
- **Severity:** medium | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** The site has a good universal ring (`global.css:327`, 3.74:1 light / 6.31:1
  dark). `global.css:464-466` then cancels it for the hero tiles with `outline: none`, replacing
  it with a border-color tint (1.96:1 light / 2.52:1 dark) that is identical to the hover state.
  The ~20 tiles are the first tab stops after the header on the home page (WCAG 2.4.7).
- **Fix:** Delete `outline: none` from `global.css:466`. Hover never draws an outline anyway, so
  this only restores the standard ring on keyboard focus. Add `outline-offset: 3px` if it
  clashes with the 12px radius. (This is the same issue reported by two auditors; F-A11Y-7 and
  the low-severity "ht-tile-outline-none" are one finding.)

### F-A11Y-8. CLAUDE.md's "0 color-contrast violations in both themes" holds only for the default state
- **Severity:** medium | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** yes (contradicts ACC-1/2)
- **Evidence:** axe `color-contrast` (serious), light theme, `/plants/` with a listbox open:
  the selected option `.fs-opt-label` "Any month" is `#2f7a45` on `#e9eee2` = **4.45:1** (needs
  4.5:1). Reproduced from tokens. The dark equivalent (7.72:1) passes. CLAUDE.md's ACC-1/2 entry
  claims the 2026-07-14 fix left "0 color-contrast violations in both themes"; that is true only
  for the default page state, not the open listbox.
- **Fix:** Either drop the accent tint on the selected label (`color: var(--bs-text-strong)`,
  13.6:1) or fix it as a side effect of F-A11Y-3. Amend the CLAUDE.md line to scope the claim to
  the default state. *Verified: axe node + token math.*

### F-A11Y-9 (do-not-fix). scrollable-region-focusable on the listbox is an APG false positive
- **Severity:** info (recorded so it is not "fixed") | **Category:** a11y | **Owner:** directory | **Effort:** none | **Known:** no
- **Evidence:** axe wants `tabindex >= 0` on the `<ul role="listbox" tabindex="-1">`, but it is
  programmatically focused the instant it becomes visible (`plants/index.astro:308`) and hidden
  otherwise, with a complete keyboard model bound to it. Complying literally would add a
  spurious tab stop on a hidden element.
- **Fix:** No code change. The genuine barrier this rule is a bad proxy for is F-A11Y-3 (the
  invisible active option). If axe runs in CI, suppress this rule for `.fs-pop` with a comment.

### F-A11Y-11. Lightbox photo changes are not announced (WCAG 4.1.3)
- **Severity:** medium | **Category:** a11y | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** `PlantGallery.astro:90-100` mutates the image, alt, and credit in place on
  arrow/prev/next; nothing in the panel is a live region and every photo shares the same alt
  (`plant.commonName`). 99 of 135 gallery pages have 2+ photos. A screen-reader user pressing
  ArrowRight hears nothing, including the CC BY credit that changed (a licence obligation).
- **Fix:** Add `aria-live="polite"` `aria-atomic="true"` to `.lightbox-fig` (`:53`) and write a
  distinguishing alt in `render()` ("<name>, photo 2 of 4"). Both inside the existing dialog, no
  focus juggling. Pairs with F-A11Y-12.

### F-IMG-6. The header/footer logo is a 14.5 KB PNG (1.94 bytes/px) on all 1,866 pages
- **Severity:** medium | **Category:** images | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `public/bloomsee-logo-96.png` is 14,534 B for a 96x78 image (a normal logo PNG
  is 0.1 to 0.3 bytes/px; this is 1.94), rendered at 34x34/30x30. Lighthouse flags ~13 to 14 KB
  recoverable on all 14 runs; the ideal is ~1.2 KB. It is the only image the directory itself
  puts above the fold on every page.
- **Fix:** Ship a 68x68 WebP (~1 to 2 KB) or vectorize to inline SVG. Keep the 181 KB
  `bloomsee-logo.png` (the Pinterest engine reads it). Note `Mark.astro` is a different, simpler
  mark, not a drop-in.

### F-IMG-7. No Astro image pipeline: the directory has no lever on any image it serves
- **Severity:** medium | **Category:** images | **Owner:** directory (decision) | **Effort:** large | **Known:** no | **Confidence:** likely
- **Evidence:** No `<Image>`, no `astro:assets`, no image config, zero image assets in
  `dist/_astro/`. Every image is a remote Supabase URL (57,626 tags) or a `public/` file copied
  verbatim. This is defensible for the remote catalog (it is the Studio's product), but it is
  why nearly every image finding above is "ask the Studio" or "do nothing": the directory cannot
  re-rasterize what it does not own.
- **Fix:** Do not adopt `astro:assets` for the remote catalog. (1) Optimize the ~10 local
  `public/` images by hand (F-IMG-6, F-IMG-4). (2) If the Studio cannot own the rails/cache,
  evaluate **Cloudflare Image Resizing** (`/cdn-cgi/image/<opts>/<supabase-url>`) in front of
  the catalog: it would fix rails, format, crop, *and* the `no-cache` header at the edge without
  Studio changes. (See open questions: does the Pages plan include it?)

### F-IMG-8 / PERF-10. Supabase images are served `Cache-Control: no-cache`
- **Severity:** medium | **Category:** performance | **Owner:** studio | **Effort:** small | **Known:** yes (PERF-1)
- **Evidence:** Live curl today: all three image classes (`cards-sm`, `cards/community`,
  `plant-photos`) return `Cache-Control: no-cache` with an ETag. Repeat-visit **bytes** are ~0
  (the 304s return nothing), but every image still costs a conditional GET round trip before it
  can paint, and the LCP image is one of them: 10 blocking revalidations on the `/plants/`
  initial viewport, 1,677 across a full scroll.
- **Fix:** Studio uploads objects with a `cacheControl` value (Supabase defaults to no-cache
  when unset). The community cards already carry a `?v=<ts>` buster, so a long max-age is safe
  there. Note for quoting: Lighthouse's `cache-insight` reports a 1 h lifetime that contradicts
  the live `no-cache` header; trust the curl.

### F-SEO-4. The Cloudflare-injected AI-crawler block is invisible in the repo and contradicts its own file
- **Severity:** medium to high (policy call) | **Category:** SEO | **Owner:** cloudflare-config | **Effort:** small | **Known:** no
- **Evidence:** The live `robots.txt` has a Cloudflare "Managed content" block prepended above
  the repo's file, setting `Content-Signal: ai-train=no` and `Disallow: /` for Amazonbot,
  Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot, meta-externalagent,
  and CloudflareBrowserRenderingCrawler. The repo's `public/robots.txt` (5 lines) has none of
  this and its first line reads "the whole library is public and crawlable," now false for 9
  agents. `seo.ts:76` targets "AI answer engines."
- **Impact (honest, not alarm):** Googlebot, Bingbot, and the live answer-engine *fetchers*
  (OAI-SearchBot, ChatGPT-User, Claude-User, PerplexityBot) are **not** blocked, so search and
  live AI retrieval still work. What is lost is training-corpus and grounding presence (Common
  Crawl, GPTBot, ClaudeBot, Google-Extended, Meta AI). This may be **intentional and consistent
  with `terms.astro`**, which forbids using the content to train ML models. The defect is not
  the policy, it is that the policy is invisible in the repo and the file's comment actively
  misleads.
- **Fix:** (1) Decide and record the policy: if `ai-train=no` is intended, say so in
  `robots.txt` and CLAUDE.md and fix the false comment; if not, it must be turned off in the
  Cloudflare dashboard (editing `public/robots.txt` cannot remove an edge-merged block).
  (2) Separately reconsider ClaudeBot and CCBot, the two with the most real AI-visibility cost.
  **This is a business/licensing call, not a bug; do not change it without an owner decision.**

### F-SEO-5. /pinterest-144d4 is an indexable, empty-title, thin-content page
- **Severity:** medium | **Category:** SEO | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `dist/pinterest-144d4.html` (Pinterest's own verification markup) serves 200
  with `<title></title>`, no canonical, no meta robots, no `X-Robots-Tag`. It carries a third
  party's copyright notice, four dofollow links to pinterest.com, and three pinimg.com images
  the site's own CSP blocks. Correctly excluded from the sitemap already.
- **Fix:** Add a `/pinterest-144d4*` `X-Robots-Tag: noindex` block to `public/_headers` (beside
  the existing pages.dev rule). Pinterest's verifier reads the `p:domain_verify` meta from the
  body and is unaffected by a noindex header, so the domain claim survives. Cover both the
  `.html` and the extensionless URL (Pages strips `.html`).

### F-PERF-11. The sticky header runs a backdrop-filter blur on every scroll frame (unmeasured)
- **Severity:** medium | **Category:** performance | **Owner:** directory | **Effort:** small | **Known:** no | **Confidence:** uncertain
- **Evidence:** `global.css:130` `.site-header` is a translucent sticky element with
  `backdrop-filter: saturate(140%) blur(10px)`, which forces the compositor to re-snapshot and
  re-blur the content behind it as it scrolls. On `/plants/` that content is 89,370 nodes.
  Secondary: 172 foliage badges also carry `backdrop-filter: blur(4px)`.
- **Impact:** Potential scroll jank on mid-range mobile on the heaviest pages. **Unverified:**
  Lighthouse's TBT measures load-time blocking, not scroll-time compositor cost, so no existing
  artifact would have caught it.
- **Fix:** Do not change blind. Record a Chrome performance trace while scrolling
  `dist/plants/index.html` on a throttled CPU with and without the filter. If expensive, an
  opaque header (`background: var(--bs-header)`, dropping the color-mix and filter) is the
  cheap fix; the visual delta is small.

## Low

### F-A11Y-12. Every gallery thumbnail has the identical accessible name
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `PlantGallery.astro:25` `aria-label="View a larger photo of {commonName}"` is
  the same string for all photos in a strip (WCAG 2.4.4). 99 of 135 gallery pages have 2+
  photos.
- **Fix:** `aria-label="...photo ${i + 1} of ${photos.length}"` (`i` and `photos` are in
  scope). Pairs with F-A11Y-11.

### F-A11Y-13. Companion photo links are heard twice by screen readers
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `PlantCompanions.astro:33-35`: a `tabindex="-1"` photo link (with an `alt`
  giving it a name) sits immediately before the `<h3>` link to the same URL. `tabindex="-1"`
  removes it from tab order, not from the a11y tree, so a virtual-cursor user hears each
  companion twice and the links list doubles.
- **Fix:** Drop the `<a>` wrapper and render the img directly (`<span class="companion-ph"><img
  alt="" ...></span>`); the h3 link already points at the same URL. Do not just set `alt=""`
  while keeping the `<a>` (that trades this for a link-name violation).

### F-A11Y-14. Reduced-motion misses two effects
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** 8 of 9 motion effects are covered by the `prefers-reduced-motion` blocks. Not
  covered: the gallery thumbnail zoom (`global.css:808,810`) and the hero-tile focus lift
  (`:489` nulls only `:hover`, not `:focus-visible`). (Two auditors reported these as one
  finding.)
- **Fix:** Add `.photo-thumb:hover img { transform: none; }` to the reduce block at
  `global.css:722`, and change `.ht-tile:hover` at `:489` to `.ht-tile:hover,
  .ht-tile:focus-visible`.

### F-A11Y-15. The theme toggle does not name the state it toggles
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no | **Confidence:** likely
- **Evidence:** `ThemeToggle.astro:3` `aria-label="Toggle light or dark theme"` + `aria-pressed`
  mirroring the dark state, so a screen reader says "...toggle button, pressed" with nothing
  binding "pressed" to "dark."
- **Fix:** `aria-label="Dark theme"` reads as "Dark theme, toggle button, pressed"
  (unambiguous), or keep a dynamic label and drop `aria-pressed`; not both.

### F-A11Y-16. Guide FAQ questions nest under an unrelated section heading
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `guides/[slug].astro:110-119` renders the Q&A as bare `<h3>`s with no heading of
  their own, so the outline nests them under whatever `<h2>` came last ("Cool colour into
  fall").
- **Fix:** Emit a section heading before the questions (e.g. `<h2>Common questions</h2>`).

### F-A11Y-17. The photo-credit link is under the WCAG 2.2 target-size floor
- **Severity:** low | **Category:** a11y | **Owner:** directory | **Effort:** trivial | **Known:** no | **Confidence:** likely
- **Evidence:** `.photo-credit a` is ~16.5 CSS px tall (the whole `<figcaption>`), under the
  24x24 floor (2.5.8), and the inline-exception is thin since it is the entire caption. It is
  legally load-bearing (CC BY attribution).
- **Fix:** `.photo-credit a { display: inline-block; padding-block: 4px; }` and increase
  `.photo-credit` top margin so its 24px target no longer intersects the thumbnail above.

### F-CH-1. Three components declare dimensions from a different image object than they render
- **Severity:** low (code-readability only) | **Category:** code-health | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Verification note:** the original filing called this a "latent CLS bug"; adversarial
  verification **refuted that impact 3 of 3**. It is not a CLS risk. The code observation below
  is accurate; the layout consequence is not.
- **Evidence:** `PlantCard.astro:8/66` sets `src` from `cardSm || card || image` but declares
  `width/height` from `cardSm` only (so a community plant serves a ~722x720 file while declaring
  640x360). Same in `HeroTiles.astro:15/29-30` and `PlantCompanions.astro:34` (hardcoded
  160x90). **This causes no CLS, now or under a future rail:** every one of these images sits in
  a container with a fixed CSS `aspect-ratio` plus `width:100%;height:100%;object-fit:cover`
  (`.card .thumb` 16/11 at `global.css:204-205`, `.ht-tile` 1/1 at `:458/463`, `.companion-ph`
  16/9 at `:769-770`), so the HTML width/height attributes never reserve layout space and a
  different-aspect file only changes the crop. Proof: the card thumb already declares 16:9 in a
  16:11 box today, and CLS is 0.000 (Lighthouse `unsized-images` passes on all 14 runs).
- **Fix (tidiness, not a bug fix):** resolve the image object once and declare from it, as
  `PlantPick.astro:28-29` and `guides/index.astro:58` already do:
  `const src = plant.cardSm ?? plant.card ?? plant.image` then `src.url/src.w/src.h`. Purely a
  readability alignment; it prevents no runtime defect while the CSS container rules stand.

### F-CH-2. Dead code: Mark.astro, five dead CSS rules, four unused tokens
- **Severity:** low | **Category:** code-health | **Owner:** directory | **Effort:** trivial | **Known:** partially (CDH-2)
- **Evidence:** Verified by diffing every class token in `dist/` + `src/` against every CSS
  selector. `Mark.astro` is imported nowhere (confirms CDH-2), and its `.brand .mark` rule is
  dead. Dead selectors: `.prose` (`:111`), `.card .strip-label` (`:246`), `.year-ribbon
  .yr-label` (`:159`), `.band--surface`/`.band--accent` (`:401-402`). Four unused token
  declarations. (Keep `--bs-track`, `--bs-danger`, `--bs-warn`, `--bs-shadow-lg`: they have live
  references.)
- **Fix:** Delete the above; re-run the `dist/` class diff to confirm no regression.

### F-SEO-6. Guide and bloom-combo meta descriptions exceed 160 characters
- **Severity:** low | **Category:** SEO | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** All 32 guide descriptions (median 193, max 229) and 87 of 97 bloom-combos
  exceed 160. Plant pages are fine (clamped to 155). Low real cost: Google rewrites descriptions
  from content most of the time, and the first 155 chars are well-written.
- **Fix:** Trim the 32 hand-authored strings in `guides.ts` to <=155 and shorten the bloom-combo
  template. Verify against the built output, not the template.

### F-SEO-7. Eight guide links point at a 302, one to itself
- **Severity:** low | **Category:** SEO | **Owner:** directory | **Effort:** small | **Known:** no
- **Evidence:** `public/_redirects:12` sends `/plants/traits/low-maintenance/` to the guide
  (302). Eight guide pages link to that redirected URL; one is the low-maintenance guide
  **itself** (`guides.ts:507,540`), so a reader clicking "low-maintenance plants" is redirected
  back to the page they are on. The hub genuinely cannot be built (0 tagged plants).
- **Fix:** Change the 8 hrefs in `guides.ts`: on the low-maintenance guide, remove the self-link
  or point it at a hub that exists; on the other 6, link directly to the guide so it resolves in
  one hop. The redirect stays.

### F-SD-3. PropertyValue pairs carry unparseable prose values (no units)
- **Severity:** low | **Category:** structured-data | **Owner:** directory | **Effort:** trivial | **Known:** no
- **Evidence:** `seo.ts:78-96` emits `{"name":"Mature height","value":"0.9 m"}`,
  `{"value":"3-9"}`, etc. A machine cannot extract "0.9" + "metres" from "0.9 m." `p.matureHeight`
  is already a number.
- **Fix:** For the two numeric properties add the structured form
  (`"value":0.9,"unitCode":"MTR","unitText":"m"`); leave prose properties alone. Fold into the
  F-SD-1 `@graph` work.

### F-CH-3. robots.txt hardcodes the sitemap origin, ignoring SITE_URL
- **Severity:** low | **Category:** SEO | **Owner:** directory | **Effort:** small | **Known:** yes (CODE-REVIEW R5)
- **Evidence:** `public/robots.txt:5` is a literal `Sitemap: https://bloomseye.com/...` while
  `astro.config.mjs` and `site.ts` honor `SITE_URL`. Zero cost today; goes stale silently if the
  origin is repointed.
- **Fix:** Move `robots.txt` to a `src/pages/robots.txt.ts` endpoint reading `SITE.url`. Plan
  together with F-SEO-4 (the two robots findings are related, though the edge-merged AI block is
  independent of this file).

### F-CH-4. CSP requires 'unsafe-inline' because 100% of the site's JS is inline
- **Severity:** low | **Category:** code-health | **Owner:** cloudflare-config | **Effort:** medium | **Known:** no
- **Evidence:** `public/_headers:32` has `script-src 'self' 'unsafe-inline' ...`; `dist/` has
  zero `.js` files, so `script-src` is effectively inert as an XSS control. Practical risk is
  low (static site, no auth, no forms, no user input, Astro auto-escapes, `ldJson()` guards
  JSON-LD), but it is worth logging.
- **Fix:** Accept the tradeoff (inline-everything is correct for performance here, see below).
  If `script-src` protection is ever wanted, emit sha256 hashes per inline script at build. This
  is **not** an argument for adding an external bundle.

## Info (recorded so the planning session does not re-litigate)

- **F-INFO-1. `Thing` is the correct JSON-LD @type for plant pages.** Do not switch to Product
  (no offer/price/review; would generate Search Console warnings, and the Amazon link is a
  search link that is currently off). Taxon is not worth it. The real SD gaps are F-SEO-1,
  F-SD-1, F-SD-3. (`seo.ts:99`)
- **F-INFO-2. AVIF is a rounding error.** The catalog is already WebP (54,461 tags). The only
  non-WebP images are the 66 community JPEGs, the logo PNG, and the preview JPEG. Lighthouse's
  own split says right-sizing beats re-formatting 6x. Skip an AVIF pipeline; do F-IMG-1/4/6.
- **F-INFO-3. The single 0.0026 CLS on `/plants/`** traces to the custom-select swap guarding
  width but not height (`plants/index.astro:64-71`). 38x inside budget; optional. Add
  `line-height: 1.2` to `.filters select` if you want it at exactly zero.
- **F-INFO-4. Analytics comment drift.** `Layout.astro:117-118` says "bundled + fingerprinted,
  ~1 KB"; it is actually inlined into every page at ~2 KB live (nothing is fingerprinted).
  Correct the comment; no code change.
- **F-INFO-5. Three stale contrast comments.** `global.css:297,323,747` still claim `--bs-faint`
  fails AA at 2.9:1; after the 2026-07-14 fix it is 4.7 to 5.5:1 (AA). Reword the comments; keep
  the declarations.
- **F-INFO-6. BloomStrip aria-label assumes a contiguous range.** A multi-window or
  year-wrapping bloom would read as one long range ("April to October"). Zero cases in today's
  catalog, but it is the only thing a screen-reader user gets, so the first such plant lies on
  ~1,700 pages at once. Same class as the known REL-5/HUNT-5. Fix `BloomStrip.astro:9-12` and
  `bloomShort()` to enumerate contiguous runs.
- **F-INFO-7. Hub/combo titles embed a live catalog count** (110+ pages), so they are rewritten
  on every catalog refresh. Low severity (the count is also a freshness signal); flagged so the
  tradeoff is seen, not discovered.
- **F-INFO-8. Guides emit `og:type=article` but no `article:published_time`/`modified_time`.**
  The dates exist in the Article JSON-LD; Google reads that, not the OG tags. Two lines if
  wanted; low value.
- **F-INFO-9. The single global stylesheet** (38.5 KB, render-blocking, ~150 ms mobile) has
  ~40% route-specific CSS (guides, gallery/lightbox, custom-select). Astro auto-scopes per-page
  `<style>` blocks (`plants/index.astro` already does this for `.filters`). Low priority; a
  contributor to the home mobile 82, but not the dominant cost (F-PERF-1 is).

---

## Already fine (verified, so the planning session does not re-solve them)

These were checked and are correct. Evidence in `raw/`.

**Accessibility**
- Progressive enhancement holds: with JS disabled the four native `<select>`s stay visible and
  operable (the `.fs > select { display: none }` rule only matches inside the JS-created `.fs`
  wrapper), and gallery thumbnails stay working links to the full image.
- The lightbox passes every behavioral check: `role="dialog"` + `aria-modal="true"`, focus
  moves to the close button on open, Escape closes, focus returns to the thumbnail, and
  `<html>` overflow is restored.
- The mobile nav menu is `visibility: hidden` when closed, so screen readers do not read
  duplicate nav links on every page. Toggle has `aria-expanded`/`aria-controls`, Escape closes,
  focus returns.
- Every interactive element gets the universal 2px accent focus ring (3.74:1 light / 6.31:1
  dark) except the one place that cancels it (F-A11Y-7).
- The 2026-07-14 `--bs-btn`/`--bs-faint` contrast fix is real and holds in both themes
  (buttons 5.28 to 6.65:1, `--bs-faint` 4.69 to 5.53:1 on every surface it is used with).
- No page scrolls sideways at 360px. Color is not the sole carrier of meaning in the foliage
  badge (literal word), chips (color name as text), or count-note. Target sizes clear 24x24
  everywhere except F-A11Y-17. `role="img"` + `aria-label` on the bloom strip covers screen
  readers. bf-cache eligible (Lighthouse `bf-cache` scores 1). Exactly one h1 per page.

**Performance**
- CLS is essentially perfect sitewide (0 on 13 of 14 runs), because every one of 61,631 `<img>`
  tags carries width and height (0 gaps).
- Desktop Core Web Vitals are entirely green (perf 100, LCP 483 to 793 ms on all 7 desktop
  runs). Every CWV problem is mobile-only.
- **No JS bundle at all**: `dist/_astro/` is one CSS file. PostHog analytics is alive in
  production (tree-shaken away only in the local no-key build); the inline-everything design is
  correct and is **not** hurting TBT (0 ms on 6 of 7 mobile pages). Do not refactor it for
  performance, and do not use it as an argument for an external bundle.
- The single 38.5 KB stylesheet should **not** be inlined and has **zero** unused CSS per
  Lighthouse; fonts have `font-display: swap` on all 6 faces (no FOIT/FOUT); the theme no-flash
  script is correct (no FOUC). Font and hashed-asset caching is already immutable/correct.
- `PlantGrid` prioritizes its LCP image correctly (`eagerCount={4}`) and is the model for the
  home hero fix. The `/plants/` grid does not download 1,677 images on load
  (`content-visibility: auto` + lazy). The gallery is correctly a deferred, non-hero block.

**SEO / structured data**
- Canonicals correct on 1,866 of 1,867 pages (all self-referential, all on the configured
  origin). Sitemap exactly right (1,865 URLs; 404 and pinterest correctly excluded; zero
  orphans/404s). Zero broken internal links across the whole site.
- BreadcrumbList parity is perfect (zero pages with visible breadcrumbs but no
  BreadcrumbList, or vice versa). Bloom-combo pages **do** emit structured data (all 97).
  Organization + WebSite on the home page only is correct (matches Google guidance), and the
  SearchAction target is honest (`/plants/?q=` really works). FAQPage discipline is exactly as
  documented (61 pages, only question-shaped notes, always visible).
- The `ldJson()` XSS escaping works (0 parse errors across 4,093 blocks). twitter:card complete
  on every page. The `Layout.astro:31-32` og:image dimension bug never fires (zero pages ship
  an og:image without width/height). `public/_redirects` and `_headers` are current, not stale.

**Corrections to CLAUDE.md "Known issues" (verified wrong or overstated):**
- "No `description` field in the live catalog" is **wrong on both halves**: the field exists,
  and 66 of 1,677 records populate it and use a real description. Restate as "96% of records
  (1,611/1,677) have a null description and fall back to the template; Studio-owned."
- "Duplicate cultivar slugs" is real but is **exactly 3 pairs / 6 pages** (0.36%), all *Anemone
  blanda*, with conflicting facts. Not the open-ended problem the phrasing implies.
- "0 color-contrast violations in both themes" (ACC-1/2) holds **only for the default page
  state**; the open custom-select fails at 4.45:1 in light (F-A11Y-8).
- "`/plants/index.html` is heavy, ~4.45 MB raw" (PERF-2) is a **main-thread** problem (133 KB on
  the wire), and it is **every card-grid page**, not one page (F-PERF-2).
- `Mark.astro` dead (CDH-2): confirmed.

---

## For the planning session

### The findings, in one paragraph
The site is healthy. The top of the list is small and cheap: fix the home hero-tile LCP
(F-PERF-1, trivial) and get the Studio to publish `cardSm` derivatives for 66 community plants
(F-IMG-1), and the two worst numbers on the site both improve at once. The second tier is the
card-grid page weight, which needs reframing before it is costed (F-PERF-2): it is main-thread
parse time on the whole SEO surface, not bandwidth on one page, and the cheapest wins there
(delete two dead attributes, gate the rest behind a prop) are trivial and cut ~11 to 20% of the
served bytes of every grid page (F-PERF-3, F-PERF-4). Accessibility is a short, clean list: one
critical (malformed hero-tile list, F-A11Y-1), a handful of contrast/underline fixes, all
directory-owned and mostly trivial. The biggest SEO lever is content, not code: half the
library has a meaningless cultivar epithet as its H1 and JSON-LD name (F-SEO-1), fixable from a
`groupName` field the code already loads but never reads.

### What it means
- **Two changes carry most of the value.** F-PERF-1 (home LCP, directory, trivial) and F-IMG-1
  (community `cardSm`, Studio, medium). They fix the two worst metrics on the site.
- **The page-weight work is real but must be sold honestly.** It buys LCP/FCP/parse-time on the
  card-grid SEO surface, not transfer, and even after every markup fix `/plants/` stays too big
  for tooling (F-PERF-6). Cost it as main-thread time and DOM nodes.
- **A lot of the highest-value image and cache work is Studio-owned** (F-IMG-1, F-IMG-3,
  F-PERF-8, F-IMG-8). The directory's own lever is limited unless Cloudflare Image Resizing is
  on the table (F-IMG-7). Worth a single Studio ask that bundles: community `cardSm`, a card
  rail matching the 16:11 box, right-sized gallery thumbs, and `cacheControl` on uploads.
- **Accessibility is close to done.** Five axe violations, all fixable this round, none
  catastrophic; the lightbox, progressive enhancement, focus management, and the 2026-07 contrast
  fix all check out.
- **Several CLAUDE.md "known issues" are stale or wrong** (see corrections above). Updating them
  is itself a cheap, high-leverage task: the file is what every agent loads first.

### Open questions (need an owner decision or a check the harness cannot make)
1. **Is the Cloudflare AI-crawler block intentional?** (F-SEO-4) It matches `terms.astro` but
   contradicts `robots.txt`'s comment and `seo.ts`'s stated goal. A business/licensing call.
   Sub-question: keep ClaudeBot and CCBot blocked specifically?
2. **Does the Cloudflare Pages plan include Image Resizing** (`/cdn-cgi/image/`)? If so, the
   directory could fix rails, format, crop, and the `no-cache` header at the edge without any
   Studio change (F-IMG-7).
3. **Can the Studio own the four image fixes in one pass:** `cardSm` for the 66 community
   plants, a card rail matching the 16:11 display box, right-sized 4:3 gallery thumbnails, and
   `cacheControl` on uploads? Is the missing community `cardSm` a licensing/provenance choice or
   a pipeline gap?
4. **For F-SEO-1:** is the composed display name best built in the directory (from the unused
   `groupName`, with the awkward-prepend cases handled) or pushed upstream to the Studio? Some
   groupNames read poorly prepended ("English (David Austin) Roses").
5. **For F-SEO-3:** which of the 3 *Anemone blanda* slug pairs is canonical? Their facts
   conflict (zones 5-9 vs 4-8), so someone has to pick.
6. **Is the card markup redesign (sprite + month-row + gradient strip) in scope this round?**
   It is the highest-leverage perf change but touches the shared card component and needs
   screenshots in both themes. The gradient strip specifically trades DOM nodes for wire bytes
   and light-theme styling (F-PERF-6): a design decision, not a pure win.
7. **Does a `.webp` og:image render in LinkedIn, Facebook, and Pinterest previews?** 1,643 pages
   depend on it (F-INFO, unverified). Needs a real check with the Facebook Sharing Debugger and
   LinkedIn Post Inspector. If any consumer rejects WebP, the hedge is a JPG/PNG og rail from the
   Studio.

### Coverage gaps in this audit (honest limits)
- **Real Cloudflare TTFB and field INP** are unmeasurable from the local harness. The lab TBT
  proxy is clean, but real INP should be watched in Search Console / CrUX.
- **Not exhaustively tested:** print stylesheets, 400% browser zoom reflow (only 360px width was
  checked), WCAG 1.4.12 text-spacing, and Windows High Contrast / forced-colors mode. None are
  likely problems given the clean axe and CLS results, but they were not driven.
- **The `sticky-header backdrop-filter` scroll cost** (F-PERF-11) is inferred, not profiled;
  it needs a scroll trace before anyone acts on it.
