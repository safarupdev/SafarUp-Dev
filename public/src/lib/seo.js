/**
 * Per-route document head management — PRD §172, PRD §50.
 *
 * Discoverability is architecture, not a cleanup pass: a page's identity —
 * title, description, canonical URL, Open Graph card and structured data — is
 * a function of the route and the entity it renders, so it is applied by the
 * route itself rather than remembered later.
 *
 * This is a client-rendered app, so the head is written imperatively. That is
 * correct for the product but is NOT sufficient on its own for a crawler that
 * does not execute JavaScript — see the pre-render concern raised in the
 * Phase 2 report.
 *
 * Absolute URLs are mandatory (API.destination.contract.md §2.2). A relative
 * or malformed canonical is a machine-readable assertion about this page's
 * identity; when in doubt the value is dropped rather than half-written.
 */

import { useEffect } from 'react';
import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE } from '../constants/site';
import { isAbsoluteUrl, joinUrl, truncate } from './format';

const MANAGED_FLAG = 'data-safarup-seo';

/** Creates, updates or removes a `<meta>` tag in the document head. */
function setMeta(attribute, key, content) {
  if (content === null || content === undefined || content === '') {
    // Removal, not skip: a stale `noindex` left behind by a previous route
    // would silently deindex a page that must be indexed.
    document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();
    return;
  }
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(content));
}

/** Creates, updates or removes `<link rel="...">`. */
function setLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/** Removes the JSON-LD blocks a previous route added. */
function clearStructuredData() {
  document.head.querySelectorAll(`script[${MANAGED_FLAG}]`).forEach((node) => node.remove());
}

function addStructuredData(payload) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(MANAGED_FLAG, '');
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

/**
 * @param {object} options
 * @param {string} options.title      `<title>`; suffixed with the site name.
 * @param {string} [options.description] meta description, clamped to 160 chars.
 * @param {string|null} options.canonical ABSOLUTE canonical URL, or a path
 *   resolved against `SITE_URL`. Pass `null` to emit **no** canonical — the
 *   correct answer for a page that must not claim an identity, such as a
 *   not-found response.
 * @param {string} [options.image]    absolute Open Graph image URL.
 * @param {string} [options.robots]   e.g. `noindex,follow` for views that must
 *   not be indexed (filtered lists, reserved routes).
 * @param {string} [options.type]     Open Graph type, default `website`.
 * @param {object|object[]} [options.structuredData] JSON-LD, array for @graph.
 */
export function useSeo({
  title,
  description,
  canonical,
  image,
  robots,
  type = 'website',
  structuredData,
} = {}) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Travel. Planned Better.`;
    const metaDescription = truncate(description, 160) ?? DEFAULT_DESCRIPTION;

    // A stored canonical is trusted only when it is an absolute http(s) URL.
    // Anything unparseable falls back to a path against SITE_URL, and an
    // explicit `null` emits nothing at all.
    const canonicalUrl =
      canonical === null
        ? null
        : isAbsoluteUrl(canonical)
          ? canonical
          : joinUrl(SITE_URL, canonical || '');

    const ogImage = isAbsoluteUrl(image) ? image : DEFAULT_OG_IMAGE;

    document.title = pageTitle;
    setMeta('name', 'description', metaDescription);
    setMeta('name', 'robots', robots);
    setLink('canonical', canonicalUrl);

    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_IN');
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', metaDescription);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:alt', title ?? null);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', metaDescription);
    setMeta('name', 'twitter:image', ogImage);

    clearStructuredData();
    if (structuredData) {
      const blocks = Array.isArray(structuredData) ? structuredData : [structuredData];
      addStructuredData(blocks.length === 1 ? blocks[0] : { '@context': 'https://schema.org', '@graph': blocks });
    }

    // Structured data belongs to one route only; leaving it behind would let a
    // "not found" page describe itself with the previous page's entity.
    return clearStructuredData;
  }, [title, description, canonical, image, robots, type, structuredData]);
}
