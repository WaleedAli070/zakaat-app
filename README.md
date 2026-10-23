# Zakaat App

Madhhab-aware Zakat calculator and year-round tracker. See `docs/superpowers/specs/2026-10-07-zakaat-app-design.md`.

## Layout
- `packages/core` — pure rules engine (no I/O). Plan 1.
- `packages/prices` — price file schema and fixtures. Plan 2.
- `apps/api` — Cloudflare Worker. Plan 2.
- `apps/mobile` — Expo app. Plan 3.

## Commands
`pnpm install` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`
