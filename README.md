# SafarUp

Monorepo for SafarUp — a digital travel company selling **complete curated journeys** and
custom private journeys, with an admin operations console.

SafarUp is **journey-first**. The product a customer buys is a whole multi-day journey:
several locations, many places, an overnight stay, transport, meals and a return. A
destination is a place a journey visits; it is not the product. See
[Public product model](#public-product-model) below.

**Authoritative specification: [`PRD.md`](PRD.md).** Source comments across the codebase
cite PRD section numbers. Where this README and the PRD disagree, the PRD is correct.

---

## Current phase

**Phase 2 — Content / Destination foundation.** Complete for the Destination vertical
slice. The public site is built and presentation-ready; the trip backend is deliberately
not started.

| Milestone | State |
|---|---|
| Phase 0 — foundation (auth, Firestore, tests, CI) | **DONE** |
| Phase 1 — PRD, domain decisions, contracts | **DONE** — all 16 gate items `APPROVED` |
| Phase 2 — District, Category, Place, Destination | **DONE** |
| Phase 3 — Trip Product (TripTemplate, Itinerary, Departure) | **NOT STARTED** — blocked on PRD §200.4 / §200.5 |
| Phase 4+ — booking, payment, private trips, automation | **NOT STARTED** |

**Phase 3 may not begin** until the Trip Detail field-level contract (§200.4) and
pickup/drop inheritance (§200.5) are decided. Those are product decisions, not
implementation details — see [Open decisions](#open-decisions).

---

## Structure

npm workspaces (`backend`, `public`, `admin`):

```
safarup/
├── backend/   Node.js + Express API (JavaScript) — Firestore via firebase-admin
├── public/    React customer-facing app (JavaScript, Vite)
├── admin/     React admin operations console (JavaScript, Vite)
├── docs/      Design system, contracts, multi-agent operating rules
└── PRD.md     Master product requirements document
```

### Domain foundation

| Entity | What it is | Backend | Admin UI | Public UI |
|---|---|---|---|---|
| `User` | account + role | `models/User.model.js` | login / password flows | — |
| `AuditLog` | immutable action record | `models/AuditLog.model.js` | — | — |
| `District` | canonical geography | ✅ | ✅ List + Form | Explore filter |
| `Category` | canonical taxonomy (`sortOrder`) | ✅ | ✅ List + Form | Explore filter |
| `Place` | canonical attraction / stop | ✅ | ✅ List + Form | destination chips |
| `Destination` | discovery content entity | ✅ | ✅ List + Form | Home, Explore, list, detail |
| `SlugClaim` | shared transactional slug uniqueness | ✅ | — | — |
| `TripTemplate` / `Itinerary` / `Departure` | **does not exist** | ❌ | ❌ | showcase data only |

Relationships: `Destination → District` is 1:1 via `districtId`;
`Destination ↔ Category` is many-to-many via `categoryIds[]`. Places are referenced by
their canonical identity and never copied into a destination document.

---

## Tech stack

JavaScript only — no TypeScript.

- **Backend**: Node.js ≥20, Express 4, Cloud Firestore via `firebase-admin`, custom
  JWT + bcrypt authentication, Zod validation, helmet, rate limiting, nodemailer
- **Public**: React 18, Vite, React Router, TanStack Query, Axios, Tailwind CSS
- **Admin**: React 18, Vite, React Router, TanStack Query, React Hook Form + Zod, Axios,
  Recharts, Tailwind CSS
- **Persistence**: Firestore, server-side only. `firestore.rules` is deny-all; the
  backend is the sole client.

There is **no** MongoDB, Mongoose, Prisma or PostgreSQL in this repository. A historical
commit (`78adef8`) used MongoDB; the persistence layer was replaced in `ac402fb` and all
SQL/ODM dependencies are gone.

---

## Getting started

Install once at the repository root — npm workspaces hoists shared dependencies into a
single root `node_modules`, so per-package `npm install` is unnecessary.

```bash
npm install
```

### Environment

Copy each example and fill in real values:

```bash
cp backend/.env.example backend/.env
cp admin/.env.example    admin/.env
cp public/.env.example   public/.env
```

The backend **will not start** without Firebase credentials, even in development:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — full service account JSON on one line (recommended for
  a secret manager)
- `FIREBASE_SERVICE_ACCOUNT_PATH` — absolute path to a downloaded key file (git-ignored)
- `FIREBASE_PROJECT_ID` plus ambient `GOOGLE_APPLICATION_CREDENTIALS`

In development, with no SMTP credentials, transactional emails are logged to the console
rather than sent — enough to exercise verification and password reset locally.

### Run

```bash
npm run dev:backend   # API on http://localhost:4000
npm run dev:public    # public app on http://localhost:5173
npm run dev:admin     # admin app on http://localhost:5174
```

### First Super Admin

There is deliberately no API route that can create the first administrator. Seed it
out-of-band:

```bash
npm run seed:super-admin --workspace=backend -- \
  --email admin@safarup.in --password "StrongPass123" --name "Super Admin"
```

Safe to re-run: if a Super Admin already exists it exits without changes.

---

## Public product model

Three distinct things, and the site is built so they are not confused.

**1. Live, backend-backed functionality.** Destination and taxonomy content is real.
Destinations, districts, categories and places come from the public API, are curated through
the admin console, and are published/unpublished/archived with an audit trail. The public
app calls the API and nothing else — it never touches Firestore.

**2. Showcase journey presentation (what exists today).** Journeys are presented as a
complete travel product — route, day-by-day itinerary, places covered, overnight,
inclusions, exclusions, vehicle, meals, important information, and a request action. The
underlying data is clearly-labelled **showcase content** in `public/src/data/showcase.js`,
because there is no trip backend yet. It is kept honestly separate from live content:

- journeys are `noindex,follow` and absent from `sitemap.xml`
- no `TouristTrip` structured data is emitted, because that type asserts a bookable trip
- no price, departure date, seat count, availability, rating, review or traveller count is
  implied anywhere
- a visible notice accompanies the content on every surface

`IS_SHOWCASE` in `showcase.js` is the single switch. Flipping it to `false` restores
indexing, canonical URLs and entity markup, and is the intended action when the
TripTemplate API ships.

**3. Phase 3 Trip Product functionality that does not exist yet.** TripTemplate,
Itinerary, Departure, availability, booking, payments, and the admin trip CMS. None of
this is built, stubbed or implied. The public enquiry form collects a brief, does not
transmit it, and says so.

---

## Public routes

| Route | Page | Data |
|---|---|---|
| `/` | Home — featured journeys, then destinations as context | live API + showcase |
| `/explore` | Journey-first discovery workbench | live API + showcase |
| `/destinations` | Destination index with journey relationships | live API |
| `/destinations/:slug` | Destination detail — a discovery page | live API |
| `/trips` | Journeys index | showcase, `noindex` |
| `/trips/:slug` | Journey detail — the flagship page | showcase, `noindex` |
| `/plan-trip` | Private journey enquiry (not a booking) | live taxonomy + showcase |
| `/about` | Product story | static |
| `*` | 404 | — |
| `/blog`, `/login`, `/dashboard/*`, `/places/:slug` | Reserved — honest "not available yet", `noindex` | — |

Routes `/trips` and `/trips/:slug` are the stable technical URLs; the user-facing term is
**Journeys**.

Mobile global navigation is a **floating glass bottom bar**, not a hamburger menu
(PRD §115). Desktop navigation takes over at ≥1024px, and exactly one primary navigation
is present at every width.

### Regenerating the sitemap

`public/public/sitemap.xml` is generated and committed. It lists the static indexable
routes plus real **published** destinations only:

```bash
node public/scripts/generate-sitemap.mjs
```

If the API is unreachable it logs a warning and writes a static-only sitemap — it never
fabricates destination slugs.

---

## Admin areas

| Area | State |
|---|---|
| Login, forgot/reset password | ✅ |
| Dashboard | ✅ |
| District, Category, Place, Destination CMS | ✅ list + form, publish/unpublish/archive |
| Destination feature toggle | ✅ |
| Trip CMS, itinerary builder, departures | ❌ Phase 3 |

Authorization is enforced server-side by `authorize()` middleware. Hiding a control in the
admin UI is not authorization (PRD §60, §63).

---

## Tests, lint and builds

```bash
npm run emulators   # terminal 1 — Firestore emulator on 127.0.0.1:8080 (Java 11+)
npm run test        # terminal 2 — backend suite
npm run lint
npm run build       # both frontends
```

Backend tests run against the **Firestore emulator**, so no real Firebase project or key
is needed. `firebase.json` and the test config read the same host and port, so they must
agree.

Current state: **202 tests across 7 files**, all passing. They cover authentication and
role authorization, the User data-access module, taxonomy and destination API contracts,
the Destination publish/feature/archive lifecycle with audit assertions, and slug-claim
concurrency (two simultaneous claims for one slug yield exactly one winner).

CI (`.github/workflows/ci.yml`) runs on every push and PR to `main`:
install → lint → Firestore emulator → tests → admin build → public build.

---

## Documentation

| Document | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Master requirements. Authoritative for scope and data model |
| [`docs/CONTRACTS/`](docs/CONTRACTS/README.md) | Contract repository — the only thing workers may implement against |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Engineering design system; binding for UI work |
| [`docs/MULTI_AGENT_DEVELOPMENT.md`](docs/MULTI_AGENT_DEVELOPMENT.md) | Multi-agent operating rules |
| [`docs/PUBLIC_CRAWLER_FOUNDATION.md`](docs/PUBLIC_CRAWLER_FOUNDATION.md) | robots/sitemap/hosting, and the CSR limitation |
| [`docs/PUBLIC_SEO_DECISIONS.md`](docs/PUBLIC_SEO_DECISIONS.md) | Recorded SEO decisions, including open ones |

### Contracts

Contracts are project architecture, version-controlled, and the only thing an agent may
implement against. Lifecycle: `DRAFT → REVIEW → APPROVED → IMPLEMENTED`. **Only
`APPROVED` contracts may be dispatched to a worker.** See
[`docs/CONTRACTS/README.md`](docs/CONTRACTS/README.md).

---

## Open decisions

Blocking Phase 3, and **not** to be guessed:

| Decision | Blocks |
|---|---|
| §200.4 — Trip Detail field-level contract | TripTemplate, Itinerary, Departure |
| §200.5 — pickup/drop inheritance | Trip detail structure |
| Accommodation / hotel relationship | Trip detail structure |
| Historical & cultural context structure | Trip detail structure |
| §200.6 — does a Place get a public page? | Currently place chips are non-linking and `/places/:slug` is `noindex` |
| §200.8 — `thingsToDo` structure | One destination field only |

None of these block the public presentation build, and the showcase structure already
represents the intended design truthfully.

---

## Known limitations

- **The public site is client-rendered.** A crawler that does not execute JavaScript
  receives an app shell without per-route titles, canonicals or JSON-LD. Pre-rendering is
  the planned fix and is a launch blocker — documented in
  `docs/PUBLIC_CRAWLER_FOUNDATION.md`.
- **No trip backend.** Journeys are showcase content, honestly labelled and not indexed.
- **No public full-text search.** The destination list returns an explicit
  `400 SEARCH_NOT_AVAILABLE`; the UI filters loaded results and says so rather than
  implying a search that does not exist.
- **The Stitch API credential** is stored in your user-level OpenCode config, not in this
  repository. It is not committed. Rotate it and move it to an environment variable before
  sharing a machine.

---

## License

Private / Proprietary.
