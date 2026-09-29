#!/usr/bin/env node
/**
 * Sitemap generator — static routes + real published destinations.
 *
 * Run:  node public/scripts/generate-sitemap.mjs        (from the repo root)
 *      node scripts/generate-sitemap.mjs                (from public/)
 *
 * Environment overrides (both optional):
 *   SITE_URL          canonical origin; defaults to the value parsed out of
 *                     public/src/constants/site.js — the single source of truth
 *                     (API.destination.contract.md §2.2 requires absolute URLs)
 *   SITE_API_BASE_URL backend origin; defaults to the value parsed out of
 *                     public/src/lib/apiClient.js
 *
 * Design rules, all of them deliberate:
 *
 *  - Only REAL data. Destination URLs come from `GET /destinations`, which by
 *    contract returns PUBLISHED content only (§2.2: DRAFT/ARCHIVED are never
 *    serialised publicly). A slug is emitted only if the API actually returned
 *    it. Nothing is invented, sampled from fixtures, or hardcoded.
 *  - Only pages that exist. `/places/*` and `/trips/*` are never emitted: a
 *    Place has no public page yet (PRD §200.6 is undecided) and `/trips` still
 *    renders showcase data. Emitting either would be advertising a 404 or a
 *    demo page as real inventory. This is asserted before the file is written.
 *  - Fails loudly but non-fatally. If the API is unreachable (offline, backend
 *    not running) the script warns and still writes a sitemap of the static
 *    routes. It never invents slugs to fill the gap. A non-zero exit is
 *    reserved for "the file could not be written" or "the origin could not be
 *    resolved" — both of which mean there is no valid output at all.
 *
 * Node 18+ (global `fetch`). No dependencies.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '..');
const SITE_CONSTANTS_FILE = path.join(APP_ROOT, 'src', 'constants', 'site.js');
const API_CLIENT_FILE = path.join(APP_ROOT, 'src', 'lib', 'apiClient.js');
const OUT_DIR = path.join(APP_ROOT, 'public');
const OUT_FILE = path.join(OUT_DIR, 'sitemap.xml');

/**
 * Indexable, always-present routes. Mirrors the route table in
 * public/src/App.jsx / public/src/constants/routes.js.
 *
 * Deliberately absent:
 *   /trips, /trips/:slug  — `noindex,follow`; showcase data, not live inventory
 *   /blog, /login, /dashboard/bookings/*, /places/:slug — reserved `noindex`
 *   /explore is included: it is a built discovery surface, not a reserved one.
 */
const STATIC_ROUTES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/explore', priority: '0.9', changefreq: 'weekly' },
  { loc: '/destinations', priority: '0.9', changefreq: 'daily' },
  { loc: '/plan-trip', priority: '0.8', changefreq: 'monthly' },
  { loc: '/about', priority: '0.5', changefreq: 'yearly' },
];

/** Path prefixes that must never reach a sitemap, asserted before writing. */
const FORBIDDEN_PREFIXES = ['/places', '/trips', '/blog', '/login', '/dashboard'];

const PAGE_LIMIT = 100; // §2.1 — hard maximum.
const MAX_PAGES = 200; // Loop guard; far above any realistic catalogue.
const REQUEST_TIMEOUT_MS = 15_000;

const warn = (message) => console.warn(`[sitemap] WARNING: ${message}`);
const info = (message) => console.log(`[sitemap] ${message}`);

/**
 * Extracts the first single-quoted string literal following `pattern` from a
 * source file. This is how the script avoids a second copy of a constant that
 * already lives in application code.
 */
async function parseDefaultFrom(source, pattern, label) {
  const contents = await readFile(source, 'utf8');
  const match = contents.match(pattern);
  if (!match) {
    throw new Error(
      `Could not find ${label} in ${path.relative(process.cwd(), source)}. ` +
        'Set it via the environment variable instead.'
    );
  }
  return match[1];
}

async function resolveOrigin() {
  const raw = process.env.SITE_URL || process.env.VITE_SITE_URL ||
    (await parseDefaultFrom(SITE_CONSTANTS_FILE, /VITE_SITE_URL\s*\|\|\s*'([^']+)'/, 'SITE_URL'));

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`SITE_URL is not a valid absolute URL: "${raw}"`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`SITE_URL must be http(s), got "${raw}"`);
  }
  return raw.replace(/\/+$/, '');
}

async function resolveApiBaseUrl() {
  const raw = process.env.SITE_API_BASE_URL ||
    (await parseDefaultFrom(API_CLIENT_FILE, /VITE_API_BASE_URL\s*\|\|\s*'([^']+)'/, 'the API base URL'));
  return raw.replace(/\/+$/, '');
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** ISO 8601 date, or null if the value is missing/unparseable. */
const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

/**
 * Walks `GET /destinations` to exhaustion using the opaque cursor (§2.1a).
 * Returns only slugs the API actually served, plus a tally of anything that
 * was rejected as untrustworthy.
 */
async function fetchPublishedDestinationSlugs(apiBaseUrl) {
  const slugs = new Map();
  let cursor = null;
  let page = 0;
  let skipped = 0;

  while (page < MAX_PAGES) {
    const url = new URL(`${apiBaseUrl}/destinations`);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`GET ${url.pathname} responded ${response.status} ${response.statusText}`);
    }

    const body = await response.json();
    const data = body?.data;
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      // The API only returns PUBLISHED (§2.2), so this is belt-and-braces —
      // but a draft leaking into a sitemap is a real, if unlikely, failure.
      if (item?.status !== 'PUBLISHED' || !isSlug(item?.slug)) {
        skipped += 1;
        continue;
      }
      if (!slugs.has(item.slug)) {
        slugs.set(item.slug, asDate(item.updatedAt) ?? asDate(item.publishedAt));
      }
    }

    page += 1;
    const next = typeof data?.nextCursor === 'string' && data.nextCursor.length > 0 ? data.nextCursor : null;
    if (next === null || next === cursor) break; // Final page, or a stuck cursor.
    cursor = next;
  }

  if (page >= MAX_PAGES) {
    warn(`stopped after ${MAX_PAGES} pages — the cursor may not be terminating. Sitemap may be truncated.`);
  }
  if (skipped > 0) {
    warn(`skipped ${skipped} item(s) that were not PUBLISHED or had an unusable slug.`);
  }

  // Sorted for a deterministic, diff-friendly file.
  return [...slugs.entries()]
    .map(([slug, lastmod]) => ({ slug, lastmod }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function render(origin, destinations) {
  const urls = [
    ...STATIC_ROUTES.map((route) => ({ ...route, loc: `${origin}${route.loc}` })),
    ...destinations.map(({ slug, lastmod }) => ({
      loc: `${origin}/destinations/${slug}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod,
    })),
  ];

  for (const { loc } of urls) {
    const pathname = new URL(loc).pathname;
    const forbidden = FORBIDDEN_PREFIXES.find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (forbidden) {
      throw new Error(`refusing to write a sitemap containing a reserved/noindex URL: ${loc}`);
    }
  }

  const entries = urls
    .map(({ loc, lastmod, changefreq, priority }) => {
      const parts = [`    <loc>${escapeXml(loc)}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
      if (changefreq) parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
      if (priority) parts.push(`    <priority>${escapeXml(priority)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by public/scripts/generate-sitemap.mjs — do not edit by hand. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  let origin;
  try {
    origin = await resolveOrigin();
  } catch (error) {
    // Cannot write a valid sitemap without a canonical origin.
    console.error(`[sitemap] FATAL: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  info(`origin ${origin}`);

  let destinations = [];
  let apiUsed = false;
  try {
    const apiBaseUrl = await resolveApiBaseUrl();
    destinations = await fetchPublishedDestinationSlugs(apiBaseUrl);
    apiUsed = true;
    info(`destination API ok — ${destinations.length} published destination(s)`);
  } catch (error) {
    // Non-fatal by design. The static routes are still real and useful.
    warn(
      `destination API unavailable (${error.message}). ` +
        'Writing a sitemap of the static routes ONLY — no destination URLs are fabricated. ' +
        'Re-run once the backend is up.'
    );
  }

  let xml;
  try {
    xml = render(origin, destinations);
  } catch (error) {
    // A reserved/noindex URL reaching the sitemap is a bug in this script, not
    // a runtime condition. Refuse to write rather than write it and move on.
    console.error(`[sitemap] FATAL: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(OUT_FILE, xml, 'utf8');
  } catch (error) {
    console.error(`[sitemap] FATAL: could not write ${OUT_FILE}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  info(
    `wrote ${path.relative(process.cwd(), OUT_FILE)} — ` +
      `${STATIC_ROUTES.length} static route(s) + ${destinations.length} destination(s)` +
      `${apiUsed ? '' : ' (static only)'}`
  );
}

await main();
