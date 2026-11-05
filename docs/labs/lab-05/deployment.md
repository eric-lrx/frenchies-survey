# Deployment: Café Feedback on Google Cloud (Lab 5)

Status: **draft**. Sections 1 to 3 describe what exists today. The GCP resources (section 4) and the
release procedure (section 5) are filled in as Issues #26 to #29 are done.

## 1. Stack and changes from the reference

| Part | Reference (Lab 5 Starter Kit) | Café Feedback | Why |
|---|---|---|---|
| Frontend | React + Vite | React + Vite (`client/`) | Same |
| API | Express + TypeScript | Express + TypeScript (`server/`) | Same |
| Database | PostgreSQL 16 + Prisma | PostgreSQL 16 + Prisma 5.22 | Same |
| Repository layout | Separate `server` and `client` installs | One npm workspace (`package-lock.json` at the root) | The Dockerfile installs once at the root |
| Image | Three stages | Two stages: build both workspaces, then a runtime with production dependencies | The workspace builds both parts in one install |
| Static files | Served by Express | Served by Express when `STATIC_DIR` is set (`server/src/app.ts`) | One origin: the session cookie and `/api` need no CORS |
| Prisma CLI | Dev dependency copied with all of `node_modules` | Runtime dependency | The migration job runs `prisma migrate deploy` from the same image, and dev dependencies are pruned |
| Local compose | API and nginx client images | One image (`app`) on port 8080, plus `db` and a one-shot `migrate` job | The same image as Cloud Run, so a local run checks what is deployed |
| Sessions | In the database | In the database (`Session` table, only the SHA-256 of the token) | Nothing is kept in the container (R-04) |

## 2. Environment variables

No variable has a default secret, and none is baked into the image (`docker image inspect` shows only
`NODE_ENV`, `PORT`, `STATIC_DIR` and `TZ`).

| Variable | Read by | Purpose | Secret | Where the value comes from |
|---|---|---|---|---|
| `DATABASE_URL` | API, migration job | PostgreSQL connection string | **Yes** | Local: `server/.env`. Compose: built from `POSTGRES_PASSWORD`. Cloud Run: Secret Manager |
| `SEED_PASSWORD` | Seed (migration job) | Password of every demo account, for UAT in Lab 6 | **Yes** | Local: `server/.env` or `.env`. Cloud Run: Secret Manager. Shared with the partner team privately, never on screen |
| `TEST_DATABASE_URL` | Automated tests only | Separate database, name must end in `_test` | Yes (local) | `server/.env`; in CI a throw-away service container |
| `POSTGRES_PASSWORD` | `docker-compose.yml` only | Password of the local PostgreSQL container | Yes (local) | `.env` (copy of `.env.example`) |
| `PORT` | API | Port to listen on | No | Image default `3000`; Cloud Run injects it |
| `NODE_ENV` | API | `production` turns on the `Secure` cookie flag | No | Image default `production`; `development` in `server/.env` |
| `STATIC_DIR` | API | Folder of the built web app | No | Image default `/app/client/dist`; unset in development (Vite serves the UI) |
| `TZ` | Node | Time zone of logs | No | Image default `Asia/Bangkok` |

Templates with placeholders only: `server/.env.example` (development and tests) and `.env.example`
(compose). `.env` and `.env.*` are in `.gitignore`, except the examples.

## 3. Commands

Development (see the README for the first setup):

```bash
npm install
npm run db:migrate && npm run db:seed
npm run dev
npm test
npm run e2e
```

Production image, locally (check C-03):

```bash
cp .env.example .env        # choose your own values
docker compose up --build   # db, then migrate + seed, then the app on http://localhost:8080
docker compose down         # keeps the data volume; `down -v` deletes it
```

Build the image alone: `docker build -t cafe-feedback .`. The migration job command is
`sh -c "prisma migrate deploy && node dist/prisma/seed.js"`; the seed is idempotent, so it can run on
every release.

## 4. GCP project and resources

To be completed with #22 and #26 (project ID, region, Cloud Run service, Cloud SQL instance, Artifact
Registry repository, secrets, service accounts).

## 5. Release procedure and finding the running commit

To be completed with #27 and #28.
