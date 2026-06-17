# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Deployment Rule

**IMPORTANT:** Whenever the user asks to deploy, upload, or push the project to the website (any phrasing like "תעלה לאתר", "פרסם", "deploy", "push to production", etc.), you MUST:
1. Stage all changed files with `git add`
2. Create a commit with a descriptive message summarizing the changes
3. Push to the remote with `git push`

Do this automatically without asking for confirmation — commit and push are implied by any deploy/upload request.

The remote is: https://github.com/bralang/patriyotit.git (branch: master)

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # ESLint (eslint-config-next)
```

No test suite is configured.

## Environment

Requires a `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase (PostgreSQL + Auth + Realtime)

**Auth flow:** `middleware.ts` checks the Supabase session on every request and redirects unauthenticated users to `/login`. After login, users pick a "worker identity" from a list (`IdentityScreen`) stored in `sessionStorage`. This identity (a `Worker` row, not a Supabase auth user) is what drives per-user filtering and activity logging. Supabase auth just gates the whole app; worker identity is application-level.

**Global state (`context/AppContext.tsx`):** A single React context holds all projects, settings (statuses/types/workers/packages), the active worker, and in-memory time-tracking timers. All pages read from `useApp()`. The context also subscribes to Supabase Realtime on the `projects` table and auto-refreshes when no timers are running.

**Data layer (`lib/`):**
- `supabase.ts` — creates a browser-side Supabase client (always client-side; no server actions or API routes)
- `projects.ts` — all CRUD for projects, including the deep `PROJECT_SELECT` join that eagerly loads client, status, type, package, workers, stages, and per-worker times in one query
- `stages.ts` — per-stage operations and the `stage_worker_times` upsert (used for time tracking)
- `settings.ts` — CRUD for the four lookup tables (statuses, types, workers, packages)
- `clients.ts` — CRUD for the clients table
- `activity.ts` — append-only activity log writes
- `types.ts` — all TypeScript types + the `WORK_STAGES` constant (7 fixed named stages every project gets)
- `utils.ts` — date urgency logic, CSV export, formatting helpers

**Pages:**
- `/` (`app/page.tsx`) — main dashboard with cards/table/calendar/archive views
- `/login` — email+password Supabase auth
- `/clients` — client management table

**Components (`components/`):** All are client components. `ProjectModal` is the main edit form. `StagesTable` renders the 7-stage workflow with per-worker time tracking.

**Database schema (`supabase/schema.sql`):** The schema file is the source of truth. RLS is enabled on all tables; authenticated users get full access. Projects auto-archive 7 days after `locked_at` is set (checked client-side in `checkAutoArchive`). The `project_workers` join table is always replaced wholesale on project save.

## Conventions

- UI is Hebrew/RTL throughout (`<html dir="rtl" lang="he">`). All user-facing strings are in Hebrew.
- `'use client'` on every component and page; there are no Server Components or Server Actions.
- Supabase client is always `createBrowserClient` from `@supabase/ssr`; the middleware uses `createServerClient`.
- Status names that include `'ננעל'` (locked) are treated specially — locked projects sort last and are excluded from urgency alerts.
