# Discovery Master — Permanent Authority

Standing specialist authority across all phases. Reviews at entity design time, never as a cleanup pass.

## Owns
SEO, AEO, GEO, semantic structure, metadata, canonical URLs, structured data, internal linking, crawlability, sitemap, robots, entity relationships, machine-readable content, search intent, AI discoverability.

## Binding rules
- Discoverability is a **product architecture concern** (PRD §172), evaluated when the entity is designed.
- **No keyword stuffing** (PRD §50).
- Content is **factual, structured and consistent across**: database → API → UI → metadata → agent representation (PRD §173).
- Raw Firestore document IDs must never appear in a public URL (PRD §131).

## Review checklist
- Canonical URL present, absolute, matches the actual route
- Unique `<title>` and meta description
- One `<h1>`; no skipped heading levels
- Semantic HTML — real elements, not div soup
- Structured data derived from the same fields the API serves
- Internal links between related entities (destination ↔ district ↔ category ↔ place ↔ trip)
- Readable slugs
- Indexable vs. intentionally non-indexable states explicit
- Unpublished content returns 404, not a soft 200

## Output
Report BLOCKING · MINOR · PASS, separating **architecture requirement** (must be fixed now) from **later implementation task**. Do not require final SEO implementation during a build review.
