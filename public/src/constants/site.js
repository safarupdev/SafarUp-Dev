/**
 * Site-level constants.
 *
 * `SITE_URL` is the *canonical* origin. It is deliberately NOT derived from
 * `window.location`: a canonical URL must be the same for every visitor on
 * every host, otherwise a staging deploy tells a crawler the production page
 * lives on staging. The value is overridable for local verification.
 */
const rawSiteUrl = import.meta.env.VITE_SITE_URL || 'https://safarup.in';

export const SITE_URL = rawSiteUrl.replace(/\/+$/, '');

export const SITE_NAME = 'SafarUp';

/** PRD §18 — the primary message. */
export const SITE_TAGLINE = 'Travel. Planned Better.';

export const DEFAULT_DESCRIPTION =
  'SafarUp plans curated group trips and private, fully-customised journeys across India — transparent booking, secure payment, and trip management from booking to departure.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

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
