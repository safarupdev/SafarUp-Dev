# District — Domain Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Intentionally minimal: 8 fields. No coordinates, boundaries, population, state or hierarchy. No unsupported field present. |
| **Entity** | District |
| **Collection** | `districts` |
| **PRD references** | §51.1 (approved v1.5), §200.3, §22 (destination card "region" — display language), §173, §131, §78, §172 |
| **Related contracts** | `DESTINATION` · `PLACE` |

---

## 1. Purpose

District is a **first-class canonical geographic entity** and part of the core destination/content hierarchy.

It exists so destinations can be filtered, discovered, internally linked and described in SEO/AEO/GEO without free-text drift. The interim "store `region` as a plain string" proposal is **withdrawn** (PRD §51.2).

---

## 2. Field table

| # | Field | Class | Evidence | Notes |
|---|---|---|---|---|
| 1 | `_id` | SYSTEM-MANAGED | §51 keying | Auto-generated |
| 2 | `name` | **REQUIRED** | v1.5 decision: "consistent naming, identity"; §173 | Public display name, e.g. "Jamui" |
| 3 | `slug` | **REQUIRED** | §131 readable URLs; §172 internal linking | **Unique.** Stable public key for district-level discovery |
| 4 | `status` | **REQUIRED** | §78 (public content entities) | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| 5 | `createdAt` | SYSTEM-MANAGED | §51 convention | |
| 6 | `updatedAt` | SYSTEM-MANAGED | §51 convention | |
| 7 | `createdBy` | SYSTEM-MANAGED | §53 pattern | |
| 8 | `updatedBy` | SYSTEM-MANAGED | §53 pattern | |

### 2.1 Explicit non-goals

The following are **deliberately excluded** because no PRD section supports them. Do not add them without an approved decision:

coordinates · boundaries / polygons · population · state · country · `parentDistrictId` hierarchy · district codes · district-level description or editorial content

§173 lists only `district` as an attribute. Geography beyond naming is unspecified — see §5.

---

## 3. Relationships

| Relationship | Cardinality |
|---|---|
| District → Destination | **1:N** — each Destination has exactly one District |
| District → Place | 1:N (a Place belongs to one District) |

---

## 4. Lifecycle

Identical to Destination (§78):

```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
```

No delete. Only `PUBLISHED` districts are exposed through public discovery surfaces.

---

## 5. Permissions (§60)

| Action | Anonymous | CUSTOMER | SUPPORT | FINANCE | CONTENT | OPERATIONS | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|---|
| Read `PUBLISHED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `DRAFT` / `ARCHIVED` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / publish / archive | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 6. Audit requirements (§59, §77)

create · edit · publish · unpublish · archive · slug change, all with `entityType: "District"`.

---

## 7. Open questions

| Question | Blocks | Note |
|---|---|---|
| Does District need hierarchy (`parentDistrictId`) or geo coordinates? | Field set | §200.8 — **not** invented here |
| Is there a public `/districts/:slug` route? | Public navigation & SEO | §200.6 — §17 defines no such route |

> A District with no assigned Destinations must render as an empty state, not be hidden (§112).
