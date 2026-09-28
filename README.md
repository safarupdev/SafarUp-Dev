# Sakala

Monorepo for the Sakala project.

## Structure

```
sakala/
├── backend/   # Node.js + Express API (JavaScript)
├── public/    # React client-facing app (JavaScript, Vite)
└── admin/     # React admin panel (JavaScript, Vite)
```

## Getting Started

Each folder is an independent app with its own `package.json`.

### Backend

```bash
cd backend
npm install
npm run dev
```

Runs the API on http://localhost:4000 by default (see `backend/.env.example`).

### Public (client app)

```bash
cd public
npm install
npm run dev
```

Runs the client app on http://localhost:5173.

### Admin (admin panel)

```bash
cd admin
npm install
npm run dev
```

Runs the admin app on http://localhost:5174.

## Tech Stack

- **Backend**: Node.js, Express (JavaScript)
- **Public / Admin**: React, Vite (JavaScript)

## License

Private / Proprietary (update as needed).
