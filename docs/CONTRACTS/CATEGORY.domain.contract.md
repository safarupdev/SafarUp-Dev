# Category — Domain Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Flat taxonomy, N:M with Destination. `sortOrder` retained as OPTIONAL on the single §115 reference. No `parentCategoryId`. Hotel/Blog migration explicitly out of scope. |
| **Entity** | Category |
| **Collection** | `categories` |
| **PRD references** | §51.1 (approved v1.5), §200.3, §42 (hotel attribute), §49 (blog attribute), §115 ("Explore can contain: … Categories"), §173 |
| **Related contracts** | `DESTINATION` · `PLACE` |

---

## 1. Purpose

Category is a **first-class taxonomy entity** for consistent naming, identity, and future filtering/discovery.

Uncontrolled free-text category values must **not** be the canonical Destination relationship. The canonical taxonomy is administered through this entity.

---

## 2. Field table

| # | Field | Class | Evidence | Notes |
|---|---|---|---|---|
| 1 | `_id` | SYSTEM-MANAGED | §51 keying | Auto-generated |
| 2 | `name` | **REQUIRED** | v1.5 decision: "consistent naming, identity"; §173 | e.g. "Heritage", "Spiritual", "Wildlife", "Nature", "Pilgrimage" |
| 3 | `slug` | **REQUIRED** | §131; §172 filtering/discovery | **Unique.** Stable key |
| 4 | `status` | **REQUIRED** | §78 | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| 5 | `sortOrder` | OPTIONAL | §115 — "Explore can contain: … Categories" | Justified **only** for Explore ordering. Optional; absence is valid |
| 6 | `createdAt` | SYSTEM-MANAGED | §51 convention | |
| 7 | `updatedAt` | SYSTEM-MANAGED | §51 convention | |
| 8 | `createdBy` | SYSTEM-MANAGED | §53 pattern | |
| 9 | `updatedBy` | SYSTEM-MANAGED | §53 pattern | |

### 2.1 Explicit non-goals

`parentCategoryId` hierarchy · icon · colour · description · per-category SEO overrides · usage counts.

The taxonomy is deliberately **flat**. Complexity is not invented.

---

## 3. Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| Category ↔ Destination | **N:M** | Destination stores `categoryIds[]` (§200.3) |
| Category ↔ Place | N:M | `categoryIds[]` on Place |

> **Scope boundary.** §42 hotels and §49 blog posts currently store a `category` **string**. Migrating them to `categoryIds` is a **separate, explicitly approved** decision and is **not** performed automatically (§200.3, §200.8).

---

## 4. Lifecycle

```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
```

No delete (§78). Archiving a Category must not orphan Destinations — the relationship is a plain ID array, so archived categories remain resolvable; public surfaces must filter them out.

---

## 5. Permissions (§60)

| Action | Anonymous | CUSTOMER | SUPPORT | FINANCE | CONTENT | OPERATIONS | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|---|
| Read `PUBLISHED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / publish / archive | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 6. Audit requirements (§59, §77)

create · edit · publish · unpublish · archive · rename, with `entityType: "Category"`.

> Renaming a Category must not rewrite denormalised names on Destinations — the relationship is by ID and names are resolved at render time. This is why the relationship is a reference and not a copy.

---

## 7. Open questions

| Question | Blocks | Note |
|---|---|---|
| Is `sortOrder` justified, given §115 is the only evidence? | Field set | Kept OPTIONAL, not assumed required |
| Is there a public `/categories/:slug` route? | Public navigation & SEO | §200.6 — §115 places Categories inside Explore, not at a top-level route |
| Should Hotel/Blog `category` strings migrate to references? | Taxonomy consistency | §200.8 — explicitly out of scope of the v1.5 decision |
