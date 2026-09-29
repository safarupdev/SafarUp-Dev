# Repository Architecture Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | User/AuditLog migration DEFERRED in review: relocating verified security-critical code is churn with no Phase 2 benefit. The import boundary is the binding rule, not the directory name. |
| **Scope** | Backend data-access layering for all of Phase 2 |
| **PRD references** | §15, §61, §62, §63, §95 |
| **Owner** | Lead Agent + Engineering Master |

---

## 1. Problem this solves

Phase 0 delivered two hand-written data-access modules (`models/User.model.js`, `models/AuditLog.model.js`) that combine three concerns in one file:

1. Firestore query mechanics
2. Data normalisation and secret-stripping
3. Implicit domain rules (defaults, keying, lifecycle)

That was correct for two modules. It does not scale to twenty collections, because business rules would become inseparable from query code and untestable without a database.

**Decision:** introduce a `repositories/` layer. This is a structural change to the backend, so it is owned by the Lead Agent and must be reviewed before implementation.

> Cheaper now than migrating twenty collections later. Adding the layer after Phase 2 would mean reworking every module immediately.

---

## 2. Target structure

```
backend/src/
├── config/           env, database, mailer
├── middleware/       authenticate, authorize, validate, rateLimit, errorHandler
├── routes/           HTTP endpoints only
├── controllers/      HTTP in/out only — no Firestore
├── services/         business logic, authorization decisions, orchestration
├── repositories/     ← NEW: all Firestore access
│   ├── base.repository.js
│   ├── destination.repository.js
│   ├── district.repository.js
│   ├── category.repository.js
│   ├── place.repository.js
│   └── user.repository.js      (migrated from models/User.model.js)
├── validators/       Zod schemas
└── utils/
```

---

## 3. Layer responsibilities

| Layer | May do | May **not** do |
|---|---|---|
| **routes** | Declare endpoints, attach middleware | Contain logic or queries |
| **controllers** | Parse/validate input, call one service, shape the response | Touch Firestore; contain business rules |
| **services** | Business rules, lifecycle transitions, permission decisions, cross-entity orchestration | Touch Firestore directly |
| **repositories** | **All** Firestore reads/writes, transactions, index-dependent queries, date normalisation | Contain business rules or HTTP concerns |
| **validators** | Input shape validation | Reach the database |

**Rule (§15, §62):** no controller and no service may import `firebase-admin` or `getFirestore()`. Every database read passes through a repository. This is enforceable with a lint rule or an import-boundary test.

---

## 4. Repository interface

```js
// Generic CRUD + query surface. Not all methods apply to every entity.
{
  create(data, { actorId }),
  findById(id),
  findBySlug(slug),
  findMany({ filters, limit, cursor, orderBy }),
  update(id, patch, { actorId }),
  setStatus(id, status, { actorId }),
  // Domain-specific, named for intent:
  findPublishedByDistrict(districtId, { limit, cursor }),
  resolveRelations(entity),      // batched relation hydration
}
```

Requirements:

- **All** methods are bounded unless explicitly named `countAll`-style.
- **All** returned dates are normalised to `Date` (Phase 0 requirement).
- **No** method returns a Firestore `DocumentSnapshot` or raw `DocumentData` to callers.
- **No** secret field is ever returned. `User` retains its `SECRET_FIELDS` / `includeSecrets` discipline, and it moves *into* `user.repository.js` unchanged.
- Repositories throw `ApiError` subclasses so the existing central error handler maps them correctly (§72) — a duplicate slug must surface as **409**, not 500.

---

## 5. Transactions

Transactions belong in the repository layer.

| Operation | Requirement | Reason |
|---|---|---|
| Destination / District / Category / Place creation | **Transactional** slug claim | Prevents the clobber class of bug proven in Phase 0 (`FIRESTORE.destination.contract.md` §3) |
| Publish / unpublish / archive | Transaction or batch **including the audit entry** | A status change without its audit trail is an incomplete mutation (§77) |
| Seat allocation (Phase 4) | Transaction | ADR: "Transaction-safe" |

**Prohibited everywhere:** read-then-write check-then-set on any uniquely-constrained value.

---

## 6. Migration of existing modules

| Current | Target | Phase 2 action |
|---|---|---|
| `models/User.model.js` | `repositories/user.repository.js` | **DEFERRED — do not move in Phase 2** |
| `models/AuditLog.model.js` | `repositories/auditLog.repository.js` | **DEFERRED — do not move in Phase 2** |
| `utils/auditLog.js` | unchanged | Unchanged |

**Phase 2 adds the new repositories alongside the existing models; it does not relocate working code.** Rationale:

- `User` and `AuditLog` are **verified, tested and stable**. The Phase 0 concurrency regression test guards them.
- Moving them creates churn and regression risk on a security-critical path, for **zero Phase 2 benefit** — no Phase 2 feature touches them.
- The instruction for Phase 0 stands: do not redo completed foundation work absent a discovered regression.

`models/` therefore coexists with `repositories/` during Phase 2. The **rule that matters is the import boundary** (§3): no controller or service may reach Firestore directly, regardless of which directory the data-access module lives in. The eventual consolidation is a mechanical follow-up once the pattern has proven itself in `repositories/`, and it must preserve behaviour exactly — the Phase 0 concurrency test must pass unchanged after any move.

**If a Phase 2 implementation finds it must modify `User` or `AuditLog`, that is a finding, not a convenience.** It should be raised, not silently absorbed.

---

## 7. Testing

- Repositories are tested against the **Firestore emulator** (`npm run emulators`), never a live project.
- Every repository exposes: create, duplicate-rejection, lookup, bounded-list, update, and date normalisation.
- Transactional operations additionally get the **concurrency regression test** pattern from `backend/test/user.model.test.js`.
- The layer boundary is testable: an import-boundary check fails if a controller or service imports `firebase-admin`.

---

## 8. Non-goals

No ORM. No query builder. No generic base class beyond the thin interface in §4. No caching layer in Phase 2. No repository-per-concern explosion — one repository per collection.

---

## 9. Resolved and open

**Resolved by this review:**

| Item | Resolution |
|---|---|
| Migrate `User`/`AuditLog` in Phase 2? | **No** — deferred (§6). Adding `repositories/` is sufficient; relocation is churn on a verified, security-critical path |
| Enforce the layer boundary how? | By **test**, not an ESLint rule — no new plugin dependency |
| Where does `resolveRelations()` live? | **Repository.** It is a data-access concern; the *service* decides whether to call it |

**Still open (not blocking Phase 2):**

| Question | Phase | Note |
|---|---|---|
| When to consolidate `models/` into `repositories/`? | 3+ | Mechanical, behaviour-preserving, guarded by the Phase 0 test |
| Should `base.repository.js` be abstract or a thin helper? | 2 | Prefer the thinnest thing that works; do not build a base class the four Phase 2 repositories do not need |
