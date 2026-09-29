# Taxonomy API Contract (District, Category, Place)

| | |
|---|---|
| **Status** | `APPROVED` |
| **Lifecycle** | DRAFT → REVIEW → APPROVED → IMPLEMENTED |
| **Reviewed** | 2026-09-29 |
| **PRD references** | §22 (public content), §38 (admin), §51.1 domain decisions, §63, §157, §200.1–§200.3 |
| **Companion contracts** | `DISTRICT.domain.contract.md` · `CATEGORY.domain.contract.md` · `PLACE.domain.contract.md` · `API.destination.contract.md` · `API.place.contract.md` |
| **Describes** | The **already-implemented** `/api/districts`, `/api/categories`, `/api/places` routers. This document changes no behaviour. |

> **Retroactive contract.** These endpoints shipped in Phase 2 and are covered by
> `backend/test/taxonomy.api.test.js` and `content.api.test.js`. This contract records what
> was built so the contract repository fully describes the API surface. Where this document
> and `backend/src/routes/taxonomy.routes.js` disagree, **the code is correct and this
> document is wrong** — fix the document, never the route.

---

## 1. Purpose

The three canonical classification entities. They exist because destination discovery
filters on them, and because PRD v1.5 made each a first-class entity rather than a string:

- **District** — canonical geography. `Destination → District` is **1:1** via `districtId`.
- **Category** — canonical taxonomy. `Destination → Category` is **MANY-TO-MANY** via
  `categoryIds[]`, merged and de-duplicated server-side.
- **Place** — canonical attraction/stop, reusable across destinations, trip itineraries,
  places-covered, maps, search and agent resources, and **never duplicated** into a
  destination document.

---

## 2. Transport conventions

Each entity exposes two routers, mounted at different points (contract-specified):

| | Public | Admin |
|---|---|---|
| District | `/api/districts` | `/api/admin/districts` |
| Category | `/api/categories` | `/api/admin/categories` |
| Place | `/api/places` | `/api/admin/places` |

| Rule | Value |
|---|---|
| Public auth | **None.** Anonymous. The service restricts every read to `PUBLISHED` (§63) |
| Admin auth | `authenticate` + `authorize(CONTENT, OPERATIONS, ADMIN, SUPER_ADMIN)`, applied once for the whole admin subtree |
| Validation | Zod via `validate()` — list queries and bodies both |
| Rate limiting | `publicReadLimiter` on every public read; `adminWriteLimiter` on every admin write |
| Success | Envelope from `utils/ApiResponse.js` |
| Failure | `{ error: { code, message, details? } }` from `utils/ApiError.js` |
| Delete | **None.** §78 forbids unnecessary deletion; archival is the only removal path |

> The admin router carries the `<entity>` path segment itself. Mounted at `/admin` without
> it, `/api/admin/districts` would fall into `get('/:id')` with `id = 'districts'` and every
> admin taxonomy route would 404.

---

## 3. Public endpoints

All three are anonymous and return `PUBLISHED` rows only.

### `GET /api/districts`
- **Query** (`districtListQuery`): `status` (accepted, ignored — anonymous reads are
  hard-coded to `PUBLISHED`), `limit`, `cursor`
- **Response:** `{ items: District[], nextCursor: string | null }`
- **Cursor-paginated.** `nextCursor` is `null` on the final page — normalised, so "no more
  pages" is never a truthy-but-empty string.

### `GET /api/districts/:slug`
- **Response:** the district, or `404` for unknown **and** non-published slugs

### `GET /api/categories`
- **Query** (`categoryListQuery`): `status`, `limit`
- **Response:** `{ items: Category[] }`
- **Deliberately no `cursor`.** `categoryRepository.list()` returns a plain array, so
  accepting one would be a silent no-op that misleads every client.
- Ordering: `sortOrder` ascending, then name — the ordering Explore and the admin filter
  UI both depend on.

### `GET /api/categories/:slug`
- **Response:** the category, or `404`

### `GET /api/places`
- **Query** (`placeListQuery`): `status` (ignored anonymously), `district`, `category`,
  `limit`
- **Response:** `{ items: Place[] }`
- **Not cursor-paginated** — see the category note above.

### `GET /api/places/:slug`
- **Response:** the place with resolved `district` and `categories[]`, or `404`

---

## 4. Admin endpoints

Applied to `/api/admin/{districts,categories,places}`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/{entity}` | List, filterable by `status`, cursor-paginated (except Category) |
| `POST` | `/{entity}` | Create — slug claimed transactionally |
| `GET` | `/{entity}/:id` | Read by Firestore id |
| `PATCH` | `/{entity}/:id` | Partial update; lifecycle fields are not settable here |
| `POST` | `/{entity}/:id/publish` | Lifecycle → `PUBLISHED` |
| `POST` | `/{entity}/:id/unpublish` | Lifecycle → `REVIEW` |
| `POST` | `/{entity}/:id/archive` | Archival — the only removal path |

`feature` exists on **destinations only** (`POST /api/admin/destinations/:id/feature`,
see `API.destination.contract.md`). Taxonomy entities are not featureable.

Every lifecycle transition is audited via `utils/auditLog.js`, recording actor, action,
previous state, new state and timestamp.

---

## 5. Field classification

| Entity | REQUIRED | OPTIONAL | SYSTEM-MANAGED |
|---|---|---|---|
| **District** | `name`, `slug` | `description` | `status`, `sortOrder`, timestamps |
| **Category** | `name`, `slug` | `description` | `status`, `sortOrder`, timestamps |
| **Place** | `name`, `slug` | `description`, `summary`, `districtId`, `categoryIds[]`, `coordinates`, `address` | `status`, timestamps |

`sortOrder` is SYSTEM-MANAGED on Category because its ordering is contract behaviour
(`CATEGORY.domain.contract.md` §2), not editorial copy.

---

## 6. Relationships

| Relationship | Cardinality | Mechanism |
|---|---|---|
| District → Destination | 1 : many | `Destination.districtId` |
| Category ↔ Destination | many : many | `Destination.categoryIds[]` |
| Place → District | many : 1 | `Place.districtId` (OPTIONAL) |
| Place ↔ Category | many : many | `Place.categoryIds[]` (OPTIONAL) |
| Entity → SlugClaim | 1 : 1 | shared `slugClaims` collection, transactional |

**No N+1.** Destination list and detail resolve `district`, `categories[]` and `places[]`
from batched reads in `destinationRelations.js` — one read per collection per request.

---

## 7. Lifecycle

```
DRAFT → REVIEW → PUBLISHED → ARCHIVED
```

- Only `PUBLISHED` is visible to the public.
- `archive` is terminal. Un-archiving is an operations action, not an API verb.
- Transition legality is enforced in the service layer, not the controller.

---

## 8. Permissions

| Action | Anonymous | Content | Operations | Admin | Super Admin |
|---|---|---|---|---|---|
| Read public (PUBLISHED only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read admin (any status) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / update | ❌ | ✅ | ✅ | ✅ | ✅ |
| Publish / unpublish / archive | ❌ | ✅ | ✅ | ✅ | ✅ |
| `feature` (destinations only) | ❌ | ✅ | ✅ | ✅ | ✅ |

Enforced server-side by `authorize(...)`. Hiding an action in the admin UI is not
authorization (§60, §63).

---

## 9. Agent-native capabilities

A machine consumes these exactly as the public UI does — no separate agent path, no
scraping:

- Enumerate districts and categories, or resolve either by slug
- Filter places by district or category
- Read a place's resolved district and categories
- Cross-reference: a destination's payload embeds the same district/category/place shapes,
  so an agent following a destination reaches its taxonomy in one request

All responses are `PUBLISHED`-only by construction, and errors are machine-readable with a
stable `code`.

---

## 10. Explicit non-goals

- **No** `q` search on any taxonomy endpoint. Only the destination list declares it, and
  only to return an explicit `400 SEARCH_NOT_AVAILABLE` (`API.destination.contract.md` §2.1b).
- **No** hierarchy between categories. Category is flat and `sortOrder`-ordered; a
  parent/child tree is not specified.
- **No** nested-subdistrict model. District is flat.
- **No** media upload. `multer` is not installed and no dependency install was
  authorised; location imagery is URL values.
- **No** delete endpoint, on any entity.
- **No** bulk import or export.
- **No** trip references from a place. A Place is a stop; trip↔place linkage arrives with
  the TripTemplate contract in Phase 3.

---

## 11. Open questions

- **`?featured` on districts/categories** — not implemented, and not requested. If wanted,
  it needs a contract amendment, not an implementation detail.
- **Category `sortOrder` administration** — the field is SYSTEM-MANAGED but has no admin
  endpoint to set it. Carried to PRD §200.
- **Place geocoding** — `coordinates` is stored, never derived or validated. Carried to
  PRD §200.

None of these blocks Phase 2, and none may be guessed.
