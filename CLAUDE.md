# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # install deps
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run production build
```

No lint or test scripts are configured in this repo.

Database schema changes are applied by hand: edit `database/migration.sql` (append, don't rewrite past sections — it's written to be idempotent and re-run in full) and run the whole file in Neon's SQL Editor. There is no migration tool/versioning.

Required env vars (`.env.local` for local dev, Vercel project settings for prod) — see [README.md](README.md) for details: `DATABASE_URL` (Neon), `DASHBOARD_PIN` (4 digits), `DASHBOARD_SECRET` (32+ char random string), `REGISTRATION_CUTOFF` (optional `HH:mm`, VN time).

## Architecture

Next.js 14 App Router app with two surfaces sharing one Postgres (Neon) database:

- **Public registration page** (`app/page.js`) — a trưởng nhóm (group leader) registers meal counts for their group(s) on a given date. No login; identified only by `so_danh_bo` (employee ID), looked up via `app/api/nhan-vien/route.js`.
- **Admin dashboard** (`app/dashboard/`) — read/edit access to all registrations, gated by a single shared 4-digit PIN, not per-user accounts.

### Auth model

There are no user accounts or roles. `lib/dashboardAuth.js` implements a single shared-secret flow: PIN check (`pinsMatch`) → HMAC-signed cookie session (`DASHBOARD_COOKIE`, 8h expiry) → every `app/api/dashboard/*` route calls `verifyDashboardSession()` and 401s otherwise. Anyone holding a valid session has full edit/cancel rights; there's no read-only vs. admin distinction.

### Data model (`database/migration.sql`)

- `dang_ky_suat_an` — one row per (so_danh_bo, ngay_dang_ky, nhom_phu_trach, loai_suat), enforced by unique index `uq_dang_ky_suat_an_nguoi_ngay_nhom_loai`. Writes are upserts on that natural key (`ON CONFLICT`), not inserts — re-registering the same combo replaces the quantities. `da_huy` soft-deletes a row (cancelled, excluded from totals but kept in the detail table and history) instead of a hard delete.
- `lich_su_dang_ky_suat_an` — append-only audit log; every write (public or admin) inserts a before/after snapshot row here, tagged with an action label and the client IP.
- `nhan_vien` — employee directory (`so_danh_bo` → `ho_ten`). No admin UI for this table yet; rows are inserted manually in Neon's SQL Editor.
- `ngay_dang_ky` is the **eating date**, not the entry date — for `loai_suat = 'dem'` (night meal) these can differ, so history queries filter on `ngay_dang_ky`, not `thoi_gian`/`thoi_gian_nhap`.
- `GROUPS` (`lib/groups.js`) and `MEAL_TYPES` (`lib/mealTypes.js`) are the canonical enums used by both client validation and the DB `CHECK` constraints. Adding a group is a one-line change; adding a meal type requires updating `lib/mealTypes.js` **and** the `ck_dang_ky_suat_an_loai_suat` check constraint in `migration.sql`.

### Time handling

All "today"/date-label logic must go through `lib/time.js`, which anchors everything to `Asia/Ho_Chi_Minh` via `Intl.DateTimeFormat` (`getVietnamDate`, `formatVietnamDate*`). Don't use raw `new Date()`/`toISOString()` for business dates — server and client clocks/timezones aren't trusted. `REGISTRATION_CUTOFF` no longer blocks submission; `isTimeAfterCutoff()` is display-only, used to flag a registration as "muộn" (late) on the dashboard.

### Validation

All input validation is centralized in `lib/validation.js` (`validateRegistration`, `validateAdminRegistrationEdit`, `isIsoDate`, `isValidEmployeeId`, `parseQuantity`) and re-used by every API route that writes to `dang_ky_suat_an` — extend these rather than adding inline checks in route handlers.

### API routes (`app/api/`)

- `config` — today's VN date + cutoff, for the client to render against.
- `dang-ky` — public GET (list a date's registrations) / POST (upsert), used by the registration page.
- `nhan-vien` — employee name lookup by `so_danh_bo`, rate-limited per IP (`lib/rateLimit.js`).
- `dashboard/login`, `dashboard/logout` — PIN check and session cookie issuance/clearing.
- `dashboard/data` — admin feed: registrations + history for a date range, with search.
- `dashboard/registration` — admin POST (add on behalf of a group) and PATCH by `id` (edit fields including date, or toggle `da_huy` cancel/restore).
- `dashboard/export` — CSV export (UTF-8, semicolon-separated so Excel opens Vietnamese text correctly without conversion).

`lib/rateLimit.js` is an in-memory `Map` on `globalThis`, scoped to a single Vercel instance/cold-start — fine for current scale, not distributed (README flags Redis/Upstash if this needs to scale).

## Deployment

Deployed on Vercel from the `main` branch of the GitHub remote (`origin`); pushing to `main` triggers an auto-deploy. `next.config.mjs` applies a fixed set of security headers (`X-Frame-Options`, etc.) to every route.
