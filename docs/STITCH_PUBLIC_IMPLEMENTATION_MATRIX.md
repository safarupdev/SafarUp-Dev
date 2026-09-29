# Stitch public implementation matrix

Audit of the rendered public site against the approved Stitch 2026 designs,
with browser evidence. Recorded during the Phase 3 stop on
`fix/phase-2-stitch-public-ui`.

## Source of truth actually used

| Item | Value |
| --- | --- |
| Stitch project (as instructed) | `4843438620307668822` — **HTTP 404, does not exist** |
| Stitch project (verified) | `4843438620300818082` — 23 screens |
| Design system | `assets/985720876190949172` (referenced by all 16 UI screens) |
| UI screens | 16 = 8 pages × desktop + mobile |
| Remaining 7 screens | image-generation prompts (hero photography), not UI |

Screens were read over the Stitch REST API (`/v1/projects/{id}/screens`).
`htmlCode` is empty on every screen, so the **screen screenshots are the design
source of truth**. Stitch was read read-only; nothing was regenerated.

## Matrix

"No legacy UI" = the rendered page is journey-first and built from the same
journeys/headlines as the Stitch screen, verified by screenshot.

| Page | Stitch screen (desktop / mobile) | Browser verified | Journey-first | Defect found | Status |
| --- | --- | --- | --- | --- | --- |
| `/` | Curated Journeys Homepage / Mobile Home | 1440 | Yes | Invisible secondary CTA (blank white pill) | **Fixed** |
| `/trips` | Curated Journeys Index / (Mobile) | 1440 | Yes | Invisible secondary CTA | **Fixed** |
| `/trips/:slug` | Jamui-Simultala Explorer / Mobile Trip Detail | 1440 | Yes | Invisible secondary CTA (blank white pill) | **Fixed** |
| `/destinations` | SafarUp Destinations Grid / Mobile | 1440 | Yes | — | PASS |
| `/destinations/:slug` | Bodh Gaya Destination Detail / (Mobile) | not reachable (0 destinations seeded) | n/a | — | **Unverified** |
| `/explore` | Explore Discovery Workbench / (Mobile) | 1440 | Yes | "the 0 destinations" copy leak; uses same invisible CTA pattern | **Fixed** |
| `/plan-trip` | Plan a Trip (Journey Builder) / (Mobile) | captured, not yet reviewed | Yes | — | Pending review |
| `/about` | About (Editorial Journey Story) / [Mobile] | captured, not yet reviewed | Yes | Invisible secondary CTA | **Fixed**, not re-reviewed |

## Discrepancies found and fixed

### 1. Invisible secondary CTA on dark surfaces (5 pages, 6 call sites)

`AboutPage`, `DestinationDetailPage`, `HomePage` (×2), `TripDetailPage`,
`TripsPage` all rendered a secondary hero CTA as
`variant="secondary"` + `className="bg-transparent text-white ring-white/30"`.

`secondary` already sets `bg-white text-navy-900`. Tailwind resolves two
competing `background-color` / `color` utilities by **stylesheet order, not
class-attribute order**, so `bg-white` won the background while `text-white`
won the text. Result: a solid white pill with white text — an invisible label
on the primary conversion path of the site.

Fixed by adding a real `onDark` variant to `Button.jsx` and switching all six
call sites to it, so the broken state is no longer reachable by overriding a
variant from a page.

### 2. `/explore` leaked a raw zero into user-facing copy

The search-scope note interpolated the count unconditionally, rendering
"the 0 destinations SafarUp has loaded". The count is now omitted when zero.

## Not verified / remaining

- `/destinations/:slug` could not be audited: the local backend has **0
  published destinations**, so the page cannot render. Needs seeded data.
- 390 / 768 / 1024 mobile widths not yet re-reviewed after the fix.
- `/plan-trip` and `/about` screenshots captured but not compared to Stitch.
- Journey card hero images render as grey placeholders in the local dev
  environment; the Stitch image assets were never wired into the repo.
- Stitch fidelity was assessed at composition/typography level from
  screenshots. Stitch `htmlCode` is empty, so exact spacing values could not
  be extracted and were not fabricated.

## Correction to the task premise

The task stated the repository was "still rendering the PREVIOUS/LEGACY UI on
multiple pages". Browser evidence does not support this. Every page audited
renders the journey-first composition built from these same Stitch designs —
identical hero headline ("One trip. Many places. The whole journey planned."),
identical showcase journeys (Jamui — Simultala Explorer, Bodh Gaya Mahabodhi
Circuit), route lines with START/overnight/RETURN markers, and honest
showcase disclosures. `/destinations` is explicitly framed as "WHERE SAFARUP
JOURNEYS GO" and a supporting layer, not a product.

The real defects were the two above, not a destination-first legacy UI. A
wholesale 8-page rewrite was therefore not performed; it would have
replaced validated journey-first work with no evidence of benefit.
