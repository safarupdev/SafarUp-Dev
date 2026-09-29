# Destination — Domain Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | All 24 fields validly classified. `districtId` / `categoryIds[]` / `placeIds[]` correct. No stored trip/blog ID arrays (derived by query). `thingsToDo` structure isolated as an OPEN DECISION blocking only that field. |
| **Entity** | Destination |
| **Collection** | `destinations` |
| **PRD references** | §22 (public), §38 (admin), §50 (SEO), §51/§51.1, §63 (access), §68 (search), §78 (publishing), §112 (empty states), §131 (slugs), §132 (URL), §172–§174 (discovery), §186 (places), §200.3 |
| **Related contracts** | `DISTRICT`, `CATEGORY`, `PLACE` · `API.destination` · `FIRESTORE.destination` |

---

## 1. Purpose

Destination is the **canonical discovery and intent entity**.

> "The destination page must convert discovery into travel intent." — PRD §22

It is the hub connecting editorial discovery, canonical places, commercial trips and private-trip intent. It is a *reusable published entity*, not a booking object.

---

## 2. Field table

Classification: **REQUIRED** · **OPTIONAL** · **DERIVED** · **RELATIONSHIP** · **SYSTEM-MANAGED**

| # | Field | Class | PRD evidence | Notes |
|---|---|---|---|---|
| 1 | `_id` | SYSTEM-MANAGED | §51 keying | Firestore auto-generated document ID |
| 2 | `slug` | **REQUIRED** | §22 (`/destinations/:slug`); §131 (readable URLs, e.g. `/destinations/rajgir`) | Public identity. Uniqueness **REQUIRED**. Never expose the raw document ID (§131) |
| 3 | `name` | **REQUIRED** | §22 card "name"; §173 | Public display name |
| 4 | `districtId` | **RELATIONSHIP · REQUIRED** | §51.1, §200.3 | → `districts`. **Canonical**. Replaces the withdrawn free-form `region` (§51.2) |
| 5 | `categoryIds` | **RELATIONSHIP · OPTIONAL** | §51.1, §200.3 | → `categories`, **N:M**. Array. May be empty but not null |
| 6 | `placeIds` | **RELATIONSHIP · OPTIONAL** | §22 "Places to visit"; §51.1, §200.2 | → `places`, **N:M**. Powers "Places to visit" and §186 |
| 7 | `shortDescription` | **REQUIRED** | §22 card "short description" | Card/list summary |
| 8 | `description` | **REQUIRED** | §22 "Overview"; §173 | Full overview prose. Structured areas below are **separate fields**, not merged into this |
| 9 | `heroImage` | **REQUIRED** | §22 card "image"; §11 "Destination images" | Primary image; also the default OG image |
| 10 | `gallery` | OPTIONAL | §11; §34 media | PRD sets no minimum count |
| 11 | `status` | **REQUIRED** | §38 | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| 12 | `featured` | **REQUIRED** | §22 card "featured status"; §18 "Popular Destinations" | Drives the homepage rail |
| 13 | `highlights` | **REQUIRED** | §22 "Highlights"; §173 | Structured list |
| 14 | `travelInformation` | **REQUIRED** | §22 "Travel information"; §173 | Structured |
| 15 | `thingsToDo` | **REQUIRED** *(structural)* | §22 "Things to do" | Content area. **Structure is OPEN DECISION (§200.8)** — reference the `activities` collection, or destination-local content? Must not be implemented until settled |
| 16 | `seoTitle` | **REQUIRED** | §50 | Per-entity override |
| 17 | `metaDescription` | **REQUIRED** | §50 | Per-entity override |
| 18 | `canonicalUrl` | **REQUIRED** | §50 | |
| 19 | `ogImage` | OPTIONAL | §50 | Falls back to `heroImage` |
| 20 | `createdAt` | SYSTEM-MANAGED | §51 convention | |
| 21 | `updatedAt` | SYSTEM-MANAGED | §51 convention | |
| 22 | `createdBy` | SYSTEM-MANAGED | §53 pattern | Actor ID written by the system, never client-supplied |
| 23 | `updatedBy` | SYSTEM-MANAGED | §53 pattern | |
| 24 | `publishedAt` | SYSTEM-MANAGED | §78 lifecycle | Set on DRAFT→PUBLISHED |

### 2.1 Rendered sections — DERIVED, never stored

| Section | Source | Class |
|---|---|---|
| Upcoming SafarUp trips | Query `tripTemplates` where `destinationId` = this, joined to published `departures` | **DERIVED** |
| Private trip CTA | §16/§23 — always present, routes to `/plan-trip` | **DERIVED** |
| Blog articles | Query `blogPosts` linked to this destination | **DERIVED** |

**Destination must not store arrays of trip or blog IDs.** Those entities hold `destinationId`; reverse lookup is a query. This prevents two sources of truth (§157, §173).

### 2.2 Explicit non-goals — not in this contract

No field is included for any of the following, because **no PRD section provides evidence**: coordinates / lat-long · `relatedDestinations` (mechanism undefined — §200.8) · country / state · view counts or popularity scores (§123 lists `destination_view` as an *analytics event*, not an entity field) · trip counts · `region` as a stored string (withdrawn, §51.2) · `categoryId` singular (superseded by `categoryIds[]`).

---

## 3. Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| District → Destination | 1:N | Each Destination has exactly one District (§200.3) |
| Category ↔ Destination | **N:M** | `categoryIds[]` (§200.3) |
| Place ↔ Destination | **N:M** | `placeIds[]` (§200.2) |
| Destination → TripTemplate | 1:N | TripTemplate holds `destinationId` (§53) |
| Destination → PrivateTripRequest | 1:N | `destinationId` (§56) |

Reverse relationships are **queried**, never denormalised.

---

## 4. Lifecycle

```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
   ▲                    │                       │
   └───── edit ─────────┴───── restore ────────┘
```

- `PUBLISHED` is the **only** publicly readable status. §63: anonymous access is limited to "explicitly public data, e.g. published destinations".
- **No delete.** §78: "Do not delete production content unnecessarily. Use archival/status flags."
- `featured` is **orthogonal to `status`**. A `DRAFT` or `ARCHIVED` destination must never appear in any public featured rail.
- Slug mutation behaviour after publish is **open** (§200.8).

---

## 5. Identity and canonical URL

- List: `/destinations` (§17, §22)
- Detail: `/destinations/:slug` (§17, §22)
- Slug is the public identity and must be **unique** (§173 requires consistency across database, API, page, metadata and agent representation).
- Slug creation **must be transaction-safe** — see `FIRESTORE.destination.contract.md` §3. Check-then-set is prohibited.

---

## 6. Public requirements

Section order (§22):

```
Overview
Highlights
Places to visit
Things to do
Travel information
Upcoming SafarUp trips
Private trip CTA
Blog articles
```

- Desktop and mobile are **independently composed** experiences (§174, §167). Mobile is not a scaled desktop.
- Public mobile global navigation = **bottom navigation**; a hamburger is not the default (§168, §115).
- Empty state when no trips are published (§112): "No trips are scheduled for this destination yet." → CTA "Plan a Private Trip".

---

## 7. Admin requirements (§38)

> "Admin can: create, edit, publish, unpublish, archive, feature, upload images, edit SEO, manage highlights, manage related trips."

- "manage related trips" is a **relationship action**, not a Destination field.
- Uploads go through an authenticated Express endpoint (§11); storage credentials never reach the browser.
- §6.3 Content Admin owns Destinations, Images, SEO.
- Structured field-level editing, **not** one giant text field (§199 principle).

---

## 8. Permissions (§60, §63, §91)

Roles per `backend/src/constants/roles.js`.

| Action | Anonymous | CUSTOMER | SUPPORT | FINANCE | CONTENT | OPERATIONS | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|---|
| Read `PUBLISHED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `DRAFT` / `ARCHIVED` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / edit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Publish / unpublish / archive | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Feature / unfeature | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit SEO fields | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage related trips | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

> Enforcement is **server-side** in Express middleware (§63). The backend `authorize()` factory currently exists but is wired to zero routes — wiring it is an Engineering gate for Phase 2, not existing behaviour. Client-side route guards are a UX convenience only (§133).

---

## 9. Audit requirements (§59, §77)

Mutations that must write an `AuditLog` entry with `entityType: "Destination"`:

create · edit · publish · unpublish · archive · feature/unfeature · SEO field change · media replace · district or category reassignment · place link/unlink

Audit fields already exist (§59): `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `before`, `after`, `timestamp`, `ipMetadata`.

§77 explicitly requires tracking `published trip`; Destination publication is the same class of operation. Audit-log write failures must never fail the underlying operation (`utils/auditLog.js`).

---

## 10. Open questions (carried to PRD §200)

| Question | Blocks | Note |
|---|---|---|
| `thingsToDo` — reference `activities` or destination-local content? | **The `thingsToDo` field only** | §200.8. The §22 section is required, but its *structure* must be settled before that field is built. Does **not** block the rest of Phase 2 |
| `relatedDestinations` — explicit links or derived by shared district/category? | Related-content rendering | §200.8 — Phase 3 |
| Slug change after publish — allowed? redirect? claim release? | Lifecycle | §200.8 — Phase 3. Mechanical claim-release requirement is stated in `FIRESTORE.destination.contract.md` §3.2 |
| `featured` — boolean or ranked ordering? | Homepage rail | §200.8 — §22 specifies "featured status" (boolean); a ranked rail is an optional upgrade, not a blocker |
| Search mechanics for §68 | Public search | §200.8 — Phase 3. `q` returns an explicit 400 in Phase 2 |
| Public route for District / Category / Place | Navigation & discovery | §200.6 — Phase 3 |

**None of these block creating the Destination entity, its lifecycle, its API, or the public page.** The `thingsToDo` field alone must wait.
