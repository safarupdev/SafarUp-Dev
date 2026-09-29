# Destination — Firestore Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Reviewed** | 2026-09-29 Four-Master review. All four Masters PASS. |
| **Review notes** | Slug uniqueness FIXED in review: `slugClaims` made shared and declared (§51.3) with transaction rationale. Speculative `tripTemplates` index REMOVED. Claim-orphan test added. Date normalisation mandatory. |
| **Collection** | `destinations` |
| **PRD references** | §10, §15 (rules), §51, §93, §95, §131, §200.3 |
| **Depends on** | `DESTINATION.domain.contract.md`, `REPOSITORY_ARCHITECTURE.contract.md` |

> **Not implemented.** No collection, index or file is created by this document.

---

## 1. Collections created by Phase 2

```
distinations/
districts/
categories/
places/
```

All four are plain Firestore collections accessed **server-side only** through the Admin SDK. The browser never connects to Firestore (`firestore.rules` denies all client access; §10).

---

## 2. Key strategy

| Entity | Document ID | Rationale |
|---|---|---|
| Destination | Auto-generated | `slug` is **mutable**. Making it the ID would block renames or force document moves. §131 is satisfied by **never exposing the raw ID in URLs** and resolving slug → ID. |
| District | Auto-generated | Same |
| Category | Auto-generated | Same |
| Place | Auto-generated | Same |

> Contrast `users`, where the ID **is** the email because email is the natural immutable identity and uniqueness must be structural. Destination, District, Category and Place have no such immutable natural key.

---

## 3. Slug uniqueness — MANDATORY transaction

Slug uniqueness is **REQUIRED** (§173 requires consistency across database, API, page, metadata and agent representation).

### 3.1 Prohibited

```js
// ❌ FORBIDDEN — check-then-set
const existing = await ref.get();
if (existing.exists) throw conflict();
await ref.set(document);
```

### 3.2 Required

Creation runs inside a Firestore transaction that **atomically claims the slug and writes the document**:

```
db.runTransaction(async (transaction) => {
  const ref = db.collection('destinations').doc(generatedId);
  const slugRef = db.collection('slugClaims').doc(slug);
  const taken = await transaction.get(slugRef);
  if (taken.exists) throw duplicateSlugError();   // code 11000 → 409
  transaction.set(slugRef, { entityId: ref.id, createdAt: new Date() });
  transaction.set(ref, document);
});
```

**`slugClaims/` — declared, shared, non-domain.** Slug uniqueness requires a claim document whose ID *is* the slug, because a uniqueness constraint on a non-ID field cannot be made atomic. This is **infrastructure**, not a business entity:

- One shared collection for **all** slugged entities: `destinations`, `districts`, `categories`, `places`, and later trips/blog posts.
- Key: the slug string. Value: `{ entityId, collection, createdAt }`.
- Never exposed through any API. Never queried by the UI.
- It is listed in PRD §51 as infrastructure alongside the domain collections.

> **Why a claim collection rather than a scan.** A transaction may only read **before** it writes, so "query all documents, check for a matching slug, then write" is not atomic against a concurrent transaction. A document whose ID equals the slug makes the uniqueness check a single point read that the transaction engine can serialise correctly.

> **Slug change (not yet specified).** If a slug is later changed, the old claim must be released in the same transaction that writes the new one, or the old slug stays permanently claimed. The *policy* for slug mutation is open (§200.8); the *mechanical requirement* — claims are updated in the same transaction — is not optional.

### 3.3 Why this is non-negotiable

`User.create()` originally used check-then-set. Two concurrent registrations for the same email both observed "does not exist", and the second `set()` **silently overwrote the first account's `passwordHash` and `tokenVersion`** — an account-takeover vector. The fix (Phase 0) was `db.runTransaction()`, and the regression test is in `backend/test/user.model.test.js`.

**The identical bug class applies to slug creation.** A check-then-set slug implementation permits a silently clobbered Destination.

### 3.4 Mandatory regression test

The Engineering contract requires a concurrency test mirroring the Phase 0 pattern:

- Fire **two concurrent** slug creations with the same slug.
- Assert **exactly one** succeeds.
- Assert the other fails with the duplicate/conflict error (`code: 11000`).
- Assert the surviving document is intact and was not overwritten.
- Run against the **Firestore emulator** (§27).

---

## 4. Index requirements

`firestore.indexes.json` is currently empty. Unlike `users` — where every query was single-field and Firestore auto-indexing sufficed — Destination requires **composite indexes**.

| Query | Fields | Index |
|---|---|---|
| Published list, newest first | `status` + `updatedAt` | **Composite** — `status ASC, updatedAt DESC` |
| Featured rail | `status` + `featured` | **Composite** — `status ASC, featured ASC` |
| Slug lookup (via `slugClaims`) | `slug` (document ID) | Single read, no index needed |
| Places by district (on `places`) | `districtId` + `status` | **Composite** — `districtId ASC, status ASC` |
| Destinations by category, N:M (on `destinations`) | `categoryIds` + `status` | **Composite** — `categoryIds ASC, status ASC` |

> **Scope note.** Indexes above cover the **Phase 2** entities only. Queries that cross into Phase 3 (`tripTemplates` by `destinationId`, used by the "Upcoming SafarUp trips" section) are **not** specified here and **no index is created for them now** — `tripTemplates` does not exist yet, so such an index would be speculative. It is specified in the Phase 3 Firestore contract when that entity is contracted. See §10.

> The `categoryIds` array index is a known Firestore characteristic: array-membership queries are served by the index but may return more results than expected. Queries must remain **bounded** (§5).

**No speculative indexes.** Only indexes required by an actual query in this contract or in `API.destination.contract.md` may be added.

---

## 5. Query rules (§15)

- **Bounded queries only.** Public list endpoints must apply `limit` and a cursor strategy. No unbounded `get()` on a public route.
- **No N+1.** The Destination detail page renders three derived sections (§22: upcoming trips, private trip CTA, blog articles). These must be issued as a bounded set of queries, not as a per-destination loop.
- **No direct Firestore access from controllers.** All access goes through the repository layer — see `REPOSITORY_ARCHITECTURE.contract.md`.
- **No denormalised copies.** Destination stores no arrays of trip or blog IDs; those entities hold `destinationId` and reverse lookup is a query.
- **Secret-free by construction.** Destination contains no credentials, tokens or personal data. `USER` documents remain the only place `passwordHash` / token material lives, and those fields stay `select: false` (`models/User.model.js`).

---

## 6. Dates and timestamps

Firestore returns `Timestamp` objects, not `Date`. The Phase 0 work established that these **must be normalised to `Date` at the data-access boundary** (`normalizeDates()` in `models/User.model.js`), otherwise:

- `updatedAt.getTime()` throws, and
- the API serialises `{_seconds, _nanoseconds}` instead of ISO 8601.

Every Phase 2 data-access module must apply the same normalisation to its date fields. This is a **hard requirement**, not a style preference.

---

## 7. Consistency model

| Operation | Consistency | Rationale |
|---|---|---|
| Create (with slug claim) | **Transaction** | Uniqueness must be atomic (§3) |
| Update fields | Single document | Atomic per document |
| Publish / unpublish / archive | Single document + audit | Status change and audit entry written together via batch or transaction |
| Resolve relations (`districtId`, `categoryIds[]`, `placeIds[]`) | Read | References resolved at render time; no denormalisation |

---

## 8. Environment & credentials (§93, §95)

- Credentials come from environment variables only: `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_SERVICE_ACCOUNT_PATH` for a local key file, or `FIREBASE_PROJECT_ID` with ambient credentials.
- The key file is git-ignored (`backend/.gitignore`) and must never be committed.
- `FIRESTORE_EMULATOR_HOST` points local development and tests at the emulator. `config/env.js` **refuses to boot in production** if it is set.
- One Firebase project per environment: `safarup-dev`, `safarup-staging`, `safarup-production`.

---

## 9. Testing requirement (§27)

| Test | Requirement |
|---|---|
| **Slug uniqueness under concurrency** | **Mandatory** (§3.4) — two concurrent creates, same slug, exactly one wins |
| **Claim/document atomicity** | **Mandatory** — a failed create must leave **no orphan claim**; a claimed slug must resolve to a readable destination |
| Create / duplicate / lookup | Mandatory |
| Status filtering (`PUBLISHED` only on public reads) | Mandatory |
| Bounded list + cursor pagination | Mandatory |
| Relation resolution (`districtId`, `categoryIds[]`, `placeIds[]`) — batched, no N+1 | Mandatory |
| Multi-category filter (merge + de-duplicate) | Mandatory |
| Date normalisation (ISO 8601 in responses) | Mandatory |
| Authorization matrix (role × action) | Mandatory |
| Audit entries on publish/archive | Mandatory |

All database behaviour is verified against the **Firestore emulator** (`npm run emulators`), not against a live project. The concurrency test mirrors the pattern proven in `backend/test/user.model.test.js`.

---

## 10. Scope boundaries

| Included in Phase 2 | Excluded (contracted later) |
|---|---|
| `distinations`, `districts`, `categories`, `places`, `slugClaims` | `tripTemplates`, `departures`, `blogPosts`, `activities` — **no indexes are created for entities that do not exist yet** (§4) |
| Published list, featured rail, detail by slug | Full-text search (`q`) — explicit 400, §2.1b of the API contract |
| Bounded cursor pagination | Slug mutation / claim release — policy open (§200.8) |
