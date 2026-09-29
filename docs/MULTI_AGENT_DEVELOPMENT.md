# SafarUp — Multi-Agent Development

**Status:** Active — Phase 2
**Applies to:** PRD v1.5 (`../PRD.md`)

> **This document does not define product requirements.** The product specification lives in `PRD.md`, which is the sole authority for scope, domain entities, business rules, UX requirements and architecture. This document defines only *how* that work is executed: who does it, in what order, against which contracts, and how it is reviewed.
>
> Section references in the form `§NNN` refer to `PRD.md`.

---

## 1. Model

```
                    LEAD AGENT
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
 BACKEND AGENT     ADMIN AGENT       PUBLIC AGENT
      │                 │                 │
      └─────────────────┼─────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
DESIGN MASTER    DISCOVERY MASTER   AGENT-NATIVE MASTER
    └───────────────────┼───────────────────┘
                        ▼
                ENGINEERING MASTER
```

**Three kinds of participant:**

| Kind | Lifetime | Role |
|---|---|---|
| **Lead Agent** | Continuous | Coordinates, defines contracts, integrates, resolves conflicts |
| **Worker agents** (Backend, Admin, Public) | **Per task** | Implement a scoped, contract-defined slice |
| **Masters** (Design, Discovery, Agent-Native, Engineering) | **Permanent** | Standing quality authority; participate throughout, not just at the end |

Workers come and go with the task. **Masters do not.** They hold standing mandates (§159) and apply to every feature without being re-created per task.

---

## 2. Roles

### 2.1 Lead Agent

Owns architecture coordination, task decomposition, ownership assignment, dependency management, interface and contract definition, conflict resolution, integration, cross-agent review and milestone management.

The Lead Agent does not implement every feature itself.

**Exclusive Lead ownership** (no agent edits these without explicit Lead coordination — §160):
- `PRD.md` and this document
- `docs/CONTRACTS/**` — the contract repository
- `docs/DESIGN_SYSTEM.md` — the binding visual source of truth
- API contracts and shared response/error shapes
- Domain contracts and shared schema definitions
- Design tokens and the design system
- `package.json` / workspace configuration
- Authentication and authorization internals
- Firebase rules and Firestore index configuration
- CI configuration

### 2.2 Worker agents

| Agent | Owns | Must not |
|---|---|---|
| **Backend** | Firestore, repositories, data access, domain models, services, APIs, validators, auth, authorization, business logic, server integrations | Make unrelated UI changes |
| **Admin** | Admin console, CMS, dashboards, management workflows, forms, tables, filtering, admin UX | Invent backend behavior; implement against an unapproved contract |
| **Public** | Public website, discovery, destination/trip pages, search, booking entry, responsive public UX | Invent content structure; introduce a hamburger as primary mobile nav (§168) |

Each worker **consumes approved contracts**. A worker that finds a contract insufficient **escalates**; it does not extend the contract unilaterally.

### 2.3 The four permanent Masters

**Design Master** (§159.1) — visual language, design system, typography, color, spacing, grid, components, responsive layouts, desktop and mobile experiences, interactions, motion, accessibility, usability, perceived quality. Prevents inconsistent AI-generated UI patterns across applications. Owns `DESIGN_SYSTEM.md`, the **binding visual source of truth** (PRD §178.1). Figma is not used as a gate.

**Discovery Master** (§159.2) — SEO, AEO, GEO, semantic structure, metadata, canonical URLs, structured data, internal linking, crawlability, sitemap, robots, entity relationships, machine-readable content. Participates *during* implementation, never as post-hoc cleanup.

**Agent-Native Master** (§159.3) — agent accessibility, machine-readable resources, API contracts, OpenAPI, agent authentication, scopes/permissions, action contracts, idempotency, confirmation boundaries, webhooks, agent-readable errors, automation interfaces, auditability.

**Engineering Master** (§159.4) — architecture and code quality, security, performance, accessibility, testing, CI/CD, observability, dependency hygiene, database correctness, error handling, regression prevention, maintainability.

---

## 3. Contract-first development

**No agent starts implementing a domain until its contract is approved.** (§161)

A domain contract specifies:

```
Entity          Fields           Relationships    Lifecycle
Permissions     Validation       API representation
Error behavior  Persistence      Public representation
Agent representation
```

### 3.1 Contract ownership

The **Lead Agent** writes domain contracts. Masters **review** them; they do not author competing versions. A Master's objection is recorded and resolved before work starts.

### 3.2 Prohibited during parallel work

- Backend Agent inventing fields independently
- Admin Agent inventing API behavior
- Public Agent inventing content structure
- Discovery Master adding content that does not exist
- Agent-Native Master bypassing or relaxing authorization

### 3.1 Contract persistence

**Contracts are project architecture and live in `docs/CONTRACTS/`.** Conversation-only contracts are not acceptable — a contract that exists only in a chat transcript does not exist, and no agent may implement against it.

Contract lifecycle: `DRAFT → REVIEW → APPROVED → IMPLEMENTED`. Only `APPROVED` contracts may be dispatched. Full lifecycle rules, required sections and ownership are in `docs/CONTRACTS/README.md`.

### 3.2 Current status

**All Phase 2 contracts are `APPROVED`** following the four-Master review of 2026-09-29. The Phase 1 gate (PRD §182.2) is **closed** and **Phase 2 is the active development phase**.

**Worker dispatch is still a separate authorisation.** Approving a contract makes it *implementable*; it does not authorise an agent to start.

### 3.3 Blocking contract gaps

If a required contract element is unresolved, work on the affected slice is **blocked**, not approximated. Open items are tracked in `PRD.md` §200 (Domain decisions) and, for phase entry, §182.1 and §182.2.

---

## 4. Parallelization rules

Parallelize only when ownership and contracts are disjoint. (§160)

Before dispatching, the Lead defines:

```
task scope · ownership · dependencies · shared interfaces
API contracts · data contracts · expected outputs · integration point
```

**High-conflict files** — do not edit concurrently without coordination:
`PRD.md` · `docs/` · shared API contracts · shared schemas · design tokens · `package.json` / lockfiles · auth internals · `firestore.rules` / `firestore.indexes.json` · CI config.

**Current status:** The Guide, Category, District and Place domain decisions are **APPROVED** (PRD v1.5, §51.1 / §200.1–200.3). `PRD.md` §200.4 (Trip Detail field-level contract) remains **unresolved and blocks Phase 3 entry** (§182.1). No Trip/Itinerary implementation may begin. **Phase 1 contract approval is complete; Phase 2 is active.**

---

## 5. Development lifecycle

```
PRD requirement
   ↓
Lead Agent analysis
   ↓
Domain / contract definition
   ↓
Design definition
   ↓
Discovery definition
   ↓
Agent-Native definition
   ↓
Engineering definition
   ↓
Parallel implementation
   ↓
Integration
   ↓
Specialist review (four Masters)
   ↓
Testing
   ↓
Release
```

Phase entry gates are in `PRD.md` §182.1 and §182.2.

### 5.1 Design workflow (PRD §178.1)

Figma is **not** the design workflow and is not a project gate. SafarUp does not require Figma, does not dispatch work to it, and treats any Figma artifact as advisory only.

```
Design Master
  ↓
docs/DESIGN_SYSTEM.md        ← binding visual source of truth
  ↓
Desktop + Mobile design intent
  ↓
Public / Admin Agent implementation
  ↓
Browser / screenshot visual review
  ↓
Design Master feedback
  ↓
Refinement + DESIGN_SYSTEM.md update
  ↓
Engineering validation
```

The Design Master may inspect the running application and use screenshots or other local visual validation through OpenCode, but **every final design decision is captured in `DESIGN_SYSTEM.md` and in code** — never only in a session or a comment. One visual language persists across all public pages.

### 5.2 Discovery workflow

Discovery participates **when the entity is designed**, not as a cleanup pass. Every public entity is evaluated for search intent, semantic structure, metadata, canonical URL, structured data, internal linking and crawlability (PRD §172). The Discovery Master reviews each public contract before `APPROVED`, and each delivered page before integration.

### 5.3 Agent-Native workflow

For every capability the Agent-Native Master asks *"what can the human do?"* then *"how does an authorized agent do the same?"* (§14). Agent endpoints reuse the same services and middleware as human clients — no agent-only code path and no authorization bypass. Consequential actions require explicit authorization, confirmation boundaries, idempotency and audit (§164).

### 5.4 Engineering workflow

Continuous, not a final gate. Database correctness, security, tests and performance are reviewed at contract time and at integration. The Engineering Master reviews every Firestore and API contract before `APPROVED`.

---

## 6. Quality gates

A feature is **not** complete because it builds. (§176)

```
Design Master          PASS
Discovery Master       PASS
Agent-Native Master    PASS
Engineering Master     PASS
        ↓
      Integration
        ↓
  Tests + Lint + Build
```

Where a gate is not applicable, the **Lead Agent records that explicitly and states why** (§183). Silence is not a pass.

Agent-friendly DoD checklist: `PRD.md` §183.

---

## 7. Integration process

1. Each worker delivers against its approved contract, with tests and lint clean.
2. Lead Agent reviews the **diff against the contract**, not against "does it work".
3. Contracts that turned out to be wrong are fixed **in the contract first**, then propagated — never patched independently on each side.
4. Integration run: `npm run lint` → `npm run test` → `npm run build` (all must pass; see §9).
5. Masters review the integrated slice.
6. Lead reports per §11.

---

## 8. Engineering standards

**Firestore** (§15): transactions for consistency-critical writes, batched writes, appropriate indexes, bounded queries, deterministic IDs where useful, repository/data-access boundaries. Avoid unbounded reads, N+1 queries, needless duplication, and Firestore access from controllers. Client-side authorization is never the security boundary.

**Security** (§16, §61): never expose passwords, secrets, JWT secrets, Firebase service credentials, refresh tokens, reset tokens or verification tokens. Agents use the same authorization path as humans — no bypass.

**Testing:** every slice ships with tests. Backend tests require the Firestore emulator (`npm run emulators`); see `backend/test/`. Regression tests are mandatory where a bug was fixed.

**Commits:** logical, scoped, conventional messages. Never commit secrets, `.env` files or Firebase service-account keys (`backend/.gitignore`).

---

## 9. Repository checks

Run from the repository root:

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across `backend`, `admin`, `public` |
| `npm run test` | Backend Vitest + Supertest suite (**requires the Firestore emulator**) |
| `npm run build` | Production builds of `admin` and `public` |
| `npm run emulators` | Start the Firestore emulator on `127.0.0.1:8080` |

CI (`.github/workflows/ci.yml`) runs: install → lint → start emulator → test → build admin → build public.

---

## 10. Git safety

**Never discard work.** Before any significant operation:

```powershell
git status
git diff --stat
git diff
```

Prohibited without explicit user authorization:

```
git reset --hard
git clean -fd
git checkout .
git push
```

Commit only when asked. Never push unless explicitly instructed.

---

## 11. Reporting

After each coordinated milestone, the Lead Agent reports:

```
Lead decision · agents used · parallel work performed
files changed · APIs/contracts changed
Design review · Discovery review · Agent-Native review · Engineering review
tests · lint · builds
unresolved issues · Git status · next milestone
```

**Unresolved decisions and conflicts are reported, never hidden.** An unresolved domain question is a legitimate milestone outcome; a silently-invented rule is a defect.

---

## 12. Core principle (§184)

SafarUp is a **human-first, search-discoverable, AI-understandable, agent-operable, automation-ready** travel platform.

Every architectural, product, UX, API, database and development decision is evaluated against that principle.
