# Place — API Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Inherits the resolved pagination and search conventions. Public page deferred to §200.6. No consequential agent action. |
| **Entity** | Place / Attraction |
| **PRD references** | §22, §38, §50, §63, §162, §165, §172, §173, §186, §200.2, §200.6 |
| **Depends on** | `PLACE.domain.contract.md`, `FIRESTORE.place.contract.md` |

> **Not implemented.** Reuse the envelope, error, validation, auth and rate-limit conventions defined in `API.destination.contract.md` §1 and §5 — do not reinvent them.

---

## 1. Public endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/places` | List published places | None |
| GET | `/api/places/:slug` | Detail by slug | None |

Query parameters: `district` (slug), `category` (slug), `limit`, `cursor`.

- `limit` — **default 20, hard maximum 100**; `cursor` — opaque, `updatedAt DESC` + `id` tiebreaker. Same convention as `API.destination.contract.md` §2.1a.
- `category` is **single-value per request**; a repeat means "match any of these", implemented as one query per value with results merged and de-duplicated.
- **`q` is not implemented.** Place search is out of Phase 2 scope. A request carrying `q` returns **400 with a clear message** — it must never silently ignore the parameter (`API.destination.contract.md` §2.1b).

> A public Place **page** (`/places/:slug`) is not confirmed — §17 defines no such route and the question is open (§200.6). These endpoints make Place data *discoverable* and *referenceable*; whether a Place is independently **indexable** as a page is a separate Discovery decision.
>
> Until then, Places are primarily consumed as **referenced content** inside Destination pages ("Places to visit", §22) and Trip itineraries (§186).

---

## 2. Admin endpoints

Roles per `PLACE.domain.contract.md` §6.

| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/api/admin/places` | List incl. `DRAFT`/`ARCHIVED` | CONTENT+ |
| POST | `/api/admin/places` | Create | CONTENT+ |
| GET | `/api/admin/places/:id` | Edit view | CONTENT+ |
| PATCH | `/api/admin/places/:id` | Partial update | CONTENT+ |
| POST | `/api/admin/places/:id/publish` | `DRAFT` → `PUBLISHED` | CONTENT+ |
| POST | `/api/admin/places/:id/unpublish` | `PUBLISHED` → `DRAFT` | CONTENT+ |
| POST | `/api/admin/places/:id/archive` | → `ARCHIVED` | CONTENT+ |

No delete endpoint (§78).

**Linking a Place to a Destination or ItineraryStop mutates the Destination or Trip, not the Place.** Those endpoints belong to the Destination and Trip contracts, and are audited against the owning entity.

---

## 3. Agent capabilities (§162)

| Human capability | Agent capability |
|---|---|
| Browse places in a district | `GET /api/places?district=` |
| Filter places by category | `GET /api/places?category=` |
| Resolve a place reference | `GET /api/places/:slug` |

An agent can therefore answer, from structured data: *which places does this destination cover?* — resolving `placeIds[]` to real, named, geolocated-by-district entities rather than scraped text.

**No consequential agent action** is defined for Place. An agent may not create, edit, publish or archive a Place.

---

## 4. Errors & idempotency

| Class | Idempotency | Audit |
|---|---|---|
| GET | N/A | No |
| POST create | Retry → 409 (slug conflict) | ✅ create |
| PATCH | Idempotent | ✅ edit |
| publish / unpublish / archive | Idempotent by target state | ✅ each |

Duplicate-slug conflicts from the transaction surface as **409**, never 500.

---

## 5. Open questions

| Question | Blocks | Note |
|---|---|---|
| Is a public `/places/:slug` route created? | Indexability, SEO fields, sitemap | §200.6 |
| Should `GET /api/places` be public at all before a Place page exists? | Public surface | This contract assumes yes, for agent/discovery use |
| Do Places need coordinates for map integration? | Map features (§195) | §200.9 — not in the field contract |
