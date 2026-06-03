# AutoCustomizer

AutoCustomizer is a full-stack automotive operations platform for car customization services and related product sales. It combines customer booking flows, seller order management, service-provider workflows, payments, chat, notifications, and admin oversight in one system.

The project is built as a production-style multi-role platform rather than a simple catalog app. It focuses on lifecycle tracking, role-based access, operational visibility, and audit-friendly business flows.

## Highlights

- Multi-role platform for customers, sellers, service providers, managers, and admins
- Service booking lifecycle with tracked status updates and pricing workflows
- Product ordering with item-level and order-level fulfillment states
- Role-aware dashboards and protected routes
- Real-time communication and notifications with Socket.IO
- API documentation with Swagger
- Admin and manager operational tooling
- Search/performance utilities for Solr, caching, and database analysis

## User Roles

### Customer

- Browse parts and services
- Create service bookings
- Place product orders
- Track orders, bookings, alerts, and payments
- Chat with providers and view workflow updates

### Seller

- Manage products and inventory
- Process product orders
- Update shipping and delivery states
- View seller dashboards, reviews, and order history

### Service Provider

- Review and manage service bookings
- Update booking progress and pricing
- Manage provider profile and reviews
- Work from service-side operational dashboards

### Manager

- Oversee products, orders, payments, and support flows
- Manage operational categories and platform activity
- Review dashboards and user-facing business metrics

### Admin

- Manage platform-wide users and data visibility
- Access admin dashboard and governance tooling
- Monitor platform activity across roles

## Core Features

### Booking and Service Workflows

- Service booking creation and lifecycle management
- Provider-side booking queue and status transitions
- Pricing updates and approval-related workflow support
- Vehicle details, pickup/drop-off, and related service metadata

### Orders and Commerce

- Product catalog and product details pages
- Cart and checkout flows
- Seller order management
- Order status tracking and customer order history

### Authentication and Access Control

- Role-based signup/login flows
- JWT/session compatibility middleware
- Protected routes for each platform role

### Communication

- Customer-provider messaging
- Real-time alerts and notifications using Socket.IO rooms

### Platform Operations

- Admin and manager dashboards
- Product and service category management
- Swagger/OpenAPI docs
- Reporting and performance scripts

## Tech Stack

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- GraphQL
- Swagger / OpenAPI

### Frontend

- React
- React Router
- Redux Toolkit
- Chart.js

### Integrations and Infrastructure

- Cloudinary
- Firebase Admin
- Stripe
- Redis
- Docker / Docker Compose
- Solr

## Project Structure

```text
.
|-- client/                 # React frontend
|-- config/                 # App, Swagger, Cloudinary, Firebase config
|-- controllers/            # Express controllers
|-- graphql/                # GraphQL schema/resolvers
|-- middleware/             # Auth, security, logging, upload, error middleware
|-- models/                 # Mongoose models
|-- public/                 # Static assets
|-- routes/                 # Express route modules
|-- scripts/                # Reindexing, performance, asset upload scripts
|-- services/               # Business logic by domain/role
|-- tests/                  # Unit tests
|-- views/                  # Legacy EJS views still supported by backend
|-- server.js               # Main server entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB
- Redis optional
- Docker optional

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root and add the values your local setup needs.

Typical variables used by this project include:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=your_stripe_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
REDIS_URL=your_redis_url
```

Use your existing local `.env` as the source of truth if this repo already has one configured.

### 3. Start the backend

```bash
npm start
```

### 4. Run the React client in development

In a second terminal:

```bash
npm --prefix client start
```

### 5. Build the client for production

```bash
npm run build:client
```

The backend serves the built React app from `client/build` in production mode.

## Available Scripts

### Root scripts

```bash
npm start
npm test
npm run test:watch
npm run test:coverage
npm run build
npm run build:client
npm run docker:build
npm run docker:run
npm run docker:compose
npm run docker:compose:dev
npm run search:solr:up
npm run search:solr:down
npm run search:solr:reindex
npm run perf:db
npm run perf:db:compare
npm run perf:cache
```

### Client scripts

```bash
npm --prefix client start
npm --prefix client build
npm --prefix client test
```

## API Docs

Swagger UI is available at:

```text
/api-docs
```

Raw OpenAPI JSON is available at:

```text
/api-docs.json
```

## Testing

Run backend tests:

```bash
npm test
```

Run frontend tests:

```bash
npm --prefix client test
```

Generate backend coverage:

```bash
npm run test:coverage
```

## Architecture Notes

- Express handles API routes, auth/session compatibility, static asset serving, and production React hosting.
- React powers the main user-facing and dashboard experiences.
- Business logic is separated into controllers, services, and models.
- The backend still supports some legacy EJS routes while the React app covers the main SPA flows.
- Socket.IO is used for chat and alert delivery.

## Why This Project Stands Out

AutoCustomizer models a more realistic business system than a standard ecommerce demo:

- Multiple user roles with different responsibilities
- Service and commerce flows in the same platform
- Operational state transitions instead of one-step CRUD actions
- Payment, reporting, and audit-oriented data flows
- A mix of product, service, communication, and admin tooling

## Roadmap Ideas

- Add `.env.example`
- Improve onboarding/demo seed data
- Expand integration and end-to-end tests
- Normalize remaining legacy pages into the React app
- Add deployment docs for Railway/Docker/cloud hosting

## License

This project currently has no published license. Add one before open-source distribution if needed.
