# AutoCustomizer

AutoCustomizer is a full-stack operations platform for managing car-related bookings, service workflows, order processing, payments, and communication across multiple user roles. It is designed for real-world operational use where dispatchers, service providers, customers, sellers, and administrators all need a shared system of record with clear access boundaries and traceable status changes.

## Recruiter Summary

This project demonstrates end-to-end ownership of a production-style platform, including:

- Booking and order lifecycle design with status history, approvals, and role-based transitions
- Live integrations for customer, provider, seller, and admin workflows
- Financial workflows for payments, settlement tracking, and audit-friendly records
- Multi-tenant authentication and authorization with role-aware access control
- Performance-focused backend work, including indexing, caching, logging, and operational reporting
- API design for web dashboards, mobile-facing flows, and internal admin tools

## User Roles

The platform is built around distinct roles, each with a specific operational responsibility:

### Customer

- Creates service bookings and product orders
- Shares vehicle and contact details needed for fulfillment
- Tracks request status, payment state, and notifications
- Communicates with providers through chat and workflow updates

### Service Provider

- Reviews incoming bookings and updates service status
- Confirms pricing, parts, pickup/drop-off needs, and completion details
- Manages linked products and service progress
- Works from the operational queue for assigned customer requests

### Seller

- Manages product listings and order fulfillment-related actions
- Updates item-level order progress such as confirmation, shipping, and delivery
- Handles order history, delivery OTP flow, and payment-related order states
- Supports marketplace-side operations tied to service fulfillment

### Manager

- Maintains service categories and operational oversight
- Monitors active bookings, provider activity, and business flow
- Reviews pricing changes, approvals, and status transitions
- Supports governance across customers, providers, and sellers

### Admin

- Manages platform-wide users, permissions, and oversight workflows
- Accesses dashboards, reports, and operational summaries
- Reviews system-level activity across bookings, orders, and payments
- Handles governance, support, and administrative controls

## What The Platform Does

The system supports the operational flow of a fleet or service business from request to completion:

1. A customer creates a booking or order.
2. The request is assigned, confirmed, and moved through a tracked lifecycle.
3. Providers, sellers, and managers update the request as work progresses.
4. Payments and financial status are recorded and reconciled.
5. Notifications, chat, and audit trails keep stakeholders aligned.

The backend is structured to handle real operational edge cases such as partial fulfillment, status rollback, custom address handling, payment states, and historical tracking of changes.

## Key Product Capabilities

### Booking and Lifecycle Management

- Service booking flows with customer, provider, and manager roles
- Order tracking with item-level and order-level status history
- Price approval workflows and change history for service bookings
- Support for operational fields such as pickup, drop-off, vehicle metadata, and linked parts

### Financial and Settlement Workflows

- Payment capture and payment status management
- Order and booking records structured for reconciliation and reporting
- Audit-friendly timestamps and history logs for status and cost changes
- Export and reporting utilities for operational review

### Access Control and Multi-Role Operations

- Authentication and authorization across admin, manager, customer, seller, and service-provider experiences
- Session and JWT compatibility for smoother migration and client integration
- Role-aware route protection and scoped data access patterns

### Communication and Operations

- Real-time support using Socket.IO rooms for customer and provider notifications
- Admin and dashboard routes for operational visibility
- Swagger API documentation for discoverability and integration support

### Performance and Reliability

- Database indexes on core order and booking queries
- Request logging, security headers, rate limiting, and NoSQL injection protection
- Operational scripts for database performance and cache analysis

## Architecture Snapshot

- Backend: Node.js, Express, MongoDB, Socket.IO
- Frontend: React application served from the backend in production
- API styles: REST endpoints plus GraphQL for admin workflows
- Documentation: Swagger/OpenAPI
- Infrastructure support: Docker and Docker Compose for local development

## Core Modules

- Authentication: user signup, login, session compatibility, role checks
- Orders: product order lifecycle, delivery status, payment status, and history
- Bookings: service booking lifecycle, pricing, linked products, and status transitions
- Payments: payment workflows and settlement-facing records
- Messaging: chat and notification delivery
- Admin tooling: dashboard, reports, and management endpoints

## Technology Stack

- Node.js
- Express
- MongoDB / Mongoose
- React
- Socket.IO
- GraphQL
- Swagger / OpenAPI
- Redis
- Stripe
- Firebase Admin
- Cloudinary
- Docker

## Why This Project Matters

This is not just a CRUD application. It models the operational complexity of a real service business:

- Multiple user roles with different permissions and responsibilities
- Mutable lifecycle states that need traceability
- Financial workflows that require consistency and auditability
- Live operational communication between users
- Backend structure that can support scale, integrations, and reporting

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run build:client
npm start
```

Useful scripts:

- `npm test` - run backend tests
- `npm run docker:compose:dev` - start the local Docker development stack
- `npm run search:solr:up` - start search infrastructure
- `npm run perf:db` - generate database performance reporting

## Suggested Recruiter Pitch

I worked on AutoCustomizer, a multi-role fleet and service operations platform that manages the full lifecycle from booking confirmation to completion, including payments, settlement tracking, notifications, and admin oversight. The system was built with role-based access control, audit-friendly state transitions, real-time communication, and performance-conscious data modeling to support production usage.

## Notes

- The project includes both legacy and modern route patterns, so the backend supports gradual migration and integration work.
- If you want this README adapted for a specific role, such as backend engineer, full-stack engineer, or platform engineer, the same content can be rewritten to emphasize that angle.
