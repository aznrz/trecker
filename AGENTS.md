# AGENTS.md

Instructions for AI agents working in this repository.

## TL;DR

- **What:** Habit Tracker on **Cloudflare Workers + D1**. Prod: https://trecker.ms-cert.workers.dev
- **Where the code is:** `_worker.js` — the entire backend (`/api/*`); `public/` — frontend (vanilla JS, no build step);
  `schema.sql` — D1 schema.
- **Read the wiki first:** the knowledge base lives in [wiki/](wiki/index.md). For questions about the project,
  look there first, then cross-check the code. On any conflict, **the code wins** — fix the page.
- **After changes:** update the affected `wiki/` pages and append a line to [wiki/log.md](wiki/log.md)
  (ingest). See the "Project wiki" section below.
- **Style:** code comments — **Russian** (to match the existing code); commit messages — **English**.
- **Security:** **never commit secrets**, use `wrangler secret put` only.
- **Irreversible (ask for confirmation):** prod D1 migrations (`--remote`), writing/resetting secrets,
  `git push` to `main` (= auto-deploy to prod).

## What this is

A personal activity tracker (Habit Tracker) on **Cloudflare Workers + D1**.
Prod: https://trecker.ms-cert.workers.dev

## Architecture

- **`_worker.js`** — the entire backend: router, authentication, API. `/api/*` requests
  are handled by the worker; everything else (static assets) is served from `public/` via the `ASSETS` binding.
- **`public/`** — frontend (vanilla JS, no build step): `index.html`, `app.js`,
  `style.css`, `manifest.json`, `icon.svg`.
- **`schema.sql`** — D1 (SQLite) schema. Tables: `users`, `activities`, `logs`,
  `exercises`, `workout_sets`, `rate_limits`.
- **`wrangler.jsonc`** — Cloudflare config. Worker name `trecker`, D1 binding `DB`.

## Commands

```
npm run dev              # local development (wrangler dev, http://localhost:8787)
npm run deploy           # manual deploy (usually not needed — see below)
npm run db:init          # apply schema.sql to the remote D1
npm run db:init:local    # apply schema.sql to the local D1
```

Ad-hoc SQL against the remote database:
```
npx wrangler d1 execute trecker --remote --command "SELECT ..."
```

## Deploy

Prod is **auto-deployed from Git** (push to `main`). A manual `wrangler deploy` is usually not needed.
Secrets are stored separately from the code in Cloudflare and survive redeploys.

## Feature flags (via Cloudflare secrets)

Features are enabled by setting secrets; until a secret is set, behavior stays as before and
prod doesn't break. `/api/config` tells the frontend what's enabled.

- **Google OAuth** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
  Details and caveats: see [README.md](README.md).
- **Cloudflare Turnstile** (anti-bot) — `TURNSTILE_SECRET` + `TURNSTILE_SITEKEY`.

Set a secret: `npx wrangler secret put NAME`.

## Conventions

- Code comments — **Russian** (to match the existing code). Commit messages — **English**.
- DB migrations are written idempotently (`IF NOT EXISTS`, guarded `ADD COLUMN`) and applied
  manually via `wrangler d1 execute --remote`. Keep `schema.sql` up to date.
- Never commit secrets. All keys/tokens go through `wrangler secret put` only.

## Caution (irreversible actions — ask for confirmation)

- Migrations on the production D1 (`--remote`).
- Writing/resetting secrets in Cloudflare.
- `git push` to `main` (triggers auto-deploy to prod).

## Project wiki (Karpathy method)

This repo maintains a persistent knowledge base following the
[Karpathy method](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
Three layers:

- **Layer 1 — Raw sources** (immutable): code (`_worker.js`, `public/`, `schema.sql`,
  `migration.sql`), design (`design/`). The agent reads but does not "rewrite to fit the wiki".
- **Layer 2 — Wiki** (`wiki/`): cross-linked markdown pages. Catalog — `wiki/index.md`,
  journal — `wiki/log.md`. The agent **owns and maintains** this layer.
- **Layer 3 — Schema**: this file (`AGENTS.md`) — rules and conventions.

### Wiki conventions
- Links between pages — `[[page-name]]` (file name without `.md`).
- Every page has frontmatter: `title`, `category`, `tags`, `sources`, `updated` (YYYY-MM-DD).
- File names — kebab-case.

### Operations
- **Ingest** (after code/feature changes): update the affected `wiki/` pages, fix links and
  `updated`, append an entry to `wiki/log.md` (append-only, on top). For a new topic — create a
  page and add it to `wiki/index.md`.
- **Query**: to answer questions about the project, search `wiki/` first; cross-check Layer 1
  when needed (the code is the source of truth). A valuable new finding can be filed as a page.
- **Lint** (periodically): check for contradictions with the code, stale facts, orphan pages
  (no incoming `[[links]]`), broken links, and missing cross-references. Record the result in `wiki/log.md`.

> When the wiki and the code disagree, **the code wins**; fix the page.
