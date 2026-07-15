# BloomsEye Studio - Plant Name Findability Audit

**Read-only investigation. 2026-07-14.** No repo files were changed. Every count and example below was produced by a deterministic simulator that mirrors the two live search surfaces byte-for-byte against the current catalog (1,677 plants: 1,611 built-in from `src/garden/plantLibrary.ts` + 66 frozen community plants from `src/data/community-snapshot.json`). Scripts and raw data live beside this file.

The mission: find where a real plant name a shopper would type does **not** resolve to a plant we already have, plus the names that resolve to the **wrong** plant. It does. There are five distinct failure classes, and the largest ones are structural, not one-off. Concretely: **1,461 distinct real shopper queries were verified to currently fail or mislead** (1,302 return nothing on both surfaces, 123 work on only one surface, the rest return the wrong plant or are ambiguous), touching **1,027 of the plants we already carry**, with **80 names flagged as ambiguous**. Those are catalogued in `alias-map.csv`; the classes and the highest-traffic examples are below.

---

## 1. How search works today (the mechanics)

There is **no alias table, no synonym list, no fuzzy match, no stemming, and no spell-correction anywhere in the product.** (Confirmed: the only `*ALIAS*` tables in the repo - `PLANT_CUTOUT_ALIASES`, `PLANT_CARD_ALIASES`, `STYLE_ALIAS` - resolve 3D models and images, never search text.) Search is literal string matching over the fields a plant happens to carry. There are **two different search surfaces, and they do not match each other**:

| | **"Add plant" picker** (`src/shared/PlantLibraryModal.tsx`) | **Browse tab** (`src/browse/BrowseTab.tsx`) |
|---|---|---|
| Where | The in-editor picker: 2D plan, 3D view, Photo Studio all open it | The full-page catalog browser |
| Fields searched | `commonName` + `botanicalName` + `category` + **all tags** (+ the variety **group name**) | `commonName` + `botanicalName` **only** |
| Match rule | query is ONE contiguous **substring** of the joined haystack, lowercased | query split on spaces into tokens; **every** token must be a substring (AND) |
| Tokenized? | **No** - the whole query must appear as one run of characters | **Yes** - per word |
| Punctuation | Literal (a hyphen or apostrophe in the data must be typed exactly) | Literal |

The consequences of that table are the whole report:

- **The picker searches tags, category, and group names; Browse searches none of them.** Every one of the 1,677 plants carries tags, and **1,511 of 1,677 (90%) sit under a variety group** (e.g. "Peonies", "Hostas", "Hydrangeas"). So the picker can find a plant by its trait ("fragrant", "shade", "drought") or by its series name ("peonies"); Browse can find neither. Browse is systematically the weaker surface.
- **The picker is not tokenized; Browse is.** So a two-word query that is not a literal contiguous substring fails the picker but can pass Browse. "black eyed susan" (no hyphen) returns **0 in the picker** but **2 in Browse**, because the stored name is "Black-**Eyed** Susan" and the picker's substring test trips on the hyphen while Browse's per-token test does not.
- **Neither surface is a superset of the other.** They fail on opposite inputs. The same shopper, typing the same words, gets different results depending on which "Add plant" entry point they came through. That inconsistency is itself a finding (Section 5).

Everything a shopper types that is not already literally present in those fields returns nothing (or the wrong thing). Alternate common names, retail brand names, and misspellings are, by definition, not in the data.

---

## 2. Findability gaps, bucketed and ranked by likely search frequency

Ranking is by how often a real garden-centre shopper types the term (my read of retail search volume), then by severity (returns nothing on both surfaces > returns nothing on one). "GAP" = 0 results on both surfaces. "DIVERGENT" = works on one surface, 0 on the other. Every example is verified against the simulator.

### Bucket A - Alternate / vernacular common names (HIGHEST value)

These are the "stonecrop returns nothing but sedum returns the plant" cases: **we carry the plant, under a different common name.** This is the single highest-volume, highest-confidence bucket. All of the following return **0 on both surfaces** today:

| Shopper types | We have it as | Botanical | Freq |
|---|---|---|---|
| **stonecrop** | Autumn Joy Sedum, Neon Sedum, Creeping Sedum (+ more) | Sedum / Hylotelephium | High |
| **cranesbill** | Hardy Geranium, Rozanne, Johnson's Blue (+ ~20) | Geranium | High |
| **tickseed** | Coreopsis (+ 11 cultivars) | Coreopsis | High |
| **bergamot** | Bee Balm (+ 11 Monarda) | Monarda | Med |
| **foamflower** (one word) | "Foam Flower" (two words - see spacing note) | Tiarella | Med |
| **gayfeather** | Blazing Star | Liatris | Med |
| **hen and chicks** (singular "hen") | Hens and Chicks | Sempervivum | Med |
| **juneberry / serviceberry** | (Amelanchier, browse-only via spacing) | Amelanchier | Med |
| **smoke bush** | resolves picker=0 / browse=1 only | Cotinus | Med |

Note the pattern: the alternate name is a whole different word from anything in the record, so no amount of substring logic will ever reach it. These need a name-to-plant mapping. The big-genus vernacular pairs a shopper reaches for (stonecrop=Sedum, cranesbill=Geranium, tickseed=Coreopsis, bee balm/bergamot=Monarda, coneflower=Echinacea, coral bells=Heuchera, catmint=Nepeta, Russian sage=Perovskia/Salvia) are the ones to cover first. Shrubs carry just as many: **althea**=Rose of Sharon, **smoke tree**=Smokebush, **summer lilac**=Butterfly Bush, **cinquefoil**=Potentilla, **juneberry / saskatoon / shadbush**=Serviceberry, **sweet pepperbush**=Summersweet, **golden bells**=Forsythia, **cape jasmine**=Gardenia, **pee gee hydrangea**=Panicle Hydrangea, **korean lilac**=Miss Kim. A proposed mapping for every one we carry is in `alias-map.csv`.

### Bucket B - Retail brand / trademark series names (HIGH value, growing)

These are what is printed on the plant tag at Lowe's / Home Depot / a nursery. The shopper knows the brand, not the botanical. All return **0 on both surfaces** unless noted:

| Shopper types | Should reach | Status |
|---|---|---|
| **endless summer** | Bigleaf Hydrangea (Hydrangea macrophylla) | GAP (0/0) |
| **million bells** | Calibrachoa / Superbells (we carry 12) | GAP (0/0) |
| **encore azalea** | Azalea (Rhododendron) | GAP (0/0) |
| **bloomerang** | Lilac (Syringa) | GAP (0/0) |
| **wave petunia** | "Purple Wave" resolves (1); other Wave colours do not | Partial |

Some brand names already resolve because a cultivar name happens to carry them: **knock out rose**, **drift rose**, **stella de oro**, **superbells** (11), **cheyenne spirit**, **sombrero**, **summerific**, **wine & roses**, and the full **David Austin** English-rose set all work. The gap is the brands whose text is nowhere in the data (endless summer, million bells, encore, bloom-a-thon, incrediball, invincibelle, bobo, pinky winky, surfinia, rainbow rhythm), plus a subtle punctuation twist the brand sweep found:

- **"wine and roses"** (spelled out) misses "Wine **&** Roses" (the weigela's cultivar name uses an ampersand); **"pow wow"** (two words) misses "PowWow"; **"stella d'oro"** (apostrophe) misses "Stella de Oro"; **"diablo"** misses ninebark "Diabolo". These are brand names we DO carry, lost to one character.
- Two brand names are **ambiguous**: **"big bang"** is a Coreopsis series AND a Spiraea ('Double Play Big Bang'); **"rockin'"** is a Salvia series AND a Monarda ('Rockin' Raspberry').

Note the interaction with Bucket A: "endless summer" is a shopper's entire mental model for a reblooming hydrangea, and we carry Bigleaf Hydrangea, but the two never meet. `alias-map.csv` proposes the brand-to-genus mappings.

### Bucket C - Misspellings and phonetic spellings for high-traffic plants

Pure substring search has zero spelling tolerance, so one wrong letter on a top-20 plant returns nothing. Verified GAPs (0/0):

| Misspelling | Correct plant | Freq |
|---|---|---|
| **crepe myrtle** (the dominant US spelling) | "Crape Myrtle" (we spell it Crape) | High |
| **hydrangia** | Hydrangea | High |
| **fuschia** (the classic one) | Fuchsia | High |
| **lavendar / lavander** | Lavender | High |
| **camelia** (single L) | Camellia | High |
| **echinacia** | Echinacea / Purple Coneflower | Med |
| **clamatis** | Clematis | Med |
| **crysanthemum** | Chrysanthemum / Garden Mum | Med |
| **weigelia / wiegela** | Weigela | Med |
| **azelea / azalia** | Azalea | Med |
| **dalia** | Dahlia | Med |
| **rhododendrun / rhodadendron** | Rhododendron | Low |

Note **crepe myrtle** specifically: our catalog uses "Crape Myrtle", but "crepe" is the more common US spelling, so the shopper's natural spelling misses one of the most-planted Southern shrubs. And a related structural miss the shrub sweep found: **cultivar + type** queries ("miss kim lilac", "snowmound spirea", "natchez crape myrtle", "winter gem boxwood") fail because the type word is the plant's *category*, which Browse never searches and the picker cannot match non-contiguously.

The misspelling specialist agent produced a longer list (begonya, petunya, geranuim, wisteria/westeria, gladiola, columbein, delphenium, hibiscous, zinia, ranunculas). These are lower-confidence than Buckets A/B because judging "real" misspelling frequency is fuzzy; treat the CSV's misspelling rows as candidates to prune, not to adopt wholesale.

### Bucket D - Plural and punctuation (structural, high traffic)

Two mechanical rules bite here, both affecting the most common plants:

**(1) Group plurals return 0 in Browse.** The picker finds "peonies" via the group name "Peonies"; Browse ignores group names, so it returns nothing. This hits the plural of nearly every popular plant. Verified `picker>0 / browse=0`:

> **peonies** (pk 16), **hostas** (16), **daylilies** (16), **coneflowers** (16), **tulips** (18), **lilies** (21), **hydrangeas** (4), **dahlias** (16), **azaleas** (15), **rhododendrons** (13), **marigolds** (11), **petunias** (14), **zinnias** (14), **snapdragons** (11), **irises** (3), **geraniums** (11), **chrysanthemums** (15), **daffodils** (16), **climbing roses** (10).

A shopper on the Browse tab typing "peonies" or "hostas" - the single most natural thing to type - gets **an empty page**, while the exact same query in the picker works. 28 group forms are affected.

**(2) Apostrophes and hyphens must be typed exactly.** Most people do not type apostrophes into a search box. 74 catalog names carry an apostrophe and 9 carry a hyphen; the natural apostrophe-free / hyphen-free spelling breaks them. Verified misses (most break **both** surfaces):

> **lambs ear** (for "Lamb's Ear"), **walkers low** ("Walker's Low" catmint), **johnsons blue** ("Johnson's Blue" geranium), **baths pink** ("Bath's Pink" dianthus), **cats meow**, **woods purple**, **black eyed susan** (picker only - the hyphen), and every other `'s`-cultivar. Also spacing: **foamflower** vs "Foam Flower", **service berry** vs "Serviceberry" (picker 0 / browse 4).

### Bucket E - the picker vs Browse divergence (the structural root)

Not a list of names but the reason many of the above exist. Because Browse searches only name+botanical while the picker also searches group + tags, **Browse cannot find 90% of plants by their series name and cannot do trait/keyword search at all**. Examples of the same query on both surfaces:

| Query | Picker | Browse | Why |
|---|---:|---:|---|
| fragrant | 316 | 1 | Browse ignores tags |
| shade | 158 | 2 | Browse ignores tags |
| drought | 24 | 0 | Browse ignores tags |
| evergreen | 85 | 0 | Browse ignores tags |
| rose of sharon | 13 | 1 | Browse ignores group |
| butterfly bush | 12 | 1 | Browse ignores group |
| coral bells | 15 | 2 | Browse ignores group |
| black eyed susan | 0 | 2 | Picker not tokenized (hyphen) |

The placeholder text in the picker ("try pink, shade, fall, fragrant") actively promises trait search - which then returns almost nothing if the user later tries the same word in Browse.

---

## 3. Noisy / wrong matches (the plant that should NOT be there)

Because matching is pure substring with no word boundaries, short queries collide with longer words and surface unrelated plants. These are verified from the current data.

### The one the brief called out
**"coral bells"** on Browse returns Coral Bells (Heuchera, correct) **plus "Superbells Coralina"** (a *Calibrachoa*). The tokens "coral" and "bells" both substring-match inside "**Coral**ina" and "Super**bells**". Confirmed.

### Two more the agents surfaced (both currently return the WRONG plant)
- **"cherry blossom"** - a shopper means a flowering cherry TREE (Yoshino, Kwanzan). The picker instead surfaces a Delphinium cultivar literally named "Magic Fountains Cherry Blossom". The trees never come back because "cherry blossom" is not in their text.
- **"moss rose"** - to a home gardener this is Portulaca grandiflora (the annual succulent). It resolves ONLY to "Duchesse de Verneuil (Moss Rose)", an antique shrub rose, because that name carries the literal text; the Portulaca we carry has no "moss rose" text and is missed. The query returns the wrong plant for most shoppers.

### Substring collisions (a systemic class)
Short search words match inside unrelated longer words. Each row is a real query where the wrong plants come back:

| Shopper types (wants) | Also returns (wrong) | Because |
|---|---|---|
| **aster** (the flower) | Dutch Master (daffodil), Globemaster (allium), Masterpiece (lupine) | "aster" is inside "M**aster**" |
| **pine** (the tree) | Lupine, and every Lupinus cultivar | "pine" is inside "Lu**pine**" |
| **mum** (chrysanthemum) | Basil (Oci**mum**), Star Jasmine (Trachelosper**mum**), Shasta Daisy (Leucanthe**mum**) | "mum" inside those genera |
| **holly** (Ilex) | Hollyhock and every Alcea | "holly" inside "**Holly**hock" |
| **rose** | Vinca (Catharanthus **rose**us), Karl **Rose**nfield peony, Rosemary, Prim**rose** | "rose" inside many words |
| **fir** (the tree) | Jet**fir**e daffodil, Star**fir**e phlox, **Fir**ewitch dianthus | "fir" inside "fire" |
| **pea** (sweet pea) | Pink **Pea**rl hyacinth, Georgia **Pea**ch heuchera | "pea" inside "pearl/peach" |
| **ash** (the tree) | Neon Fl**ash** spirea, K**ash**mir White geranium | "ash" inside "flash/kashmir" |
| **oak** | Velvet Cl**oak** smokebush | "oak" inside "cloak" |

The common thread: any query of ~3 to 5 letters that is also a fragment of a cultivar name is polluted. `collisions.json` has the full scan. (Legitimately-polysemous words - "lily", "daisy", "rose" as a name - also span genera, but that is horticulturally correct and not a bug.)

---

## 4. Ambiguous names (one name, two or more unrelated plants)

Names that legitimately mean different plants to different shoppers. These need a disambiguating result, not a single silent answer.

| Name | Meaning 1 | Meaning 2 | In our data? |
|---|---|---|---|
| **cherry truffle** | a *Sedum* cultivar | a *Heuchera* cultivar | Neither is carried under that name; returns 0. The name is inherently ambiguous. |
| **black-eyed susan** | Rudbeckia (perennial) | Black-Eyed Susan Vine (Thunbergia alata) | Both carried; both returned. Genuinely two different plants. |
| **geranium** | hardy Geranium (perennial) | annual "geranium" = Pelargonium | Both carried (23 hits) - AND a daffodil literally named "Geranium" (Narcissus) also comes back. Triple ambiguity. |
| **jack frost** | Brunnera 'Jack Frost' | also used for Heuchera / other silver-leaf plants | Brunnera carried. |
| **snowball / snowball bush** | European Snowball (Viburnum opulus) | Smooth Hydrangea 'Annabelle' (also called snowball bush); Agapanthus 'Snowball' | Multiple carried; "snowball" alone hits the Agapanthus. |
| **elephant ears** | Bergenia (elephant's ears, perennial) | "Elephant Ear" in our catalog is Colocasia (tropical bulb) - unrelated | Both carried under different names. |
| **periwinkle** | Vinca minor (our "Periwinkle") | annual Catharanthus (our "Vinca") | Both carried; query reaches only Periwinkle. |
| **larkspur** | annual Consolida (our "Larkspur") | perennial Delphinium | Both carried; Delphinium does not resolve. |
| **rose mallow** | Hardy Hibiscus (H. moscheutos) | Rose of Sharon (H. syriacus) | Both carried; name is shared. |
| **natchez** | Crape Myrtle 'Natchez' (Lagerstroemia) | Mock Orange 'Natchez' (Philadelphus) | Same cultivar name, two unrelated shrubs. |
| **helichrysum** | strawflower (now Xerochrysum) | also the licorice-plant Helichrysum | Former genus; the retail search term still. |
| **primrose** | Primula | a Syringa (lilac) cultivar named 'Primrose' | The lilac is what returns. |
| **dusty miller / ice plant / mock orange / money plant / cedar** | classic shared-common-name collisions | | mixed |

"Martha Stewart" and other celebrity/branded lines (a rose, a Heuchera, etc.) do not resolve at all: the brand text is nowhere in the data.

---

## 5. `alias-map.csv` (the companion deliverable)

`alias-map.csv` is a review sheet: **existing plant -> proposed aliases** (the names that currently fail or mislead but should reach it), one row per plant, with the bucket(s) and a frequency tier. It merges the hand-verified seed with candidates generated by a 15-way fan-out of horticultural-naming agents (plus a dedicated retail-brand sweep), and **every proposed alias was run through the simulator - only names that currently fail or are ambiguous are included** (names that already resolve were dropped). **1,025 distinct plants** carry at least one proposed alias, drawn from 1,442 verified failing/ambiguous queries. It is a proposal for human review, not a finished mapping. Columns: `existing_plant, botanical, proposed_aliases, buckets, top_freq, n_aliases`.

Representative rows (each alias verified to currently return nothing or the wrong plant):
- **Bigleaf Hydrangea** <- big leaf hydrangea; endless summer; french hydrangea; hortensia; lacecap; mophead; hydrangia; hydrangeas
- **Hardy Geranium** <- cranesbill; crane's bill; perennial geranium; hardy cranesbill
- **Arborvitae** <- white cedar; arbor vitae; eastern white cedar; arborvite (misspelling)
- **Rugosa Rose** <- beach rose; salt spray rose; japanese rose; hedgehog rose; sea tomato
- **Garden Mum** <- mum; mums; fall mum; hardy mum; crysanthemum (misspelling)
- **Ranunculus** <- buttercup; persian buttercup; ranunculas / renunculus (misspellings)

Recommended vetting order: Bucket A (alternate common names) and Bucket D (plural/punctuation) are high-confidence and safe. Bucket B (brands) needs a human to confirm we actually carry the species the brand denotes. Bucket C (misspellings) is the noisiest; prune it.

---

## 6. For the planning session

**Findings (what is true today):**
1. There is no alias / synonym / fuzzy / spell-correct layer at all. Search is literal substring/token matching over whatever text a plant already carries.
2. Five failure classes, in rough order of shopper impact: (A) alternate common names we carry under another name - stonecrop, cranesbill, tickseed, bergamot, and dozens more return nothing; (D) plurals and punctuation - "peonies"/"hostas" return an empty Browse page, apostrophe-free typing breaks 74+ names; (B) retail brand names - endless summer, million bells, encore; (C) misspellings - hydrangia, fuschia, lavendar; and the noise class (§3) where short queries surface the wrong plant (coral bells -> Calibrachoa, aster -> daffodils, pine -> lupines, mum -> basil).
3. The two search surfaces disagree. Browse ignores tags and group names, so it cannot find 90% of plants by series name or do any trait search; the picker is not tokenized, so it breaks on hyphens. The same words give different answers in the picker and in Browse.

**What it means:**
- The catalog is *deep* (1,677 plants, real botanical data) but *shallow on names*: each plant is reachable by essentially one spelling of one name (plus its botanical). A shopper who does not already know our exact label often concludes "they don't have it" when we do. For the north-star user (a non-expert typing the words she knows - stonecrop, mums, coral bells, peonies), this is the gap most likely to make the library feel empty.
- The highest-value, lowest-risk fix space is a curated name-to-plant alias layer (Bucket A + D), because those names are unambiguous and we demonstrably carry the plants. Brands and misspellings are real but need judgement. Noise (§3) is a matching-quality problem (word boundaries / ranking), separate from missing aliases.
- Fixing Browse to match the picker's fields (tags + group names) would erase a whole class of "empty page" gaps at once, independent of any alias work.

**Open questions for the session (not decisions to make here):**
1. Should the picker and Browse share one matching function? They diverge today; unifying them removes half the surprises but is a behaviour change to two shipped surfaces.
2. Where should aliases live - as data on the `Species` (a new optional `aliases: string[]`, which the picker already substring-searches for free if folded into the haystack) or as a separate name-to-slug map? (The brief says do not design the implementation; flagging only that the schema is additive-only, so an optional field is cheap.)
3. Ambiguous names (§4): show a small disambiguation ("did you mean the perennial or the vine?") or just return both? Needs a UX call.
4. Misspelling tolerance: curated alias rows (cheap, exact) vs real fuzzy matching (broader, riskier, and a perf question given the 1,677-row grid the picker already windows for speed)?
5. How wide to go on brand names, given they change yearly and are a maintenance commitment (each is "permanent code you do not control")?
6. Does the same gap exist on the **directory** site and the **companion app** (both read the same published `plants.json`)? This audit covered the Studio only; the directory's SEO depends on findability most of all, so it is worth a parallel look.

---

### Method note (for reproducibility)
`dataset.json` is the extracted catalog. `search_sim.py` reimplements both surfaces exactly (verified against the code in `PlantLibraryModal.tsx` and `BrowseTab.tsx`). `verify.py` classifies any candidate list; `noise_detect.py` and `collision_scan.py` find wrong matches; `punct_plural_scan.py` finds the punctuation/plural breaks. `build_outputs.py` merges the curated seed with the agent-generated candidates and emits `alias-map.csv`. Counts in this report are from those scripts against the catalog as of 2026-07-14.
