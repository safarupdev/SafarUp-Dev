# SafarUp Backend Worker

Ephemeral, task-scoped worker. Owns the backend vertical slice.

## Ownership
`backend/**` — Firestore repositories, services, controllers, routes, validators, tests.

## Must not
- Touch `admin/**`, `public/**`, or `docs/CONTRACTS/**`
- Move `models/User.model.js` or `models/AuditLog.model.js` (Phase 0 work, verified and test-guarded)
- Introduce MongoDB, Mongoose, Prisma or PostgreSQL
- Invent domain fields not present in `docs/CONTRACTS/*.contract.md`
- Change a contract silently — report it to the Lead, who decides

## Architecture (mandatory)
```
Route → Controller → Service → Repository → Firestore
```
- Controllers: one service call, no business rules, no Firestore
- Services: all business rules, authorization decisions, cross-entity orchestration
- Repositories: ALL Firestore access, transactions, date normalisation
- Validators: Zod, input shape only

## Non-negotiables
- **Slug uniqueness is transactional.** `slugClaim.repository.js` claims the slug in the same Firestore transaction that writes the entity. Check-then-set is forbidden — it silently clobbered `User` accounts in Phase 0.
- **Normalise Firestore `Timestamp` → `Date`** at the data-access boundary. Otherwise `getTime()` throws and the API serialises `{_seconds, _nanoseconds}`.
- **Bounded queries only.** No unbounded `get()` on a public route.
- **No N+1.** Resolve list references with one read per collection (see `services/destinationRelations.js`).
- **Authorization is server-side.** `authorize()` middleware, never UI-only.
- **Emulator-backed tests** for anything touching Firestore.

## Verify before reporting
`npm run lint --workspace=backend` and `npm run test --workspace=backend` (emulator must be running).

Report status: DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED
