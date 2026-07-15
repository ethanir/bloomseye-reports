export const meta = {
  name: 'bloomseye-botanical-plausibility',
  description: 'Fan out botanical-plausibility review over the whole plant catalog by category, then adversarially verify each flag',
  phases: [
    { title: 'Review', detail: 'category-grouped finders flag clear botanical implausibilities' },
    { title: 'Verify', detail: 'independent skeptics confirm or reject each flag' },
  ],
}

// args = the chunk manifest: [{ path, cat, idx, count }, ...]
// Tolerate args arriving as a JSON string (the harness sometimes serializes it).
const manifest = typeof args === 'string' ? JSON.parse(args) : args

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          slug: { type: 'string' },
          field: { type: 'string', description: 'bloom | zones | sun | water | height | spread | category | name | other' },
          current: { type: 'string', description: 'the current value in the catalog' },
          issue: { type: 'string', description: 'why it is clearly implausible for THIS species' },
          expected: { type: 'string', description: 'what a knowledgeable gardener would expect instead' },
          confidence: { type: 'string', enum: ['high', 'medium'] },
        },
        required: ['slug', 'field', 'current', 'issue', 'expected', 'confidence'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slug: { type: 'string' },
    field: { type: 'string' },
    verdict: { type: 'string', enum: ['confirmed', 'rejected'] },
    reason: { type: 'string' },
  },
  required: ['slug', 'field', 'verdict', 'reason'],
}

const FINDER_INTRO = `You are a horticultural data auditor for BloomsEye, a garden-design app whose core promise is an accurate year-round BLOOM forecast and to-scale 3D sizing. You will be given a file path; use the Read tool to read it. Each line is one catalog plant: slug | common name | botanical | category | mature Height x Spread (metres) | years-to-maturity | bloom window(s) with hex colour | USDA hardiness zones | sun need | water need | search tags.

Flag ONLY values that a knowledgeable gardener would call CLEARLY WRONG for that exact species/cultivar - not typical-value quibbles. The library openly documents that bloom/size/zone values are "typical" approximations, so do NOT flag small differences (a few weeks of bloom, a zone off by one, a size within ~40%). Flag things like:
- bloom MONTHS in the wrong SEASON for the species (e.g. a spring-only bulb blooming in autumn), or a bloom colour that clearly contradicts the named cultivar/common name (e.g. a plant called "White ..." with a red hex), or NO bloom on a plant grown primarily for flowers.
- hardiness ZONES impossible for the species (e.g. a tropical listed hardy to zone 3, or a very cold-hardy classic listed zones 9-11 only).
- SUN clearly wrong: a classic deep-shade plant (hosta, fern, astilbe) listed full-sun, or a sun-demanding plant (most roses, lavender, sedum) listed full-shade.
- WATER clearly wrong: a bog/moisture plant listed low water, or a true xeric/succulent listed high water.
- SIZE off by roughly 2x or more from the species' real mature size (height or spread).
- CATEGORY clearly wrong (a true tree filed as Shrub at tree height, a woody shrub filed as Perennial, etc.).
- NAME/botanical mismatch (the common name and the Latin name are not the same plant).

Return STRICT JSON via the tool. If nothing is clearly wrong in this chunk, return an empty findings array. Be conservative: precision over recall. Do not invent slugs; only use slugs present below.`

phase('Review')

const totalPlants = manifest.reduce((s, m) => s + m.count, 0)
log(`Reviewing ${totalPlants} plants in ${manifest.length} category-grouped chunks`)

const results = await pipeline(
  manifest,
  (c) => agent(
    `${FINDER_INTRO}\n\nCATEGORY: ${c.cat} (chunk ${c.idx + 1}, ${c.count} plants)\nRead this file, then review every plant in it:\n${c.path}`,
    { label: `review:${c.cat}#${c.idx + 1}`, phase: 'Review', schema: FINDINGS_SCHEMA }
  ),
  // Verify each finding from this chunk as soon as the chunk returns
  (review, c) => {
    const fs = (review && review.findings) || []
    if (!fs.length) return []
    return parallel(fs.map((f) => () =>
      agent(
        `You are an adversarial verifier. A first-pass auditor flagged a BloomsEye catalog value as botanically wrong. Your job is to REFUTE it unless it is clearly correct. Default to "rejected" if there is any reasonable defense of the current value (remember the library uses typical approximations, and many cultivars vary).\n\nPlant slug: ${f.slug}\nField: ${f.field}\nCurrent value: ${f.current}\nAuditor's claim: ${f.issue}\nAuditor's expected: ${f.expected}\n\nUse your horticultural knowledge of this specific species/cultivar. Only "confirmed" if the current value is genuinely, clearly wrong for this plant. Return STRICT JSON via the tool.`,
        { label: `verify:${f.slug}/${f.field}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ).then((v) => ({ finding: f, verdict: v, cat: c.cat })).catch(() => null)
    ))
  }
)

const flat = results.flat().filter(Boolean)
const confirmed = flat.filter((x) => x.verdict && x.verdict.verdict === 'confirmed')
const rejected = flat.filter((x) => x.verdict && x.verdict.verdict === 'rejected')

log(`Flagged ${flat.length} -> confirmed ${confirmed.length}, rejected ${rejected.length}`)

return {
  totalFlagged: flat.length,
  confirmedCount: confirmed.length,
  rejectedCount: rejected.length,
  confirmed: confirmed.map((x) => ({ ...x.finding, cat: x.cat, verifyReason: x.verdict.reason })),
  rejectedSample: rejected.slice(0, 40).map((x) => ({ slug: x.finding.slug, field: x.finding.field, claim: x.finding.issue, whyRejected: x.verdict.reason })),
}
