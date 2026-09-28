# SAFARUP — MASTER PRODUCT REQUIREMENTS DOCUMENT

| | |
|---|---|
| **Product** | SafarUp |
| **Domain** | safarup.in |
| **Admin** | admin.safarup.in |
| **Document** | Master Product Requirements Document |
| **Version** | 1.0 |
| **Status** | Production Development Baseline |
| **Date** | September 2026 |
| **Product Type** | Digital Travel Company + Travel Commerce Platform |
| **Primary Market** | India, initially Bihar-focused |
| **Primary Currency** | INR (₹) |

---

## 1. Executive Summary

### 1.1 Product Vision

SafarUp is a digital-first travel company designed to make organized travel discoverable, customizable, bookable and manageable online.

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
Firebase        Razorpay        Email
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
├── web/
├── admin/
└── backend/
```

- **web/** — Customer-facing SafarUp application.
- **admin/** — Internal operations application.
- **backend/** — Shared trusted backend/business logic.

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

### 9.1 Web

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### 9.2 Admin

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### 9.3 Backend

- Firebase
- Cloud Functions
- Firebase Admin SDK
- TypeScript

Firebase Cloud Functions supports HTTPS requests and event-driven backend execution, making it appropriate for payment verification, booking workflows, scheduled jobs and other trusted operations.

### 9.4 Authentication

Firebase Authentication.

Supported:
- Email/password
- Google
- Apple

No phone OTP authentication in V1.

Firebase officially supports email/password, Google and Sign in with Apple authentication for web applications.

Email verification must be enabled for email/password accounts.

> **Note (project deviation):** The current repo scaffold (`backend`, `public`, `admin`) was built in plain JavaScript/Express, not the Firebase + TypeScript stack described above. This PRD reflects the target architecture; a stack alignment decision is needed before Phase 1 build-out (see §149).

---

## 10. Database

**Primary database:** Cloud Firestore

Firestore is the system of record for application data.

Security must use:
- Firebase Authentication
- Firestore Security Rules
- Backend authorization
- Firebase App Check where appropriate

Firebase recommends Authentication + Firestore Security Rules for securing web/mobile access, with App Check available as an additional protection.

---

## 11. Storage

Firebase Storage. Used for:

- Destination images
- Trip images
- Blog images
- User profile images
- Documents
- Invoices where appropriate
- Operational media

Storage access must be governed by authenticated authorization and appropriate Storage Rules.

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
SafarUp
  ↓
Create booking intent
  ↓
Backend
  ↓
Create Razorpay Order
  ↓
Razorpay Checkout
  ↓
Payment
  ↓
Razorpay callback/webhook
  ↓
Backend verification
  ↓
Firestore transaction/update
  ↓
Booking confirmed
```

Razorpay recommends server-side handling of trusted amounts, signature validation and HMAC validation for webhooks.

Never store Razorpay secret credentials in the React application.

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

Fields: full name, email, password, confirm password, terms acceptance. Email verification required.

**Google** — OAuth.

**Apple** — Sign in with Apple.

---

## 31. Account Linking

If the same verified email exists across authentication providers, the system should support safe account-linking flows where Firebase supports them.

Avoid duplicate customer profiles.

---

## 32. Mobile Experience

SafarUp is mobile-first in interaction design, while remaining premium on desktop.

The mobile experience must feel like an application.

**Mobile navigation** — Use a floating bottom navigation system.

Recommended: Home, Trips, Explore, Bookings, Account.

**Visual language:**
- Glass-like translucent surface
- Backdrop blur
- Rounded container
- Soft border
- Subtle elevation
- Animated active state
- Large touch targets

The design should be SafarUp-branded, not a literal Apple UI clone.

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

Core collections:

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

---

## 52. User Document

`users/{uid}`

Fields: `uid`, `email`, `displayName`, `photoURL`, `role`, `emailVerified`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`

Additional traveler information belongs in controlled application data, not Firebase Auth's fixed user object. Firebase documents that additional user properties should be stored in another service such as Firestore.

---

## 53. Trip Template

`tripTemplates/{tripId}`

Fields: `title`, `slug`, `destinationId`, `description`, `durationDays`, `durationNights`, `heroImage`, `gallery`, `basePrice`, `currency`, `status`, `featured`, `itineraryId`, `inclusions`, `exclusions`, `terms`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

---

## 54. Departure

`departures/{departureId}`

Fields: `tripTemplateId`, `departureDate`, `returnDate`, `capacity`, `reservedSeats`, `confirmedSeats`, `availableSeats`, `price`, `status`, `pickupLocations`, `bookingCutoff`, `createdAt`, `updatedAt`

---

## 55. Booking

`bookings/{bookingId}`

Fields: `bookingNumber`, `userId`, `tripTemplateId`, `departureId`, `status`, `travelerCount`, `subtotal`, `discount`, `tax`, `total`, `currency`, `paymentStatus`, `razorpayOrderId`, `createdAt`, `updatedAt`

---

## 56. Private Trip Request

`privateTripRequests/{requestId}`

Fields: `userId`, `destinationId`, `travelStartDate`, `travelEndDate`, `travelerCount`, `pickupLocation`, `hotelPreference`, `transportPreference`, `activityPreferences`, `foodPreferences`, `budget`, `specialRequirements`, `status`, `createdAt`, `updatedAt`

---

## 57. Private Proposal

`privateTripProposals/{proposalId}`

Fields: `requestId`, `version`, `itinerary`, `services`, `subtotal`, `markup`, `tax`, `discount`, `total`, `currency`, `validUntil`, `status`, `createdBy`, `createdAt`, `updatedAt`

Proposal versioning is mandatory. If an admin changes the proposal, a new version should be created rather than destroying the historical record.

---

## 58. Payment

`payments/{paymentId}`

Fields: `bookingId`, `userId`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `currency`, `status`, `method`, `signatureVerified`, `capturedAt`, `createdAt`, `updatedAt`

---

## 59. Audit Log

Every sensitive administrative action should be auditable.

`auditLogs/{logId}`

Fields: `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `before`, `after`, `timestamp`, `ipMetadata`

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

Mandatory controls: Firebase Auth, Firestore Security Rules, Storage Security Rules, App Check where appropriate, server-side authorization, server-side payment verification, secret management, rate limiting for sensitive functions, input validation, output sanitization, audit logging, least privilege, secure cookies/session handling where applicable, HTTPS everywhere.

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

## 63. Firestore Security Model

Public anonymous users should only access explicitly public documents, e.g. published destinations, trips, blog posts (READ).

**Customers:** own profile (READ/WRITE per policy), own bookings (READ), own payments (READ), own private requests (READ/WRITE per workflow).

**Admin:** access determined by role and backend authorization.

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

Never expose raw Firebase/Razorpay/server errors to customers.

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

Use: responsive images, WebP/AVIF where appropriate, proper compression, lazy loading, CDN delivery through Firebase-compatible infrastructure.

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

## 93. Firebase Project Strategy

Prefer separate Firebase projects/configurations:

- `safarup-dev`
- `safarup-staging`
- `safarup-production`

This prevents development data from contaminating production.

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

**Integration** — Firebase, Razorpay, email, Cloud Functions.

**E2E (group trip)** — Browse → Select → Login → Book → Pay → Confirm

**E2E (private trip)** — Request → Admin proposal → Customer acceptance → Payment → Confirmation

---

## 99. Critical Test Cases

**Payment:** successful payment, failed payment, abandoned checkout, duplicate callback, invalid signature, wrong amount, refund.

**Booking:** last seat, multiple simultaneous bookings, expired payment, cancellation, duplicate submission.

**Authentication:** email signup, email verification, Google login, Apple login, existing account, password reset, provider account linking.

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

Monitor: Core Web Vitals, function latency, Firestore errors, payment failures, checkout conversion, API errors.

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

Avoid exposing raw Firestore IDs in public URLs.

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

Consider: Firebase App Check, reCAPTCHA where necessary, honeypots for public forms, rate limits.

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
- [ ] Functions
- [ ] Webhooks
- [ ] Idempotency
- [ ] Logging
- [ ] Error handling

**Authentication**
- [ ] Email/password
- [ ] Google
- [ ] Apple
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
Repository, monorepo, Firebase projects, environments, CI/CD, design tokens, authentication architecture, security baseline.

**Phase 1 — Public foundation**
Homepage, header, footer, destinations, destination details, trips, trip details, about, contact, policies.

**Phase 2 — Admin foundation**
Admin authentication, roles, dashboard, destination CMS, trip CMS, itinerary builder, departure management.

**Phase 3 — Customer accounts**
Signup, login, Google, Apple, profile, dashboard, bookings.

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
| Public application | React + TypeScript + Vite |
| Backend | Firebase |
| Database | Firestore |
| Authentication | Firebase Auth |
| Email/password | Yes |
| Google | Yes |
| Apple | Yes |
| Phone OTP | No |
| Storage | Firebase Storage |
| Server logic | Firebase Cloud Functions |
| Public domain | safarup.in |
| Admin domain | admin.safarup.in |
| Repository structure | web + admin + backend |
| Public mobile UX | App-like / floating bottom navigation |
| Desktop UX | Premium full web experience |
| Admin UX | Desktop-first operations control center |
| Core commercial object | Trip / Departure / Booking |
| Private-trip workflow | Request → Proposal → Acceptance → Payment → Booking |
| Payment verification | Server-side |
| Booking capacity | Transaction-safe |
| Admin | Operational source of truth |
