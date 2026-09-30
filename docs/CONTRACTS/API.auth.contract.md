# Auth API Contract

| | |
|---|---|
| **Status** | `APPROVED` |
| **Lifecycle** | DRAFT → REVIEW → APPROVED → IMPLEMENTED |
| **Reviewed** | 2026-09-29 |
| **PRD references** | §30 (authentication), §52 (User), §59–§63 (security), §101, §134 |
| **Describes** | The **already-implemented** `/api/auth` router. This document changes no behaviour. |

> **Retroactive contract.** Every endpoint here shipped in Phase 0/1 and is covered by
> `backend/test/auth.test.js` (21 tests). This contract records what was built so the
> contract repository is a complete description of the API surface. Where this document
> and `backend/src/routes/auth.routes.js` disagree, **the code is correct and this
> document is wrong** — fix the document, never the route.

---

## 1. Purpose

Authentication for SafarUp. There is **no Firebase Auth** and no third-party identity
provider: the stack is JavaScript-only, so sessions are self-managed (§1.1 changelog,
v1.1/v1.2). Passwords are hashed with bcrypt; access is a short-lived JWT delivered in an
`httpOnly` cookie, with a separate refresh token for renewal.

This is a **public + admin** contract. `/login` and `/admin/login` are distinct endpoints
with distinct rate limits because they have different threat profiles (§97).

---

## 2. Transport conventions

All routes are mounted under `/api/auth` (`backend/src/routes/index.js`).

| Rule | Value |
|---|---|
| Request validation | Zod, via `validate(schema)` middleware — a malformed body is rejected **before** the controller runs |
| Success | `200`/`201` + a JSON envelope from `utils/ApiResponse.js` |
| Failure | `{ error: { code, message, details? } }` from `utils/ApiError.js` |
| Rate limiting | `express-rate-limit`, per-endpoint, keyed by IP |
| Auth state | `authenticate` middleware; reads the access-token cookie, falls back to `Authorization: Bearer` |
| Audit | Login, logout, password reset and token refresh are written to `AuditLog` |

---

## 3. Endpoints

### Public registration

#### `POST /api/auth/register`
Creates a `User` and sends a verification email.

- **Auth:** none · **Rate limit:** `registerLimiter`
- **Body** (`registerSchema`): `email`, `password`, `fullName`, optional `phone`
- **Validation:** Zod `registerSchema`; email format, password strength, name length
- **Response:** `201` with the created user (never the password hash)
- **Errors:** `409` if the email is already registered; `400` on validation failure

#### `POST /api/auth/verify-email`
Confirms an email address from the token in the verification email.

- **Body** (`verifyEmailSchema`): `token`
- **Errors:** `400` if the token is missing, malformed or expired
- **Side effect:** user becomes verified; token is single-use

#### `POST /api/auth/resend-verification`
Reissues a verification email.

- **Rate limit:** `registerLimiter` (shares the registration budget deliberately — a
  resend is the same abuse vector as a signup flood)
- **Errors:** does not reveal whether the address exists; always `200`

### Sessions

#### `POST /api/auth/login`
Public login.

- **Rate limit:** `loginLimiter` · **Body:** `loginSchema` — `email`, `password`
- **Response:** `200` + sets the `httpOnly` access-token cookie
- **Errors:** `401` for bad credentials, `403` for an unverified email
- **Note:** deliberately does **not** distinguish "no such user" from "wrong password"

#### `POST /api/auth/admin/login`
Admin-panel login.

- **Rate limit:** `adminLoginLimiter` — tighter than public login
- **Behaviour:** additionally requires an administrative role. A valid non-admin
  credential is rejected, so a compromised customer account cannot reach `/admin`.
- **Errors:** `401` bad credentials · `403` valid credentials, insufficient role
- **Audit:** records the actor and outcome

#### `POST /api/auth/refresh`
Exchanges a valid refresh token for a new access token.

- **Auth:** refresh token (cookie or `Bearer`) · **Body:** none
- **Response:** `200` + a new access token
- **Errors:** `401` if the refresh token is missing, expired or revoked
- **Side effect:** rotates the refresh token; the old one stops working

#### `POST /api/auth/logout`
Revokes the current session.

- **Auth:** `authenticate`
- **Response:** `204` · **Side effect:** clears cookies and revokes the refresh token
- **Audit:** yes

#### `GET /api/auth/me`
Returns the authenticated user.

- **Auth:** `authenticate` (required)
- **Response:** `200` with the current user, excluding the password hash
- **Errors:** `401` when the token is absent, expired or invalid

### Password recovery

#### `POST /api/auth/forgot-password`
Public password-reset request.

- **Rate limit:** `passwordResetLimiter` · **Body** (`forgotPasswordSchema`): `email`
- **Response:** always `200` — never reveals whether the address is registered
- **Side effect:** emails a single-use reset token

#### `POST /api/auth/admin/forgot-password`
Admin password-reset request. Identical mechanics to the public route, with
`adminLoginLimiter`-class throttling and an admin-audited log entry.

#### `POST /api/auth/reset-password`
Completes a reset.

- **Rate limit:** `passwordResetLimiter` · **Body** (`resetPasswordSchema`): `token`, `newPassword`
- **Response:** `200`
- **Side effect:** password hash replaced; **all existing sessions revoked**; token single-use
- **Errors:** `400` on a weak password, a used token or an expired token
- **Audit:** yes

---

## 4. Rate limits

| Limiter | Applies to | Rationale |
|---|---|---|
| `loginLimiter` | `/login` | Credential stuffing |
| `adminLoginLimiter` | `/admin/login` | Higher-value target, tighter budget |
| `registerLimiter` | `/register`, `/resend-verification` | Account and email flooding |
| `passwordResetLimiter` | `/forgot-password`, `/admin/forgot-password`, `/reset-password` | Mail-bomb and token-guessing |

---

## 5. Field classification

| Field | Class | Notes |
|---|---|---|
| `email` | REQUIRED | Unique; normalised to lowercase |
| `password` | SYSTEM-MANAGED | bcrypt hash only; never returned by any endpoint |
| `fullName` | REQUIRED | |
| `phone` | OPTIONAL | |
| `role` | SYSTEM-MANAGED | Set at creation/elevation, never client-supplied |
| `emailVerified` | SYSTEM-MANAGED | |
| `refreshTokenHash` | SYSTEM-MANAGED | Stored hashed, rotated on refresh |
| `createdAt` / `updatedAt` | SYSTEM-MANAGED | |

---

## 6. Relationships

`User` → `AuditLog` is the only relationship. A user is referenced by id in audit
records. No content entity references a user yet; trip/departure assignment arrives with
Phase 3.

---

## 7. Lifecycle

```
register ──> emailVerified ──> active ──> (password reset revokes sessions)
```

---

## 8. Permissions

| Action | Anonymous | Authenticated |
|---|---|---|
| `register` | ✅ | ✅ |
| `verify-email`, `resend-verification` | ✅ | ✅ |
| `login` | ✅ | — |
| `admin/login` | ✅ (must hold an admin role) | — |
| `refresh`, `logout` | — (token required) | ✅ |
| `me` | — | ✅ |
| `forgot-password` / `reset-password` | ✅ | ✅ |

Authorization is enforced **server-side**. Hiding an action in the UI is not
authorization (§60, §63).

---

## 9. Audit requirements

Audited: `admin/login` (success and failure), `logout`, `refresh`, `reset-password`.
Each entry records actor, action, outcome and timestamp via `utils/auditLog.js`.

---

## 10. Explicit non-goals

- **No** OAuth / Google Sign In / Apple Sign In. Google OAuth is supported in the product
  plan; Apple Sign In is deferred (§30). Neither exists in this contract.
- **No** MFA/TOTP, no session/device management UI, no token introspection endpoint.
- **No** public signup for admin roles — roles are assigned operationally.
- **No** rate-limit headers are part of the response contract.

---

## 11. Open questions

- Google OAuth is planned but has no contract. Carried to PRD §30; it needs its own
  contract before implementation.
- Whether admin login should require a second factor is undecided.

Neither blocks Phase 2, and neither may be guessed.
