# Place — Firestore Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Indexes scoped to existing entities only. No-N+1 batch resolution explicit. Concurrency test mandatory, mirroring the Phase 0 pattern. |
| **Collection** | `places` |
| **PRD references** | §10, §15, §51, §51.1, §93, §95, §131, §186, §200.2, §200.9 |
| **Depends on** | `PLACE.domain.contract.md`, `REPOSITORY_ARCHITECTURE.contract.md` |

> **Not implemented.** No collection, index or file is created by this document.

---

## 1. Key strategy

| Aspect | Requirement |
|---|---|
| Collection | `places` |
| Document ID | **Auto-generated** |
| Slug | **Unique**, transaction-claimed — identical mechanism to Destination (`FIRESTORE.destination.contract.md` §3) |
| Relations stored | `districtId` (required), `categoryIds[]` (optional, N:M) |
| Reverse references | **Not stored.** Destinations and Trips hold Place IDs |
| Dates | Normalised to `Date` at the data-access boundary (Phase 0 requirement) |

**Duplication is forbidden** (§186). A Place is referenced, never copied into a Destination or Trip document.

---

## 2. Index requirements

| Query | Fields | Index |
|---|---|---|
| Slug lookup | `slug` | Single-field (auto) |
| Places in a district, published | `districtId` + `status` | **Composite** — `districtId ASC, status ASC` |
| Places by category (N:M) | `categoryIds` + `status` | **Composite** — `categoryIds ASC, status ASC` |
| Published list | `status` + `updatedAt` | **Composite** — `status ASC, updatedAt DESC` |

`firestore.indexes.json` is currently empty and will need these. **No speculative indexes** — only those required by an actual query.

> `categoryIds` is an array. Firestore serves array-membership queries from the index, but results may exceed expectation; always bound with `limit`.

---

## 3. Query rules (§15)

- **Bounded queries only.**
- **No N+1.** A Destination page rendering "Places to visit" (§22) resolves all `placeIds[]` in **one batched read**, never one read per ID.
- Repository-layer access only; no Firestore in controllers.
- Archiving a Place must not break references: the ID still resolves, but public surfaces filter `status == PUBLISHED`.

---

## 4. Consistency model

| Operation | Consistency | Rationale |
|---|---|---|
| Create (with slug claim) | **Transaction** | Uniqueness must be atomic — see the `User.create()` clobber bug in `FIRESTORE.destination.contract.md` §3.3 |
| Update fields | Single document | Atomic per document |
| Publish / unpublish / archive | Single document + audit | Status and audit written together |
| Relation resolution | Read | Resolved at render time; no denormalisation |

---

## 5. Date normalisation

Firestore returns `Timestamp`, not `Date`. Normalisation to `Date` at the data-access boundary is **mandatory** — see `FIRESTORE.destination.contract.md` §6. Without it, `getTime()` throws and the API serialises `{_seconds, _nanoseconds}`.

---

## 6. Environment & credentials (§93, §95)

Identical to every other collection: credentials from environment variables only, key file git-ignored, `FIRESTORE_EMULATOR_HOST` for local/test and **refused in production** by `config/env.js`.

---

## 7. Testing requirement (§27)

| Test | Requirement |
|---|---|
| Slug uniqueness under concurrency | **Mandatory** — same pattern as Destination |
| Create / duplicate / lookup | Mandatory |
| `districtId` / `categoryIds[]` resolution | Mandatory |
| Batched `placeIds[]` resolution (no N+1) | Mandatory |
| Archived Place excluded from public reads | Mandatory |
| Date normalisation | Mandatory |

Emulator-backed (`npm run emulators`).
