# SafarUp

Monorepo for the SafarUp project — a digital travel company selling curated group
trips and custom private trips, with an admin operations console.

## Structure

npm workspaces (`backend`, `public`, `admin`):

```
safarup/
├── backend/   # Node.js + Express API (JavaScript) — Firestore via firebase-admin
├── public/    # React client-facing app (JavaScript, Vite)
└── admin/     # React admin panel (JavaScript, Vite)
```

## Getting Started

Install once at the repository root — npm workspaces hoists shared dependencies
into a single root `node_modules`, so per-package `npm install` is unnecessary.

```bash
npm install
```

### Backend

```bash
cp backend/.env.example backend/.env   # then fill in Firebase credentials
npm run dev:backend
```

Runs the API on http://localhost:4000 (see `backend/.env.example`).

The backend **will not start** without Firebase credentials, even in development.
Provide one of:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — the full service account JSON as a single-line
  string (recommended for production secret managers)
- `FIREBASE_SERVICE_ACCOUNT_PATH` — absolute path to a downloaded key file
  (convenient locally; the file is git-ignored and must never be committed)
- `FIREBASE_PROJECT_ID` plus ambient `GOOGLE_APPLICATION_CREDENTIALS`

In development, if no SMTP credentials are set, transactional emails are logged to
the console instead of sent — this lets the auth flow (email verification, password
reset) be exercised end-to-end locally.

### Public (client app)

```bash
npm run dev:public
```

Runs the client app on http://localhost:5173.

### Admin (admin panel)

```bash
npm run dev:admin
```

Runs the admin app on http://localhost:5174. Configure its API base URL via
`admin/.env` (`VITE_API_BASE_URL`, see `admin/.env.example`).

### First Super Admin

There is deliberately no API route that can create the first administrator. Seed it
out-of-band:

```bash
npm run seed:super-admin --workspace=backend -- \
  --email admin@safarup.in --password "StrongPass123" --name "Super Admin"
```

The script is safe to re-run: if a Super Admin already exists it exits without changes.

## Tests

Backend tests run against the **Firestore emulator**, so no real Firebase
project or service-account key is needed.

```bash
npm run emulators    # terminal 1 — starts Firestore on 127.0.0.1:8080
npm run test         # terminal 2 — runs the backend suite
```

The emulator requires **Java 11+** (`java -version`) and the Firebase CLI
(`npm i -g firebase-tools`). Port and host come from `firebase.json`; the
test run reads the same values, so both must agree.

The suite covers the existing auth foundation (login, invalid login,
protected routes, refresh, logout, role authorization, `/auth/me`) and the
`users` data-access module — including a regression test asserting that two
concurrent `User.create()` calls for the same email produce exactly one
account.

## Scripts

| Command | Description |
|---|---|
| `npm run dev:backend` | Start the API (nodemon) |
| `npm run dev:public` | Start the public app (port 5173) |
| `npm run dev:admin` | Start the admin app (port 5174) |
| `npm run build` | Build both frontends |
| `npm run build:public` | Production build of the public app |
| `npm run build:admin` | Production build of the admin app |
| `npm run lint` | Lint backend, admin and public |
| `npm run test` | Run the backend test suite (needs the emulator) |
| `npm run emulators` | Start the Firestore emulator |
| `npm run seed:super-admin --workspace=backend` | Bootstrap the first Super Admin |

## Firebase configuration

| File | Purpose |
|---|---|
| `firebase.json` | Firestore rules/indexes targets and emulator ports |
| `firestore.rules` | Deny-all client access — the backend is the only client of Firestore |
| `firestore.indexes.json` | No composite indexes required yet; every current query is a single-field lookup, which Firestore indexes automatically |

Security rules are defence in depth. Real access control is enforced in
Express middleware before any Firestore call (PRD §63).

## Tech Stack

- **Backend**: Node.js, Express, Cloud Firestore via `firebase-admin`, custom
  JWT + bcrypt authentication, Zod validation, nodemailer, Razorpay (planned)
- **Public / Admin**: React 18, Vite, React Router, TanStack Query, React Hook Form,
  Zod, Axios, Tailwind CSS (admin)
- **Language**: JavaScript only (no TypeScript)

## Documentation

`PRD.md` is the master Product Requirements Document and the source of truth for
scope, data model and security requirements. Source comments cite the relevant PRD
section numbers.

## License

Private / Proprietary.
