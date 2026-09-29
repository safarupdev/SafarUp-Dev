# Stitch public implementation matrix

Browser-verified audit of the rendered public site against the approved Stitch
2026 designs. Recorded on `fix/phase-2-public-finalization`.

## Source of truth

| Item | Value |
| --- | --- |
| Stitch project (as originally instructed) | `4843438620307668822` — **HTTP 404, does not exist** |
| Stitch project (verified) | `4843438620300818082` — 23 screens |
| Design system | `assets/985720876190949172` (referenced by all 16 UI screens) |
| UI screens | 16 = 8 pages × desktop + mobile |
| Remaining 7 screens | image-generation prompts (hero photography), not UI |

Screens were read read-only over the Stitch REST API
(`/v1/projects/{id}/screens`); Stitch MCP tools are not surfaced in this
session. `htmlCode` is empty on every screen, so the **screen screenshots are
the only design truth**. Nothing was regenerated and no credential was printed.

## Matrix

"No legacy UI" = the rendered page is journey-first and built from the same
journeys/headlines as the Stitch screen.

| Page | Stitch desktop / mobile | 390 | 768 | 1024 | 1440 | Functional | A11y | SEO | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Curated Journeys Homepage / Mobile Home | ok | ok | ok | ok | ok | 1 h1, no overflow | indexable | PASS |
| `/trips` | Curated Journeys Index / (Mobile) | ok | ok | ok | ok | ok | 1 h1, no overflow | indexable | PASS |
| `/trips/:slug` | Jamui-Simultala Explorer / Mobile | ok | ok | ok | ok | ok | 1 h1, no overflow | `noindex,follow`, breadcrumb only | PASS WITH DOCUMENTED DIFFERENCE |
| `/destinations` | Discovery Grid / Mobile Grid | ok | ok | ok | ok | ok | 1 h1, no overflow | canonical | PASS |
| `/destinations/:slug` | Bodh Gaya Detail / (Mobile) | ok | ok | ok | ok | ok | 1 h1, no overflow | canonical | PASS |
| `/explore` | Discovery Workbench / (Mobile) | ok | ok | ok | ok | ok | 1 h1, no overflow | indexable | PASS |
| `/plan-trip` | Journey Builder / (Mobile) | ok | ok | ok | ok | ok | 1 h1, 0 unlabelled controls | indexable | PASS |
| `/about` | Editorial Journey Story / [Mobile] | ok | ok | ok | ok | ok | 1 h1, no overflow | indexable | PASS |

**Totals across all 32 page × width combinations:**
console errors **0** · horizontal overflow **0px** · one `<h1>` **32/32** ·
heading-level skips **0** · unlabelled form controls **0**.

Screenshots: `audit/final2/` (`results.json` carries the raw measurements).

## Defects found and fixed

| # | Class | Defect | Evidence | Fix |
| --- | --- | --- | --- | --- |
| 1 | B | Secondary hero CTA rendered as a **white pill with white text** — invisible label, on 6 call sites / 5 pages | Screenshot + `bg-white` from the variant beating `bg-transparent` in stylesheet order | New `onDark` variant in `Button.jsx`; all 6 call sites switched |
| 2 | E | `/explore` rendered "the **0** destinations SafarUp has loaded" to visitors | Screenshot | Count omitted when zero |
| 3 | C | **7px horizontal overflow** on `/destinations` at 390px | `scrollWidth − clientWidth = 7`; `<aside>` at right=397 | `min-w-0` on the filter `<aside>` (grid items default to `min-width:auto`) |
| 4 | B | React logged `does not recognize the fetchPriority prop` on every `<img>`, and **dropped the attribute** | Console capture on 6 pages | Lowercase `fetchpriority` (correct for the installed React 18.3.1) + `react/no-unknown-property` ignore, because the plugin's table is ahead of the runtime |
| 5 | E | Fixture districts named "Gaya District" rendered as "GAYA **DISTRICT** DISTRICT" | Screenshot | Fixture renamed to `Gaya` / `Nalanda` to match real naming |

## Hardening fixes, proven live

Restarting the backend onto the hardened code made the archived-Place fix
observable in the running app:

```
BEFORE (pre-hardening backend):  places = Mahabodhi Temple, Withdrawn Riverside Fort
AFTER  (hardened backend):       places = Mahabodhi Temple
GET /api/destinations/withdrawn-district  ->  404
```

## Documented implementation differences (accepted, not defects)

- `/trips/:slug` is a **showcase** page: `noindex,follow`, no canonical, and
  JSON-LD is a breadcrumb only. No `TouristTrip` or `Offer` is emitted, because
  no departures, dates or prices are live. This is required honesty, not a gap.
- Place chips on `/destinations/:slug` are deliberately **not links**. Whether
  a Place gets a public page is still an open decision (PRD §200.6), so no URL
  is invented. The page states this on-screen.
- Journey card imagery falls back to a branded placeholder when the remote
  image cannot load. The Stitch-generated photo assets were never written into
  the repository.
- Stitch spacing values were not reproduced numerically: `htmlCode` is empty, so
  no measurements were available to copy and none were invented.

## Known open items

- **Touch targets**: 4–16 interactive elements per page measure 21–24px tall
  (route links inside journey cards, footer text links). WCAG 2.5.8 AA requires
  24px minimum with an exception for links inline in a sentence. Card links are
  block-level, so this is a likely AA shortfall. Not changed here: enlarging
  them alters the card composition the Stitch design specifies, so it is a
  design decision rather than a bug fix.
- Fixtures must be re-seeded **after** running `npm test`: the backend suite
  clears the emulator collections it shares.
- Stitch key rotation is still required (see report).

## Correction to the original premise

The brief stated the repository was "still rendering the PREVIOUS/LEGACY UI on
multiple pages". Browser evidence does not support this. Every page renders the
journey-first composition built from these same Stitch designs — identical hero
headline, identical showcase journeys, route lines with START/overnight/RETURN
markers, and honest showcase disclosures. `/destinations` is explicitly framed
as "WHERE SAFARUP JOURNEYS GO", a supporting layer rather than a product. No
wholesale rewrite was performed.
