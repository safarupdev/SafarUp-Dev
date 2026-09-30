# Public SEO Decisions — Open Questions

Status: **documented, not resolved.** This file records decisions that are
*deliberately not yet made*, so the current code can be read as provisional
rather than accidental. It records no implementation.

Scope: page-level discoverability decisions for the public site. It does **not**
repeat `PUBLIC_CRAWLER_FOUNDATION.md` (robots.txt, sitemap generation, and the
client-side-rendering limitation) — read that document for those.

---

## 1. `/explore` vs `/destinations` — two discovery surfaces, one intent

### What is true today

Both routes exist, both are live, and **both are intentionally indexable**:

| Route | Component | Indexable | In `sitemap.xml` |
|---|---|---|---|
| `/explore` | `public/src/pages/ExplorePage.jsx` | yes | yes, `priority 0.9`, `changefreq weekly` |
| `/destinations` | `public/src/pages/DestinationsPage.jsx` | yes | yes, `priority 0.9`, `changefreq daily` |

Neither emits `noindex`, neither canonicalises to the other, and neither is
disallowed in `robots.txt`. Filtered views of `/destinations`
(`?district=`, `?category=`) *are* `noindex,follow` and canonicalise to the
clean list — that part is settled. The overlap between the two *unfiltered*
pages is not.

### Why both are kept for now

They are not the same product surface, and the guest presentation needs both:

- **`/destinations`** is the canonical catalogue. It is backed by
  `GET /api/destinations`, cursor-pagininated, filter state lives in the query
  string so a filtered view is shareable and crawlable, and it degrades
  honestly when the catalogue is empty.
- **`/explore`** is the client-side discovery surface: the full published set
  loaded in one request, filtered in the browser, with the search box clearly
  labelled as filtering the loaded set (the backend's `q` answers
  `400 SEARCH_NOT_AVAILABLE`).

Neither supersedes the other yet. `/explore` cannot replace `/destinations`
because it has no server-side pagination; `/destinations` cannot replace
`/explore` because it has no client-side search over the whole set. Merging
them is an architecture decision with product consequences — see §3.

### Which one is INTENDED to become canonical

`/destinations` is the intended permanent discovery surface.

The reasoning, stated so it can be argued with:

1. It is the surface backed by the contracted API
   (`API.destination.contract.md` §2), so its content can be pre-rendered or
   server-rendered later without a client-side data layer. `/explore` depends
   on loading the entire catalogue into the browser, which caps at the API's
   documented hard maximum of 100 items (§2.1).
2. Filter state is in the URL, which is shareable, bookmarkable and crawlable.
   `/explore`'s filters are React component state and exist nowhere but in the
   tab.
3. Deep links work. `/destinations/rajgir` is a real page with its own entity
   markup; there is no equivalent on `/explore`.

`/explore` is **not** intended to be deleted in this state. It is the surface
that currently demonstrates search, which is the thing `/destinations` cannot
yet do.

### The interim risk, stated plainly

**Two indexable pages compete for one intent.**

Both pages target the same query space — "Bihar destinations", "heritage trips
in Bihar", "places to visit in Nalanda". Their titles, descriptions and H1s
overlap. The likely outcomes, in rough order of probability:

- **Split ranking.** Google indexes both and alternates them, so neither reaches
  the position either would hold alone. Link equity and impressions are
  divided between two URLs for one piece of demand.
- **The wrong page wins.** `/explore` is the more visually "discovery"-shaped
  surface, so it is a credible candidate to outrank `/destinations` for
  head terms even though it is the weaker page underneath (no pagination, no
  crawlable filter URLs, capped at 100 records).
- **Cannibalisation of the deep links.** `/explore` links to
  `/destinations/:slug`. If the listing ranks for the destination name, the
  detail page's own ranking for that name is suppressed.

Both pages also share internal links from the header, footer and bottom nav,
which spreads authority across both instead of concentrating it.

### What is explicitly NOT decided

**The final redirect, `noindex` or merge is a product decision, and it has not
been made.** Concretely, none of the following is decided or implemented:

- whether `/explore` is retired, merged into `/destinations`, or kept as a
  labelled client-side view;
- whether `/explore` becomes `noindex` and is reachable from the catalogue
  rather than from the nav;
- whether search is added to `/destinations` (which would make `/explore`
  redundant) or dropped as a standalone surface;
- what happens to `/explore`'s query-string filters if they are ever made
  shareable;
- whether the sitemap keeps listing both.

### What was done in the interim, and why it is safe

Only the *per-page* correctness work, none of which forecloses the decision:

- `ExplorePage` now canonicalises to `PATHS.explore` instead of a hardcoded
  `'/explore'` literal, so the canonical tracks the route table.
- `ExplorePage`'s meta description no longer claims the site covers "across
  Bihar" while `DEFAULT_DESCRIPTION` says "across India" — the two pages
  contradicted each other about the catalogue's scope.
- Neither page canonicalises to the other. A canonical is a declaration that
  this URL is *the* address for a resource; asserting it while the choice is
  open would pre-empt the product decision in a place a human is unlikely to
  notice.

### How to settle it

The decision needs three inputs, none of which are engineering questions:

1. **Which surface the guest presentation leads with**, and whether the pitch
   leads with "browse a catalogue" or "search for where to go".
2. **Whether search is a committed feature.** If yes, it belongs on
   `/destinations` and `/explore` has no long-term reason to exist.
3. **How much catalogue there will be.** Under ~100 published destinations the
   100-item cap is invisible. Over it, `/explore` cannot show everything and
   the pagination difference stops being theoretical.

When it is settled, the change is small and localised: a redirect from one
route to the other, plus a sitemap entry. It was deliberately not pre-built
here.

---

## 2. Trips ↔ destinations linking (recorded, decided, narrow scope)

`public/src/data/showcase.js` gives each showcase trip a `destinationSlug`.
This is a real relationship, not a convenience: each value was read from
`GET /api/destinations` and is a slug the API actually serves. A trip whose
district has no published destination has `destinationSlug: null` and renders
no link.

The link is one-directional by construction — a trip may point at a
destination, never the reverse, and only via `showcaseTripsForDestination()`,
which is a slug equality test. A district match or a keyword match was
rejected because each would assert a trip↔destination relationship the data
does not state.

Trips remain `noindex,follow` while `IS_SHOWCASE` is true (see
`PUBLIC_CRAWLER_FOUNDATION.md` §5). Linking an indexed page to a non-indexed
page is deliberate: `noindex` is a *indexing* instruction, not a
`nofollow`, and the equity still flows. When the TripTemplate API lands, this
relationship is re-pointed at real templates; the shape does not change.

---

## 3. Organisation `sameAs` — omitted on purpose

The single shared Organization node (`constants/site.js`, `organizationNode()`)
carries `name`, `url`, `slogan`, `description` and `logo`. It does **not**
carry `sameAs`.

`sameAs` means "URLs that identify this same organisation elsewhere" — social
profiles, review listings, business directories. As of writing, SafarUp has no
such profile anywhere in the repository or in `docs/`, and no marketing surface
exists to host one. The only external reference is the GitHub *source*
repository, which is where the code lives rather than a public face of the
company, and publishing it as an identity claim is not what it is.

A guessed Instagram or LinkedIn handle is not a small error: it is a permanent
machine-readable pointer at somebody else's page, and a consumer that follows
it will attribute their content to SafarUp. **The property is added when a
profile genuinely exists, and not before.**

---

## 4. One Organization node, defined once

Two pages used to emit an Organization with the same `@id`
(`https://safarup.in/#organization`) and different property sets, while a third
page referenced that `@id` from a `TouristTrip`'s `provider`. That is a
self-contradiction: an `@id` asserts that one node with one shape exists at
that identifier, and a consumer merging the graph has no principled way to
choose a winner.

The node now lives in `public/src/constants/site.js` as `organizationNode()`
and is imported by every page that defines or references it, so the properties
cannot drift. `websiteNode()` pairs with it and links to it through
`publisher: { '@id': ORGANIZATION_ID }`.

The `logo` currently points at `public/public/og-default.png` — the only
brand image asset the site has. It is a real, crawlable image served from the
site origin, which is what a logo reference must be. Replace it with a
dedicated square mark when one is designed, and update
`SITE_LOGO_WIDTH`/`SITE_LOGO_HEIGHT` in the same change.

---

## 5. Things deliberately *not* done

Recorded so a later reader does not "fix" them:

- **No `/explore` → `/destinations` redirect.** See §1. Product decision.
- **No `noindex` on `/explore`.** Same reason.
- **No `rel="canonical"` between the two discovery pages.** A canonical is the
  decision itself; emitting one settles the question by accident.
- **No trip↔destination links invented to fill the "Upcoming SafarUp trips"
  section** on `DestinationDetailPage`. Where no trip names the destination,
  the empty state stays.
- **No `sameAs`.** See §3.
- **No pre-rendering or SSR.** That is the actual launch blocker and it is
  tracked in `PUBLIC_CRAWLER_FOUNDATION.md` §4, not here.
