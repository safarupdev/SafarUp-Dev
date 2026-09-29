# SAFARUP — MASTER PRODUCT REQUIREMENTS DOCUMENT

| | |
|---|---|
| **Product** | SafarUp |
| **Domain** | safarup.in |
| **Admin** | admin.safarup.in |
| **Document** | Master Product Requirements Document |
| **Version** | 1.5 |
| **Status** | Proposed |
| **Date** | September 2026 |
| **Product Type** | Digital Travel Company + Travel Commerce Platform |
| **Primary Market** | India, initially Bihar-focused |
| **Primary Currency** | INR (₹) |

> **v1.5 changelog:** Phase 1 domain decisions and the repository design workflow. **Records four APPROVED decisions** — (a) **Guide** is an internal operational entity for V1 (admin management and trip/departure assignment allowed; public guide marketplace, discovery experience and separate portal remain V1 non-goals per §4); (b) **Category** is a first-class taxonomy entity and **Destination → Category is MANY-TO-MANY via `categoryIds[]`**, not a singular `categoryId` and not an uncontrolled free-text string; (c) **District** is a first-class canonical geographic entity and **Destination → District is 1:1 via `districtId`**, superseding the interim "store `region` as a plain string" proposal; (d) **Place / Attraction** is a **first-class canonical entity** for Phase 2 content foundation, reusable across Destination, Trip itineraries, Places Covered, maps, search, SEO/AEO/GEO and agent resources, and **never duplicated** into destination or trip documents. Establishes the **contract-first, repository-persisted contract system** (`docs/CONTRACTS/`, lifecycle `DRAFT → REVIEW → APPROVED → IMPLEMENTED`) so that contracts are project architecture rather than conversation artifacts. **Supersedes the Figma-based design-to-code workflow**: the visual source of truth is now **OpenCode + `docs/DESIGN_SYSTEM.md` + browser/screenshot visual review** (§178 replaced). Retains the four permanent Masters (§159), structured Trip Detail architecture (§185–§199) and the agent-native product direction (§162–§166). Persists the destination/domain/API/Firestore contracts for the Phase 2 Destination content foundation. Historical changelog entries are retained.
>
> **v1.4 changelog:** Structured Trip Detail / Group Booking content architecture. Adds §185–§200: the canonical Trip Detail content model (§185 trip identity, overview, pickup/drop, day-wise itinerary; §186 places covered; §187 historical/cultural context; §188 inclusions/exclusions; §189 vehicle; §190 accommodation; §191 food/meals; §192 seasonality; §193 important information; §194 booking summary), desktop and mobile Trip Detail composition (§195), Trip Detail SEO/AEO/GEO (§196), the agent-native Trip interface (§197), the group-booking model separation (§198), Trip content-management requirements for the admin CMS (§199), and **§200 Domain Decisions Required** — which records the newly identified `places`/attraction entity gap alongside the existing Guide, Category and District items. Amends §20, §40, §53, §51.1, §182 and §178 to point at the new sections without duplicating them. No business rule is invented where the source material is silent; unresolved items are listed in §200 rather than assumed.
>
> **v1.3 changelog:** Product architecture evolution. Establishes SafarUp as a *human-first, search-discoverable, AI-understandable, agent-operable, automation-ready* platform, and adds §157–§184: the multi-agent development model (§158), the four permanent quality masters (§159), parallel-development governance (§160), contract-first development (§161), human/agent capability parity (§162), the agent-native platform and its safety model (§163–§166), the premium responsive + design-system standard (§167–§171), the SEO/AEO/GEO architecture (§172–§174), vertical slices and quality gates (§175–§177), design-to-code workflow (§178), retention principles (§179), booking/automation evolution (§180), domain-model governance (§181), the revised phase model (§182), the agent-friendly Definition of Done (§183), and the core principle (§184). Also amends §1 (vision), §7/§9 (architecture), §10/§51 (database), §32 (mobile navigation), §34 (design system) and §151 (Definition of Done). §181 flags **Guide**, **Category** and **District** as requiring explicit product reconciliation before implementation — see §51.1.
>
> **v1.2 changelog:** Restored Firebase Firestore as the primary database, accessed server-side through the `firebase-admin` Node SDK (commit `ac402fb`). This reverses the v1.1 database change: the JavaScript-only application stack (React + Vite for `public`/`admin`, Node.js + Express for `backend`, custom JWT/bcrypt authentication) is unchanged and remains in force. What changed is the persistence layer only — data access goes through Firestore data-access modules in `backend/src/models/*.model.js` instead of Mongoose schemas. All data models in §51–59 are unchanged in shape. See §1.1 changelog for the v1.1 history.
>
> **v1.1 changelog:** Replaced the Firebase/TypeScript stack (Firebase Auth, Cloud Functions, Firebase Storage) with a JavaScript-only stack: React + Vite for `public`/`admin`, Node.js + Express for `backend`, custom JWT/bcrypt authentication (Google OAuth supported, Apple Sign In deferred). All data models in §51–59 are unchanged in shape.

---

## 1. Executive Summary

### 1.1 Product Vision

SafarUp is a digital-first travel company designed to make organized travel discoverable, customizable, bookable and manageable online.

SafarUp shall be designed for both human travelers and authorized AI-agent interaction, with a **shared canonical platform layer**. The business logic, authorization model, domain services, availability rules, booking rules and payment rules remain centralized; user interfaces, AI agents and automation systems are all clients of the same capabilities (§157, §162). See §184.

SafarUp will provide two primary travel products:

**Product A — Curated Group Trips**

SafarUp creates complete, ready-to-book trips with:

- Fixed destination
- Fixed departure date
- Fixed return date
- Fixed itinerary
- Fixed/included services
- Fixed capacity
- Defined pricing
- Transportation
- Accommodation
- Meals where applicable
- Activities/sightseeing
- Trip coordinator/guide where applicable

Customers simply select the departure and book available seats.

**Product B — Private / Customized Trips**

Customers who don't want to join a fixed group can request a private trip.

They specify requirements such as:

- Destination
- Dates
- Number of travelers
- Duration
- Pickup location
- Accommodation preference
- Transport preference
- Activities
- Food preferences
- Budget
- Special requirements

SafarUp's operations team prepares a customized itinerary and quotation.

The customer reviews the proposal digitally and, once accepted, completes payment through Razorpay.

---

## 2. Core Product Thesis

SafarUp is not primarily a tourism directory.

SafarUp is not primarily a blog.

SafarUp is not a WhatsApp booking service.

SafarUp is:

> A software-enabled travel business.

The website is the customer-facing storefront.

The admin application is the operational control center.

The backend is the business-rule and integration layer.

```
SAFARUP
   │
   ├──────────────┬──────────────┐
   │                             │
   ▼                             ▼
CUSTOMER SIDE                 OPERATIONS SIDE
safarup.in                    admin.safarup.in
   │                             │
   └──────────────┬──────────────┘
                  │
                  ▼
               BACKEND
                  │
   ┌──────────────┼──────────────┐
   ▼               ▼              ▼
 Firestore        Razorpay        Email
```

---

## 3. Business Objectives

### 3.1 Primary objectives

1. Sell curated group trips online.
2. Digitize private-trip planning.
3. Eliminate WhatsApp as a required booking mechanism.
4. Eliminate manual payment-screenshot workflows.
5. Provide online payment through Razorpay.
6. Provide automated booking confirmation.
7. Provide customer accounts and booking history.
8. Give administrators complete control over trips and operations.
9. Centralize customer, booking and payment data.
10. Build a scalable travel-commerce foundation.

### 3.2 Secondary objectives

- Build SEO traffic through destinations and travel content.
- Establish SafarUp as a recognizable travel brand.
- Create reusable trip templates.
- Enable operational analytics.
- Reduce manual administrative work.
- Create a foundation for future mobile applications.
- Create a foundation for future AI-assisted itinerary generation.

---

## 4. Non-Goals for V1

The following are not core V1 requirements:

- Native Android application
- Native iOS application
- Full open marketplace for arbitrary third-party providers
- Public guide marketplace
- Hotel marketplace
- Flight booking engine
- Train booking engine
- Real-time airline/GDS integration
- Complex loyalty program
- AI-generated itineraries without human approval
- Multi-country tax infrastructure
- Multi-currency commerce

These may become future roadmap items.

---

## 5. Target Customers

### 5.1 Individual traveler

Wants:
- Simple trip discovery
- Transparent pricing
- Easy booking
- Digital confirmation
- Secure payment

### 5.2 Family

Needs:
- Private trip options
- Flexible dates
- Private transport
- Appropriate accommodation
- Family-friendly itinerary

### 5.3 Friends/group

Needs:
- Group capacity
- Shared trip
- Fixed pricing
- Group booking

### 5.4 Couple

Needs:
- Private itinerary
- Flexible accommodation
- Custom experiences
- Privacy

### 5.5 Student/college group

Potential future segment:
- Group transport
- Large capacity
- Institutional/group quotation
- Customized itinerary

---

## 6. Internal Users

### 6.1 Super Admin

Full system authority. Can:
- Manage administrators
- Manage permissions
- Configure system
- View all business data
- Access audit logs
- Manage financial settings

### 6.2 Operations Admin

Responsible for:
- Trips
- Itineraries
- Departures
- Bookings
- Private trip requests
- Customers
- Operations

### 6.3 Content Admin

Responsible for:
- Destinations
- Blog
- Images
- SEO
- FAQs
- Static content

### 6.4 Finance/Admin

Responsible for:
- Payments
- Refunds
- Financial reconciliation
- Invoices
- Revenue reporting

### 6.5 Support Staff

Responsible for:
- Customer enquiries
- Booking assistance
- Cancellation requests
- Support tickets

Role-based permissions must prevent unnecessary access.

---

## 7. Product Architecture

### 7.1 Three-project structure

```
safarup/
├── public/
├── admin/
└── backend/
```

- **public/** — Customer-facing SafarUp application (React, JavaScript, Vite).
- **admin/** — Internal operations application (React, JavaScript, Vite).
- **backend/** — Shared trusted backend/business logic (Node.js, Express, Firestore).

> Naming note: this repository uses `public/` for the customer-facing app (matching the existing scaffold) instead of `web/`. All references to "web" elsewhere in this document refer to this `public/` application.

### 7.2 Canonical platform layer

The backend is the **canonical** implementation of every business capability. `public/`, `admin/`, future mobile applications, AI agents and automation systems are all clients of it (§157, §162).

Consequences, which are binding on all implementation agents (§160, §166):

- Business rules are implemented **once**, in backend services.
- An AI agent calling an API and a human clicking a button reach the same service through the same authorization model (§164).
- Automation must not introduce a second, independent implementation of any rule (§166).
- Agents must not need to reverse-engineer the public website to understand platform capabilities (§163).

---

## 8. Domain Architecture

- **Public** — https://safarup.in
- **Admin** — https://admin.safarup.in
- **Backend** — Backend services are not intended to be a public website.

If a dedicated API surface becomes necessary:

`https://api.safarup.in`

may be introduced later.

---

## 9. Technology Stack

### 9.1 Web (`public`)

- React (JavaScript, no TypeScript)
- Vite
- React Router
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod (runtime validation, used as plain JS schemas)
- Axios (HTTP client)

### 9.2 Admin

- React (JavaScript, no TypeScript)
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Axios
- Recharts (or similar) for dashboard charts

### 9.3 Backend

- Node.js
- Express (JavaScript, no TypeScript)
- Firestore via the `firebase-admin` Node SDK (server-side data access modules)
- JSON Web Tokens (`jsonwebtoken`) for session/auth tokens
- bcrypt for password hashing
- Zod for request validation
- node-cron for scheduled jobs (booking expiry sweep, reminders)

Express provides the HTTP routing and middleware layer for all trusted business logic: pricing, availability, booking state transitions, and payment verification. There is no serverless/Cloud Functions layer — the backend runs as a persistent Node.js process (`server.js` + `app.js`), matching the scaffold already in this repository.

### 9.4 Authentication

Custom authentication built on the Express backend (no Firebase Authentication).

Supported in V1:
- Email/password (bcrypt-hashed, JWT session)
- Google OAuth (via `passport-google-oauth20` or equivalent)

Deferred to a later phase:
- Apple Sign In
- Phone OTP

Email verification is required for email/password accounts (verification token emailed on signup, confirmed via a backend endpoint).

Tokens are issued as short-lived access tokens + refresh tokens, stored in httpOnly secure cookies. Passwords are never stored in plaintext or returned in any API response.

---

## 10. Database

**Primary database:** Cloud Firestore

Firestore is the system of record for application data, accessed exclusively server-side through the `firebase-admin` Node SDK. Each data model in `backend/src/models/*.model.js` is a plain data-access module over a Firestore collection — there is no schema-definition layer, so the §51–59 field lists below are enforced in code (defaults, required fields, and secret-stripping) rather than by a schema. See `models/User.model.js` for the reference implementation of that pattern.

Security must use:
- Backend authentication (JWT) on every protected route
- Backend authorization (role checks) on every admin route
- Input validation (Zod) on every write endpoint
- Service-account credentials held only in environment variables/secret manager (§95), with the key file git-ignored and never committed
- A dedicated, least-privileged service account per environment; the backend must never be reachable with a client-shipped Firebase config

**Firestore Security Rules are still not the access-control layer.** The browser never talks to Firestore directly — all reads and writes go through Express, so Firestore Rules are a defence-in-depth backstop, not the primary control. **All access control is enforced in Express middleware** before any Firestore call is made.

### 10.1 Collection roadmap status (v1.3)

The §51 collection list is a **target**, not a statement of what exists. Every collection carries an explicit status, and no implementation agent may treat a named collection as approved for implementation until its status is `Implemented` or `Planned` (§181).

| Status | Meaning |
|---|---|
| **Implemented** | Data-access module exists in `backend/src/models/` and is covered by tests |
| **Planned** | Approved in this PRD, sequenced in §182, not yet built |
| **Deferred** | Explicitly out of V1 scope |
| **Requires decision** | Named somewhere in the product surface but not reconciled in the domain model — **implementation is blocked** |

Current true state: `users` and `auditLogs` are **Implemented**; every other named collection is unbuilt. The reconciliation items are tracked in §51.1.

---

## 11. Storage

File/media storage is handled by the backend, not a client-facing cloud storage SDK.

Used for:
- Destination images
- Trip images
- Blog images
- User profile images
- Documents
- Invoices where appropriate
- Operational media

**V1 approach:** uploads go through an authenticated Express endpoint (`multer` for multipart handling) and are stored either on local/attached disk (early development) or an S3-compatible object store (recommended before production launch). Storage access must be governed by authenticated authorization in the backend — never by exposing storage credentials to the browser.

---

## 12. Payment

**Payment gateway:** Razorpay

Razorpay provides APIs and webhooks for online payment processing.

SafarUp will not use:
- QR screenshot confirmation
- Manual payment verification through WhatsApp
- "Send payment screenshot"
- Manual UPI confirmation as the core flow

---

## 13. Payment Security

Payment architecture:

```
Customer
  ↓
SafarUp (public app)
  ↓
Create booking intent
  ↓
Backend (Express)
  ↓
Create Razorpay Order
  ↓
Razorpay Checkout
  ↓
Payment
  ↓
Razorpay callback/webhook
  ↓
Backend verification (HMAC signature check)
  ↓
Firestore transaction/batched write
  ↓
Booking confirmed
```

Razorpay recommends server-side handling of trusted amounts, signature validation and HMAC validation for webhooks.

Never store Razorpay secret credentials in the React application. Secrets live only in backend environment variables.

---

## 14. Email Automation

Email automation will be a first-class system.

**Authentication triggers:**
- Welcome email
- Email verification
- Password reset

**Booking triggers:**
- Booking initiated
- Payment successful
- Booking confirmed
- Booking failed
- Booking cancelled
- Refund initiated
- Refund completed

**Private trip triggers:**
- Request received
- Proposal ready
- Proposal accepted
- Payment requested
- Trip confirmed

**Trip triggers:**
- Trip reminder
- Pre-trip instructions
- Departure reminder
- Post-trip thank-you
- Review request

---

## 15. Customer Journey — Group Trip

```
Discover
  ↓
View Trips
  ↓
Select Trip
  ↓
View itinerary
  ↓
Select departure
  ↓
Select number of travelers
  ↓
Login/signup
  ↓
Traveler details
  ↓
Review booking
  ↓
Razorpay
  ↓
Payment
  ↓
Confirmation
  ↓
Customer dashboard
```

---

## 16. Private Trip Journey

```
Destination
  ↓
Plan Private Trip
  ↓
Travel requirements
  ↓
Submit request
  ↓
Admin receives request
  ↓
Admin prepares itinerary
  ↓
Admin calculates quotation
  ↓
Customer receives proposal
  ↓
Customer reviews
  ↓
Accept / Request changes
  ↓
Final quotation
  ↓
Razorpay
  ↓
Payment
  ↓
Booking confirmed
```

---

## 17. Public Website Information Architecture

```
/
├── /trips
├── /trips/:slug
│
├── /destinations
├── /destinations/:slug
│
├── /plan-trip
│
├── /about
├── /contact
│
├── /blog
├── /blog/:slug
│
├── /login
├── /signup
├── /forgot-password
│
├── /dashboard
├── /dashboard/profile
├── /dashboard/bookings
├── /dashboard/bookings/:id
├── /dashboard/private-trips
├── /dashboard/payments
├── /dashboard/invoices
│
└── /legal
    ├── /terms
    ├── /privacy
    ├── /cancellation-refund
    └── /booking-policy
```

---

## 18. Homepage

The homepage is a commercial landing page, not merely a tourism showcase.

**Required sections**

- **Hero** — Primary message: "Travel. Planned Better." Supporting message describing SafarUp. Primary CTAs: Explore Trips, Plan a Private Trip.
- **Upcoming Trips** — Show destination, trip title, date, duration, starting price, availability.
- **Popular Destinations** — Destination cards.
- **Why SafarUp** — Highlight curated trips, transparent booking, secure payment, private customization, digital trip management.
- **How it works** — Discover → Choose → Book → Travel
- **Private Trips** — Dedicated promotional section.
- **Testimonials** — Customer reviews.
- **Travel Stories** — Blog content.
- **Final CTA** — Explore or plan.

---

## 19. Trips Page

Route: `/trips`

**Features**
- Search
- Destination filter
- Date filter
- Duration filter
- Price filter
- Availability filter
- Trip-type filter

**Trip cards show:**
- Hero image
- Trip name
- Destination
- Duration
- Departure date
- Price/person
- Seats remaining
- CTA

---

## 20. Trip Details

Route: `/trips/:slug`

**Required information**

Header:
- Trip title
- Destination
- Duration
- Departure date
- Return date
- Price
- Availability (Capacity: 20, Booked: 12, Available: 8)

Day-wise itinerary, example:

```
DAY 01
09:00 — Departure
12:30 — Arrival
13:30 — Lunch
15:00 — Sightseeing
19:00 — Hotel check-in
21:00 — Dinner
```

- Inclusions
- Exclusions
- Accommodation
- Transport
- Activities
- Important information
- Cancellation policy
- Booking CTA

> **v1.4.** The list above states *which* information the page must carry. The **structure, ownership and contract** for that information — trip identity, overview, pickup/drop, day-wise itinerary, places covered, historical/cultural context, inclusions/exclusions, vehicle, accommodation, meals, seasonality, important information and booking summary — is defined canonically in **§185–§194**. Page composition (desktop and mobile) is **§195**; discoverability is **§196**; the agent interface is **§197**; the TripTemplate → Departure → Booking separation is **§198**.
>
> The day-wise itinerary is a **first-class structured domain element** (Trip → Day → Stop/Activity, order-preserving), **not** a single text blob. See §185.4.

---

## 21. Trip Template vs Departure

This distinction is mandatory.

**Trip Template** defines: *"What the trip is."*

Example: Rajgir Explorer — 2D/1N

Contains: destination, base itinerary, included services, base price, media, description.

**Departure** defines: *"When this specific trip happens."*

Example:
- Trip: Rajgir Explorer
- Departure: 12 October 2026
- Return: 13 October 2026
- Capacity: 20
- Price: ₹4,999

Multiple departures may use the same template.

---

## 22. Destinations

**Destination list** — Route: `/destinations`

Each card: image, name, short description, region, featured status.

**Destination detail** — Route: `/destinations/:slug`

Sections:
- Overview
- Highlights
- Places to visit
- Things to do
- Travel information
- Upcoming SafarUp trips
- Private trip CTA
- Blog articles

The destination page must convert discovery into travel intent.

---

## 23. Private Trip Planner

This is one of SafarUp's defining product features.

1. **Destination** — Customer selects destination.
2. **Travel dates** — Start date, end date.
3. **Travelers** — Adults, children where applicable.
4. **Pickup** — City, location.
5. **Accommodation** — Preferences: Budget / Standard / Premium.
6. **Transport** — Options determined by admin.
7. **Activities** — Customer indicates desired activities/places.
8. **Food** — Preference/options where supported.
9. **Additional requirements** — Free-text requirements.
10. **Submit request** — Customer receives a Private Trip Request ID.

---

## 24. Private Trip Admin Workflow

Admin receives: `PRIVATE REQUEST #PT-1024`

Admin can:
- Review requirements
- Contact internally if necessary
- Select transport
- Select accommodation
- Add activities
- Build itinerary
- Adjust dates
- Add service costs
- Add markup
- Add taxes/fees where applicable
- Set quotation expiry
- Add terms
- Submit proposal

---

## 25. Private Trip Proposal

Customer dashboard shows, e.g.:

```
Rajgir Family Escape
20–21 October 2026
6 Travelers
₹42,500 Total

Accommodation
Transport
Activities
Meals
Service charges

[Accept Proposal]  [Request Changes]
```

Customer acceptance changes proposal state.

---

## 26. Booking Engine

Booking states:

```
DRAFT
PENDING_PAYMENT
PAYMENT_PROCESSING
CONFIRMED
CANCEL_REQUESTED
CANCELLED
REFUND_PENDING
REFUNDED
COMPLETED
```

Invalid state transitions must be rejected.

---

## 27. Seat Management

For group trips:

```
capacity = 20
confirmed = 14
available = 6
```

Booking must be transaction-safe.

Two customers must not be able to consume the same final seat.

The system must prevent overselling through atomic/transactional reservation logic.

---

## 28. Booking Expiry

Pending payment bookings may reserve seats temporarily.

Example configurable policy:

```
Pending payment
  ↓
Reservation hold
  ↓
Payment deadline
  ↓
Paid → Confirmed
Not paid → Expired
  ↓
Seats released
```

The exact hold duration should be an admin-configurable business setting.

---

## 29. Customer Dashboard

- **Dashboard** — Upcoming trip, booking status, payment status, private trip requests, notifications.
- **My Trips** — Upcoming, Completed, Cancelled.
- **Booking detail** — Booking ID, trip, travelers, date, itinerary, amount, payment, cancellation status.
- **Payments** — Transaction history: amount, date, status.
- **Invoices** — View, download.
- **Profile** — Name, email, profile image, traveler information.

---

## 30. Authentication

**Sign up (email/password)**

Fields: full name, email, password, confirm password, terms acceptance. Password is hashed with bcrypt before storage. Email verification required (verification token emailed on signup, confirmed via backend endpoint).

**Google** — OAuth (via `passport-google-oauth20` or equivalent), linked to the `users` collection via `googleId`.

**Apple Sign In** — Deferred to a later phase (see §4, Non-Goals for V1); the `authProvider` field on the user schema (§52) is designed to accommodate it later without a schema migration.

---

## 31. Account Linking

If the same verified email address is used to sign up via a different provider (e.g. Google after an existing email/password account), the backend should detect the collision by email and link the new provider to the existing `users` document rather than creating a duplicate account.

Avoid duplicate customer profiles.

---

## 32. Mobile Experience

SafarUp is mobile-first in interaction design, while remaining premium on desktop.

The mobile experience must feel like an application.

**Mobile navigation** — Use a floating bottom navigation system.

Recommended: Home, Trips, Explore, Bookings, Account.

> **Binding (v1.3, §168).** Bottom navigation is the **primary global navigation pattern** for the public mobile experience. A hamburger menu shall **not** be used as the default primary global navigation mechanism. Any deviation from the bottom-navigation pattern requires explicit product/design approval.
>
> The bottom-navigation system must define: active state, inactive state, icons, labels, safe-area handling, touch-target sizing, scroll interaction, accessibility, transitions, and contextual actions.

**Visual language:**
- Glass-like translucent surface
- Backdrop blur
- Rounded container
- Soft border
- Subtle elevation
- Animated active state
- Large touch targets

The design should be SafarUp-branded, not a literal Apple UI clone.

> **Binding (v1.3, §167, §169).** Desktop and mobile share the same brand and design system but have **independently designed** information hierarchy, composition, interaction patterns and navigation. Mobile shall not be a mechanically scaled-down desktop layout. Touch-appropriate patterns on mobile include horizontal carousels, bottom sheets, sticky actions, touch-friendly filters, swipe interactions, expandable sections and mobile-first search; desktop may use hover states, multi-column layouts, side filters, expanded navigation and richer spatial composition. The same functionality must remain understandable in both.

---

## 33. Desktop Experience

Desktop should feel like a premium travel website/application.

Header: SafarUp, Trips, Destinations, Plan a Trip, Blog, About, Login, Account.

Desktop layouts can use:
- Wide hero sections
- Multi-column grids
- Rich imagery
- Side-by-side itinerary layouts
- Sticky booking panel

---

## 34. Design System

**Design principles**

1. Premium
2. Travel-oriented
3. Trustworthy
4. Spacious
5. Fast
6. Clear
7. Conversion-focused
8. Accessible
9. Consistent
10. Distinctive SafarUp identity

**Components**

Button, Input, Select, Date picker, Search, Card, Trip card, Destination card, Price block, Availability indicator, Timeline, Itinerary day, Modal, Drawer, Toast, Dialog, Bottom navigation, Header, Footer, Skeleton, Empty state, Error state, Confirmation state.

> **Binding (v1.3, §171).** SafarUp maintains a **centralized product design system** that is the visual source of truth for implementation. Major public experiences require intentional desktop **and** mobile compositions, and must use this centralized system rather than inventing per-screen styling. The Design Master (§159.1) owns it and prevents inconsistent AI-generated UI patterns across applications.
>
> The system is organised in three layers: **Foundations** (brand colors, typography, spacing, grids, radii, shadows, iconography); **Components** (buttons, navigation, bottom navigation, cards, search, filters, forms, dialogs, sheets, badges, trip cards, destination cards, itinerary components, booking components); and **Interaction States** (hover, active, focus, disabled, loading, success, error, empty).

---

## 35. Admin Application

Admin is not a secondary dashboard. It is the operational backbone.

---

## 36. Admin Navigation

```
Dashboard

Trips
├── Trip Templates
├── Departures
├── Itineraries
└── Availability

Private Trips
├── Requests
├── Proposals
└── Active

Bookings
├── All
├── Pending
├── Confirmed
├── Cancelled
└── Completed

Customers
Destinations
Hotels
Transport
Activities
Blog

Payments
├── Transactions
├── Refunds
└── Reconciliation

Communications
Reports
Settings
Audit Logs
```

---

## 37. Admin Dashboard

**KPIs:** Today's bookings, revenue, upcoming departures, seats sold, seats available, pending private requests, pending payments, cancellation requests.

**Charts:** Booking trend, revenue trend, popular destinations, trip performance.

---

## 38. Destination Management

Admin can: create, edit, publish, unpublish, archive, feature, upload images, edit SEO, manage highlights, manage related trips.

Status: `DRAFT`, `PUBLISHED`, `ARCHIVED`

---

## 39. Trip Template Management

Admin creates: name, slug, destination, description, duration, images, base price, itinerary, inclusions, exclusions, terms, SEO metadata.

---

## 40. Itinerary Builder

Admin can create:

```
Day 1
 ├── Time
 ├── Location
 ├── Activity
 ├── Description
 ├── Meal
 └── Notes

Day 2
 ...
```

Support: reordering, add/remove activities, time editing, notes, media.

> **v1.4.** This is the admin capability summary. The canonical, order-preserving Trip → Day → Stop/Activity structure that this builder edits — including the conceptual fields for each level, overnight marking and meal association — is defined in **§185.4**. Structured Trip content-management requirements beyond the itinerary are in **§199**.

---

## 41. Departure Management

Admin defines: departure date, return date, capacity, price, pickup point, status, booking cutoff, special notes.

Statuses: `DRAFT`, `OPEN`, `ALMOST_FULL`, `FULL`, `CLOSED`, `CANCELLED`, `COMPLETED`

---

## 42. Hotel Management

Admin stores: name, location, category, room type, cost, contact, amenities, images, availability notes.

---

## 43. Transport Management

Admin can configure: vehicle type, capacity, provider, cost, pickup, drop, driver/coordinator information.

---

## 44. Activity Management

Admin can create: activity, destination, description, duration, cost, age restrictions, availability, included/excluded status.

---

## 45. Booking Management

Admin sees: booking ID, customer, trip, departure, travelers, amount, payment, status, created time.

Admin actions: view, confirm where authorized, cancel, process refund request, add internal notes, download invoice, contact customer.

---

## 46. Payment Management

Display: Razorpay order ID, payment ID, amount, currency, status, booking ID, customer, timestamp, refund state.

Never expose secret credentials.

---

## 47. Refund Management

Refund workflow:

```
Customer cancellation
  ↓
Policy evaluation
  ↓
Refund eligibility
  ↓
Admin review if required
  ↓
Refund initiated
  ↓
Razorpay
  ↓
Refund confirmation
  ↓
Booking updated
  ↓
Email sent
```

Cancellation rules must be configurable per trip.

---

## 48. Cancellation Policy Engine

A trip can define rules such as:

- \> 15 days before departure → 100% refund
- 7–14 days → 75%
- 3–6 days → 50%
- < 3 days → No refund

These are examples of configurable rules, not fixed SafarUp policy. The actual commercial policy must be defined separately.

---

## 49. Blog CMS

Admin can: create article, edit, save draft, publish, schedule, archive.

Fields: title, slug, cover image, excerpt, content, author, category, tags, SEO title, SEO description, canonical URL, published date.

---

## 50. SEO

Every public content entity must support: SEO title, meta description, canonical URL, Open Graph image, structured metadata where applicable, sitemap inclusion, robots configuration.

**SEO targets:** Bihar tourism, Bihar travel, Bihar tour packages, Bihar weekend trips, Rajgir trips, Bodh Gaya trips, destination-specific queries.

No keyword stuffing.

---

## 51. Firestore Data Model

Core collections, **with roadmap status** (v1.3; see §10.1 for the status vocabulary and §51.1 for reconciliation items). Each collection is accessed through a data-access module in `backend/src/models/`.

| Collection | Status | Phase (§182) |
|---|---|---|
| `users` | **Implemented** | 0 |
| `auditLogs` | **Implemented** | 0 |
| `destinations` | Planned | 2 |
| `districts` | Planned | 2 |
| `categories` | Planned | 2 |
| `places` | Planned | 2 |
| `guides` | Planned | 2 (internal ops only) |
| `tripTemplates` | Planned | 3 |
| `itineraries` | Planned | 3 |
| `departures` | Planned | 3 |
| `bookings` | Planned | 4 |
| `bookingTravelers` | Planned | 4 |
| `payments` | Planned | 5 |
| `privateTripRequests` | Planned | 2 |
| `privateTripProposals` | Planned | 2 |
| `hotels` | Planned | 2 |
| `activities` | Planned | 2 |
| `transportProviders` | Planned | 2 |
| `refunds` | Planned | 5 |
| `reviews` | Planned | 2 |
| `blogPosts` | Planned | 2 |
| `notifications` | Planned | 7 |
| `supportTickets` | Planned | 2 |
| `coupons` | Planned | 7 |
| `settings` | Planned | 0 |
| **slugClaims** | Planned | 2 — infrastructure, not a domain entity (see §51.3) |
| **Guides** | Planned | 2 — internal ops only, see §51.1 |
| **Categories** | Planned | 2 — N:M via `categoryIds[]`, see §51.1 |
| **Districts** | Planned | 2 — 1:1 via `districtId`, see §51.1 |
| **Places** | Planned | 2 — canonical entity, see §51.1 |

Raw target list (for reference; status above is authoritative):

```
users
destinations
tripTemplates
departures
itineraries
hotels
transportProviders
activities
privateTripRequests
privateTripProposals
bookings
bookingTravelers
payments
refunds
reviews
blogPosts
notifications
supportTickets
coupons
settings
auditLogs
```

Documents use Firestore's native auto-generated document ID as primary key. Foreign references (e.g. `userId`, `tripTemplateId`) are stored as document-ID strings and resolved explicitly by the data-access layer where needed.

Two collections have bespoke keying rules, both for integrity guarantees rather than performance:

- **`users`** — the document ID **is** the lowercased email address. Firestore has no unique-index constraint equivalent to a relational unique index, so keying by email makes a duplicate account impossible to create by construction. Creation is **transactional** (read-then-write inside `db.runTransaction`), because keying alone does not prevent two concurrent writes from clobbering each other.
- **`auditLogs`** — auto-generated IDs via `.add()`, and the module deliberately exposes no update or delete function, keeping the log append-only (§59, §77).

### 51.1 Domain model governance — resolved and unresolved entities (§181)

Four entities appeared in the product surface without a domain-model position. **All four are now APPROVED (v1.5)** and recorded below. Per §181 these decisions are **not to be reopened**.

| Entity | Where it appears | Decision | Status |
|---|---|---|---|
| **Guide** | §108 Guide Model; §107 partner entities | **Internal operational entity for V1.** A `guides` collection is allowed. Admin management is allowed. Guide may be associated with trips/departures where operationally required. **Not allowed in V1:** public guide marketplace, public guide discovery experience, separate `guide.safarup.in` portal. The §4 V1 non-goal on a public guide marketplace remains in force. | ✅ **APPROVED** |
| **Category** | §173 Destination attributes; §42 hotel attribute; §49 blog attribute; §115 "Explore can contain: … Categories" | **First-class taxonomy entity.** A `categories` collection is allowed. **Destination → Category is MANY-TO-MANY** via `categoryIds[]`. Uncontrolled free-text category values must **not** be the canonical Destination relationship. | ✅ **APPROVED** |
| **District** | §173 Destination attributes; §22 destination card "region" | **First-class canonical geographic entity.** A `districts` collection is allowed. **Destination → District is 1:1** via `districtId`. A free-form `region` string is **not** the canonical relationship. This **supersedes** the §51.2 interim proposal. | ✅ **APPROVED** |
| **Place / Attraction** | §22 "Places to visit"; §173; §185.3; §186 (v1.4) | **First-class canonical entity**, part of the Phase 2 content foundation. Independently identifiable and referenceable across Destination, Trip itineraries, Places Covered, maps, search, SEO/AEO/GEO and agent resources. **Place records must never be duplicated** into individual destination or trip documents (§186). | ✅ **APPROVED** |

**Canonical relationship model (v1.5):**

```
District    1:N  Destination
Category    N:M  Destination      (categoryIds[])
Place       N:M  Destination      (placeIds[])
Destination 1:N  TripTemplate
TripTemplate 1:1 Itinerary
Itinerary   1:N  ItineraryDay
ItineraryDay 1:N ItineraryStop / Activity
ItineraryStop  →  may reference Place
TripTemplate 1:N Departure
Departure   1:N  Booking
Booking     1:N  Traveler
Booking     1:N  Payment
```

Where the PRD has not established a cardinality, it is **documented as a contract question**, not silently chosen. See §200 and `docs/CONTRACTS/`.

#### 51.2 District — superseded

The interim proposal that `region` be stored "as a **plain string field on the destination document** in V1" is **superseded and withdrawn**. District is a canonical entity and Destination references it via `districtId`. Do not implement a free-form `region` string as the canonical relationship.

> **Naming note.** The PRD's public-facing language in §22 still describes a destination card field as "region". That is **display language**, satisfied by resolving `districtId` to the District's `name`. The stored relationship is `districtId`.

#### 51.3 `slugClaims` — slug-uniqueness infrastructure (v1.5)

Public content entities are addressed by a readable `slug` (§131). Firestore provides no unique constraint on a non-ID field, and a check-then-write is not atomic — the same class of defect that made `User.create()` unsafe in Phase 0, where a concurrent write could silently overwrite an account.

A `slugClaims` collection therefore provides atomic slug claiming:

| Aspect | Value |
|---|---|
| Document ID | **the slug string** |
| Fields | `entityId`, `collection`, `createdAt` |
| Scope | Shared across all slugged entities (`destinations`, `districts`, `categories`, `places`, and later trips/blog posts) |
| Exposure | **Never** exposed through any API; never queried by a UI |
| Classification | **Infrastructure, not a business entity** — it carries no product meaning and has no lifecycle |

Creation of any slugged entity claims the slug and writes the document **inside one Firestore transaction**. Claiming and writing must never be split.

A release mechanism is required if and only if slug mutation is permitted; that policy is open (§200.8), but any implementation that permits mutation must release the old claim in the same transaction that writes the new one.

---

## 52. User Document

Collection: `users`

Fields: `_id`, `email`, `passwordHash`, `displayName`, `photoURL`, `role`, `authProvider` (`local` \| `google`), `googleId`, `emailVerified`, `emailVerificationToken`, `passwordResetToken`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`

`passwordHash` is generated with bcrypt and is never selected/returned by default on any query (`select: false` at the schema level). Traveler-specific information (pickup preferences, saved travelers, etc.) is stored in related documents referencing `userId`, not embedded in the core user record, to keep authentication documents small and stable.

---

## 53. Trip Template

Collection: `tripTemplates`

Fields: `_id`, `title`, `slug`, `destinationId` (ref `destinations`), `description`, `durationDays`, `durationNights`, `heroImage`, `gallery`, `basePrice`, `currency`, `status`, `featured`, `itineraryId` (ref `itineraries`), `inclusions`, `exclusions`, `terms`, `createdBy` (ref `users`), `updatedBy` (ref `users`), `createdAt`, `updatedAt`

> **v1.4 — this field list is a baseline, not the final contract.** It predates the structured Trip Detail model and is **insufficient on its own**: a single `description` string cannot carry the Trip Detail experience.
>
> §185–§194 define the additional structured content a Trip Template must support (identity, overview, pickup/drop, day-wise itinerary, places covered, historical/cultural context, inclusions/exclusions, vehicle, accommodation, meals, seasonality, important information). §185 is the canonical content model. **Field-level names and collection boundaries for that content are not yet fixed** and are tracked in §200.4 — the Trip Detail contract must be approved before this list is extended, so that no implementation agent invents its own fields (§161, §181).

---

## 54. Departure

Collection: `departures`

Fields: `_id`, `tripTemplateId` (ref `tripTemplates`), `departureDate`, `returnDate`, `capacity`, `reservedSeats`, `confirmedSeats`, `availableSeats`, `price`, `status`, `pickupLocations`, `bookingCutoff`, `createdAt`, `updatedAt`

---

## 55. Booking

Collection: `bookings`

Fields: `_id`, `bookingNumber`, `userId` (ref `users`), `tripTemplateId` (ref `tripTemplates`), `departureId` (ref `departures`), `status`, `travelerCount`, `subtotal`, `discount`, `tax`, `total`, `currency`, `paymentStatus`, `razorpayOrderId`, `createdAt`, `updatedAt`

---

## 56. Private Trip Request

Collection: `privateTripRequests`

Fields: `_id`, `userId` (ref `users`), `destinationId` (ref `destinations`), `travelStartDate`, `travelEndDate`, `travelerCount`, `pickupLocation`, `hotelPreference`, `transportPreference`, `activityPreferences`, `foodPreferences`, `budget`, `specialRequirements`, `status`, `createdAt`, `updatedAt`

---

## 57. Private Proposal

Collection: `privateTripProposals`

Fields: `_id`, `requestId` (ref `privateTripRequests`), `version`, `itinerary`, `services`, `subtotal`, `markup`, `tax`, `discount`, `total`, `currency`, `validUntil`, `status`, `createdBy` (ref `users`), `createdAt`, `updatedAt`

Proposal versioning is mandatory. If an admin changes the proposal, a new version should be created rather than destroying the historical record.

---

## 58. Payment

Collection: `payments`

Fields: `_id`, `bookingId` (ref `bookings`), `userId` (ref `users`), `razorpayOrderId`, `razorpayPaymentId`, `amount`, `currency`, `status`, `method`, `signatureVerified`, `capturedAt`, `createdAt`, `updatedAt`

---

## 59. Audit Log

Every sensitive administrative action should be auditable.

Collection: `auditLogs`

Fields: `_id`, `actorId` (ref `users`), `actorRole`, `action`, `entityType`, `entityId`, `before`, `after`, `timestamp`, `ipMetadata`

Avoid storing unnecessary sensitive information.

---

## 60. Authorization Model

```
SUPER_ADMIN
    ↓
ADMIN
    ↓
OPERATIONS
    ↓
CONTENT
    ↓
FINANCE
    ↓
SUPPORT
```

Each role receives explicit permissions.

Do not implement authorization only through hidden UI buttons. Authorization must also be enforced server-side.

---

## 61. Security

Mandatory controls: JWT-based authentication, role-based backend authorization on every admin route, bcrypt password hashing, server-side payment verification, secret management via environment variables, rate limiting for sensitive endpoints (`express-rate-limit`), input validation (Zod) on every write endpoint, output sanitization, audit logging, least privilege, secure httpOnly cookies for session tokens, HTTPS everywhere (enforced via reverse proxy/load balancer in production).

---

## 62. Business Logic Must Live in Backend

Never trust the browser for: price, discount, seat count, payment amount, booking confirmation, refund eligibility, admin privileges, proposal acceptance, financial status.

Example:

```
Browser:  "I want 4 seats."
Backend:  "Trip price = ₹4,999. 4 seats available. Total = ₹19,996."
Backend:  Create Razorpay order.
Browser:  Open checkout.
Backend:  Verify payment.
Backend:  Confirm booking.
```

---

## 63. Backend Access Control Model

There is no client-side database, so Firestore Security Rules are never on the critical path — every access rule is enforced by Express middleware and route handlers before any Firestore call runs. Rules may additionally be configured as a defence-in-depth backstop (see §10).

Public/anonymous requests should only reach endpoints that return explicitly public data, e.g. published destinations, trips, blog posts (`GET`/read-only).

**Customers (authenticated, `role: customer`):** own profile (read/update via authenticated middleware scoping queries to `req.user._id`), own bookings (read-only), own payments (read-only), own private requests (read/write per workflow, scoped to `userId`).

**Admin (authenticated, role in `SUPER_ADMIN`/`ADMIN`/`OPERATIONS`/`CONTENT`/`FINANCE`/`SUPPORT`):** access determined by a role-permission map checked in an authorization middleware (see §60) on every admin route; never inferred from the frontend alone.

---

## 64. Private Data

Never expose: internal margins, supplier costs, admin notes, payment secrets, private operational contacts, internal financial data, customer data belonging to another customer.

---

## 65. Notification System

**Channels:**
- Email — primary transactional channel.
- In-app — for logged-in customers.
- Optional future channels — SMS/WhatsApp can be considered later, but must not become the core booking workflow.

---

## 66. Customer Notification Events

```
ACCOUNT_CREATED
EMAIL_VERIFIED
BOOKING_CREATED
PAYMENT_SUCCESSFUL
BOOKING_CONFIRMED
PAYMENT_FAILED
PRIVATE_REQUEST_RECEIVED
PROPOSAL_READY
PROPOSAL_ACCEPTED
TRIP_REMINDER
TRIP_UPDATED
BOOKING_CANCELLED
REFUND_INITIATED
REFUND_COMPLETED
REVIEW_REQUEST
```

---

## 67. Admin Notifications

Admins should receive alerts for: new booking, new private-trip request, payment failure, cancellation request, refund request, trip reaching capacity, low availability, operational issues.

---

## 68. Search

**V1 search:** destinations, trips, blog.

**Future:** semantic destination search, personalized discovery, AI itinerary assistant.

---

## 69. Reviews

After completed trips, customer receives a prompt: "Rate your SafarUp experience."

Fields: overall rating, review, optional images. Admin moderation should exist.

---

## 70. Coupons

Future-ready schema should support: percentage discount, fixed discount, trip-specific coupon, destination-specific coupon, minimum booking value, expiry, usage limit, per-user limit.

But coupons should not be unnecessarily complex in initial launch.

---

## 71. Analytics

**Acquisition:** visitors, sources, landing pages, destination views.

**Product:** trip views, booking conversion, private-trip requests, search activity.

**Commerce:** gross bookings, revenue, average order value, payment success rate, cancellation rate.

**Operations:** seats sold, capacity utilization, trip performance, proposal conversion.

---

## 72. Error Handling

- **Loading** — skeleton UI.
- **Empty** — meaningful empty states.
- **Error** — human-readable error.
- **Retry** — where appropriate.
- **Network failure** — graceful recovery.

Never expose raw Firestore/Razorpay/server stack traces or internal error messages to customers — map them to human-readable messages at the API boundary.

---

## 73. Observability

Production should track: errors, failed functions, payment failures, booking failures, authentication failures, slow requests, webhook failures.

A production monitoring service such as Sentry can be integrated if desired as part of the deployment configuration.

---

## 74. Idempotency

Critical operations must be idempotent, especially: payment webhooks, booking confirmation, refund processing, email sending, seat reservation, proposal acceptance.

If a webhook arrives twice, it must not create two bookings.

---

## 75. Webhook Processing

```
Receive
  ↓
Validate signature
  ↓
Check event ID/idempotency
  ↓
Load booking/payment
  ↓
Apply valid state transition
  ↓
Write audit record
  ↓
Trigger notification
  ↓
Return success
```

---

## 76. Booking Transaction Safety

Example: 20-seat trip. Two customers attempt to book the last seat.

System must ensure: Request A → gets seat, Request B → receives sold-out/availability response.

Never: A sees 1 seat, B sees 1 seat, A confirms, B confirms = -1 seats.

---

## 77. Admin Auditability

Track who: changed price, changed capacity, cancelled booking, issued refund, changed itinerary, published trip, changed private quotation, changed customer status.

---

## 78. Content Publishing

```
Draft
  ↓
Review
  ↓
Publish
  ↓
Update
  ↓
Archive
```

Do not delete production content unnecessarily. Use archival/status flags.

---

## 79. Trip Lifecycle

```
DRAFT
  ↓
PUBLISHED
  ↓
OPEN
  ↓
BOOKING
  ↓
FULL
  ↓
DEPARTED
  ↓
COMPLETED
  ↓
ARCHIVED
```

Cancellation is a separate exceptional state.

---

## 80. Private Request Lifecycle

```
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
PLANNING
  ↓
PROPOSAL_READY
  ↓
CUSTOMER_REVIEW
  ├── REQUEST_CHANGES
  │       ↓
  │   PLANNING
  │
  └── ACCEPTED
         ↓
     PAYMENT_PENDING
         ↓
       CONFIRMED
```

---

## 81. Customer Account UX

The account must be useful, not merely an authentication screen. The user should be able to see:

- What have I booked?
- What do I need to pay?
- When am I traveling?
- What is my itinerary?
- What is my booking status?
- What private trip proposal is pending?

---

## 82. Responsive Design Breakpoint Strategy

- **Desktop** — large navigation, multi-column layout, rich visual hierarchy, side panels.
- **Tablet** — adaptive grids, compact navigation.
- **Mobile** — single-column, floating bottom navigation, sticky CTA, touch-first controls, swipeable cards, app-like interaction.

---

## 83. Accessibility

Target WCAG-aligned implementation.

Requirements: keyboard navigation, focus states, semantic HTML, alt text, form labels, error announcements, sufficient contrast, touch target sizes, reduced-motion support.

> Note: full WCAG compliance validation requires manual testing with assistive technologies and expert accessibility review; automated checks alone are not sufficient evidence of conformance.

---

## 84. Performance

Targets: fast initial load, optimized images, lazy loading, code splitting, route-based loading, cached public content, minimal JavaScript where possible.

Core public pages should remain fast even on mid-range mobile devices and slower Indian networks.

---

## 85. Image Strategy

Use: responsive images, WebP/AVIF where appropriate, proper compression, lazy loading, CDN delivery in front of the object storage/backend used for uploaded media (see §11).

Hero images must not unnecessarily block first meaningful rendering.

---

## 86. PWA

Public SafarUp should be PWA-ready.

Capabilities: installable web app, app icon, splash/launch experience, offline fallback, cached static shell.

Do not promise full offline booking functionality.

---

## 87. Admin Responsiveness

Admin is desktop-first. It should still be usable on tablets.

Mobile admin can be supported for essential operations, but full operational workflows should be optimized for desktop.

---

## 88. Customer Support

Contact page should provide: contact form, email, phone, support request.

WhatsApp may exist as an optional communication channel. However:

> Booking must remain inside SafarUp.

---

## 89. Legal Pages

Required: Terms & Conditions, Privacy Policy, Cancellation & Refund Policy, Booking Policy, Cookie Policy where applicable.

All policy content must be reviewed before production launch.

---

## 90. Security Rule: Customer Data

Customer data must be isolated. A customer must never be able to query another customer's booking, payment, private-trip request, personal information, or invoice.

---

## 91. Admin Security

Admin must have: strong authentication, role-based authorization, secure session management, audit logging, optional/required MFA according to operational security policy, restricted administrative permissions.

Razorpay itself recommends strong access control and 2FA for its own dashboard accounts.

---

## 92. Environment Strategy

```
Development
  ↓
Staging
  ↓
Production
```

Never develop directly against production data.

---

## 93. Database Environment Strategy

Prefer a separate Firebase project per environment:

- `safarup-dev`
- `safarup-staging`
- `safarup-production`

Each environment gets its own service-account credentials, supplied via environment variables (`FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_SERVICE_ACCOUNT_PATH` for local key files) and never hardcoded or committed (§95). Project selection is driven entirely by which credentials are loaded, so development data can never contaminate production. A service-account key file must be covered by `.gitignore` (see `backend/.gitignore`).

---

## 94. Razorpay Environment

```
Razorpay Test
  ↓
Integration Testing
  ↓
Production Keys
```

Never commit production keys.

---

## 95. Secrets

Secrets must be stored through appropriate secret/environment management.

Never commit to Git:
- `RAZORPAY_KEY_SECRET`
- `EMAIL_API_KEY`
- `SERVICE_ACCOUNT_PRIVATE_KEY`

---

## 96. Git Strategy

Recommended branches: `main`, `develop`, `feature/*`, `fix/*`, `release/*`

Pull requests should require build, type check, lint, and tests before merge.

---

## 97. CI/CD

**Every PR:** Install → Lint → Typecheck → Unit tests → Build

**Production:** Approved PR → Build → Deploy staging → Smoke test → Production deployment

---

## 98. Testing Strategy

**Unit** — pricing, availability, cancellation, discount, state transitions.

**Integration** — Firestore (data-access modules), Razorpay, email delivery, scheduled jobs (node-cron).

**E2E (group trip)** — Browse → Select → Login → Book → Pay → Confirm

**E2E (private trip)** — Request → Admin proposal → Customer acceptance → Payment → Confirmation

---

## 99. Critical Test Cases

**Payment:** successful payment, failed payment, abandoned checkout, duplicate callback, invalid signature, wrong amount, refund.

**Booking:** last seat, multiple simultaneous bookings, expired payment, cancellation, duplicate submission.

**Authentication:** email signup, email verification, Google login, existing account, password reset, provider account linking. (Apple login test cases apply once Apple Sign In ships — see §30.)

---

## 100. Admin Testing

Verify:
- Unauthorized admin cannot access protected pages.
- Content admin cannot modify financial records.
- Finance user cannot change trip content unless permitted.
- Operations user cannot manage system settings unless permitted.
- Audit records are created for sensitive actions.

---

## 101. Data Validation

Use shared schemas (e.g. Zod) across web, admin, and backend — but backend validation remains authoritative.

---

## 102. API / Function Contracts

Functions should be organized around business capabilities, e.g.:

```
createBooking
createRazorpayOrder
verifyPayment
handlePaymentWebhook
cancelBooking
requestRefund
createPrivateTripRequest
createPrivateProposal
updatePrivateProposal
acceptPrivateProposal
calculateTripPrice
checkAvailability
reserveSeats
releaseSeats
```

---

## 103. Pricing Engine

Pricing must be centralized. Conceptually:

```
Base price
+ selected services
+ transport
+ hotel
+ activities
+ taxes/fees
- discounts
= final amount
```

The exact formula varies by trip. The customer-facing amount must come from the trusted backend.

---

## 104. Private Trip Pricing

```
Transport cost
+ accommodation cost
+ activity cost
+ meal cost
+ operational cost
+ SafarUp margin
+ applicable taxes/fees
= quotation
```

Internal costs should never be exposed unless intentionally configured.

---

## 105. Trip Profitability

Admin should eventually see:

```
Selling Price
- Transport Cost
- Hotel Cost
- Activity Cost
- Other Costs
= Gross Contribution
```

This is an internal admin feature.

---

## 106. Inventory Model

For V1, inventory can be managed manually through admin: seats, hotel allocations, vehicle capacity, activity capacity.

Future integrations can automate external availability.

---

## 107. Partner Model

Future-ready partner entities may include: hotel, transport provider, activity provider, guide, restaurant.

However, V1 does not need a public provider marketplace.

---

## 108. Guide Model

Guides/coordinators may be managed internally as operational resources.

A separate public `guide.safarup.in` portal is not part of the current three-application launch architecture unless reinstated later.

---

## 109. Blog Strategy

Blog is not just content. It should drive:

```
Google Search
  ↓
Blog
  ↓
Destination
  ↓
Trip
  ↓
Booking
```

Every relevant article should contain contextual travel CTAs.

---

## 110. Conversion Strategy

- **Primary:** Book Trip
- **Secondary:** Plan Private Trip
- **Tertiary:** Explore Destination
- **Supporting:** Read Travel Guide

---

## 111. Home Page Conversion Hierarchy

The user should understand within seconds:

1. What SafarUp is.
2. Where they can travel.
3. What trips are available.
4. How to book.
5. That private customization is available.

---

## 112. Empty States

- **No upcoming trips** — "No trips are scheduled for this destination yet." → CTA: Plan a Private Trip
- **No bookings** — "Your next journey starts here." → CTA: Explore Trips
- **No private requests** — "You haven't requested a private trip yet." → CTA: Plan a Private Trip

---

## 113. Accessibility of Booking

Booking must not depend exclusively on: hover, complex gestures, color alone, tiny buttons.

---

## 114. Mobile Booking UX

Mobile checkout must use: sticky bottom CTA, large inputs, native date selection where appropriate, simple traveler forms, clear price summary, Razorpay checkout, confirmation screen.

---

## 115. Mobile Bottom Navigation

**Primary:** Home, Trips, Explore, Bookings, Account

**Explore can contain:** Destinations, Blog, Search, Categories

---

## 116. Admin Design Language

Admin should be: dense but readable, data-oriented, keyboard-friendly, fast, desktop-first.

Unlike the public website, admin does not need elaborate marketing visuals.

---

## 117. Admin Tables

Every major data table needs: search, filters, sort, pagination, status, date range, export where appropriate.

---

## 118. Bulk Operations

Future-ready support for: publish/unpublish, archive, status change, export.

Destructive operations require confirmation.

---

## 119. File Management

Admin media upload must support: upload, preview, delete/archive, metadata, compression, alt text.

---

## 120. Content Versioning

Important operational entities should maintain version history where practical: private proposals, pricing changes, itinerary changes, policy changes.

---

## 121. Data Retention

Define retention periods for: booking data, payment records, customer communications, audit logs — according to applicable legal/business requirements.

---

## 122. Privacy

Collect only information required for: account, booking, payment, trip fulfillment, customer support.

Avoid unnecessary personal-data collection.

---

## 123. Analytics Events

```
page_view
destination_view
trip_view
private_trip_started
private_trip_submitted
booking_started
checkout_started
payment_success
payment_failed
booking_confirmed
cancellation_requested
review_submitted
```

---

## 124. Performance Observability

Monitor: Core Web Vitals, API/route latency, Firestore errors, payment failures, checkout conversion, API errors.

---

## 125. Backup / Recovery

Production data should have an appropriate backup and recovery strategy.

Important records — bookings, payments, customers, proposals, audit logs — should not depend solely on a single accidental deletion recovery path.

---

## 126. Failure Scenarios

- **Payment succeeds but frontend closes** — backend webhook/event reconciliation must eventually confirm payment.
- **Customer refreshes payment success page** — must not duplicate booking.
- **Webhook arrives twice** — must be idempotent.
- **Admin changes trip after bookings** — existing confirmed bookings must retain the correct historical commercial information. This is important.

---

## 127. Historical Booking Snapshot

A booking should preserve a snapshot of important commercial information: trip name, price, itinerary, departure, included services.

Why? Because if admin changes the trip template tomorrow, yesterday's booking must not magically change.

---

## 128. Currency

V1: INR / ₹. Future multi-currency support is not required.

---

## 129. Language

V1: English. Future: Hindi, regional languages. Architecture should not make localization impossible.

---

## 130. Timezone

Primary business timezone: `Asia/Kolkata` / IST.

All trip dates and operational schedules must be displayed in India time. Backend timestamps should be stored consistently and rendered according to business timezone.

---

## 131. Slugs

Public URLs must be readable, e.g.:

```
/trips/rajgir-weekend-trip
/destinations/rajgir
/blog/best-places-to-visit-in-bihar
```

Avoid exposing raw Firestore document IDs in public URLs.

---

## 132. SEO URL Rules

URLs must: be lowercase, use hyphens, be stable, avoid unnecessary query parameters, redirect old slugs if changed.

---

## 133. Admin URL Security

Admin route protection must happen at:

1. Authentication
2. Authorization
3. Backend operation level

Hiding `/admin` from navigation is not security.

---

## 134. Rate Limiting

Protect: login-related endpoints, private-trip requests, contact forms, booking creation, payment order creation, coupon validation, password reset triggers.

---

## 135. Bot Protection

Consider: reCAPTCHA where necessary, honeypots for public forms, `express-rate-limit` on sensitive endpoints.

---

## 136. Customer Form Protection

Prevent: duplicate submissions, accidental double booking, double-clicking payment, duplicate private-trip requests.

Use client-side UX + backend idempotency.

---

## 137. Customer Communication

Every critical state change must be visible through: dashboard, email.

Customer should not need WhatsApp to know whether a booking succeeded.

---

## 138. Support Requests

Support ticket fields: `ticketId`, `customerId`, `bookingId`, `category`, `subject`, `description`, `status`, `priority`, `assignedTo`, `createdAt`, `updatedAt`

Statuses: `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`

---

## 139. Admin Settings

Central configuration: booking cutoff, payment settings, cancellation defaults, email templates, support contact, business details, tax configuration, currency, feature flags.

Sensitive settings should not be editable by ordinary admins.

---

## 140. Feature Flags

Support flags for: `privateTripPlanner`, `reviews`, `coupons`, `blog`, `pwa`, `newCheckout`

This allows controlled rollout.

---

## 141. Email Template System

Templates should be centrally managed.

Variables: `{{customerName}}`, `{{bookingNumber}}`, `{{tripName}}`, `{{departureDate}}`, `{{amount}}`, `{{bookingUrl}}`

Admin can preview templates.

---

## 142. Customer Invoice

Invoice/receipt should contain: SafarUp details, customer, booking number, trip, date, amount, payment reference, applicable tax details where required.

---

## 143. Refund Record

Refund must preserve: original payment, refund ID, amount, reason, initiated by, timestamp, status.

---

## 144. Trip Cancellation by SafarUp

```
Departure → CANCELLED
       ↓
Affected bookings identified
       ↓
Customer notified
       ↓
Refund/rebooking workflow
       ↓
Audit
```

---

## 145. Customer Cancellation

```
Customer
  ↓
Cancellation request
  ↓
Policy calculation
  ↓
Refund amount
  ↓
Confirmation
  ↓
Refund
```

---

## 146. Refund Policy Display

Before payment, customer must be able to understand the applicable cancellation terms. No hidden policy.

---

## 147. Trust Requirements

Public website should clearly communicate: business identity, contact details, terms, cancellation policy, secure payment, booking confirmation process, customer support.

Trust is a core conversion requirement for travel commerce.

---

## 148. Production Checklist

Before launch:

**Product**
- [ ] Trips functional
- [ ] Private trips functional
- [ ] Booking functional
- [ ] Payment functional
- [ ] Cancellation functional
- [ ] Customer dashboard functional

**Admin**
- [ ] Trip management
- [ ] Departure management
- [ ] Booking management
- [ ] Private request management
- [ ] Payment management
- [ ] Content management

**Backend**
- [ ] Security rules
- [ ] Route/middleware layer
- [ ] Webhooks
- [ ] Idempotency
- [ ] Logging
- [ ] Error handling

**Authentication**
- [ ] Email/password
- [ ] Google
- [ ] Email verification
- [ ] Password recovery

**Payment**
- [ ] Razorpay test
- [ ] Signature verification
- [ ] Webhooks
- [ ] Refund
- [ ] Reconciliation

**SEO**
- [ ] Sitemap
- [ ] Robots
- [ ] Metadata
- [ ] OG tags
- [ ] Canonicals

**Performance**
- [ ] Mobile testing
- [ ] Desktop testing
- [ ] Image optimization
- [ ] Lighthouse/Core Web Vitals review

**Security**
- [ ] Rules reviewed
- [ ] Admin permissions reviewed
- [ ] Secrets secured
- [ ] No production secrets in Git
- [ ] Rate limiting
- [ ] App Check where appropriate

---

## 149. Development Phases

**Phase 0 — Product foundation**
Repository, monorepo (`backend`, `public`, `admin`), Firestore projects per environment, CI/CD, design tokens, authentication architecture, security baseline.

**Phase 1 — Public foundation**
Homepage, header, footer, destinations, destination details, trips, trip details, about, contact, policies.

**Phase 2 — Admin foundation**
Admin authentication, roles, dashboard, destination CMS, trip CMS, itinerary builder, departure management.

**Phase 3 — Customer accounts**
Signup, login, Google, profile, dashboard, bookings. (Apple Sign In deferred — see §30.)

**Phase 4 — Booking engine**
Traveler details, availability, seat reservation, booking state machine, booking confirmation.

**Phase 5 — Razorpay**
Order creation, checkout, payment verification, webhooks, reconciliation, failure handling, refunds.

**Phase 6 — Private trips**
Request wizard, admin request queue, proposal builder, proposal versioning, customer review, acceptance, payment.

**Phase 7 — Automation**
Email templates, booking emails, private proposal emails, reminders, cancellation emails, refund emails.

**Phase 8 — Growth**
Blog, SEO, reviews, coupons, analytics, PWA enhancements.

---

## 150. Release Strategy

**Internal Alpha** — Only team/admin users. Test content, trips, booking, payments.

**Closed Beta** — Limited customers. Test real customer journeys, payment, support, private trips.

**Public Launch** — After payment reconciliation verified, security review, backup verified, policies published, operational team trained.

---

## 151. Definition of Done

A feature is not complete when: *"The UI works."*

It is complete when:

```
UI
  ↓
Validation
  ↓
Backend
  ↓
Database
  ↓
Security
  ↓
Error handling
  ↓
Analytics
  ↓
Email/notification
  ↓
Testing
  ↓
Documentation
```

all work correctly.

### 151.1 Four mandatory quality gates (v1.3, §159, §176)

The above chain is necessary but not sufficient. Every substantial feature must additionally pass all four specialist gates, and a feature is **not** complete merely because the application builds:

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

These are **permanent disciplines** that participate throughout development, not a final QA pass (§159). Where a gate is not applicable to a given feature, the Lead Agent must state that explicitly and record why (§183).

See also the agent-friendly Definition of Done in §183 for the applicability checklist on public-facing capabilities.
---

## 152. Critical Business Rules

1. Backend is authoritative.
2. Payment is never trusted from the client.
3. Booking cannot exceed capacity.
4. Historical bookings retain historical commercial data.
5. Customer data is isolated.
6. Admin permissions are role-based.
7. Sensitive operations are audited.
8. Private-trip proposals are versioned.
9. WhatsApp is not the booking system.
10. Razorpay is the payment gateway.

---

## 153. V1 Success Metrics

**Business:** number of bookings, gross booking value, revenue, average booking value, private-trip conversion, group-trip occupancy.

**Product:** trip → booking conversion, checkout completion, payment success, private request completion, proposal acceptance.

**Operations:** average private-trip response time, average proposal creation time, cancellation rate, refund processing time.

**Customer:** repeat booking, reviews, support tickets, customer satisfaction.

---

## 154. Future Roadmap

**V2** — Advanced private-trip builder, automated pricing, coupons, reviews, referral system, loyalty, advanced analytics.

**V3** — AI trip planning, personalized recommendations, dynamic itinerary generation, intelligent pricing assistance, automated proposal generation.

**V4** — Native mobile applications, partner ecosystem, hotel integrations, transport integrations, activity providers, larger geographic expansion.

---

## 155. Final Product Model

```
SAFARUP
   │
   ├───────────┬───────────┐
   │                       │
   ▼                       ▼
GROUP TRIPS            PRIVATE TRIPS
   │                       │
Pre-designed          Customer requirements
   │                       │
Fixed departures       Custom dates
   │                       │
Fixed itinerary        Custom itinerary
   │                       │
Fixed capacity          Custom capacity
   │                       │
   └───────────┬───────────┘
               ▼
            BOOKING
               │
            PAYMENT
               │
            RAZORPAY
               │
          CONFIRMATION
               │
        CUSTOMER DASHBOARD
               │
          TRIP EXECUTION
```

And behind it:

```
ADMIN
   │
   ├───────────┬───────┼────────┬──────────┐
   ▼           ▼       ▼        ▼          ▼
Destinations Trips  Bookings Payments  Customers
              │
              ▼
          Itineraries
              │
              ▼
          Departures
              │
              ▼
         Private Trips
              │
              ▼
          Proposals
```

---

## 156. The Definitive SafarUp Positioning

The product should ultimately communicate this:

> SafarUp is a digital-first travel company where travelers can discover curated trips, book fixed-date group journeys, or create customized private trips — with itinerary planning, pricing, secure Razorpay payment, booking confirmation and trip management handled through one platform.

The technology exists to support that business — not the other way around.

---

## Architecture Decision Record

For the new SafarUp, these decisions are now the baseline:

| Decision | Final |
|---|---|
| Product model | Digital travel company |
| Group trips | Yes |
| Private/custom trips | Yes |
| WhatsApp booking dependency | No |
| QR screenshot payment | No |
| Payment gateway | Razorpay |
| Language | JavaScript (no TypeScript) across all three apps |
| Public application | React + Vite (JavaScript) |
| Admin application | React + Vite (JavaScript) |
| Backend | Node.js + Express (JavaScript) |
| Database | Cloud Firestore (server-side, via `firebase-admin`) |
| Authentication | Custom (JWT + bcrypt), backend-issued sessions |
| Email/password | Yes |
| Google | Yes |
| Apple | Deferred to a later phase |
| Phone OTP | No |
| Storage | Backend-managed uploads (local/S3-compatible) |
| Server logic | Express routes/controllers/middleware |
| Public domain | safarup.in |
| Admin domain | admin.safarup.in |
| Repository structure | public + admin + backend |
| Public mobile UX | App-like / floating bottom navigation |
| Desktop UX | Premium full web experience |
| Admin UX | Desktop-first operations control center |
| Core commercial object | Trip / Departure / Booking |
| Private-trip workflow | Request → Proposal → Acceptance → Payment → Booking |
| Payment verification | Server-side |
| Booking capacity | Transaction-safe (Firestore transactions/batched writes) |
| Admin | Operational source of truth |

---

## 157 — Product Architecture Evolution

SafarUp shall be developed as a human-first, search-discoverable, AI-understandable, agent-operable, and automation-ready travel platform.

SafarUp is not limited to being a conventional travel website.

The platform shall support multiple interaction channels over the same underlying business capabilities:

```
Human
 ├── Public Web
 └── Future Mobile Application

AI Agent
 └── Machine-readable SafarUp capabilities

Automation
 └── Authorized SafarUp capabilities
```

The core business logic, authorization model, domain services, availability rules, booking rules, and payment rules shall remain centralized.

User interfaces, AI agents, and automation systems shall act as clients of the same canonical platform capabilities.

## 158 — Multi-Agent Development Architecture

SafarUp development shall use a multi-agent engineering model.

A Lead Agent shall coordinate specialized implementation agents and specialist quality masters.

```
                          LEAD AGENT
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    BACKEND AGENT         ADMIN AGENT         PUBLIC AGENT
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       DESIGN MASTER      DISCOVERY MASTER   AGENT-NATIVE
                                              MASTER
              └────────────────┼────────────────┘
                               ▼
                    ENGINEERING MASTER
```

### Lead Agent

The Lead Agent is responsible for:

```
architecture coordination
task decomposition
ownership assignment
dependency management
interface and contract definition
conflict resolution
integration
cross-agent review
milestone management
```

The Lead Agent does not need to implement every feature itself.

### Backend Agent

Responsible for:

```
Firestore
repositories/data access
domain models
services
APIs
validators
authentication
authorization
business logic
server-side integrations
```

### Admin Agent

Responsible for:

```
administration console
CMS
operational dashboards
management workflows
admin forms
tables
filtering
administration UX
```

### Public Agent

Responsible for:

```
public website
discovery experience
destination pages
trip pages
search
booking experience
responsive public UX
```

## 159 — Four Permanent Quality Masters

SafarUp shall maintain four permanent specialist quality disciplines.

### 159.1 Design / UI-UX Master

The Design Master owns the product experience, including:

```
visual language
design system
typography
color system
spacing
grid
components
responsive layouts
desktop experience
mobile experience
interactions
motion
accessibility
usability
perceived quality
```

The Design Master shall prevent inconsistent AI-generated UI patterns across applications.

### 159.2 Discovery Master

The Discovery Master owns:

```
SEO
AEO
GEO
semantic content structure
metadata
canonical URLs
structured data
internal linking
crawlability
sitemap
robots directives
entity relationships
machine-readable content
```

Discovery requirements shall be considered during page and domain implementation, not added only after development.

### 159.3 Agent-Native Architecture Master

The Agent-Native Master owns:

```
AI-agent accessibility
machine-readable resources
API contracts
OpenAPI documentation
agent authentication
permissions/scopes
action contracts
idempotency
booking actions
availability actions
confirmation boundaries
webhooks
agent-readable errors
automation interfaces
auditability
```

### 159.4 Engineering Excellence Master

The Engineering Master owns:

```
architecture quality
code quality
security
performance
accessibility
testing
CI/CD
observability
dependency hygiene
database correctness
error handling
maintainability
regression prevention
```

These four disciplines shall participate throughout development rather than only during final review.

## 160 — Parallel Development Governance

Multi-agent development shall be used to increase development speed without sacrificing consistency.

Agents may work in parallel only when their work has clearly defined ownership and contracts.

Before parallel work begins, the Lead Agent shall define:

```
task scope
ownership
dependencies
shared interfaces
API contracts
data contracts
expected outputs
integration point
```

Agents should not independently redefine the same business entity.

Agents should avoid simultaneously modifying the same high-conflict files unless explicitly coordinated.

Shared architectural files and contracts require Lead Agent control.

## 161 — Contract-First Development

Before multiple agents implement the same domain capability, SafarUp shall define the canonical domain contract.

A domain contract should specify:

```
Entity
Fields
Relationships
Lifecycle
Permissions
Validation
API representation
Error behavior
Persistence behavior
Public representation
Agent representation
```

Implementation shall follow the approved contract.

The purpose is to prevent multiple agents from creating conflicting interpretations of the same domain.

## 162 — Human-Agent Capability Parity

Every major user capability shall be evaluated for an equivalent machine-operable capability.

| Human Capability | Agent Capability |
|---|---|
| Search destinations | Search API |
| Search trips | Trip query API |
| View destination | Destination resource |
| Compare trips | Structured trip data |
| Check availability | Availability endpoint |
| Prepare booking | Booking intent/action |
| Complete booking | Authorized booking action |
| Check booking | Booking status resource |
| Cancel booking | Authorized cancellation action |

Not every UI interaction requires a separate API operation.

The underlying principle is:

> The platform capability is canonical; the human interface and AI interface are clients of that capability.

## 163 — Agent-Native Platform

SafarUp shall expose structured platform capabilities that allow authorized agents to understand and interact with the travel platform.

The system should support, where applicable:

```
discovery
search
filtering
comparison
destination information
trip information
itinerary information
availability
pricing
booking preparation
booking
booking status
cancellation
account actions
support actions
future automation
```

AI agents must not need to reverse-engineer the public website to understand core SafarUp capabilities.

The platform shall provide explicit machine-readable interfaces.

## 164 — Agent Authentication, Authorization & Safety

AI agents shall not receive unrestricted access to SafarUp.

Agent access shall operate under explicit authorization.

Actions shall be categorized according to risk.

### Read / Discovery Actions

Examples:

```
search
view
compare
availability lookup
itinerary retrieval
```

### Preparatory Actions

Examples:

```
create a booking intent
prepare traveler information
calculate booking totals
reserve a temporary workflow state where applicable
```

### Consequential Actions

Examples:

```
confirm booking
make payment
cancel booking
modify paid reservations
change sensitive account information
```

Consequential actions shall require appropriate user authorization and platform permissions.

The platform shall support explicit confirmation boundaries where appropriate.

All consequential agent actions shall be auditable.

## 165 — Agent-Native API Requirements

SafarUp APIs intended for machine/agent consumption shall be:

```
predictable
versionable
documented
validated
authorization-aware
idempotent where required
explicit about errors
machine-readable
```

The platform should maintain an OpenAPI specification for supported public/agent capabilities where appropriate.

Agent-facing errors should provide structured information sufficient for an authorized client to understand whether an action:

```
succeeded
failed validation
requires authorization
is unavailable
conflicts with current state
can be retried
```

## 166 — Automation Readiness

SafarUp shall be architected to support future automation workflows.

Examples include:

```
Watch for a trip matching user preferences
Watch for availability
Notify when conditions are met
Prepare a travel plan
Recommend matching trips
Trigger an authorized booking workflow
```

Automation shall operate through the same canonical platform services and authorization boundaries as interactive user actions.

Automation shall not introduce a second independent business-rule implementation.

## 167 — Premium Responsive Experience

SafarUp public experiences shall be intentionally designed for both desktop and mobile.

Desktop and mobile shall share the same brand and design system but may use different information hierarchy, composition, interaction patterns, and navigation behavior.

Mobile shall not be treated as a mechanically scaled-down desktop layout.

The Design Master shall define both experiences intentionally.

## 168 — Mobile Navigation

The SafarUp public mobile experience shall use a persistent bottom navigation bar as the primary global navigation pattern.

A hamburger menu shall not be used as the default primary global navigation mechanism.

The mobile navigation system shall define:

```
active state
inactive state
icons
labels
safe-area handling
touch target sizing
scroll interaction
accessibility
transitions
contextual actions
```

Any deviation from the bottom-navigation pattern requires explicit product/design approval.

## 169 — Responsive Interaction Design

Public SafarUp interfaces shall use touch-appropriate interaction patterns on mobile.

Where appropriate, mobile may use:

```
horizontal carousels
bottom sheets
sticky actions
touch-friendly filters
swipe interactions
expandable sections
mobile image galleries
mobile-first search
context-aware actions
```

Desktop may use:

```
hover states
multi-column layouts
side filters
expanded navigation
richer map/content compositions
desktop-specific information density
```

The same functionality should remain understandable across both experiences.

## 170 — Motion & Animation System

Motion shall be intentional and functional.

Motion may be used to communicate:

```
navigation
hierarchy
state changes
feedback
progress
discovery
transitions
```

Motion shall not exist merely for decoration.

SafarUp shall support reduced-motion preferences and avoid animations that materially damage performance, usability, accessibility, or content discoverability.

## 171 — SafarUp Design System

SafarUp shall maintain a centralized product design system.

The design system shall include:

### Foundations

```
brand colors
typography
spacing
grids
radii
shadows
iconography
```

### Components

```
buttons
navigation
bottom navigation
cards
search
filters
forms
dialogs
sheets
badges
trip cards
destination cards
itinerary components
booking components
```

### Interaction States

```
hover
active
focus
disabled
loading
success
error
empty
```

The approved design system shall serve as the visual source of truth for implementation.

## 172 — SEO / AEO / GEO Architecture

SafarUp shall treat discoverability as a product architecture concern.

Every public entity/page shall be evaluated for:

```
search intent
semantic HTML
heading hierarchy
page title
description
canonical URL
internal links
structured data
entity identity
related entities
crawlability
indexability
machine-readable information
```

SEO, AEO, and GEO considerations shall be incorporated during design and implementation.

## 173 — Machine-Readable Public Content

Public SafarUp entities should expose information in a consistent and machine-understandable structure.

Examples include:

### Destination

```
name
location
district
category
description
highlights
travel information
related destinations
related trips
```

### Trip

```
title
destination
duration
itinerary
pricing
availability
booking state
```

### Booking

```
traveler
trip
departure
status
payment state
```

The specific schema shall follow the approved domain model.

Structured information must remain consistent between:

```
database
API
public page
metadata
agent representation
```

> **Note.** `district` and `category` are now **resolved canonical relationships** (§51.1, §200.3): Destination → District is 1:1 via `districtId`; Destination → Category is N:M via `categoryIds[]`. The schema follows the approved domain model; this list is illustrative, not a field-level contract. Field-level contracts live in `docs/CONTRACTS/`.

## 174 — Public Page Experience Standard

Every major public page shall have an intentional desktop and mobile experience.

Required page families include, subject to the approved domain model:

```
Homepage
Explore/Search
Destination
Trip
Itinerary
Booking
Profile
Saved/Planning
Other approved discovery/entity pages
```

Each page shall define:

```
Purpose
Primary user intent
Information hierarchy
Primary action
Secondary actions
Desktop layout
Mobile layout
Interaction states
Motion
Accessibility
SEO/AEO/GEO requirements
Agent-native requirements
```

## 175 — Vertical Slice Development

SafarUp shall prefer complete vertical slices instead of disconnected implementation.

Example:

```
Domain
  ↓
Firestore
  ↓
Repository
  ↓
Service
  ↓
Validation
  ↓
Controller
  ↓
API
  ↓
Admin
  ↓
Public
  ↓
SEO/AEO/GEO
  ↓
Agent capability
  ↓
Tests
  ↓
Engineering review
```

A feature should not be considered complete merely because its frontend exists.

## 176 — Quality Gates

A substantial SafarUp feature shall pass four specialist gates.

```
Design Master
        ↓
Discovery Master
        ↓
Agent-Native Master
        ↓
Engineering Master
        ↓
Integration
        ↓
Tests
        ↓
Build
```

A feature is complete only when:

```
required design standards are satisfied
discovery requirements are satisfied
agent-native requirements are satisfied where applicable
engineering requirements are satisfied
tests pass
lint passes
builds pass
```

## 177 — Development Workflow

The standard SafarUp development workflow shall be:

```
PRD Requirement
        ↓
Lead Agent Analysis
        ↓
Domain / Contract Definition
        ↓
Design Definition
        ↓
Discovery Definition
        ↓
Agent-Native Definition
        ↓
Engineering Definition
        ↓
Parallel Agent Implementation
        ↓
Integration
        ↓
Specialist Review
        ↓
Testing
        ↓
Release
```

Parallel implementation may begin only after the relevant contracts are sufficiently defined.

## 178 — Design-to-Code Workflow

> **Superseded (v1.5).** The v1.4 Figma-based workflow is withdrawn. SafarUp does **not** use Figma as the binding design workflow, does not require Figma for implementation, and does not treat Figma as a project gate. The visual source of truth is now **`docs/DESIGN_SYSTEM.md` + implementation + browser/screenshot visual review**. See §178.1.

For major public experiences, the workflow is:

```
PRD
  ↓
Design Master
  ↓
docs/DESIGN_SYSTEM.md
  ↓
Desktop + Mobile design intent
  ↓
OpenCode implementation
  ↓
Browser / screenshot visual review
  ↓
Design Master feedback
  ↓
Refinement + design-system update
  ↓
Engineering validation
```

The implementation follows the documented design system instead of independently inventing a visual system.

### 178.1 OpenCode-managed design workflow (binding, v1.5)

- The engineering-facing design authority is **`docs/DESIGN_SYSTEM.md`**, maintained by the Design Master and living in the repository.
- **Figma is not required**, is not a gate, and is never dispatched work. Any Figma artifact present is advisory, never binding.
- The Design Master may inspect the running application and use screenshots or other local visual validation through OpenCode, **but every final design decision is captured in `docs/DESIGN_SYSTEM.md` and in code** — never only in a local session or a comment.
- Coding agents shall **not** independently redesign the product. If a pattern is missing from the design system, the Design Master extends the document; the pattern is not invented ad hoc per page.
- One visual language persists across Home, Explore, Destination, Trip, Booking, Profile and future public pages (§171, §24 of the multi-agent development plan).
- The design system is **evolving**: the Design Master refines it as implementation reveals reusable patterns, and that refinement is a repository change, not a private one.

## 179 — Product Retention Principles

SafarUp shall prioritize retention through usefulness and continuity, not excessive visual stimulation.

Retention mechanisms may include:

```
saved destinations
saved trips
personalized discovery
trip planning
comparisons
recommendations
booking history
travel preferences
availability alerts
future AI travel assistance
authorized automation
```

Animation and visual effects shall support the experience but shall not be treated as the primary retention mechanism.

## 180 — Booking & Automation Evolution

The booking architecture shall be designed so that future AI-assisted and automated booking can operate on the same booking state model used by human users.

Future flow:

```
Discover
  ↓
Compare
  ↓
Availability
  ↓
Booking Intent
  ↓
User Authorization
  ↓
Booking
  ↓
Payment
  ↓
Confirmation
```

Future automation may operate on this workflow where the user's authorization and platform policy permit it.

## 181 — Domain Model Governance

The PRD is the authority for domain entities and relationships.

No implementation agent may create a new business entity solely because another prompt, UI design, or implementation plan mentions it.

Any discrepancy between:

```
PRD entities
collection model
API model
UI requirements
agent capabilities
```

must be resolved by an explicit product/architecture decision before implementation.

### Current items requiring explicit reconciliation

```
Guide          → RESOLVED (v1.5): internal operational entity, no public marketplace
Category       → RESOLVED (v1.5): first-class taxonomy, Destination N:M via categoryIds[]
District       → RESOLVED (v1.5): first-class entity, Destination 1:1 via districtId
Place          → RESOLVED (v1.5): first-class canonical entity; field contract still open
```

The current development plan must not assume these entities have the same lifecycle or collection status until the PRD is reconciled. **These four are now reconciled; the plan must treat them as decided and must not reopen them.**

The current reconnaissance specifically identified a discrepancy around Guide and notes that Guide marketplace functionality is treated as a V1 non-goal in the current PRD. **That non-goal remains in force:** Guide is an internal operational entity only, and no public Guide UX may be built (§200.1).

> Resolution tracking for these entities is maintained in **§51.1** and **§200**. **All four are now APPROVED (v1.5)** and are **not to be reopened**: Guide (internal operational entity), Category (first-class taxonomy, N:M via `categoryIds[]`), District (first-class entity, 1:1 via `districtId`), and Place/Attraction (first-class canonical entity). **§200 is the authoritative decision log** for the items that genuinely remain open.

## 182 — Development Phase Model

The previous development phases shall be extended to include the new architecture.

```
PHASE 0
Foundation
✓ Completed

PHASE 1
PRD + Domain + Contract Definition

PHASE 2
Content / Destination Foundation

PHASE 3
Trip Product
TripTemplate
Itinerary
Departure

PHASE 4
Group Booking

PHASE 5
Payment

PHASE 6
Agent-Native Capabilities

PHASE 7
AI-Assisted Travel Workflows

PHASE 8
Automation

PHASE 9
Scale / Optimization
```

The four permanent Masters operate across all phases.

### 182.1 Phase content and entry gates (v1.4)
Each phase has an **entry gate**: it cannot begin until the prior phase's contracts are approved. The gate exists to prevent agents implementing against an unapproved contract (§160, §161).

| Phase | Content | Entry gate — must be approved first |
|---|---|---|
| **0** | Foundation (auth, Firestore, tests, CI) | — **Complete** |
| **1** | PRD + domain + contract definition | ✅ **COMPLETE** — four-Master review passed 2026-09-29 (§182.2) |
| **2** | Content / Destination foundation — District, Category, Place, Destination | ✅ **Gate closed** — all Phase 2 contracts `APPROVED`. Active phase |
| **3** | Trip Product — TripTemplate, Itinerary, Departure | **Trip Detail field-level contract (§200.4)**; pickup/drop inheritance (§200.5). `places` entity gate is **cleared** (v1.5) |
| **4** | Group Booking — Booking, Travelers | Booking model + availability contract; §48 cancellation policy |
| **5** | Payment | §12–§13, §58, §94 |
| **6** | Agent-Native Capabilities | §165 API contract, OpenAPI, agent auth model (§164) |
| **7** | AI-Assisted workflows | Phase 6 capabilities |
| **8** | Automation | Phase 6 + booking intent/confirmation boundaries (§180) |
| **9** | Scale / optimization | — |

> **Note.** Trip Detail content architecture is specified in **§185–§200** and is delivered in **Phase 3** (public/admin surfaces) with agent capabilities landing in **Phase 6** per §197. §200.4 currently blocks Phase 3 entry.

### 182.2 Phase 1 completion gate (v1.5)

Phase 1 is complete when **all** of the following are **APPROVED** in `docs/CONTRACTS/` (lifecycle §11 of the multi-agent development plan). Only then may Phase 2 begin.

| # | Gate item | Artifact | Status |
|---|---|---|---|
| 1 | PRD domain decisions recorded | §51.1, §200.1–200.3 | ✅ Done |
| 2 | Destination contract | `DESTINATION.domain.contract.md` | ✅ **APPROVED** |
| 3 | District contract | `DISTRICT.domain.contract.md` | ✅ **APPROVED** |
| 4 | Category contract | `CATEGORY.domain.contract.md` | ✅ **APPROVED** |
| 5 | Place contract | `PLACE.domain.contract.md` | ✅ **APPROVED** |
| 6 | Destination API contract | `API.destination.contract.md` | ✅ **APPROVED** |
| 7 | Place API contract | `API.place.contract.md` | ✅ **APPROVED** |
| 8 | Destination Firestore contract | `FIRESTORE.destination.contract.md` | ✅ **APPROVED** |
| 9 | Place Firestore contract | `FIRESTORE.place.contract.md` | ✅ **APPROVED** |
| 10 | Repository architecture contract | `REPOSITORY_ARCHITECTURE.contract.md` | ✅ **APPROVED** |
| 11 | Design requirements | `docs/DESIGN_SYSTEM.md` | ✅ **APPROVED** |
| 12 | Discovery requirements | Reviewed into every public contract | ✅ **PASS** |
| 13 | Agent-Native requirements | Reviewed into every API contract | ✅ **PASS** |
| 14 | Engineering requirements | Reviewed into every Firestore/API contract | ✅ **PASS** |
| 15 | Multi-agent operating rules | `docs/MULTI_AGENT_DEVELOPMENT.md` | ✅ **APPROVED** |
| 16 | Design system rules | `docs/DESIGN_SYSTEM.md` | ✅ **APPROVED** |

> **Phase 1 — CONTRACT APPROVAL COMPLETE.** All sixteen gate items are satisfied as of the 2026-09-29 four-Master review. **Phase 2 is the active development phase.** Worker dispatch remains a separate authorisation.

**Residual conditions carried into Phase 2** (each is scoped, tracked and non-blocking):

| Item | Treatment |
|---|---|
| `thingsToDo` structure (§200.8) | The §22 section is required; the field waits on the §200.8 decision. Blocks that field only |
| `multer` media upload | Scoped out of the initial Phase 2 backend slice (`API.destination.contract.md` §3). Media fields are URL values |
| Public search (`q`) | Not implemented in Phase 2; explicit 400 (`API.destination.contract.md` §2.1b) |
| Public app has no Tailwind / router / API client | Established as a prerequisite before public UI work (`docs/DESIGN_SYSTEM.md` §12.1) |
| §200.4–§200.10 | Later-phase decisions. §200.4 blocks Phase 3, not Phase 2 |

## 183 — Agent-Friendly Definition of Done

A feature that exposes a meaningful public capability should, where applicable, satisfy the following:

```
✓ Human UI exists
✓ Mobile experience exists
✓ Desktop experience exists
✓ Accessible interaction exists
✓ SEO requirements satisfied
✓ AEO/GEO structure satisfied
✓ Machine-readable representation exists
✓ API capability exists
✓ Authorization defined
✓ Idempotency defined for consequential mutation
✓ Auditability defined
✓ Tests exist
✓ Performance reviewed
✓ Security reviewed
```

Not every item applies identically to every internal/admin feature, but the Lead Agent shall explicitly determine applicability.

## 184 — Core SafarUp Principle

SafarUp is a human-first, search-discoverable, AI-understandable, agent-operable, and automation-ready travel platform.

All future architectural, product, UX, API, database, and development decisions should be evaluated against this principle.

---

# Part IV — Trip Detail & Group Booking Content Architecture (v1.4)

> This part defines the structured content model behind SafarUp's Trip Detail page. It is an **information architecture**: it specifies which structured areas a Trip must support and how they relate, without hard-coding any specific trip as a product record.
>
> **Content principle (§28).** SafarUp content is **structured product data first, rendered experience second**:
>
> ```
> Trip data
>   ↓
>  API
>   ├── Public UI
>   ├── Admin CMS
>   ├── SEO/AEO/GEO
>   ├── AI agents
>   └── Booking engine
> ```
>
> No consumer surface becomes the hidden source of truth. The public page, the admin CMS, the search index and the agent interface are all *renderings* of the same structured trip data.
>
> **Reference model.** The structure below is derived from a canonical SafarUp group trip (a 2 Days / 1 Night, October–February "Explorer" trip covering temples, heritage, hills, forests, local culture and seasonal wildlife). That example defines the **content structure and experience model only**. Its factual claims — destinations, timings, inclusions, seasonal facts — are **not** validated, corrected or invented here, and are not encoded as a product record. Where a rule depends on facts not established in this document, it is marked unresolved in §200 rather than assumed.

## 185. Trip Detail Content Model

### 185.1 Trip identity

Every Trip Template must be able to express the following identity concepts. Naming follows the existing domain convention (`title`, `slug`, `durationDays`, `durationNights`, `heroImage`, `gallery` per §53); where a concept has no established name it is described, not named.

| Concept | Notes |
|---|---|
| Trip title | §53 `title` |
| Short subtitle / tagline | Concept new to §53; short-form hook for cards and hero |
| Destination / region | §53 `destinationId`; District relationship per §51.1/§200.3 (`districtId`) |
| Duration | §53 `durationDays`, `durationNights` |
| Season | Operating season — see §192 |
| Starting point | Also surfaced in pickup/drop (§185.3) |
| Ending point | Also surfaced in pickup/drop (§185.3) |
| Overnight location | Where the group stays; see §190 |
| Group size | Min/max or policy — see §189/§190, which are group-dependent |
| Guide information | §200.1 — Guide is an **approved internal operational entity** (§51.1). A trip may reference a Guide for operations, but must express a guide *model/policy* so it is not structurally dependent on one |
| Trip type | e.g. group / heritage / nature / wildlife classification |

Media and summary: `heroImage`, `gallery`, and a short summary are supported (§53 already defines `heroImage`/`gallery`). Saving/favouriting a trip is a traveler capability and is **not** part of the Trip entity — it belongs to a user-owned saved-items concern (§179 lists "saved trips"); it is not specified here.

> **Unresolved:** the concept list above deliberately does **not** assign field names to new concepts. Field-level naming is part of the Trip Detail contract and is tracked in §200.4.

### 185.2 Trip overview

The overview is a **structured summary**, not a prose blob. It must be able to express:

```
summary
experience description
trip highlights
duration
starting point
ending point
operating season
group capacity
guide model
overnight information
```

The public UI may render this as a concise summary block, while the API exposes the individual structured fields. The same data serves the hero, the quick-facts strip, the agent representation (§197) and structured data (§196).

> **Note on `guide model`.** The reference model includes guide information. Guide is now an **approved internal operational entity** (§51.1, §200.1), so a Trip **may** reference a Guide where operationally required. It must still be able to express a guide *model/policy* (e.g. accompanied / self-guided / on-request) **without** structurally depending on a `guides` reference, so that a trip remains valid if no Guide is assigned. No **public** Guide UX is permitted in V1.

### 185.3 Pickup & drop

Pickup and drop must be represented **independently of the general description**, because they are operationally significant and are needed by the booking summary (§194), the traveler view and agent responses.

Must support:

```
pickup locations
pickup instructions
supported arrival points
drop locations
drop instructions
coordination notes
```

Locations should be **linkable to structured place/location data where the domain model allows it** (§200.2 — the `places` entity is now **approved** as a first-class canonical entity).

> **Note.** §54 `Departure` already carries `pickupLocations`. Whether a departure may *override* a trip-level default, or must inherit it, is not settled by the source material. Tracked in §200.5.

### 185.4 Day-wise itinerary (first-class structured element)

The itinerary is a **first-class structured domain element**. It must **not** be represented as one plain-text blob.

```
Trip
  ↓
Day  (ordered)
  ↓
Stops / Activities  (ordered, independently identifiable)
```

**Day concepts:** day number, title, summary, start location, end location, sequence, stops/activities, descriptions, approximate timing where available, location information, overnight status, meal associations where applicable, operational notes.

**Ordering must be preserved.** Reordering is an explicit admin capability (§40) and the public and agent renderings must reflect stored order, not incidental document order.

The reference model is shaped like:

```
Day 1
  ↓
  ├── [stop 1]
  ├── [stop 2]
  ├── ...
  └── [overnight stop]

Day 2
  ↓
  ├── [stop 1]
  └── [final stop / return]
```

Each stop must be independently identifiable, so that it can be referenced (§186), rendered, localised and later linked to a canonical place (§200.2).

## 186. Places covered

A Trip should be able to reference **structured SafarUp place entities** rather than duplicating them.

Reference categories from the source material:

```
Spiritual & Cultural
Heritage
Hills & Nature
Wildlife & Seasonal Attractions
```

**These must not be duplicated as independent copies.** Places are **references to canonical place/destination entities** where the domain model allows it. This matters for internal linking, destination discovery, SEO/AEO/GEO (§196), agent interfaces (§197) and future recommendation systems.

> **✅ RESOLVED (v1.5).** Place / Attraction is now a **first-class canonical entity** with a `places` collection (§51.1, §200.2). Places Covered is implemented as an **N:M reference** from Destination to Place via `placeIds[]`.
>
> Place records are **never duplicated** into destination or trip documents. A Place is independently identifiable and reusable across Destination, Trip itineraries, maps, search, SEO/AEO/GEO and agent interfaces. The Place **field-level** contract remains open (§200.9) and does not block the relationship itself.

## 187. Historical & cultural context

Trips may contain **structured contextual content** explaining:

```
historical importance
cultural importance
spiritual context
ecological / natural context
local significance
```

This content is **editorial/product content** and must not be mixed into operational booking data.

**Attribution-ready by design.** Where the platform later supports source attribution or editorial verification, the architecture must allow it **without forcing it into unrelated trip fields**. This is a structural constraint on the future contract — the content area must be able to carry provenance (source, verification status, last-reviewed date) when those concepts are introduced, rather than requiring a later re-modelling of trip documents.

> **Not specified here:** the fields, structure, and editorial workflow. The source material defines the *existence* and *separation* of this content area, not its schema. Tracked in §200.6.

## 188. Inclusions & exclusions

Inclusions and exclusions must be **structured as separate lists**, not one paragraph and not one combined field.

**Included** (from the reference model): pickup, drop, transportation, vehicle, guide, accommodation, breakfast, lunch, dinner, coordination/assistance, planned sightseeing.

**Excluded** (from the reference model): entry fees, personal expenses, shopping, additional food/beverages, personal itinerary changes, medical/emergency expenses, unspecified services.

> **Note.** §53 already lists `inclusions` and `exclusions` on the trip template, so this area is largely covered by the existing model. §185–§194 do not redefine it; they confirm it must remain **two distinct structured lists** so that the UI (§195), agent representation (§197) and booking summary (§194) can each consume them independently.

## 189. Vehicle

Vehicle requirements are **group-dependent**. Trip data must support:

```
vehicle policy
possible vehicle types
group-size dependency
comfort requirements
route requirements
```

**Do not force a single vehicle type when actual operations may select the vehicle after group size is known.** A trip expresses a *policy and a set of possibilities*; the concrete assignment is an operational decision (§198).

## 190. Accommodation

Accommodation must be **independently represented**, supporting:

```
location
accommodation policy
availability dependency
safety / comfort criteria
group-size dependency
room allocation notes
overnight location
```

**Do not assume one permanent property if the business model allows accommodation to vary.** A trip states a policy; a specific property may be resolved per departure.

> **Overlap with the `hotels` collection (§51).** `hotels` exists in the collection list and §42 covers hotel management. The relationship between a trip's accommodation *policy* and a concrete `hotels` record is **not** defined by the source material. Tracked in §200.7.

## 191. Food & meals

Meal information must be structured:

```
Day
  ↓
Meal
```

Example shape from the reference model:

```
Day 1 → Lunch, Dinner
Day 2 → Breakfast, Lunch
```

This data must be usable by the **booking summary** (§194), the **traveler view**, **admin operations**, and **agent responses** (§197) — so it is stored as structured day/meal associations rather than prose, and is not duplicated per departure.

## 192. Seasonality

Seasonality is an important Trip attribute. The system must distinguish:

```
operating season
recommended travel season
seasonal attractions
seasonal limitations
seasonal availability
```

**Do not assume that all attractions operate identically throughout the year.** A trip operating October–February does not imply every covered place has the same seasonal behaviour; that is what `seasonalAttractions` and `seasonalLimitations` exist to express.

> **Relationship to §54.** Departure-level availability is distinct from trip-level seasonality. Seasonality is a property of the **Trip Template**; a specific **Departure** is only offered if it falls within the operating season (§198).

## 193. Important information

A trip must support **structured operational/advisory information**:

```
weather dependency
road conditions
accessibility
site availability
activity limitations
guest responsibilities
wildlife viewing limitations
local rules
personal safety reminders
personal belongings responsibility
```

Structured as informational items where practical, so they can be rendered consistently and surfaced in booking/traveler contexts rather than buried in a description.

## 194. Trip booking summary

The Trip Detail experience must connect to a **booking capability**. A user must be able to understand, at minimum:

```
trip
date / departure
duration
group size
pricing
availability
inclusions
exclusions
pickup / drop
accommodation
cancellation / relevant policy where defined
```

**The exact booking fields must follow the existing PRD booking model** (§55, §54). **No unsupported pricing or cancellation rule is introduced here** — cancellation and pricing rules are owned by §48, §103 and §104, and this section only requires that the Trip Detail surface them where defined.

Live availability and price are **departure** properties, not trip properties (§198).

## 195. Trip Detail page composition

Desktop and mobile are **independently composed** experiences sharing one design system (§167, §171). The mobile composition is **not** the desktop composition scaled down.

### 195.1 Desktop experience

Conceptual composition:

```
Hero
  ↓
Trip identity
  ↓
Quick facts
  ↓
Main content + sticky booking panel
  ↓
Trip Overview
  ↓
Pickup & Drop
  ↓
Interactive Day-wise Itinerary
  ↓
Places Covered
  ↓
Historical / Cultural Context
  ↓
Included / Excluded
  ↓
Vehicle
  ↓
Accommodation
  ↓
Food
  ↓
Best Time
  ↓
Important Information
  ↓
Related experiences / destinations
  ↓
Final CTA
```

Desktop may use multi-column layouts, a **sticky booking panel**, larger gallery, itinerary timeline, map integration and side information cards. The mobile composition is **not** forced onto desktop.

### 195.2 Mobile experience

Conceptual composition:

```
Hero
  ↓
Trip identity
  ↓
Quick facts
  ↓
Overview
  ↓
Pickup / Drop
  ↓
Itinerary
  ↓
Places
  ↓
Cultural context
  ↓
Included / Excluded
  ↓
Vehicle
  ↓
Stay
  ↓
Food
  ↓
Best time
  ↓
Important information
```

Mobile may use swipeable galleries, expandable sections, an itinerary timeline, bottom sheets, a **sticky booking action**, touch-friendly controls and horizontal cards.

**Binding navigation rule (§168).** Global navigation on public mobile uses the **established bottom navigation pattern**. A **hamburger menu must not** be introduced as the primary global navigation. The booking CTA may use a **sticky action area above** the global bottom navigation, so the two do not collide.

### 195.3 Premium experience standard

The Trip Detail page is **premium travel editorial + trip planner + group booking product**. It must not degrade into a plain document. Information should be easy to scan while detail remains available, using hierarchy, visual grouping, cards, timelines, maps, imagery, progressive disclosure and clear CTAs.

**Motion** communicates progress, state, navigation, itinerary position and booking feedback. It must not exist for decoration (§170), must respect `prefers-reduced-motion`, and must not be added at the cost of performance (§167).

## 196. Trip Detail SEO / AEO / GEO

The Trip Detail page is an **indexable travel entity**. It must support:

```
stable trip URLs
title
description
canonical URL
semantic heading structure
internal links
destination relationships
itinerary information
duration
season
availability / pricing where indexability rules permit
structured data
machine-readable content
related destinations
related trips
```

Search engines and answer engines must be able to understand the trip **without relying on visual rendering alone** — this is a direct requirement of the structured content model (§185) and of §172/§173.

**AEO/GEO content must be factual, structured and directly supported by SafarUp data.** **No hidden keyword stuffing.** Structured information must remain consistent between database, API, public page, metadata and agent representation (§173).

Slugs remain readable and must not expose raw Firestore document IDs (§131). URL rules are governed by §132.

## 197. Agent-native Trip interface

An AI agent must be able to answer the following **from structured platform capabilities, without scraping the visual page**:

```
What is this trip?
How long is it?
Where does it start?
Where does it end?
What season does it operate?
What places are covered?
What is the itinerary?
Where is the overnight stay?
What is included?
What is not included?
What meals are provided?
What group size is supported?
What dates are available?
What does it cost?
Can I prepare a booking?
```

Every one of these is answerable only if the corresponding content area exists as **structured data** (§185–§194) — which is the architectural argument for this model over a description blob.

Capability phases (aligned with §182):

| Phase | Capability |
|---|---|
| 3 | GET trip, GET itinerary |
| 4 | GET availability, GET pricing, CREATE booking intent |
| 4/5 | CONFIRM booking (consequential — see §164) |

**Consequential actions require explicit authorization** (§164): booking confirmation, payment, cancellation and account changes are not available to an agent without appropriate authorization, confirmation boundaries, idempotency and audit logging (§165, §183).

**All agent actions use the same services and authorization model as human actions** (§157, §162, §166). There is no separate agent-only business-logic path.

> **The final API design must follow the canonical backend contract** and is not authored here. This section defines *capabilities*, not endpoints.

## 198. Group booking model

The following are **distinct concepts and must not be collapsed into one object**:

```
Trip Template
        ↓
Departure (scheduled instance)
        ↓
Group Booking
        ↓
Participants / Travelers
        ↓
Payment
```

| Concept | Represents | Owns |
|---|---|---|
| **Trip Template** (§53) | *What the trip is* — the reusable product | identity, content (§185–§193), base price, media, itinerary reference |
| **Departure** (§54) | *When this specific trip happens* | date, return date, actual availability, capacity, operational allocation, applicable pricing |
| **Booking** (§55) | A user's actual transaction | booking number, traveler count, totals, status, payment status |
| **Traveler** (`bookingTravelers`) | Individual participants | per-traveler details |
| **Payment** (§58) | Money movement | order/payment IDs, amount, status, signature verification |

The **Trip Detail page describes the reusable trip product** (Trip Template). A **specific departure** determines date, actual availability, current capacity, operational allocation and applicable pricing. A **booking** represents a user's actual transaction.

Consequences:

- Trip-level content (§185–§193) is **not duplicated per departure**.
- Meals (§191) and itinerary (§185.4) are template-level, not per-booking.
- Seat/seat-count logic belongs to the Departure, and is transaction-safe (§152 → ADR "Transaction-safe").
- Capacity, price and availability shown on the Trip Detail page are **departure-derived** and may be absent when no departure is open — an empty state, not a zero (§112).

This restates and reinforces the existing §21 distinction; it does not replace it.

## 199. Trip content management (admin CMS)

Admin users **must not** be forced to edit a single giant text field. The CMS must support structured editing of:

```
overview
pickup / drop
itinerary days
itinerary stops
places covered
inclusions
exclusions
vehicle
accommodation
meals
seasonality
important information
media
SEO metadata
structured content
```

Beyond the existing §40 itinerary builder, this implies:

- **Structured, field-level editing** per content area (§185–§193), each with its own validation.
- **Preview** that renders against the same contract the public page consumes (§195), so a content error is visible before publishing.
- **Publishing workflow** consistent with §78 (Draft → Review → Publish → Update → Archive); trips are not deleted unnecessarily.
- **Audit logging** for significant mutations (§59, §77).
- **Role enforcement**: content edits vs. operational/financial changes remain separated by role (§60).

> **Unresolved:** concrete CMS screens, field-level validation rules, and preview mechanics are design/implementation detail for the Admin Agent **once the Trip Detail contract is approved**. Specifying them before then would encode an unapproved schema.

## 200. Domain decisions

Per §181, an implementation agent may **not** create a business entity because a prompt, UI design or implementation plan mentions it. This section is the authoritative decision log.

### 200.1 Guide — ✅ RESOLVED (v1.5)

| | |
|---|---|
| **Appears in** | §108 (Guide Model), §107 (partner entities), §185.1/§185.2 (guide information / guide model) |
| **Earlier conflict** | No `guides` collection in §51; §4 listed a public guide marketplace as a V1 non-goal; §108 ruled out a `guide.safarup.in` portal |
| **Decision** | **Guide is an internal operational entity for V1.** A `guides` collection is **allowed**. Admin management is **allowed**. Guide may be **associated with trips/departures** where operationally required, and with future operational booking relationships. |
| **Still not allowed in V1** | Public guide marketplace · public guide discovery experience · separate guide portal. The §4 non-goal stands. **No public Guide UX may be built.** |
| **Constraint on Trip** | Trip expresses a *guide model / policy* (§185.2). Now that a `guides` entity is permitted, a Trip **may** reference a Guide for operations, but the model is not required to depend on one. |

### 200.2 Place / Attraction entity — ✅ RESOLVED (v1.5)

| | |
|---|---|
| **Appears in** | §22 ("Places to visit"), §173, §185.3 (linkable pickup/drop locations), §186 (Places Covered) |
| **Earlier conflict** | The collection model had no `places` collection, while §22/§173 assume place-level content and §186 requires references to canonical place entities and forbids duplication |
| **Decision** | **Place / Attraction is a first-class canonical entity**, part of the **Phase 2 content foundation**. A `places` collection is **allowed**. A Place is **independently identifiable and referenceable** across Destination, Trip itineraries, Places Covered, maps, search, SEO/AEO/GEO, agent-readable resources and future recommendation systems. |
| **Hard constraint** | **Place records must never be duplicated** into individual destination or trip documents (§186). Trips reference Places from itinerary stops; Destinations reference them from Places Covered. |
| **Still open** | Field-level detail (§200.9) and whether a public `/places/:slug` route exists (§200.6). These do **not** block the entity. |

### 200.3 Category and District — ✅ RESOLVED (v1.5)

| Entity | Decision |
|---|---|
| **Category** | **First-class taxonomy entity.** A `categories` collection is allowed. **Destination → Category is MANY-TO-MANY via `categoryIds[]`.** Destination must **not** be frozen to a singular `categoryId`, and uncontrolled free-text category values must **not** be the canonical relationship. The canonical taxonomy is administered through Category. |
| **District** | **First-class canonical geographic entity.** A `districts` collection is allowed. **Destination → District is 1:1 via `districtId`.** A free-form `region` string is **not** the canonical relationship; the §51.2 interim proposal is **withdrawn** (§51.2). District is part of the core destination/content hierarchy, supporting future destination filtering, district-level discovery, internal linking and SEO/AEO/GEO. |

> **Scope boundary (not deferred, just separate).** §42 hotels and §49 blog posts currently carry a `category` **string**. Migrating those to `categoryId`/`categoryIds` is a **separate, explicitly approved** decision and is **not** performed automatically.

### 200.4 Trip Detail field-level contract

| | |
|---|---|
| **Status** | **UNRESOLVED — blocks Trip/Itinerary implementation (Phase 3).** |
| **Issue** | §185–§194 define *which structured areas* a Trip supports and their relationships, but deliberately do **not** fix field names, Firestore sub-document boundaries, or how much content is embedded vs. referenced. §53 remains a pre-v1.4 baseline and is insufficient (§53 note). |
| **Decision needed** | The canonical Trip Detail contract: field names, itinerary collection/sub-collection layout, validation rules, and which content is derived rather than stored. Required **before** dispatching the Backend Agent (§161). |
| **Interim position (proposed, not approved)** | Keep §185 as the capability contract. Do not let the Backend Agent choose field names. |

### 200.5 Pickup/drop inheritance

| | |
|---|---|
| **Status** | **UNRESOLVED.** |
| **Issue** | §54 `Departure` carries `pickupLocations`, while §185.3 defines trip-level pickup/drop. Whether a departure may override a trip default, or must inherit it, is not settled. |

### 200.6 Public routes for District, Category and Place

| | |
|---|---|
| **Status** | **UNRESOLVED — does not block Phase 2 entity work.** |
| **Issue** | §17 defines `/destinations` and `/destinations/:slug` only. There is no defined route for districts, categories or individual places, although §172/§173 contemplate district-level discovery and internal linking, and §115 places Categories inside Explore. |
| **Decision needed** | Whether `/districts/:slug`, `/categories/:slug` and `/places/:slug` are public routes, and what their indexability is. |

### 200.7 Accommodation ↔ `hotels` relationship

| | |
|---|---|
| **Status** | **UNRESOLVED.** |
| **Issue** | §190 requires accommodation as an independent, group-dependent concept; §51 has a `hotels` collection and §42 covers hotel management. The link between a trip's accommodation *policy* and a concrete `hotels` record is undefined. |

### 200.8 Remaining field/behaviour questions

> **These are NOT the Guide / Category / District / Place entity decisions.** Those four are **APPROVED** in §200.1–200.3. The items below are narrower field and behaviour questions that remain genuinely open.

| Item | Status | Blocks |
|---|---|---|
| Place field-level contract (§200.9) — the entity is approved, its fields are not | UNRESOLVED | Place implementation |
| `thingsToDo` model — reference the `activities` collection, or destination-local content? | UNRESOLVED | Destination `thingsToDo` |
| `relatedDestinations` — explicit links, or derived by shared district/category? | UNRESOLVED | Destination related content |
| Slug change behaviour after publish (allow? redirect?) | UNRESOLVED | Destination lifecycle |
| `featured` ordering — boolean or ranked? | UNRESOLVED | Homepage rail |
| Search mechanics for §68 ("V1 search: destinations, trips, blog") | UNRESOLVED | Public search |
| Hotel/Blog `category` string → reference migration | UNRESOLVED (explicitly out of scope of §200.3) | Taxonomy consistency |

### 200.9 Place field-level contract

| | |
|---|---|
| **Status** | **UNRESOLVED — blocks Place implementation.** |
| **Issue** | The Place **entity** is approved (§200.2), but its field list is not. Location coordinates, boundary data, opening hours, ticketing, multilingual name and similar tourism attributes have **no PRD support** and must not be invented. |
| **Decision needed** | Minimum Place field set, and whether a Place has its own public page. |

### 200.10 Historical/cultural content structure

| | |
|---|---|
| **Status** | **UNRESOLVED — does not block Phase 2 or Phase 3.** |
| **Issue** | §187 establishes that this Trip content area exists, is separate from operational booking data, and must be attribution-ready. Its field structure and editorial/verification workflow are not specified, and are not required to begin Destination or Trip/Itinerary work. |

### 200.11 Out of scope for v1.5

The following were **not** changed by v1.5 and remain owned elsewhere: pricing rules (§103, §104), cancellation policy (§48), booking state machine (§55, §76), payment/Razorpay (§12–§13, §58), and private-trip proposals (§56, §57). No rule in those areas is modified, restated or invented by this version.
