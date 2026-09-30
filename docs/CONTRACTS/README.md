# SafarUp — Contract Repository

Contracts are **project architecture**. They live here, in version control, and they are the only thing worker agents may implement against.

**Conversation-only contracts are not acceptable.** If a contract exists only in a chat transcript, it does not exist.

---

## 1. Why contracts

SafarUp uses multiple agents working in parallel (§160). Without a written contract, five agents independently interpret the same entity and produce five incompatible implementations. A contract is the shared, reviewable definition of what an entity *is*.

Applies to PRD §161.

---

## 2. Lifecycle

```
DRAFT  →  REVIEW  →  APPROVED  →  IMPLEMENTED
```

| Status | Meaning | May a worker implement it? |
|---|---|---|
| **DRAFT** | Being written. Fields may change freely. | ❌ No |
| **REVIEW** | Submitted for Master review. | ❌ No |
| **APPROVED** | Reviewed and accepted by all four Masters. | ✅ **Yes — only APPROVED** |
| **IMPLEMENTED** | Built, tested, integrated. | — |

**Only `APPROVED` contracts may be dispatched to worker agents.**

A contract rejected at review returns to `DRAFT`. The contract — not each consumer — is corrected first, then propagated. Consumers are never patched independently against differing versions.

---

## 3. Status of this repository

| Contract | Status | Reviewed |
|---|---|---|
| `DESTINATION.domain.contract.md` | **`APPROVED`** | 2026-09-29 |
| `DISTRICT.domain.contract.md` | **`APPROVED`** | 2026-09-29 |
| `CATEGORY.domain.contract.md` | **`APPROVED`** | 2026-09-29 |
| `PLACE.domain.contract.md` | **`APPROVED`** | 2026-09-29 |
| `API.destination.contract.md` | **`APPROVED`** | 2026-09-29 |
| `API.place.contract.md` | **`APPROVED`** | 2026-09-29 |
| `FIRESTORE.destination.contract.md` | **`APPROVED`** | 2026-09-29 |
| `FIRESTORE.place.contract.md` | **`APPROVED`** | 2026-09-29 |
| `REPOSITORY_ARCHITECTURE.contract.md` | **`APPROVED`** | 2026-09-29 |
| `API.taxonomy.contract.md` | **`APPROVED`** | 2026-09-29 |
| `API.auth.contract.md` | **`APPROVED`** | 2026-09-29 |

All Phase 2 contracts passed the four-Master review. **Phase 2 entry gate is closed** (PRD §182.2).

**Retroactive contracts.** `API.taxonomy` and `API.auth` describe routers that were
already implemented and tested before this repository listed them. They were written to
close a contract-coverage gap, not to author new behaviour: where a document and
`backend/src/routes/` disagree, the code is correct and the document is wrong.

**Substantive changes made during review** — these were blocking, not cosmetic:

| Change | Reason |
|---|---|
| `slugClaims` declared in PRD §51.3 and made shared across all slugged entities | The transaction example referenced an undeclared `destinationSlugs` collection. Firestore cannot make a non-ID field unique atomically, so a slug-claim document is required — and it must be declared, not invented at implementation time |
| API response serialization fixed (`API.destination` §2.2) | The contract deferred its own core output to "Master review", leaving the single most important output undefined |
| Pagination fixed: cursor-based (`API.destination` §2.1a) | An endpoint cannot be implemented against an undefined pagination strategy |
| Search explicitly deferred with an explicit 400 (`API.destination` §2.1b) | A required-looking `q` parameter with undefined mechanics invites silent ignoring, which misrepresents results to humans and agents |
| Media upload scoped out of Phase 2 | `multer` is not installed and no dependency install was authorised. Media fields proceed as URL values |
| Speculative `tripTemplates` index removed | `tripTemplates` does not exist; an index for it would violate the no-speculative-indexes rule |
| `User`/`AuditLog` migration deferred | Moving verified, security-critical, test-guarded code creates regression risk with zero Phase 2 benefit. The import boundary is what matters, not the directory name |
| PRD §185.1/§185.2 "Guide is deferred" corrected | Contradicted the v1.5 approval of Guide as an internal operational entity |

---

## 4. Contract families

| Family | Answers | Owned by |
|---|---|---|
| `*.domain.contract.md` | What the entity *is*: fields, classes, lifecycle, relationships, permissions, audit | Lead Agent |
| `API.*.contract.md` | How it is exposed: endpoints, auth, validation, error shapes, agent capabilities | Lead Agent + Agent-Native Master |
| `FIRESTORE.*.contract.md` | How it is stored: keys, documents, indexes, query patterns, transaction requirements | Lead Agent + Engineering Master |
| `REPOSITORY_ARCHITECTURE.contract.md` | How data access is layered across the whole backend | Lead Agent + Engineering Master |

Cross-cutting concerns (design system, multi-agent rules) live in `docs/`, not here:
`../DESIGN_SYSTEM.md` · `../MULTI_AGENT_DEVELOPMENT.md` · `../../PRD.md`

---

## 5. Field classification

Every field in every domain contract must be classified:

| Class | Meaning |
|---|---|
| **REQUIRED** | Must be present for the entity to be valid |
| **OPTIONAL** | May be absent; absence is a valid state |
| **DERIVED** | Computed at read time from other data. **Never stored** |
| **RELATIONSHIP** | A reference to another canonical entity by ID |
| **SYSTEM-MANAGED** | Written by the system (timestamps, actor IDs). Never client-supplied |

**Do not invent fields.** A field may only be added if a PRD section or an approved decision supports it. "Travel apps usually have this" is not evidence.

---

## 6. Ownership

`docs/CONTRACTS/**` is **Lead-only**. Worker agents must not create or modify contracts (§26 of the multi-agent development plan).

The Lead Agent authors contracts. The four permanent Masters **review** them and may object. A Master's objection is recorded and resolved before the contract leaves `REVIEW`. Masters do not author competing contract versions.

---

## 7. Change control

- A change to an `APPROVED` contract returns it to `DRAFT` and re-opens review.
- Every consumer of that contract is re-checked.
- Amendments record **what changed and why**, so a worker reading the contract knows which parts are new.

---

## 8. Required sections in a contract

1. **Status** and PRD references
2. **Purpose**
3. **Field table** with classification
4. **Relationships** (and cardinality)
5. **Lifecycle / status values**
6. **Permissions** (role × action)
7. **Audit requirements**
8. **Explicit non-goals** — what is deliberately *not* in the contract
9. **Open questions** — carried to PRD §200, never guessed
