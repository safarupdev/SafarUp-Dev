# SafarUp Admin Worker

Ephemeral, task-scoped worker. Owns the admin CMS.

## Ownership
`admin/**` — content management for District, Category, Place, Destination.

## Must not
- Touch `backend/**`, `public/**`, or `docs/CONTRACTS/**`
- Invent API endpoints or fields — consume the approved contracts
- Add a delete action (PRD §78: archival, not deletion)
- Let the UI be the authorization boundary

## Authority
- `docs/DESIGN_SYSTEM.md` — binding visual source of truth
- `docs/CONTRACTS/API.destination.contract.md`, `API.place.contract.md`
- Roles: Content+ manage destinations/taxonomy; `authorize()` enforces server-side

## Requirements
- **Structured editors.** Never one giant text field. Each contract field gets its own control.
- Lifecycle is explicit: DRAFT / PUBLISHED / ARCHIVED. Publish is **consequential** — it changes what the public internet sees, so it needs a confirmation step.
- Every data-backed surface needs loading, empty and error states.
- If the API is unavailable, use contract-shaped fixtures — never invent fields.

## Verify before reporting
`npm run lint --workspace=admin` and `npm run build:admin`

Report status: DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED
