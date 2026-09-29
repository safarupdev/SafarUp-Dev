# SafarUp — Design System

| | |
|---|---|
| **Status** | `v1.0 — APPROVED` (Design Master authority; four-Master review 2026-09-29) |
| **Owner** | Design Master (permanent) |
| **Scope** | Engineering-facing design authority for `public/` and `admin/` |
| **PRD references** | §32, §33, §34, §71, §82, §83, §84, §87, §115, §167–§171, §178.1, §195 |

> **This document is the visual source of truth.** Per PRD §178.1, SafarUp does **not** use Figma as the binding design workflow. Figma is not required, is not a gate, and is never dispatched. Implementation follows this document plus the code.
>
> The Design Master may inspect the running application and use screenshots or other local visual validation, but **every final design decision is captured here and in code** — never only in a session or a comment.

---

## 1. Design principles (§34)

Premium · Travel-oriented · Trustworthy · Spacious · Fast · Clear · Conversion-focused · Accessible · Consistent · Distinctive SafarUp identity

**Premium must never come at the expense of performance** (§167). A slow, heavy page is not premium.

---

## 2. Brand

### 2.1 Colour

Tokens are defined in the Tailwind theme so that code and this document cannot drift.

| Token | Role | Notes |
|---|---|---|
| `brand-50 … brand-700` | Primary action, links, active states | Blue family — the existing admin scale |
| SafarUp navy | Brand anchor, headings, high-contrast surfaces | Trust, premium |
| SafarUp orange | Accent, CTAs, energy | Warmth, travel, India-forward |
| Neutral / slate | Body text, borders, surfaces | Existing admin slate scale is the base |

The **admin** app is deliberately denser and quieter than the public app (§116): data-oriented, keyboard-friendly, desktop-first. It must not adopt the public app's marketing visuals.

> Concrete hex values belong in `admin/tailwind.config.js` and the public equivalent. If a token here disagrees with code, **code is wrong** and the Design Master updates this document — or the code, deliberately.

### 2.2 Logo and iconography

Logo usage rules are set by the Design Master. Iconography is consistent line-weight; no mixed icon families in one surface.

---

## 3. Typography

| Role | Treatment |
|---|---|
| Display | Largest, tightest leading, used once per page |
| Heading 1–4 | Strictly decreasing; no skipped levels |
| Body | Comfortable measure, generous line-height for long-form travel content |
| Label / meta | Small, uppercase tracking where used for filters and eyebrows |

Semantic heading hierarchy is a **Discovery requirement** (§172), not only a visual one. Heading levels must reflect document structure.

---

## 4. Layout and spacing

| Breakpoint | Behaviour |
|---|---|
| Desktop | Multi-column, side filters, sticky panels, expanded navigation, richer composition |
| Tablet | Adapted, not merely squeezed |
| Mobile | **Independently composed** — bottom navigation, touch-first controls, different information hierarchy |

- Spacing follows a consistent scale.
- Content uses a container system with a readable maximum measure for long-form text.
- Mobile is **not** a compressed desktop layout (§167, §169).

---

## 5. Mobile navigation (binding, §168)

**Primary global navigation on public mobile is a bottom navigation bar.**

- A **hamburger menu is not the default primary global navigation** and must not be introduced without explicit product-owner approval.
- The bottom navigation defines: active state, inactive state, icons, labels, safe-area handling, touch-target sizing, scroll behaviour, accessibility, transitions, and contextual actions.
- A sticky booking/action bar may sit **above** the global bottom navigation so the two do not collide (§195.2).
- Items (§115): Home, Trips, Explore, Bookings, Account. Explore may contain Destinations, Blog, Search, Categories.

---

## 6. Components

| Group | Components |
|---|---|
| Navigation | Header, desktop nav, **bottom navigation**, breadcrumbs, skip link |
| Actions | Button (primary / secondary / ghost / danger), link button, icon button |
| Content | Card, **destination card**, **trip card**, itinerary timeline, place list, highlights list, gallery, media |
| Discovery | Search, filters, filter chips, sort control, pagination |
| Forms | Input, select, textarea, date picker, checkbox, radio, validation message |
| Overlays | Dialog, drawer, **bottom sheet**, toast |
| Commerce | Price block, availability indicator, booking panel, summary |
| States | Skeleton/loading, **empty**, **error**, confirmation, success |

State components are mandatory, not optional (§72, §112). Every data-backed surface has all three.

---

## 7. Interaction states

Every interactive component defines: **hover · active · focus · disabled · loading · success · error · empty**.

Focus must be visible and keyboard-reachable (§83). Colour is never the only carrier of state.

---

## 8. Motion (§170, §12 of the multi-agent plan)

Motion communicates hierarchy, state, feedback, navigation, progress, discovery. It does not exist for decoration.

| Scale | Use |
|---|---|
| Micro | Hover, press, small state change |
| Small | Sheet/dialog entrance, chip removal |
| Medium | Section transition, card expand |
| Large | Page/route transition |

- **`prefers-reduced-motion` is respected** and must be implemented, not merely intended.
- Motion is never added at the cost of performance or content discoverability.
- An animated page that hides content from a crawler or a reduced-motion user is a defect.

---

## 9. Accessibility (§83)

- Semantic HTML first; ARIA only where semantics cannot express intent.
- Keyboard operability for all interactive elements; visible focus.
- Contrast meeting WCAG AA.
- Touch targets sized for the mobile context.
- Alt text on meaningful imagery; decorative imagery marked as such.
- Accessibility is a **quality gate**, not a final pass.

---

## 10. Performance budget

Premium perception depends on speed. The Design Master's decisions are subject to:

- No layout shift on load (reserve space for images and async sections).
- Images sized and served appropriately; hero imagery is the largest cost on a Destination or Trip page.
- Motion that does not block interaction or delay first paint.
- Skeletons over spinners for content that is known to arrive.

---

## 11. Workflow

```
Design Master
  ↓
docs/DESIGN_SYSTEM.md   ← this document
  ↓
Public / Admin Agent implementation
  ↓
Browser / screenshot visual review
  ↓
Design Master feedback
  ↓
Refinement + update to this document
  ↓
Engineering validation
```

**One visual language persists** across Home, Explore, Destination, Trip, Booking, Profile and future public pages. The Public Agent does not invent a new language per page (§24 of the multi-agent development plan).

This document is **evolving**. Reusable patterns discovered during implementation are added here, so the next page inherits them.

---

## 12. Open items

| Item | Status |
|---|---|
| Exact hex/ramp values for navy and orange | To be fixed at first implementation and recorded here |
| **Public app has no Tailwind, router, or design tokens** | **Phase 2 prerequisite.** The public app is currently a 10-line scaffold with only `react` and `react-dom`. Tailwind, a router, and an API client must be established — and this document's tokens applied — before any public UI is built |
| Component inventory vs. the real implementation | Refined as pages are built |

### 12.1 Public app prerequisite (Phase 2 gate)

The public application cannot consume this design system until it has one. Before any public page is implemented, the following must exist and follow §171:

1. **Tailwind configured** for `public/`, carrying the same brand tokens as `admin/`. The two apps must share one visual language, not two themes.
2. **A router.** §17 defines the public route tree (`/destinations`, `/destinations/:slug`, …).
3. **An API client** consuming the contracts in `docs/CONTRACTS/API.destination.contract.md`.
4. **Bottom navigation** as the mobile global navigation (§5 of this document, PRD §168).

An admin-surface visual system may be established in parallel with the backend; the public surface is blocked until these four exist.
