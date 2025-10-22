# Crypto Sim Platform

Foundational scaffold for a crypto trading simulator that includes a NestJS backend, Prisma + MySQL persistence, Redis-powered caching and queues, BullMQ workers, Socket.IO real-time push, and a Vite + React admin console styled with Tailwind and shadcn/ui primitives.

## Repository Layout

- `backend/` – NestJS monolith with modular architecture (auth, market data ingestion, queues, Redis, Prisma ORM).
- `frontend/` – Admin dashboard built with Vite, React, TanStack Router/Query, Tailwind, and reusable UI components.
- `docker-compose.yml` – Local dependencies (MySQL 8, Redis 7).
- `.env.example` – Backend environment template located at `backend/.env.example`.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker (for local MySQL & Redis)

## Quick Start

```bash
# install dependencies
npm install

# start infrastructure
docker compose up -d

# prepare backend
cp backend/.env.example backend/.env
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed

# run backend & frontend in separate terminals
npm run backend:dev
npm run frontend:dev
```

Backend API defaults to `http://localhost:3000/api` with WebSocket endpoint at `ws://localhost:3000`. Frontend dev server runs at `http://localhost:5173` and expects the API URL to be provided via `VITE_API_URL` (`frontend/.env` file if needed).

## Backend Highlights

- **NestJS Modules**: Auth (JWT access/refresh, RBAC decorators), Prisma ORM service, Redis cache/connection manager, BullMQ queue service + processors, Socket.IO gateway with Redis adapter, Market data ingestion service (Binance WS + CoinGecko fallback), Mail service via Nodemailer.
- **Configuration**: `@nestjs/config` with Zod-based validation and hierarchical configuration (`src/config`).
- **Prisma Schema**: User, Session, Order, Trade, MarketSnapshot models with seed script to bootstrap an initial admin account.
- **Queues & Jobs**: `QueueService` abstraction, example processors for notifications and market data persistence, Bull Board dependencies ready for UI integration.
- **Testing**: Jest unit + e2e configuration mirroring defaults from Nest CLI.

## Frontend Highlights

- **Routing & Data**: TanStack Router for nested layouts & guards, TanStack Query for API caching.
- **State & Auth**: Central `AuthProvider` handles JWT storage/refresh, Axios client with automatic token refresh, logout wiring, and context hook (`useAuth`).
- **UI Foundation**: Tailwind configuration with shadcn-style primitives (Button, Card, Input, Label) and layout components (Sidebar, Header, AppShell).
- **Real-time Ready**: `MarketDataPage` demonstrates Socket.IO/WebSocket subscription for price updates.
- **Developer Tooling**: TypeScript strict mode, ESLint + Prettier configs, Query & Router Devtools enabled in development.

## Next Steps

1. Implement domain modules (orders, portfolios, risk) on the backend and expose DTOs/services.
2. Expand queue processors and Bull Board UI to observe job throughput.
3. Harden auth (password reset, MFA) and add fine-grained permissions.
4. Flesh out frontend data grids and forms using TanStack Table + react-hook-form/zod for validation.
5. Add CI workflows (lint, test, build) and deployment automation (Docker images, IaC templates).

## Useful Commands

- `npm run backend:dev` – Start NestJS backend with hot reload.
- `npm run backend:test` – Run backend unit tests.
- `npm run frontend:dev` – Launch Vite dev server.
- `npm run frontend:build` – Production build for the admin UI.
- `docker compose up -d` – Spin up MySQL & Redis locally.

## Environment Variables

Backend configuration is documented in `backend/.env.example`. Key values:

- Database connection (`DATABASE_URL`)
- JWT secrets & TTLs (`JWT_*`)
- Redis coordinates for cache/queue/session separation
- Mail transport credentials
- Market data settings for Binance + CoinGecko adapters

Frontend accepts:

- `VITE_API_URL` – Backend base URL (defaults to `http://localhost:3000/api`).
- `VITE_WS_URL` – Socket.IO base URL (defaults to `ws://localhost:3000`).

---

This scaffold is intentionally opinionated to accelerate development while remaining modular enough to adapt as requirements evolve.
