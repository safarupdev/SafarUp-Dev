/**
 * Content-entity validation schemas — PRD §101 (Data Validation).
 *
 * The backend is the **authoritative** validator. Any client-side Zod schema
 * is a UX convenience only and must not diverge in meaning.
 *
 * Schemas are grouped per entity and mirror the APPROVED field tables in
 * `docs/CONTRACTS/`. A field is validated here only if the contract declares
 * it — most notably `thingsToDo`, which is intentionally absent because its
 * structure is still an open decision (PRD §200.8).
 */

const { z } = require('zod');

/** Shared lifecycle values (PRD §38, §78). */
const contentStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

/** Readable, URL-safe slug (PRD §131). Case is normalised, not rejected. */
const slug = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and single hyphens')
  .transform((value) => value.toLowerCase());

const hexColor = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour');

const httpUrl = z.string().trim().url('Must be a valid URL').max(2048);

const travelInformation = z
  .object({
    bestTimeToVisit: z.string().trim().max(500).optional(),
    howToReach: z.string().trim().max(1000).optional(),
    nearestRailway: z.string().trim().max(200).optional(),
    nearestAirport: z.string().trim().max(200).optional(),
    localLanguage: z.string().trim().max(100).optional(),
  })
  .partial()
  .default({});

// ---------------------------------------------------------------------------
// District
// ---------------------------------------------------------------------------

const districtBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug,
  status: contentStatus.optional(),
});

// ---------------------------------------------------------------------------
// Patch schemas — `slug` is deliberately NOT patchable
// ---------------------------------------------------------------------------

const SLUG_IMMUTABLE_MESSAGE =
  'Slug cannot be changed after creation (PRD §200.8 — slug-mutation policy is unapproved)';

/**
 * PATCH schemas deliberately make `slug` unpatchable.
 *
 * A slug is claimed atomically at create time (`createWithSlug` → `claimSlug`),
 * and every public read resolves a slug by reading that `slugClaims` document
 * (`findPublishedBySlug` → `resolveSlug`). A PATCH that merged a new `slug`
 * into the entity without touching the claim would cause two failures:
 *
 *   1. The old claim stays behind permanently, so that slug can never be
 *      reused by anything, ever.
 *   2. The new slug is never claimed, so `findPublishedBySlug` returns null and
 *      the entity loses its canonical URL — an unannounced 404 for a page that
 *      is still live, published, and linked from the sitemap.
 *
 * A CONTENT-role user could trigger this through an ordinary PATCH, which is
 * why the field is rejected in the schema rather than merely documented.
 *
 * `z.never()` rejects any supplied value while still permitting the field to be
 * absent, so the request fails as a 400 naming `slug` instead of being silently
 * stripped and reported as an unrelated "empty body" error.
 *
 * The *policy* for slug mutation — redirect, slug retention, which role may
 * perform it — is an open decision under PRD §200.8, so it is deliberately not
 * invented here. Once approved, slug mutation must be implemented as a single
 * transaction that claims the new slug and releases the old one via
 * `releaseSlug`, never as a bare merge.
 */
const withoutSlug = (bodySchema) =>
  bodySchema
    .extend({ slug: z.never({ invalid_type_error: SLUG_IMMUTABLE_MESSAGE }) })
    .partial();

const districtPatch = withoutSlug(districtBody).partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

const categoryBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug,
  status: contentStatus.optional(),
  // OPTIONAL — exists only to order Categories inside Explore (PRD §115).
  sortOrder: z.number().int().min(0).max(9999).nullable().optional(),
});

const categoryPatch = withoutSlug(categoryBody).partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

const placeBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug,
  // Canonical geographic relationship (PRD §200.3).
  districtId: z.string().trim().min(1, 'District is required'),
  categoryIds: z.array(z.string().trim().min(1)).max(20).default([]),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  heroImage: httpUrl.nullable().optional(),
  status: contentStatus.optional(),
  // OPTIONAL — meaningful only once a public Place page exists (PRD §200.6).
  seoTitle: z.string().trim().max(120).nullable().optional(),
  metaDescription: z.string().trim().max(320).nullable().optional(),
  canonicalUrl: httpUrl.nullable().optional(),
});

const placePatch = withoutSlug(placeBody).partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ---------------------------------------------------------------------------
// Destination
// ---------------------------------------------------------------------------

const destinationBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug,
  // 1:1 canonical district (PRD §200.3).
  districtId: z.string().trim().min(1, 'District is required'),
  // N:M taxonomy via an ARRAY (PRD §200.3) — never a singular categoryId.
  categoryIds: z.array(z.string().trim().min(1)).max(20).default([]),
  // N:M canonical places (§200.2). References, never copies (§186).
  placeIds: z.array(z.string().trim().min(1)).max(100).default([]),
  shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(300),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(20000),
  heroImage: httpUrl,
  gallery: z.array(httpUrl).max(30).default([]),
  status: contentStatus.optional(),
  featured: z.boolean().default(false),
  highlights: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  travelInformation,
  // SEO (PRD §50)
  seoTitle: z.string().trim().min(1).max(120),
  metaDescription: z.string().trim().min(1).max(320),
  canonicalUrl: httpUrl,
  ogImage: httpUrl.nullable().optional(),
  // NOTE: `thingsToDo` is intentionally NOT accepted. Its structure is an
  // open decision (PRD §200.8); accepting it now would freeze an unapproved
  // schema.
});

const destinationPatch = withoutSlug(destinationBody).partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * List query. `q` is accepted by the shape but is explicitly rejected by the
 * service in Phase 2 with a 400 — search mechanics are an open decision
 * (PRD §200.8) and silently ignoring the parameter would misrepresent
 * results to humans and agents alike (API.destination.contract.md §2.1b).
 */
const destinationListQuery = z.object({
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  district: slug.optional(),
  category: z
    .union([slug, z.array(slug)])
    .optional()
    .transform((value) => (value === undefined ? undefined : Array.isArray(value) ? value : [value])),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
  cursor: z.string().max(500).optional(),
  q: z.string().max(200).optional(),
});

const placeListQuery = z.object({
  status: contentStatus.optional(),
  district: slug.optional(),
  category: slug.optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
});

/**
 * List query for a cursor-paginated list (Destination admin, District).
 *
 * `cursor` must be part of the schema: Zod strips unknown keys, so a cursor
 * the schema does not declare is silently dropped and the endpoint emits a
 * `nextCursor` that no client can ever send back.
 */
const adminListQuery = z.object({
  status: contentStatus.optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
  cursor: z.string().max(500).optional(),
});

/**
 * District list. The public list ignores `status` — the service hard-codes
 * `PUBLISHED` for anonymous callers — but the admin list filters on it.
 */
const districtListQuery = z.object({
  status: contentStatus.optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
  cursor: z.string().max(500).optional(),
});

/**
 * Category list. Deliberately has NO `cursor`: `categoryRepository.list()`
 * returns a plain array, so accepting a cursor would be a silent no-op.
 */
const categoryListQuery = z.object({
  status: contentStatus.optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
});

const slugParam = z.object({
  slug: z.string().trim().min(1),
});

const idParam = z.object({
  id: z.string().trim().min(1),
});

// ---------------------------------------------------------------------------
// Request envelopes
// ---------------------------------------------------------------------------
//
// `validate(schema)` (middleware/validate.js) parses `{ body, query, params }`
// — it mirrors the Express request object, and it hands the PARSED values
// downstream. A flat schema therefore never validates anything real: parsing
// the envelope with `destinationBody` reports every field as missing.
//
// The schemas above are flat on purpose: each one documents exactly one
// entity's field contract. Wrapping them here keeps both properties — one
// place per entity, and a correct envelope per source.

const body = (schema) => z.object({ body: schema });
const query = (schema) => z.object({ query: schema });
const params = (schema) => z.object({ params: schema });

/** Wraps a flat body/query/params schema into the envelope `validate()` parses. */
const validateBody = body;
const validateQuery = query;
const validateParams = params;

module.exports = {
  contentStatus,
  districtBody,
  districtPatch,
  categoryBody,
  categoryPatch,
  placeBody,
  placePatch,
  destinationBody,
  destinationPatch,
  destinationListQuery,
  placeListQuery,
  adminListQuery,
  districtListQuery,
  categoryListQuery,
  slugParam,
  idParam,
  // exported for tests
  slug,
  hexColor,
  httpUrl,
  validateBody,
  validateQuery,
  validateParams,
};
