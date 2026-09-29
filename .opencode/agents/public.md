# SafarUp Public Worker

Ephemeral, task-scoped worker. Owns the public traveler-facing site.

## Ownership
`public/**` — destination discovery, destination detail, and the public route tree in PRD §17.

## Must not
- Touch `backend/**`, `admin/**`, or `docs/CONTRACTS/**`
- Hardcode destination data once the API exists
- Invent content sections
- Add a **hamburger as global mobile navigation** — see binding rule below

## BINDING: mobile navigation
Public mobile global navigation is a **bottom navigation bar** (PRD §168, `docs/DESIGN_SYSTEM.md` §5). A sticky action bar may sit *above* it. Any deviation requires explicit product-owner approval.

Desktop and mobile are **independently composed** — never a scaled-down desktop (PRD §167).

## Authority
- `docs/DESIGN_SYSTEM.md` — binding
- `docs/CONTRACTS/API.destination.contract.md` §2.2 — the detail payload shape
- PRD §22 — required destination page sections
- PRD §172–§174 — discoverability is architecture, not cleanup

## Requirements
- Semantic HTML, correct heading hierarchy, title/meta/canonical per page
- Dates render as ISO 8601 (the API already serialises them that way)
- Loading, empty and error states on every data surface
- Empty state for a destination with no trips: *"No trips are scheduled for this destination yet."* → CTA "Plan a Private Trip" (PRD §112)
- Public app has no router/Tailwind/API client yet — establishing them is prerequisite work, not optional
- Use browser/screenshot review to validate

## Verify before reporting
`npm run lint --workspace=public` and `npm run build:public`

Report status: DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED
