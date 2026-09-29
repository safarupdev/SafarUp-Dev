# Place / Attraction — Domain Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Canonical identity preserved; duplication prohibition explicit. Field-level detail (coordinates, hours, ticketing) correctly left to §200.9 as an OPEN DECISION rather than invented. |
| **Entity** | Place (also "Attraction") |
| **Collection** | `places` |
| **PRD references** | §51.1 (approved v1.5), §200.2, §22 ("Places to visit"), §173, §185.3 (pickup/drop linkability), §186 (Places Covered) |
| **Related contracts** | `DESTINATION` · `DISTRICT` · `CATEGORY` · `API.place` · `FIRESTORE.place` |

---

## 1. Purpose — why Place is canonical

A Place is an independently identifiable, reusable entity: a temple, a tower, a bird sanctuary, a hill.

Without a canonical Place entity, every Destination and every Trip would carry its own copy of a place's name. That duplication is explicitly **forbidden** (§186) and expensive to reverse, because it breaks:

- **internal linking** and destination discovery (§172)
- **SEO/AEO/GEO** — one entity, one canonical URL, one structured-data node (§173)
- **agent-readable resources** — an agent can resolve "Simultala" to one identity (§197)
- **future recommendation systems** (§179)

**A Place record must never be duplicated into a Destination or TripTemplate document.** Both reference Places by ID.

---

## 2. Field table

Deliberately minimal. A large tourism schema is **not** invented — see §6.

| # | Field | Class | Evidence | Notes |
|---|---|---|---|---|
| 1 | `_id` | SYSTEM-MANAGED | §51 keying | Auto-generated |
| 2 | `name` | **REQUIRED** | v1.5 decision; §22 | e.g. "Maa Netula Temple", "Nagi-Nakti Bird Sanctuary" |
| 3 | `slug` | **REQUIRED** | §131; §172 | **Unique.** Stable public key |
| 4 | `districtId` | **RELATIONSHIP · REQUIRED** | §51.1, §200.2, §200.3 | → `districts`. Canonical geography |
| 5 | `categoryIds` | **RELATIONSHIP · OPTIONAL** | §51.1, §200.2 | → `categories`, N:M (e.g. Spiritual & Cultural, Heritage, Hills & Nature, Wildlife) |
| 6 | `description` | **REQUIRED** | §22, §173 | Place-level content |
| 7 | `heroImage` | OPTIONAL | §11 "Destination images", media | No PRD section requires a Place image |
| 8 | `status` | **REQUIRED** | §78 | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| 9 | `seoTitle` | OPTIONAL | §50 | Required only if a public Place page exists (§200.6) |
| 10 | `metaDescription` | OPTIONAL | §50 | As above |
| 11 | `canonicalUrl` | OPTIONAL | §50 | As above |
| 12 | `createdAt` | SYSTEM-MANAGED | §51 convention | |
| 13 | `updatedAt` | SYSTEM-MANAGED | §51 convention | |
| 14 | `createdBy` | SYSTEM-MANAGED | §53 pattern | |
| 15 | `updatedBy` | SYSTEM-MANAGED | §53 pattern | |

### 2.1 Explicit non-goals — not in this contract

Coordinates / lat-long · boundary data · opening hours · ticketing · entry fees · multilingual names · ratings · contact details · accessibility attributes · seasonal availability · images beyond a single hero

**None of these have PRD support.** Each would be a tourism schema invented from convention. If a real requirement appears, it is raised as a contract question (§6), not added by an implementation agent.

> **Note on location.** §173 lists `location` as a Destination attribute, not a Place attribute. Coordinates are therefore **not** included here. If map integration (§195) requires them, that is a new decision — see §6.

---

## 3. Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| District → Place | 1:N | Each Place has exactly one District |
| Category ↔ Place | N:M | `categoryIds[]` |
| Destination ↔ Place | **N:M** | `placeIds[]` on Destination — "Places to visit", §22 |
| TripTemplate → Place | N:M | Via itinerary stops — §185.4, §186 |
| Place → Place | self-reference | **Not modelled.** No PRD requirement |

---

## 4. Lifecycle

```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
```

No delete (§78). Archiving a Place must not break existing Destinations or Trips: the reference is a plain ID, so resolution still works, but public surfaces filter archived Places out.

---

## 5. Public requirements

**Undecided.** §17 defines no `/places` route. Until §200.6 is resolved:

- A Place is **not** assumed to have its own public page.
- Places may still be **linked from** Destination pages ("Places to visit", §22) and rendered as part of Trip itineraries.
- `seoTitle` / `metaDescription` / `canonicalUrl` are therefore **OPTIONAL** here.

---

## 6. Permissions (§60)

Identical to District and Category:

| Action | Anonymous | CUSTOMER | SUPPORT | FINANCE | CONTENT | OPERATIONS | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|---|
| Read `PUBLISHED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `DRAFT` / `ARCHIVED` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / publish / archive | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 7. Audit requirements (§59, §77)

create · edit · publish · unpublish · archive · district or category reassignment, with `entityType: "Place"`.

---

## 8. Open questions (carried to PRD §200.9)

| Question | Blocks | Note |
|---|---|---|
| Minimum Place field set — is this list sufficient? | Place implementation | §200.9 |
| Does a Place have its own public page (`/places/:slug`)? | SEO fields, public routes | §200.6 |
| Do Places need coordinates for map integration? | Map features (§195) | §200.9 — not added without a decision |
| Does a Place need a `highlights`/`travelInformation` equivalent? | Content depth | §200.9 |
