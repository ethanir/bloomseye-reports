export const meta = {
  name: 'multicolor-catalog-audit',
  description: 'Botanical audit: which single-color catalog plants truly come in multiple colors',
  phases: [
    { title: 'Assess ungrouped' },
    { title: 'Assess groups' },
    { title: 'Verify multi-color' },
    { title: 'Synthesize' },
  ],
}

// args = { ungrouped: [...100 single-entry plants...], groups: [...176 variant groups...] }
const ungrouped = args.ungrouped
const groups = args.groups

// ---- schemas -------------------------------------------------------------
const UNGROUPED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['plants'],
  properties: {
    plants: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'verdict', 'candidateColors', 'storedColorFair', 'colorAffectsSizeOrCare', 'shopperRelevance', 'confidence', 'reasoning'],
        properties: {
          slug: { type: 'string' },
          verdict: { type: 'string', enum: ['clearly-multi', 'probably-multi', 'single-color', 'foliage-plant-na'] },
          candidateColors: { type: 'array', items: { type: 'string' }, description: 'Realistic garden-center colors for this genus/species BEYOND the stored one; empty if single-color' },
          storedColorFair: { type: 'boolean', description: 'Is the stored color a fair default/most-common form?' },
          colorAffectsSizeOrCare: { type: 'boolean', description: 'True only if a specific color correlates with a genuinely different mature size or care need (may need its own entry, not just a color note)' },
          colorSizeCareNote: { type: 'string', description: 'If colorAffectsSizeOrCare, explain which color and how; else empty' },
          shopperRelevance: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How commonly a home gardener buys this and actively picks a color' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          reasoning: { type: 'string', description: 'One or two sentences from genus/species botany' },
        },
      },
    },
  },
}

const GROUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['groups'],
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'groupType', 'colorGapSeverity', 'missingColors', 'note'],
        properties: {
          key: { type: 'string' },
          groupType: { type: 'string', enum: ['color-variants', 'species-or-form-types', 'mixed'], description: 'Are members distinct COLORS of one plant, or distinct SPECIES/FORMS (e.g. hydrangea mophead vs panicle, iris bearded vs siberian)?' },
          colorCovers: { type: 'boolean', description: 'Does the set of members already span the realistic garden color range for this plant?' },
          colorGapSeverity: { type: 'string', enum: ['none', 'minor', 'notable'], description: 'How much shopper-relevant color range is missing' },
          missingColors: { type: 'array', items: { type: 'string' }, description: 'Obvious garden colors a shopper would expect but that no member provides' },
          note: { type: 'string' },
        },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'genuinelyMultiColor', 'correctedColors', 'gardenCenterCommon', 'caveat', 'confidence'],
  properties: {
    slug: { type: 'string' },
    genuinelyMultiColor: { type: 'boolean', description: 'After skeptical review: is this genus/species genuinely sold in multiple distinct flower colors?' },
    correctedColors: { type: 'array', items: { type: 'string' }, description: 'The colors you can actually defend for this plant in home-garden commerce' },
    gardenCenterCommon: { type: 'boolean', description: 'Are the multiple colors commonly available to an ordinary home gardener (not just specialist/rare)?' },
    caveat: { type: 'string', description: 'Any correction, botanical confusion risk, or nuance the first pass may have missed' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
}

// ---- helpers -------------------------------------------------------------
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

const BOTANIST_INTRO = `You are a horticultural botanist auditing a garden-design app's plant catalog. The app is used by ordinary home gardeners (the north-star user is a non-expert home gardener). The catalog stores exactly ONE flower color per plant entry. Your job: judge, from each plant's genus and species, whether it REALISTICALLY comes in MULTIPLE distinct flower colors that a home gardener would encounter at a normal garden center or big-box nursery, not obscure collector variants.

Rules for judgment:
- "clearly-multi": the plant is famously sold in several colors (e.g. a genus with red/pink/white/purple forms everyone recognizes).
- "probably-multi": genus has real color range but the specific species is somewhat narrower, or availability is moderate.
- "single-color": the plant is essentially one color in cultivation (note: some genera have a rare off-color that a normal shopper never sees; those are still single-color for this purpose).
- "foliage-plant-na": grown for foliage; flowers irrelevant (ferns, hostas-like, succulents grown for leaves). Still note if foliage color varies.
- Reason from actual botany. Do NOT confuse a genus with a look-alike. Be honest that a stored color like white lily-of-the-valley or yellow goldenrod is genuinely the only color.
- colorAffectsSizeOrCare = TRUE only for the RARE case where a specific color correlates with a genuinely different mature SIZE or CARE need (implying it may deserve its own catalog entry, not just a color note). Example pattern: a trailing/purple species sold under the same common name as an upright multicolor species. Think hard about whether any plant in your batch has this.
- shopperRelevance: how often a home gardener actually buys this plant AND cares which color they get.

Return one row per plant, using the exact slug given.`

// =========================================================================
phase('Assess ungrouped')
const ungroupedBatches = chunk(ungrouped, 10)
const ungroupedResults = await parallel(
  ungroupedBatches.map((batch, i) => () =>
    agent(
      `${BOTANIST_INTRO}\n\nAssess these ${batch.length} plants. Each shows: slug, common name, botanical name, genus, category, and the single color currently stored.\n\n${JSON.stringify(batch, null, 2)}`,
      { label: `botanist:ungrouped-${i + 1}`, phase: 'Assess ungrouped', schema: UNGROUPED_SCHEMA }
    )
  )
)
const ungroupedFlat = ungroupedResults.filter(Boolean).flatMap((r) => r.plants || [])
log(`Ungrouped assessed: ${ungroupedFlat.length}/${ungrouped.length}`)

// =========================================================================
phase('Assess groups')
const GROUP_INTRO = `You are a horticultural botanist reviewing a garden app's EXISTING plant "variant groups". Each group collapses several catalog entries of one plant type into one picker card that opens to its members. For each group you get: key, display name, member count, and the DISTINCT flower colors its members currently span (derived from stored colors).

Decide for each group:
- groupType: are the members distinct COLORS of essentially one plant (e.g. petunias in purple/red/white), or distinct SPECIES/FORMS/CULTIVAR-TYPES that happen to be grouped (e.g. hydrangea mophead vs panicle vs oakleaf; iris bearded vs siberian vs dutch; lily asiatic vs oriental vs tiger)? "mixed" if both.
- colorCovers / colorGapSeverity / missingColors: even if the group exists, does its current member set already span the realistic garden color range a shopper expects? If a famously multicolor plant is grouped only by form and misses obvious colors (e.g. a hydrangea group with no blue/pink split, or a group that is all one color), flag the gap. "notable" only when a shopper would clearly be frustrated by the missing colors.
Be calibrated: most large groups (roses, tulips, dahlias, coneflowers) already cover color well; say so with colorGapSeverity "none".`

const groupBatches = chunk(groups, 22)
const groupResults = await parallel(
  groupBatches.map((batch, i) => () =>
    agent(
      `${GROUP_INTRO}\n\nReview these ${batch.length} groups:\n\n${JSON.stringify(batch, null, 2)}`,
      { label: `botanist:groups-${i + 1}`, phase: 'Assess groups', schema: GROUP_SCHEMA }
    )
  )
)
const groupFlat = groupResults.filter(Boolean).flatMap((r) => r.groups || [])
log(`Groups assessed: ${groupFlat.length}/${groups.length}`)

// =========================================================================
phase('Verify multi-color')
// Adversarially verify every ungrouped plant the first pass called multi-color.
const bySlug = Object.fromEntries(ungrouped.map((u) => [u.slug, u]))
const toVerify = ungroupedFlat.filter((p) => p.verdict === 'clearly-multi' || p.verdict === 'probably-multi')
log(`Verifying ${toVerify.length} multi-color candidates`)

const verifyResults = await parallel(
  toVerify.map((p) => () => {
    const src = bySlug[p.slug] || {}
    return agent(
      `You are a SKEPTICAL second-opinion botanist. A first pass claimed this catalog plant comes in multiple flower colors. Try to REFUTE that. Only confirm multi-color if you can defend, from genus/species botany, that ordinary home gardeners genuinely encounter several distinct flower colors of THIS plant at normal garden centers.\n\nWatch for: confusing the genus with a relative; counting only rare collector forms; a genus that is truly monochrome in cultivation; or the plant actually being grown for foliage.\n\nPlant: ${src.name} (${src.botanical}), genus ${src.genus}, category ${src.cat}. Currently stored as a single color: ${src.storedColor} (${src.storedHex}).\nFirst pass said: verdict=${p.verdict}, candidateColors=${JSON.stringify(p.candidateColors)}, reasoning="${p.reasoning}".\n\nReturn your honest skeptical verdict for slug "${p.slug}".`,
      { label: `verify:${p.slug}`, phase: 'Verify multi-color', schema: VERIFY_SCHEMA }
    )
  })
)
const verifyBySlug = {}
for (const v of verifyResults.filter(Boolean)) verifyBySlug[v.slug] = v

// =========================================================================
phase('Synthesize')
// merge first-pass + verify into final records
const merged = ungroupedFlat.map((p) => {
  const v = verifyBySlug[p.slug]
  const src = bySlug[p.slug] || {}
  let finalVerdict = p.verdict
  if (v) {
    if (!v.genuinelyMultiColor) finalVerdict = 'single-color'
    else if (v.gardenCenterCommon) finalVerdict = 'clearly-multi'
    else finalVerdict = 'probably-multi'
  }
  return {
    slug: p.slug,
    name: src.name,
    botanical: src.botanical,
    genus: src.genus,
    cat: src.cat,
    storedColor: src.storedColor,
    storedHex: src.storedHex,
    firstPassVerdict: p.verdict,
    finalVerdict,
    candidateColors: v && v.genuinelyMultiColor ? v.correctedColors : p.candidateColors,
    storedColorFair: p.storedColorFair,
    colorAffectsSizeOrCare: p.colorAffectsSizeOrCare,
    colorSizeCareNote: p.colorSizeCareNote || '',
    shopperRelevance: p.shopperRelevance,
    gardenCenterCommon: v ? v.gardenCenterCommon : null,
    confidence: v ? Math.min(p.confidence, v.confidence) : p.confidence,
    reasoning: p.reasoning,
    verifyCaveat: v ? v.caveat : '',
  }
})

return {
  ungrouped: merged,
  groups: groupFlat,
  counts: {
    ungroupedTotal: ungrouped.length,
    assessed: merged.length,
    clearlyMulti: merged.filter((m) => m.finalVerdict === 'clearly-multi').length,
    probablyMulti: merged.filter((m) => m.finalVerdict === 'probably-multi').length,
    singleColor: merged.filter((m) => m.finalVerdict === 'single-color').length,
    foliage: merged.filter((m) => m.finalVerdict === 'foliage-plant-na').length,
    colorAffectsSize: merged.filter((m) => m.colorAffectsSizeOrCare).length,
    groupsAssessed: groupFlat.length,
    groupNotableGap: groupFlat.filter((g) => g.colorGapSeverity === 'notable').length,
    groupFormTypes: groupFlat.filter((g) => g.groupType === 'species-or-form-types').length,
  },
}
