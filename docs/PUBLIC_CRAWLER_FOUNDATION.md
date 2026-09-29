# Public Crawler Foundation

Status: **implemented (infrastructure only)** · One known limitation is **NOT resolved** — see [§4](#4-known-limitation-not-resolved-csr).

Adds the crawler-facing scaffolding the public site needs in order to be found
and correctly indexed. No feature, page or component is changed by this work.

---

## 1. What was added

| File | Change | Purpose |
|---|---|---|
| `public/public/robots.txt` | new | Crawl policy for the production origin. |
| `public/scripts/generate-sitemap.mjs` | new | Builds `sitemap.xml` from static routes + real published destinations. |
| `public/public/sitemap.xml` | new (generated) | Committed output of the generator. |
| `firebase.json` | modified | Added a `hosting` block with SPA rewrites. No `hosting` block existed. |
| `docs/PUBLIC_CRAWLER_FOUNDATION.md` | new | This document. |

`public/public/` is Vite's `publicDir` — it is copied verbatim into
`public/dist/` at build time, so `robots.txt` and `sitemap.xml` are served as
static files from the domain root. Neither requires a build step to appear.

### robots.txt

- `Allow: /` — normal crawling of public pages is unrestricted.
- `Disallow` on the four reserved/noindex route families: `/blog`, `/login`,
  `/dashboard/`, `/places/`. These render explicit "not available yet" states
  and emit `noindex,follow`; disallowing them stops crawlers spending crawl
  budget on pages that must never be indexed.
- `Sitemap: https://safarup.in/sitemap.xml` — the referenced file **exists** and
  is committed. The origin matches `SITE_URL`.
- A comment block documents the CSR limitation inline, so whoever opens
  `robots.txt` next learns about it without having to find this document.

> The robots.txt origin is a literal, not a generated value. If `SITE_URL`
> changes in `public/src/constants/site.js`, `robots.txt` must be updated by
> hand in the same change. This is the one place the origin is duplicated, and
> it is duplicated deliberately: `robots.txt` must exist as a static file on a
> host that runs no build step.

### Sitemap generation

`public/scripts/generate-sitemap.mjs` emits:

- the static indexable routes — `/`, `/explore`, `/destinations`, `/plan-trip`,
  `/about`
- one `<url>` per **real published destination**, sourced from
  `GET /destinations`

Invariants the script enforces rather than assumes:

- **The origin is never duplicated in the script.** It is parsed out of
  `public/src/constants/site.js` (the same constant the app uses for canonical
  and Open Graph URLs). `SITE_URL` / `VITE_SITE_URL` override it. A literal
  domain inside the script would be a second source of truth that silently
  drifts.
- **Only published data.** The list endpoint returns `PUBLISHED` content only
  (`API.destination.contract.md` §2.2 — `DRAFT`/`ARCHIVED` are never serialised
  publicly). The script pages through it with the opaque `nextCursor` (§2.1a)
  and additionally rejects any item whose `status` is not `PUBLISHED` or whose
  `slug` is not a valid slug. Drafts are never requested and never emitted.
- **No URL is invented for something without a public page.** `/places/*` is
  not emitted (whether a Place has a public page is undecided — PRD
  §200.6/§200.9). `/trips/*` is not emitted (see §5). This is asserted over the
  rendered XML before the file is written, not just intended by comment.
- **Fails loudly, but non-fatally.** If the API is unreachable the script logs
  a clear warning and still writes a sitemap containing the static routes
  only. It never fabricates slugs to fill the gap. A non-zero exit is reserved
  for the two cases where there is no valid output at all: the origin could not
  be resolved, or the file could not be written.

### Hosting

`firebase.json` had no `hosting` block. One was added:

```json
"hosting": {
  "public": "public/dist",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "cleanUrls": true,
  "rewrites": [{ "source": "**", "destination": "/index.html" }]
}
```

Without the rewrite, every client route — `/destinations/rajgir`,
`/trips/...`, `/explore` — returns a host 404 on a cold deep link. The rewrite
is only reached when no static file matches, so `robots.txt` and
`sitemap.xml` are still served as files. `cleanUrls` prevents `/index.html` and
`/` from both being served as duplicate copies of the home page.

> This rewrite serves the SPA shell. It does **not** make the routes
> pre-rendered — see §4.

---

## 2. Commands

Run from the repository root:

```bash
# Regenerate the sitemap (backend must be running for destination URLs)
node public/scripts/generate-sitemap.mjs

# Equivalent, from the public app directory
cd public && node scripts/generate-sitemap.mjs
```

Point it at a non-default backend or origin:

```bash
# Windows PowerShell
$env:SITE_API_BASE_URL = "https://api.safarup.in/api"
$env:SITE_URL         = "https://safarup.in"
node public/scripts/generate-sitemap.mjs

# bash
SITE_API_BASE_URL=https://api.safarup.in/api SITE_URL=https://safarup.in \
  node public/scripts/generate-sitemap.mjs
```

Defaults, if neither is set: API base `http://localhost:4000/api` and origin
`https://safarup.in` — both parsed from application source, not hardcoded
here.

> **No npm script was added.** `public/package.json` is owned by another agent
> in this phase. The command above is the whole contract; when that file is
> free again the equivalent is `"sitemap": "node scripts/generate-sitemap.mjs"`.

**When to regenerate:** whenever a destination is published, unpublished or
archived. The sitemap is committed to the repository, so it is a reviewable
artefact and a change to the set of public destinations shows up in a diff.

---

## 3. What is indexable today

| Route | In sitemap | Reason |
|---|---|---|
| `/` | yes | Home |
| `/explore` | yes | Built discovery surface |
| `/destinations` | yes | List |
| `/destinations/:slug` | yes, one per **published** destination | Real pages backed by the API |
| `/plan-trip` | yes | Private-trip enquiry |
| `/about` | yes | Product story |
| `/trips`, `/trips/:slug` | **no** | `noindex,follow` — showcase data (§5) |
| `/blog`, `/login`, `/dashboard/bookings/*`, `/places/:slug` | **no** | Reserved, `noindex,follow`, disallowed in robots.txt |
| `*` | no | Genuine 404, emits no canonical |

---

## 4. Known limitation — NOT resolved (CSR)

**This is not fixed by anything in this document.** It is a launch blocker.

The public app is a pure client-side-rendered Vite SPA. Every route is built by
JavaScript in the browser. A crawler that does not execute JavaScript receives
the app shell and nothing else:

- no per-route `<title>` — every URL is served the generic site title
- no per-route meta description
- no per-route `<link rel="canonical">`
- no JSON-LD structured data, which `public/src/lib/seo.js` writes at runtime

Googlebot and most major crawlers do render JavaScript, so the runtime head
written by `useSeo()` is not worthless. But it is a *dependency on the
crawler's behaviour*, not a guarantee, and it is explicitly not sufficient for
every crawler or every social/chat unfurl consumer. A sitemap that lists
`/destinations/rajgir` sends a crawler to a URL whose content is empty HTML
until the client boots.

**Planned fix:** pre-render the indexable routes (SSG) or serve them via SSR, so
each URL is real HTML in the initial response. Options, in rough order of cost:

1. Pre-render at build time from the same API this sitemap reads (matches the
   data the sitemap advertises — one source, one refresh point).
2. SSR the route table through the existing server.

**Not done here, and not claimed:** robots.txt, `sitemap.xml` and the hosting
rewrite are *discovery* infrastructure. They tell a crawler that a URL exists
and is worth fetching. None of them make the URL's content present. Until
pre-rendering or SSR ships, the content half of the problem is open.

---

## 5. Why `/trips` is `noindex`

`/trips` and `/trips/:slug` are excluded from the sitemap and emit
`noindex,follow` while they render **showcase/demo data**
(`public/src/data/showcase.js`, `IS_SHOWCASE = true`) — not live inventory.

The distinction is not cosmetic. The trip pages are fully built, look
concrete, and carry structured travel-product data. A crawler that indexes
them will index itineraries, prices and departures that do not correspond to
anything bookable. That is worse for the product than being absent: it is a
page that ranks, gets clicked, and then cannot be booked. `noindex,follow`
keeps the links crawlable so the equity flows onward, without claiming the page
as a search result.

**Flipping this requires the real `TripTemplate` API.** It is not a flag. The
showcase data is not a seed of what the API will return — it is placeholder
copy with invented itineraries. Flipping `IS_SHOWCASE` to `false` while the
data is still showcase would make the site assert, in structured data, that
these trips exist and can be booked. The correct sequence is:

1. `TripTemplate` entity + public read API contracted and implemented.
2. Trip pages read from that API.
3. Real published trips confirmed for the destination(s) being pointed at.
4. `IS_SHOWCASE` set to `false`, `noindex` dropped, and the generator extended
   to emit `/trips/:slug` for published templates.

Step 4 is the point at which this decision is revisited. Until then it stands.

---

## 6. Constraints observed

- No new npm dependencies — Node built-ins (`node:fs/promises`, `node:path`,
  `node:url`) and the Node 18+ global `fetch` only.
- No SQL or ORM introduced. The backend is Firestore via the Firebase Admin
  SDK; this work touches no data access at all — it only reads the public HTTP
  API, exactly as a crawler would.
- No approved contract in `docs/CONTRACTS/` was modified.
- Nothing under `public/src/`, `backend/src/`, `admin/`, `tailwind.config.js`
  or any page/component file was modified. `public/public/`,
  `public/scripts/`, `firebase.json` and this document only.
