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

### 6.1 Card — the single card recipe

`public/src/components/common/Card.jsx`. The same "raised white box holding one topic" object was previously re-implemented three ways across pages with three different radii and paddings. **Use `Card`; do not hand-roll a card.**

| Prop | Values | Recipe | Use for |
|---|---|---|---|
| `variant` | `surface` (default) | `bg-white ring-1 ring-navy-100 shadow-card` | Real content: destination/trip cards, detail panels, summary blocks |
| | `outline` | `bg-white border border-navy-100`, no shadow | A card inside another card, or beside a `surface` card where two shadows would compete |
| | `inset` | `border border-dashed border-navy-200 bg-navy-50/40` | **Placeholder regions only** — upcoming trips, empty lists, "coming soon" |
| `pad` | `none` \| `sm` \| `md` (default) \| `lg` | `p-4` / `p-5` / `p-6 sm:p-8` | Normalised padding; never hand-written per card |
| `hover` | boolean | adds `hover:shadow-card-hover focus-within:shadow-card-hover` | Interactive cards only |
| `as` / `to` | `'link'` + `to` | renders `<Link>` | Whole-card link — one tab stop, title remains the link text |

Radius is `rounded-card` (`borderRadius.card = 1rem`) for every variant. The component is a thin wrapper over existing Tailwind utilities: no CSS-in-JS, no runtime styling, no new CSS system — removing it would change no visual behaviour.

A dashed edge must never wrap real content; `inset` is the only dashed option in the system.

### 6.2 Floating nav clearance

Mobile global navigation is a **floating** (inset, glassmorphic) bar, not a full-width flush bar (§5). Because it floats above the viewport edge, content must clear **bar height + safe-area inset + the visible gap beneath the bar** — not just the bar height.

| Utility | Formula | Use |
|---|---|---|
| `.pb-safe-nav` | `bottom-nav` + `safe-area-inset-bottom` + `1.5rem` | Existing flat-bar pages — **still supported, do not remove** |
| `.pb-floating-nav` | `floating-nav` + `safe-area-inset-bottom` + `floating-nav-gap` | Pages under the floating bar |

Both are defined once in `src/index.css` (`@layer components`) and are derived from the `spacing` tokens the bar itself is built from, so the bar and its clearance cannot drift apart. Reserved unconditionally on mobile so the last card is never trapped under the bar and the sticky action bar has somewhere to sit (§195.2).

---

## 7. Interaction states

Every interactive component defines: **hover · active · focus · disabled · loading · success · error · empty**.

Focus must be visible and keyboard-reachable (§83). Colour is never the only carrier of state.

### 7.1 Focus ring — one rule, centrally defined

The focus indicator is defined **once**, in `public/src/index.css` in `@layer base`, as a 2px `outline` at 2px offset. `outline`, not `box-shadow`, so it survives forced-colours mode and never collides with a component's `shadow-*` / `ring-*`.

| Surface | Ring colour | Measured ratio | Requirement |
|---|---|---|---|
| Light (`#ffffff`) | `brand-600` `#1d4ed8` | **6.70:1** | 1.4.11 needs 3:1 — passes |
| Dark (`navy-950` `#0a1120`) | `#ffffff` (inverted) | **18.85:1** | 1.4.11 needs 3:1 — passes |

`brand-600` on `navy-950` is only **2.81:1** and failed 1.4.11, so the dark case is handled by an explicit inverted variant — same thickness, offset and shape, colour only:

- `focus-ring-invert` — on a single control inside a dark surface.
- `on-dark` — on a dark **container**; every focusable descendant inherits the light ring.

> **Do not use `focus:outline-none` (or `outline: none`) on any form control or interactive element to remove the ring.** Several pages did this to suppress the ring on inputs; that is a WCAG 1.4.11 failure, not a style choice. To change the indicator, change the single rule in `index.css`. The only permitted removal is `[tabindex="-1"]:focus`, which covers programmatic focus targets that are not interactive.

### 7.2 Touch targets — 44px floor

**Every interactive control is at least 44 × 44 CSS px** (WCAG 2.5.5 / DESIGN_SYSTEM §9). In Tailwind that is `min-h-11`.

| Control | Before | Now |
|---|---|---|
| `Button` `size="sm"` (the only header action on mobile) | `min-h-9` (36px) — **fail** | `min-h-11` (44px) |
| `Chip` (mobile filter chips — a primary touch control) | `min-h-9` (36px) — **fail** | `min-h-11` (44px) |
| `Button` `size="md"` | `min-h-11` | unchanged |
| `Button` `size="lg"` | `min-h-12` | unchanged |

A dense chip row may be visually tight, but the target is the target — reduce gap and horizontal padding, never the height.

### 7.3 Primary CTA contrast

`text-white` on **`accent-700` `#c2410c` = 5.18:1** — passes AA for body text (4.5:1). Hover steps one deeper to `accent-800` `#9a3412` = 7.31:1, active to `accent-900`.

The previous `accent-600` `#ea580c` was **3.56:1** and failed AA at every button size. No new ramp step was added; an existing step that already passed was selected. `brand-600` on white is 6.70:1 and was left alone.

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

## 13. Visual direction (2026 refinement)

The brand direction is unchanged — **deep navy + warm orange + clean whites**. This section refines how it is *composed*, so the app reads premium rather than merely competent. Refinement, not replacement: no new hue enters the ramp.

| Quality | Rule |
|---|---|
| **Cinematic** | One dominant image or one dominant focal point per screen. Imagery is full-bleed or generously cropped, never a small inset thumbnail in a box of padding. Gradient overlays (`navy-950` → transparent) rather than flat scrims. |
| **Editorial** | `display` serif for headings, system sans for UI and body. Asymmetric layouts; a wide gutter and a narrow measure beat an even two-column split. Generous line-height on long-form travel copy. |
| **Warm** | Orange appears at a **single focal point per screen** — the primary CTA, or the featured badge, never both fighting. It is the accent, not the surface. |
| **Spacious** | Outer padding ≥ `p-6` on mobile and `p-8`+ on desktop. Section rhythm in multiples of `p-12`. A crowded premium page is a defect. |
| **Restrained motion** | Motion confirms causality and shows hierarchy, nothing else (§8). 150–220ms, `ease-standard`. No parallax, no scroll-jacking, no decorative loops. `prefers-reduced-motion` is implemented and must not be weakened (§8). |
| **Intentional glass** | Glassmorphism — `backdrop-blur-glass`, translucency, `shadow-float` — is used **only** for navigation, floating action controls and overlays: surfaces that genuinely sit above other content. Glass on every card turns the page into soup and costs paint performance (§10). |

Tokens supporting the above: `rounded-card`, `shadow-card` / `card-hover` / `float` / `floating-nav`, `backdrop-blur-glass`, `spacing.floating-nav` / `floating-nav-gap`, `maxWidth.prose` / `shell`.

Motion, glass and shadow are *additive layers on top of* the primitives in §6 — never a substitute for them. When in doubt, use `Card`.

---

## 12. Open items

| Item | Status |
|---|---|
| Exact hex/ramp values for navy and orange | **Fixed** — recorded in `public/tailwind.config.js` (`navy-50…950`, `accent-50…900`) and carried identically by `admin/`. See §2.1 |
| Card primitive adoption across pages | `Card.jsx` exists and is authoritative (§6.1); page-by-page adoption in progress |
| `focus:outline-none` removal from form controls | Central rule fixed (§7.1); removal from individual pages in progress |
| **Public app has no Tailwind, router, or design tokens** | **Phase 2 prerequisite.** The public app is currently a 10-line scaffold with only `react` and `react-dom`. Tailwind, a router, and an API client must be established — and this document's tokens applied — before any public UI is built |
| Component inventory vs. the real implementation | Refined as pages are built |

### 12.1 Public app prerequisite (Phase 2 gate)

The public application cannot consume this design system until it has one. Before any public page is implemented, the following must exist and follow §171:

1. **Tailwind configured** for `public/`, carrying the same brand tokens as `admin/`. The two apps must share one visual language, not two themes.
2. **A router.** §17 defines the public route tree (`/destinations`, `/destinations/:slug`, …).
3. **An API client** consuming the contracts in `docs/CONTRACTS/API.destination.contract.md`.
4. **Bottom navigation** as the mobile global navigation (§5 of this document, PRD §168).

An admin-surface visual system may be established in parallel with the backend; the public surface is blocked until these four exist.
