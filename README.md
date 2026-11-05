# Café Feedback

Survey system for a café: the manager builds and publishes short surveys, registered customers answer
them once, and the manager reads the aggregate results. Project of team Frenchies (Eric Le Roux and
Marc), CPE 334, semester 1/2026, theme 10 (Review, Feedback, and Survey System).

Stack: React + Vite (client), Express + Prisma (server), PostgreSQL 16, Vitest, Supertest, Playwright.

## Prerequisites

- Node.js 20 or later
- PostgreSQL 16 running locally (`pg_isready` should answer)

## Setup

```bash
git clone https://github.com/eric-lrx/frenchies-survey.git && cd frenchies-survey
npm install
cp server/.env.example server/.env        # then replace every placeholder
createdb cafe_feedback && createdb cafe_feedback_test
npm run db:migrate
npm run db:seed
npm run dev                               # UI on http://localhost:5173, API on http://localhost:3000
npm test                                  # in another terminal
```

`npm install` also generates the Prisma client. The allowed install scripts (Prisma engines and esbuild)
are listed under `allowScripts` in `package.json`.

## Environment variables (`server/.env`)

| Variable | Purpose | Secret |
|---|---|---|
| `DATABASE_URL` | Development database | yes |
| `TEST_DATABASE_URL` | Test database; its name must end in `_test`, or the tests refuse to run | yes |
| `SEED_PASSWORD` | Password given to every demo account by the seed; share it privately | yes |
| `PORT` | API port (default 3000) | no |
| `NODE_ENV` | `development`, `test` or `production` | no |

Never commit `server/.env`. Only `server/.env.example` is tracked.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API and UI together, with reload on change |
| `npm test` | Server tests (unit, API and database, on the test database), then client tests |
| `npm run build` | Compiles the server and builds the client |
| `npm run db:migrate` | Applies Prisma migrations to the development database |
| `npm run db:seed` | Creates or updates the demo data (safe to run again) |

## Engineering documents

| Document | Content |
|---|---|
| `docs/srs.md` | Requirements, business rules, decisions |
| `docs/features.md` | Feature inventory and planned acceptance criteria |
| `docs/traceability.md` | Requirement, feature, sprint and verification |
| `docs/system-sds.md` | Architecture, data model, API and access conventions, configuration, deployment plan |
| `docs/sprints/plan.md` | Three-sprint plan |
| `docs/sprints/sprint-1/` | Sprint 1 contracts (one per feature), test specification, Definition of Done |
