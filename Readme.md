<div align="center">

# Find N' Stay

### Property management for landlords, property managers, and tenants

RentFlow is a planned full-stack property management platform that brings rental discovery, applications, leases, rent collection, and maintenance into one place.

</div>

RentFlow is designed as a portfolio-grade project focused on real product workflows and sound backend engineering, not just basic record management. This repository is at the beginning of that build: the features below describe the intended product and roadmap, not a claim that every feature is already implemented.

## Product Overview

RentFlow connects three kinds of users around the rental lifecycle:

- **Tenants** discover available units, apply, manage their lease, pay rent, and report maintenance issues.
- **Landlords and property managers** manage properties and units, review applicants, manage leases, track payments, and coordinate repairs.
- **Administrators** verify users and listings, respond to reports, monitor platform activity, and enforce account policies.

The core relationship is **property → unit → application → lease → invoice/payment**. A property can contain many separately rentable units, each with its own availability, rent, and application history.

## Roles and Capabilities

### Tenant

- Register, sign in, and manage an account.
- Browse property listings and search available units by location, price, bedrooms, bathrooms, property type, and amenities.
- View property and unit details, then submit an application with supporting documents.
- Track application decisions and lease information.
- View rent invoices, pay rent, and review payment history.
- Submit maintenance requests, follow their progress, and receive notifications.

### Landlord / Property Manager

- Create and manage properties, images, amenities, and individual units.
- Set unit rent, fees, and availability.
- Review applications and approve or reject them.
- Manage tenants and leases, track invoices and payments, and review occupancy.
- Assign and manage maintenance work.
- View operational summaries such as occupancy, income, applications, and open requests.

### Administrator

- Manage users and suspend accounts when necessary.
- Verify landlords and properties.
- Review reports about properties or users.
- View platform statistics and audit sensitive actions.

## Key Workflows

### Property and unit management

A landlord creates a property and adds one or more units. Property information describes the building or listing; unit information describes the rentable space, including bedrooms, bathrooms, rent, and availability.

### Applications and leases

```text
Tenant applies → Pending review → Approved or rejected
					    ↓ Approved
				    Lease is created
					    ↓
				 Unit becomes occupied
```

Application status changes are enforced by the backend. Invalid transitions, such as changing a rejected application directly to approved, should not be possible without an explicit reopen/review action. Lease creation and unit occupancy updates should be handled consistently, using database transactions where appropriate.

### Rent and payment verification

Leases can generate rent invoices. The planned payment flow uses Paystack in test mode: the backend initializes a transaction, verifies the provider response or webhook, and only then records a successful payment and marks the invoice paid. The frontend is never treated as proof of payment.

### Maintenance

Tenants create requests associated with their unit and describe the issue, optionally attaching images. Landlords can assign work and move a request through `OPEN`, `ASSIGNED`, `IN_PROGRESS`, and `RESOLVED` (with cancellation handled where appropriate). Request history and updates remain visible to the relevant users.

### Notifications and audit history

Database-backed notifications keep users informed about applications, leases, payments, and maintenance. Important actions, such as application decisions, rent changes, and account suspensions, are recorded in audit logs. Real-time delivery with Socket.IO can build on these persisted events.

## Planned Data Model

The PostgreSQL schema is centered on users, properties, and rental units, with supporting tables for the workflows above:

| Area                | Tables / records                                      |
| ------------------- | ----------------------------------------------------- |
| Identity and access | `users`, roles, verification and account status       |
| Listings            | `properties`, `units`, `property_images`, `amenities` |
| Rental lifecycle    | `applications`, `leases`, `documents`                 |
| Billing             | `invoices`, `payments`                                |
| Operations          | `maintenance_requests`, `maintenance_updates`         |
| Platform activity   | `notifications`, `reviews`, `audit_logs`              |

Foreign keys connect records to their owners and parent entities. Statuses are constrained to known values, and indexes will support common listing filters, ownership lookups, and workflow queues. The schema lives in [`db/dB.schema`](db/dB.schema).

## Technology

The current project dependencies and schema establish this starting stack:

- **Runtime and server:** Node.js, Express 5
- **Database:** PostgreSQL with the `pg` client
- **Views:** EJS
- **Authentication foundation:** `express-session` and `bcrypt`
- **Validation and security:** `express-validator`, Helmet, and `express-rate-limit`
- **Uploads and media:** Multer and Cloudinary
- **Notifications and communication:** Socket.IO and Nodemailer

Paystack is a planned payment integration; it is not listed as an installed dependency yet. The implementation may evolve as the project develops.

## API Direction

The application will expose role-protected routes for authentication and the main product workflows. Example endpoints:

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

GET  /api/properties?location=Lagos&minPrice=500000&maxPrice=2000000&bedrooms=2&page=1&limit=20
GET  /api/landlord/properties
POST /api/landlord/properties
POST /api/units/:unitId/applications
PATCH /api/applications/:applicationId/status
POST /api/maintenance-requests
```

Authentication identifies the user; authorization checks both role and resource ownership. For example, a tenant must not be able to access a landlord's property-management endpoints or another tenant's private records. Listing search will support validation, filtering, sorting, and pagination at the database layer.

## Development Roadmap

### Phase 1: Foundation

- Establish PostgreSQL schema, configuration, and database access.
- Build authentication, sessions, role checks, and request validation.
- Add consistent error handling and the initial application views.

### Phase 2: Properties and discovery

- Create and manage properties, units, amenities, and images.
- Implement public listing details and searchable, filtered, paginated results.

### Phase 3: Applications and leases

- Submit applications and supporting documents.
- Build landlord review actions with enforced status transitions.
- Create leases for approved applications and keep unit occupancy consistent.

### Phase 4: Invoices and payments

- Generate invoices from leases and show payment history.
- Integrate Paystack test mode with backend transaction verification and webhooks.

### Phase 5: Maintenance and notifications

- Create, assign, update, and resolve maintenance requests.
- Persist notifications and add real-time delivery where useful.

### Phase 6: Dashboards and administration

- Build tenant, landlord, and admin dashboards.
- Add occupancy, revenue, application, maintenance, and outstanding-rent summaries.
- Add verification, reported-property handling, account controls, and audit history.

### Phase 7: Production readiness

- Add automated tests, API documentation, structured logging, and robust validation.
- Review security, rate limiting, file-upload handling, and deployment configuration.
- Consider recurring invoice generation and automated rent reminders.

## Portfolio Goals

RentFlow is intended to demonstrate practical ability in relational data modeling, REST API design, role-based access control, secure payment workflows, transactional updates, file uploads, search and pagination, real-time communication, testing, and production-minded security. The priority is to deliver the workflows in stages and keep the database and authorization rules trustworthy as the product grows.
