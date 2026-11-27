# Briwon Academy Student Portal

A student management and learning management web app for Briwon Academy, covering the full journey from admission to certificate and placement, for three roles: **Admin**, **Trainer** and **Student**.

Built with Next.js (App Router) + TypeScript + Tailwind CSS on Supabase (Postgres, Auth, Storage, Row Level Security).

- What is built and tested: [BUILD_PROGRESS.md](./BUILD_PROGRESS.md)
- Architecture, rules, security and deployment: [PROJECT_NOTES.md](./PROJECT_NOTES.md)

## Run it locally

You need **Node.js 20.9+** and **Docker** (for the local Supabase stack). Nothing here touches a real Supabase project or costs money.

```bash
npm install
npm run db:start          # starts local Supabase in Docker, applies migrations + seed
```

`db:start` prints an `API URL`, an `ANON_KEY` (or publishable key) and a `SERVICE_ROLE_KEY` (or secret key). Create `.env.local` from the example and paste those **local** values in:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from db:start>
# SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from db:start>
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev               # http://localhost:3000
```

### Demo accounts (local seed only)

All use the password `Briwon@2026`. These exist only in the local development database created by `supabase/seed.sql`; never load the seed into production.

| Role | Email |
| --- | --- |
| Admin | admin@example.com |
| Trainer | trainer@example.com, trainer2@example.com |
| Student | student@example.com (fully eligible for a certificate), student2@ … student5@example.com |

Emails sent by the local stack (invites, password resets) are captured by Mailpit at http://127.0.0.1:54324. No real email is sent.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests for the business rules (`src/lib/domain`) |
| `npm run test:integration` | Database, RLS and storage tests against the **local** stack (see below) |
| `npm run db:reset` | Re-create the local DB from migrations + seed |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` |

Integration tests refuse to run against anything other than `127.0.0.1`/`localhost` and need the local keys:

```bash
npm run db:reset
SUPABASE_TEST_ANON_KEY=<local anon key> SUPABASE_TEST_SERVICE_KEY=<local service key> npm run test:integration
```

## Project layout

```
supabase/migrations/   schema, business-rule functions, RLS policies, storage buckets
supabase/seed.sql      local demo data (development only)
supabase/templates/    invite + password-reset email templates
src/app/               pages and API routes (public, (portal)/admin|trainer|student|academics, api/)
src/lib/actions/       server actions (all writes go through these or SQL RPCs)
src/lib/domain/        pure business rules + unit tests
src/components/        UI kit, layout, charts
tests/integration/     database/RLS/storage tests
```
