/**
 * Site-level constants.
 *
 * `SITE_URL` is the *canonical* origin. It is deliberately NOT derived from
 * `window.location`: a canonical URL must be the same for every visitor on
 * every host, otherwise a staging deploy tells a crawler the production page
 * lives on staging. The value is overridable for local verification.
 */
import { joinUrl } from '../lib/format';

const rawSiteUrl = import.meta.env.VITE_SITE_URL || 'https://safarup.in';

export const SITE_URL = rawSiteUrl.replace(/\/+$/, '');

export const SITE_NAME = 'SafarUp';

/** PRD §18 — the primary message. */
export const SITE_TAGLINE = 'Travel. Planned Better.';

export const DEFAULT_DESCRIPTION =
  'SafarUp plans curated group trips and private, fully-customised journeys across India — transparent booking, secure payment, and trip management from booking to departure.';

/**
 * Page-level Open Graph card, 1200×630, in `public/public/`. Every route that
 * does not pass its own `image` falls back to this, so it must be a file that
 * actually exists — an `og:image` that 404s is worse than none, because it is
 * a machine-readable assertion that the page has share art.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/**
 * Organization logo. There is no separate wordmark or favicon asset on the
 * site yet, so the 1200×630 share card doubles as the logo. It is a real,
 * crawlable image served from the site origin, which is what a logo
 * reference has to be.
 *
 * Replace this with a dedicated square mark the moment one is designed; the
 * dimensions below are asserted from the actual file and must be updated with
 * it.
 */
export const SITE_LOGO = DEFAULT_OG_IMAGE;
export const SITE_LOGO_WIDTH = 1200;
export const SITE_LOGO_HEIGHT = 630;

export const ORGANIZATION_DESCRIPTION =
  'SafarUp is a digital-first travel company running curated group departures and fully customised private trips across India.';

/**
 * Stable `@id`s for the two site-level entities.
 *
 * A `@id` is an assertion that ONE node with ONE shape exists at that
 * identifier. Two pages emitting the same `@id` with different properties is a
 * self-contradiction: a consumer that merges the graph has no principled way to
 * pick a winner, and the properties that only appear on one of them are simply
 * lost. So the Organization is *defined once* here and imported everywhere it
 * is referenced, rather than being re-spelled per page.
 */
export const ORGANIZATION_ID = joinUrl(SITE_URL, '/#organization');
export const WEBSITE_ID = joinUrl(SITE_URL, '/#website');

/**
 * The one Organization node.
 *
 * `sameAs` is intentionally absent. `sameAs` means "URLs of web pages that
 * identify this same organisation elsewhere" — social profiles, review
 * listings, directories. As of this writing SafarUp has no such profile
 * anywhere in the repository or in `docs/`, and the only external reference is
 * the GitHub *source* repository, which is where the code lives, not a public
 * face of the company. Emitting a guessed Instagram/LinkedIn handle would be
 * an invented URL pointing at somebody else's page. Add the property when a
 * profile genuinely exists.
 *
 * Omitting a property that is unknown is the honest answer; a wrong
 * `sameAs` is a permanent, machine-readable falsehood.
 */
export function organizationNode() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    slogan: SITE_TAGLINE,
    description: ORGANIZATION_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: SITE_LOGO,
      contentUrl: SITE_LOGO,
      width: SITE_LOGO_WIDTH,
      height: SITE_LOGO_HEIGHT,
    },
  };
}

/**
 * The one WebSite node. `publisher` links it to the Organization, so the two
 * are a connected graph rather than two unrelated blobs — this is what makes
 * an entity-based reading of the site (logo, name, canonical home) possible.
 */
export function websiteNode() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-IN',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * Vite exposes only `VITE_*` variables. A missing `VITE_SITE_URL` in local
 * development therefore means canonical/OG URLs point at production, which is
 * the correct production behaviour but confusing to see locally — so the
 * mismatch is surfaced once, loudly, rather than silently.
 */
if (import.meta.env.DEV && rawSiteUrl.includes('localhost') === false && !import.meta.env.VITE_SITE_URL) {
  // eslint-disable-next-line no-console
  console.info(
    `[safarup] VITE_SITE_URL is not set; canonical and Open Graph URLs resolve against ${SITE_URL}.`
  );
}
