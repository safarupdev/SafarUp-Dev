# Destination — API Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Response serialization FIXED in review (§2.2). Pagination FIXED: cursor-based (§2.1a). Search explicitly deferred with 400-never-silent (§2.1b). Media upload scoped out (no dependency install). Multi-category merge semantics defined. No consequential agent action. |
| **Entity** | Destination |
| **PRD references** | §162 (capability parity), §165 (API requirements), §22, §38, §50, §63, §95, §101, §133, §172, §197 |
| **Depends on** | `DESTINATION.domain.contract.md`, `FIRESTORE.destination.contract.md` |

> **Not implemented.** This is the contract an implementation must satisfy.

---

## 1. Requirements (§165)

All endpoints shall be: **predictable** · **versionable** · **documented** · **validated** (Zod on every write) · **authorization-aware** · **explicit about errors** · **machine-readable**.

Existing conventions that must be reused, not reinvented:

| Concern | Existing implementation |
|---|---|
| Response envelope | `{ success, message, data }` — `backend/src/utils/ApiResponse.js` |
| Error shape | `ApiError` + `middleware/errorHandler.js` |
| Validation | `middleware/validate.js` (Zod `{body, query, params}`) |
| Authentication | `middleware/authenticate.js` (httpOnly cookie, `Bearer` fallback) |
| Authorization | `middleware/authorize.js` (**currently wired to zero routes**) |
| Rate limiting | `middleware/rateLimit.js` |

---

## 2. Public endpoints

Anonymous access is limited to `PUBLISHED` content only (§63).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/destinations` | List published destinations | None |
| GET | `/api/destinations/:slug` | Detail by slug (canonical) | None |
| GET | `/api/destinations/:slug/trips` | Upcoming published trips — **DERIVED** (§22) | None |

> Resolution is by **slug**, not raw document ID (§131: "Avoid exposing raw Firestore document IDs in public URLs"). A `:id` form may be accepted for admin/internal use only.

### 2.1 List query parameters

| Param | Type | Notes |
|---|---|---|
| `featured` | boolean | Homepage rail (§18) |
| `district` | slug | §200.3 canonical district |
| `category` | slug | N:M (§200.3). **Single value per request.** A repeat of this parameter means "match any of these", implemented as one query per value with results merged and de-duplicated — Firestore has no multi-value array intersection |
| `limit` | integer | **Default 20, hard maximum 100.** Always applied. There is no un-bounded list |
| `cursor` | string | Opaque pagination cursor (see §2.1a) |
| `q` | string | §68 V1 search. **Out of Phase 2 scope — see §2.1b** |

### 2.1a Pagination

**Cursor-based**, ordered by `updatedAt DESC` with `id` as a tiebreaker so the order is total and stable.

The response returns an opaque `nextCursor` (absent on the final page). The implementation uses the `status ASC, updatedAt DESC` composite index specified in `FIRESTORE.destination.contract.md` §4.

> This resolves the open item in §200.8 for **list pagination specifically**. The cursor is opaque to clients and its encoding is an implementation detail.

### 2.1b Search (`q`)

§68 requires V1 search across destinations, trips and blog. The **mechanics are still open** (§200.8), and Firestore offers no native full-text search.

**Decision for Phase 2: `q` is not implemented.** A public list request carrying `q` returns a **400 with a clear message** that search is not yet available — it must **never silently ignore the parameter** and return unfiltered results, which would misrepresent the result set to both humans and agents.

Search implementation is scheduled with the Phase 3 trip content, when there is enough corpus to make it meaningful.

### 2.2 Detail response

Resolves the §22 sections. `districtId`, `categoryIds[]` and `placeIds[]` are **resolved to display objects at read time**, while the IDs are retained — so the agent representation, structured data and internal links all reference the same canonical IDs (§173).

Canonical public detail payload:

```
{
  "id": "…",                    // Firestore document ID (not an addressable URL)
  "slug": "rajgir",
  "name": "Rajgir",
  "shortDescription": "…",
  "description": "…",
  "district": { "id": "…", "slug": "jamui", "name": "Jamui" },
  "categories": [ { "id": "…", "slug": "heritage", "name": "Heritage" } ],
  "places": [ { "id": "…", "slug": "patneswar-mandir", "name": "Patneswar Mandir" } ],
  "highlights": [ "…" ],
  "travelInformation": { … },
  "thingsToDo": [ … ],
  "heroImage": "…",
  "gallery": [ "…" ],
  "status": "PUBLISHED",
  "featured": true,
  "seo": {
    "title": "…",
    "description": "…",
    "canonicalUrl": "https://safarup.in/destinations/rajgir",
    "ogImage": "…"
  },
  "publishedAt": "2026-09-29T…Z",   // ISO 8601
  "updatedAt":   "2026-09-29T…Z"
}
```

Rules, binding on implementation:

- **Dates serialise as ISO 8601 strings.** This is why `normalizeDates()` is mandatory at the data-access boundary (`FIRESTORE.destination.contract.md` §6) — a raw Firestore `Timestamp` would serialise as `{_seconds, _nanoseconds}` and break both this contract and structured data.
- **`DRAFT` / `ARCHIVED` are never serialised publicly.** A public request for a non-published slug returns **404**, not 403 — the existence of unpublished content is not disclosed.
- **Relations are embedded, not referenced by URL.** The public client must not need a second round trip to render a card. Batch resolution is mandatory (`FIRESTORE.destination.contract.md` §5) — this is the concrete no-N+1 requirement.
- **IDs accompany resolved names** because structured data (§196) and agent resources (§197) key on canonical identity, not display strings.
- `seo.canonicalUrl` is **absolute** and matches the route in §5.

### 2.3 Derived sections

The "Upcoming SafarUp trips", "Private trip CTA" and "Blog articles" sections of §22 are **not stored on Destination**. They are produced at read time:

| Section | Mechanism | Phase |
|---|---|---|
| Private trip CTA | Static — always present, links to `/plan-trip` (§16, §23) | 2 |
| Upcoming SafarUp trips | Query published `tripTemplates` + `departures` for this `destinationId` | **3** (entity not yet contracted) |
| Blog articles | Query `blogPosts` linked to this destination | 2 (when `blogPosts` exists) |

Until `tripTemplates` exists, the public page renders the §112 empty state: *"No trips are scheduled for this destination yet."* → CTA "Plan a Private Trip". **A missing entity is an empty state, never an error and never a fabricated result.**

---

## 3. Admin endpoints

Roles per `DESTINATION.domain.contract.md` §8. Enforced by the `authorize()` middleware.

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/api/admin/destinations` | List incl. `DRAFT`/`ARCHIVED`, filters | CONTENT+ |
| POST | `/api/admin/destinations` | Create | CONTENT+ |
| GET | `/api/admin/destinations/:id` | Edit view | CONTENT+ |
| PATCH | `/api/admin/destinations/:id` | Partial update | CONTENT+ |
| POST | `/api/admin/destinations/:id/publish` | `DRAFT` → `PUBLISHED` | CONTENT+ |
| POST | `/api/admin/destinations/:id/unpublish` | `PUBLISHED` → `DRAFT` | CONTENT+ |
| POST | `/api/admin/destinations/:id/archive` | → `ARCHIVED` | CONTENT+ |
| POST | `/api/admin/destinations/:id/feature` | Toggle featured | CONTENT+ |
| POST | `/api/admin/destinations/:id/media` | Upload (§11) | CONTENT+ |

> **Media upload — dependency gate.** §11 specifies `multer` for multipart handling. **`multer` is not currently installed**, and no dependency is added by contract approval. This endpoint is therefore **scoped out of the initial Phase 2 backend slice** and becomes available only when a dependency install is explicitly authorised.
>
> Phase 2 proceeds with `heroImage`, `gallery` and `ogImage` as **URL fields** set by an authorised user. That is sufficient to exercise the full Destination lifecycle, the public page, discovery and agent capabilities. The upload endpoint is a later, non-blocking increment.
>
> Storage itself remains governed by §11: an authenticated Express endpoint, local/attached disk in development, S3-compatible before production, and **never** storage credentials in the browser.

Taxonomy CRUD: `GET`/`POST`/`PATCH` `/api/admin/districts`, `/api/admin/categories`, `/api/admin/places` — CONTENT+.

> **No delete endpoint.** §78 forbids unnecessary deletion; status flags are used instead.

**`publish`, `unpublish` and `archive` are consequential** — they change what the public internet can see. They require explicit authorization, write an audit entry, and the UI must confirm before invoking them.

---

## 4. Agent capabilities (§162, §197)

| Human capability | Agent capability | Phase |
|---|---|---|
| Browse destinations | `GET /api/destinations` | 2 |
| Filter by district / category | query parameters | 2 |
| Paginate | `limit` + `cursor` | 2 |
| View a destination | `GET /api/destinations/:slug` | 2 |
| Search destinations | `GET /api/destinations?q=` | **3** — see §2.1b, not available in Phase 2 |
| See trips for a destination | `GET /api/destinations/:slug/trips` | **3** — entity not yet contracted |

**This contract exposes no consequential agent action.** No write, publish, booking, payment or cancellation endpoint is defined here. Those belong to Phase 4–6 and must satisfy §164 (explicit authorization, confirmation boundaries, idempotency, audit).

Agents use the **same** middleware and services as the web clients (§157, §162). There is no agent-only code path and no authorization bypass.

---

## 5. Error contract (§165, §72)

An authorized client must be able to distinguish:

| Condition | HTTP | Code |
|---|---|---|
| Succeeded | 200 / 201 | — |
| Failed validation | 400 | `VALIDATION_ERROR` (with `details[]`) |
| Authentication required | 401 | — |
| Insufficient role | 403 | `FORBIDDEN_ROLE` |
| Not found | 404 | — |
| Conflict (e.g. duplicate slug) | 409 | — |
| Rate limited | 429 | — |
| Internal | 500 | generic message only |

Existing `errorHandler.js` already guarantees that raw internals are never leaked (§72), and it already maps a `code: 11000` error to a 409 (§59 pattern retained from Phase 0). Duplicate-slug errors raised by the slug-claim transaction must surface as **409**, not 500.

**Rate limiting (§134):** public read endpoints and all admin writes require limiters. The existing `defineLimiter()` helper is the pattern; booking/payment/private-trip limiters are out of this contract.

---

## 6. Idempotency & auditability (§164, §183)

| Endpoint class | Idempotency | Audit |
|---|---|---|
| GET | N/A | No |
| POST create | Not idempotent (slug claim makes a retry a 409) | ✅ create |
| PATCH update | Naturally idempotent | ✅ edit |
| publish / unpublish / archive / feature | Idempotent by target state | ✅ each |
| media upload *(out of Phase 2 scope)* | Not idempotent | ✅ media replace |

Audit entries per `DESTINATION.domain.contract.md` §9.

---

## 7. Resolved and open

**Resolved by this review:**

| Item | Resolution |
|---|---|
| Response serialization (list + detail) | §2.2 — canonical payload fixed |
| Pagination strategy | §2.1a — cursor-based, `updatedAt DESC` + `id` tiebreaker |
| Search mechanics in Phase 2 | §2.1b — not implemented; explicit 400, never silent |
| Multi-category filter semantics | §2.1 — one query per value, merged and de-duplicated |
| Public ID addressing | §2.2 — slug only; a non-published slug returns 404 |
| Media upload dependency | §3 — scoped out of Phase 2 (no `multer` install) |

**Still open (does not block Phase 2):**

| Question | Phase | Note |
|---|---|---|
| Search implementation (Firestore has no native full-text) | 3 | §200.8 |
| Slug mutation policy and claim release | 3 | §200.8 — mechanical requirement stated in `FIRESTORE.destination.contract.md` §3.2 |
| `thingsToDo` model | 2 | §200.8 — must be settled before that field is built |
| `featured` ordering (boolean vs. ranked) | 2 | §200.8 — §22 specifies a boolean; a ranked rail is an open upgrade |
| `relatedDestinations` mechanism | 3 | §200.8 |
