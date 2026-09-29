/**
 * Client-side Zod schemas for the content CMS — one schema per contract
 * field set: DISTRICT, CATEGORY, PLACE and DESTINATION.
 *
 * These mirror `backend/src/validators/content.validator.js`. Per PRD §101
 * the **backend is the authoritative validator**; these exist so an editor
 * gets immediate feedback on an obviously-invalid value instead of a round
 * trip. When the server still rejects a payload, the 400's `details[]` are
 * mapped onto the same field paths (see lib/formErrors.js).
 *
 * Two deliberate, documented normalisations happen here before validation,
 * because an HTML form represents "absent" as an empty string and the
 * contracts model absence as `null` or as an omitted key:
 *   - a blank row in a repeatable list is dropped (highlights, gallery)
 *   - a blank optional URL/SEO field becomes `null`, not `''`
 *
 * `status` is deliberately NOT part of any form schema. Lifecycle moves
 * through the explicit, confirmed lifecycle controls (PRD §38, §78), never
 * through a form field — otherwise publishing could happen without the
 * confirmation step the public-visibility change requires.
 */

import { z } from 'zod';

/** Mirrors the backend `slug` schema (PRD §131). */
const slug = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers and single hyphens — for example rajgir'
  );

/** Mirrors the backend `httpUrl` schema. */
const url = z
  .string()
  .trim()
  .url('Must be a valid URL, including https://')
  .max(2048, 'URL must be at most 2048 characters');

/** Optional URL: blank becomes `null`, which is what the contract allows. */
const nullableUrl = z.preprocess(blankToNull, url.nullable());

/** Optional plain text: blank becomes `null`. */
const nullableText = (max, message) =>
  z.preprocess(blankToNull, z.string().trim().max(max, message).nullable());

/** Mirrors `travelInformation` (DESTINATION §14, backend `travelInformation`). */
const travelInformationSchema = z
  .object({
    bestTimeToVisit: z.string().trim().max(500, 'Best time to visit must be at most 500 characters').optional(),
    howToReach: z.string().trim().max(1000, 'How to reach must be at most 1000 characters').optional(),
    nearestRailway: z.string().trim().max(200, 'Nearest railway must be at most 200 characters').optional(),
    nearestAirport: z.string().trim().max(200, 'Nearest airport must be at most 200 characters').optional(),
    localLanguage: z.string().trim().max(100, 'Local language must be at most 100 characters').optional(),
  })
  .partial();

/**
 * A single row of a repeatable list. Empty is tolerated here and removed by
 * the normaliser, so a half-filled row in the editor is not an error.
 */
const listRow = z.string().trim().max(300, 'Each entry must be at most 300 characters');

/** Repeatable list of URLs (Destination `gallery`). */
const urlListRow = z
  .string()
  .trim()
  .max(2048, 'URL must be at most 2048 characters')
  .refine((value) => value === '' || isHttpUrl(value), {
    message: 'Must be a valid URL, including https://',
  });

// ---------------------------------------------------------------------------
// Normalisers — applied before validation via z.preprocess
// ---------------------------------------------------------------------------

function blankToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? null : value;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Trims and drops blank rows, so a spare empty row is not submitted. */
function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((row) => (typeof row === 'string' ? row.trim() : row)).filter((row) => row !== '');
}

/** Drops keys whose value is an empty string — an absent field, not a blank one. */
function cleanRecord(record) {
  if (!record || typeof record !== 'object') return {};
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => !(typeof value === 'string' && value.trim() === ''))
  );
}

function cleanIdList(list) {
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string' && id !== '') : [];
}

// ---------------------------------------------------------------------------
// District — DISTRICT.domain.contract.md §2 (8 fields, 3 editable)
// ---------------------------------------------------------------------------

export const districtFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  slug,
});

// ---------------------------------------------------------------------------
// Category — CATEGORY.domain.contract.md §2 (5 fields, 4 editable)
// ---------------------------------------------------------------------------

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  slug,
  // OPTIONAL in the contract: it exists only to order Categories in Explore
  // (PRD §115), so "leave blank" is a valid answer, not an error.
  sortOrder: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z
      .number({ invalid_type_error: 'Sort order must be a whole number' })
      .int('Sort order must be a whole number')
      .min(0, 'Sort order cannot be negative')
      .max(9999, 'Sort order must be 9999 or less')
      .nullable()
  ),
});

// ---------------------------------------------------------------------------
// Place — PLACE.domain.contract.md §2 (15 fields, 11 editable)
// ---------------------------------------------------------------------------

export const placeFormSchema = z.preprocess(
  (raw) => ({
    ...raw,
    categoryIds: cleanIdList(raw?.categoryIds),
    heroImage: blankToNull(raw?.heroImage),
    seoTitle: blankToNull(raw?.seoTitle),
    metaDescription: blankToNull(raw?.metaDescription),
    canonicalUrl: blankToNull(raw?.canonicalUrl),
  }),
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(160, 'Name must be at most 160 characters'),
    slug,
    // Canonical 1:1 geography (PRD §200.3) — a Place belongs to one District.
    districtId: z.string().min(1, 'Select a district'),
    // N:M taxonomy (PRD §200.2) — a plain ID array, never a copied name.
    categoryIds: z.array(z.string()).max(20, 'A place can belong to at most 20 categories'),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description must be at most 5000 characters'),
    // OPTIONAL in the contract: no PRD section requires a Place image.
    heroImage: nullableUrl,
    // OPTIONAL: only meaningful once a public Place page exists (PRD §200.6).
    seoTitle: nullableText(120, 'SEO title must be at most 120 characters'),
    metaDescription: nullableText(320, 'Meta description must be at most 320 characters'),
    canonicalUrl: nullableUrl,
  })
);

// ---------------------------------------------------------------------------
// Destination — DESTINATION.domain.contract.md §2 (24 fields, 19 form-editable)
//
// Two contract fields are deliberately NOT part of this schema:
//   - `status`   — moved only through the confirmed lifecycle controls, so
//                  publishing can never happen as a side effect of a form save
//   - `featured` — changed only through the feature toggle, which the backend
//                  refuses for a non-PUBLISHED destination; keeping it out of
//                  the payload also stops an unrelated save from reverting a
//                  feature change made elsewhere
//
// `thingsToDo` is intentionally absent: its structure is an open decision
// (PRD §200.8) and the backend refuses to accept it (contract field #15).
// `createdAt` / `updatedAt` / `createdBy` / `updatedBy` / `publishedAt` are
// system-managed and are never client-supplied.
// ---------------------------------------------------------------------------

export const destinationFormSchema = z.preprocess(
  (raw) => ({
    ...raw,
    categoryIds: cleanIdList(raw?.categoryIds),
    placeIds: cleanIdList(raw?.placeIds),
    highlights: cleanList(raw?.highlights),
    gallery: cleanList(raw?.gallery),
    travelInformation: cleanRecord(raw?.travelInformation),
    ogImage: blankToNull(raw?.ogImage),
  }),
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(160, 'Name must be at most 160 characters'),
    slug,
    districtId: z.string().min(1, 'Select a district'),
    categoryIds: z.array(z.string()).max(20, 'A destination can belong to at most 20 categories'),
    placeIds: z.array(z.string()).max(100, 'A destination can list at most 100 places'),
    shortDescription: z
      .string()
      .trim()
      .min(10, 'Short description must be at least 10 characters')
      .max(300, 'Short description must be at most 300 characters'),
    description: z
      .string()
      .trim()
      .min(20, 'Description must be at least 20 characters')
      .max(20000, 'Description must be at most 20000 characters'),
    heroImage: url,
    gallery: z.array(urlListRow).max(30, 'Gallery supports at most 30 images'),
    highlights: z.array(listRow).max(20, 'Highlights supports at most 20 entries'),
    travelInformation: travelInformationSchema,
    seoTitle: z
      .string()
      .trim()
      .min(1, 'SEO title is required')
      .max(120, 'SEO title must be at most 120 characters'),
    metaDescription: z
      .string()
      .trim()
      .min(1, 'Meta description is required')
      .max(320, 'Meta description must be at most 320 characters'),
    canonicalUrl: url,
    ogImage: nullableUrl,
  })
);

/** Statuses shared by every content entity (PRD §38, §78). */
export const CONTENT_STATUSES = Object.freeze(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
