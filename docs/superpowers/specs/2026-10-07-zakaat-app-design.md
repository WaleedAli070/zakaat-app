# Zakaat App — Design Specification v2

**Date:** 2026-10-07, revised 2026-10-21 · **Status:** Draft for review · **Supersedes:** `design_document.md` v1.1
**Companion documents:** `docs/design-review-2026-10-07.md` (review and rationale), `docs/research-fiqh-2026-10-07.md` (sourced rule matrix), `docs/research-technical-2026-10-07.md`, `docs/research-market-2026-10-07.md`.

---

## 1. Purpose and principles

A mobile app that calculates Zakat according to the user's chosen school of jurisprudence (Hanafi, Shafiʿi, Maliki, Hanbali, or a General precautionary mode), keeps an itemised record of zakatable assets and liabilities across years, tracks payments against each year's obligation, and explains every number with the rule and citation that produced it.

Principles, in priority order:

1. **Fiqh correctness over convenience.** Every rule comes from a named, traceable institutional or classical source. Where scholars differ, the app says so and lets the user choose; it never silently picks.
2. **The user's mode drives all logic.** No implicit mixing of schools in one calculation. The audit trail cites only the selected mode and the user's explicit overrides.
3. **Auditability.** Every calculation is a frozen snapshot: inputs, prices, rule set, engine version, and structured explanations. Past years remain reproducible after prices and rules change.
4. **Privacy by architecture.** Financial data lives on the user's device and, if they sign in, in a database only they can read. No analytics on amounts, no location permission, no in-app donations.
5. **Free to use, near-zero to run.** Free tiers everywhere; the first paid step is when daily Firestore traffic outgrows the free plan (several hundred daily syncs).

Non-goals for v1: fatwa issuance, business inventory, crypto as a distinct category, Zakat al-Fitr, livestock and agricultural zakat, routing or collecting payments, a majority-view ("Jumhūr") mode, per-lot hawl tracking, Arabic or Urdu UI, non-Sunni jurisprudence, household or multi-payer accounts.

Target user for v1: an individual Muslim in Pakistan or the Pakistani diaspora who already pays zakat and wants it calculated correctly for their school and tracked through the year. English UI, PKR-first data, with USD, GBP, EUR, INR, AED and SAR supported.

---

## 2. Scope of v1

### 2.1 In scope

| Area | v1 content |
|---|---|
| Modes | Hanafi, Shafiʿi, Maliki, Hanbali, General (precautionary = maximum-zakat option per contested rule) |
| Rule overrides | Mode sets defaults; an Advanced screen lets the user change any contested rule to a listed alternative, each with citation |
| Asset categories | Cash in hand · Bank account · Foreign currency · Gold · Silver · Stocks/funds · Retirement account · Real estate (home, rental, land for resale, plot file) · Receivable (money owed to the user) · Other zakatable asset (100%, user-labelled) |
| Liabilities | Immediate debts; long-term debts with the instalments due in the year; interest portion flagged and excluded |
| Hawl | One anniversary per user, Hijri-based, user-chosen (1 Ramadan shortcut); start/end model for Hanafi and General, continuous model with year-end dip attestation for the other three; new wealth annexed in all modes, labelled "advance" where the school would give it its own hawl |
| Nisab | Silver or gold; 85/595 g or 87.48/612.36 g; metal combining per mode; live values in base currency |
| Calculation | Preview any time; close period to freeze an authoritative snapshot and create the obligation |
| Payments | Ledger entries against a period with recipient, Qurʾanic category (8 asnaf), date, optional receipt photo; reversals instead of edits |
| Carry-forward | Shortfall or overpayment carried to the next period; overpayment can instead be marked as sadaqah |
| Reports | Current period summary; year-over-year zakat due and paid; distribution by category; per-period PDF statement |
| Prices | Daily signed price file (gold, silver, FX) from licensed sources; local-market per-tola override |
| Accounts | Optional. Works fully without sign-in and without anonymous auth; data stays on the device. Sign-in (Apple, Google, email link via Firebase Auth) enables sync and backup across devices and in-app account deletion |
| Notifications | Local scheduled: 30, 10, 1 days before the anniversary. Remote push (FCM topics) is wired but not sent in v1 |
| Web | Static `/calculator` route, no persistence, for Ramadan search traffic |
| Platforms | iOS and Android via Expo SDK 57 |

### 2.2 Deferred (v2 candidates)

Business inventory and trade receivables as first-class categories · crypto category · majority-view mode · per-lot hawl · Arabic and Urdu localisation · remote push ("gold crossed nisab") · export/import between households · licensed local-market feeds (Sarafa, IBJA) · passkeys · remote push alerts (nisab movement, Ramadan) over FCM topics.

---

## 3. Fiqh rule set

The authoritative, per-cell sourced matrix is `docs/research-fiqh-2026-10-07.md` section (a). This section fixes what the engine implements. Each rule has an id, a fixed option list, a default per mode, and an "overridable" flag. Citations are stored per (rule id, option) in `packages/core/citations/`.

### 3.1 Rule table

| Rule id | Options | Hanafi | Shafiʿi | Maliki | Hanbali | General | Overridable |
|---|---|---|---|---|---|---|---|
| `NISAB_METAL` | SILVER, GOLD | SILVER | GOLD | GOLD | GOLD | SILVER | yes |
| `NISAB_GRAMS` | STD_85_595, STD_87_612 | STD_87_612 | STD_85_595 | STD_85_595 | STD_85_595 | lower value of the two | yes |
| `NISAB_COMBINE_METALS` | COMBINE, SEPARATE | COMBINE | SEPARATE | COMBINE | SEPARATE (disputed; show both narrations) | COMBINE | yes |
| `HAWL_MODEL` | START_END, CONTINUOUS | START_END | CONTINUOUS | CONTINUOUS | CONTINUOUS | START_END | no (mode-defining) |
| `HAWL_ZERO_RESET` | ZERO_OR_BASIC_NEEDS | same for all | | | | | no |
| `HAWL_NEW_WEALTH` | ANNEX, ANNEX_LABEL_ADVANCE | ANNEX | ANNEX_LABEL_ADVANCE | ANNEX_LABEL_ADVANCE | ANNEX_LABEL_ADVANCE | ANNEX | no in v1 |
| `JEWELLERY_PERSONAL` | ZAKATABLE, EXEMPT_IF_WORN | ZAKATABLE | EXEMPT_IF_WORN | EXEMPT_IF_WORN | EXEMPT_IF_WORN | ZAKATABLE | yes |
| `JEWELLERY_EXCESSIVE` | USER_FLAG | per-item "excessive by custom" flag makes it zakatable in exempt modes | | | | | n/a |
| `JEWELLERY_MENS_GOLD` | ZAKATABLE | all modes | | | | | no |
| `DEBT_DEDUCTION_SCOPE` | NONE, DUE_INSTALMENT, TWELVE_MONTHS, FULL | TWELVE_MONTHS | NONE | TWELVE_MONTHS | TWELVE_MONTHS (islamqa.info alternative: NONE) | NONE | yes |
| `DEBT_SURPLUS_OFFSET` | OFF, ON | OFF | n/a | ON | ON | n/a | yes |
| `DEBT_INTEREST` | EXCLUDE | all | | | | | no |
| `RECEIVABLE_TIMING` | YEARLY_IF_STRONG, YEARLY_ALL, ON_RECEIPT (all-years vs one-year on receipt is a ledger-time decision for Plan 3, not an engine option) | YEARLY_IF_STRONG (weak: from receipt) | YEARLY_IF_STRONG (bad: all years on receipt) | YEARLY_IF_STRONG (loans: one year on receipt) | YEARLY_IF_STRONG (bad: one year on receipt) | YEARLY_IF_STRONG on all | yes |
| `RETIREMENT_METHOD` | FULL_VESTED, NET_WITHDRAWABLE, ZAKATABLE_PROPORTION, NONE_UNTIL_ACCESS, COMPULSORY_DEFERRED_VOLUNTARY_YEARLY | COMPULSORY_DEFERRED_VOLUNTARY_YEARLY (Deobandi: compulsory contributions zakated on receipt, voluntary ones yearly) | NONE_UNTIL_ACCESS | NET_WITHDRAWABLE (no Maliki-specific source; institutional) | NONE_UNTIL_ACCESS | FULL_VESTED | yes |
| `RETIREMENT_TAX_PENALTY` | user inputs with jurisdiction defaults (PK: 0/0 for accessible PF; US: 10% penalty + marginal tax) | | | | | | n/a |
| `STOCK_TRADING` | FULL_MARKET_VALUE | all | | | | | no |
| `STOCK_PASSIVE_METHOD` | PROXY_25, PROXY_30, FULL_MARKET_VALUE, DIVIDENDS_ONLY (balance-sheet ratio is supplied per asset as `proxyPercent`) | PROXY_30 | PROXY_30 | PROXY_30 | PROXY_30 | FULL_MARKET_VALUE | yes (proxy % editable) |
| `HOME` | EXEMPT | all | | | | | no |
| `RENTAL_METHOD` | SAVED_RENT, QARADAWI_NET_RENT_10 | SAVED_RENT | SAVED_RENT | SAVED_RENT | SAVED_RENT | higher of the two | yes |
| `LAND_INTENT` | RESALE_INTENT_AT_PURCHASE_REQUIRED | all | | | | | no |
| `PLOT_FILE` | FROM_PURCHASE, FROM_POSSESSION (pure file without a specific plot is valued as a receivable inside this rule) | FROM_PURCHASE (specific plot + resale intent); RECEIVABLE_IF_NO_PLOT | FROM_PURCHASE (general trade-goods rule) | FROM_PURCHASE | FROM_PURCHASE | FROM_PURCHASE | yes (FROM_POSSESSION is the minority option) |
| `OTHER_ASSET` | FULL_VALUE | all | | | | | no |
| `ADVANCE_PAYMENT` | ALLOWED, ALLOWED_ONE_YEAR, ALLOWED_TWO_YEARS, RESTRICTED | ALLOWED | ALLOWED_ONE_YEAR | RESTRICTED (warn) | ALLOWED_TWO_YEARS | ALLOWED | no |
| `RATE` | LUNAR_2_5 | all; solar 2.577% not offered in v1 | | | | | no |
| `ROUNDING` | ROUND_UP_FINAL_MINOR_UNIT | all | | | | | no |
| `MINORS` | informational only in v1 | | | | | | n/a |
| `QADA_PRIOR_UNPAID` | DEDUCT, NO_DEDUCT | DEDUCT | NO_DEDUCT | NO_DEDUCT | NO_DEDUCT | NO_DEDUCT | yes |

Notes:
- The Hanafi default of `TWELVE_MONTHS` for debt is the contemporary rule used by NZF UK, Askimam, Darul Ifta Birmingham and SeekersGuidance; the Advanced screen exposes `DUE_INSTALMENT` (Darul Iftaa Leicester, AMJA) and `FULL` (classical). The Maliki and Hanbali defaults follow the same contemporary scope because no Maliki- or Hanbali-specific contemporary ruling on long-term instalments was found; the classical "deduct, after surplus-asset offset" is preserved by `DEBT_SURPLUS_OFFSET = ON`.
- `STOCK_PASSIVE_METHOD` defaults to 30% (Fiqh Council of North America 2025, Joe Bradford, NZF Canada) rather than 25% (NZF UK only). The percentage is shown and editable, and the explanation entry names the source.
- General mode is defined operationally: for every overridable rule, the option that yields the highest zakat. It is labelled in the UI as "Precautionary (iḥtiyāṭ): pays the higher figure wherever scholars differ; any excess counts as advance zakat or sadaqah."
- Scholar review: every rule default and option must have at least one citation before release. A named-institution citation is required; a named-scholar citation is additionally recorded where available.

### 3.2 Hawl semantics

- The anniversary is stored as a Hijri date (Umm al-Qura tabular) plus a per-user offset of −2..+2 days for local sighting. The Gregorian date is derived and stored alongside for display and notifications.
- Period N ends the day before the anniversary in year N+1 (one lunar year).
- `START_END`: zakat is due if net zakatable wealth ≥ nisab at the authoritative close. The user is asked once at close: "Did your zakatable wealth fall to zero (or only what you needed to live on) at any point this year?" Yes resets the hawl start to the date they say wealth returned.
- `CONTINUOUS`: the close asks "Did your zakatable wealth fall below the nisab at any point this year?" with the year's nisab shown. Yes breaks the hawl; the new period starts from the date the user says nisab was regained; no obligation entry is written for the broken period, and the snapshot records `HAWL_BROKEN`.
- Changing the anniversary requires confirmation and is recorded as a settings change in the ledger (`adjustment` entry with zero amount and a note).

### 3.3 Nisab

Nisab in base currency on the close date = grams × price per gram from the price file, for both metals and both standards. The applicable one is chosen by `NISAB_METAL` and `NISAB_GRAMS`. If net wealth is between the silver and gold nisab, the summary shows both and states which applies under the user's settings.

---

## 4. Architecture

### 4.1 Components

```
┌──────────────────────────────┐   sync adapter (outbox push / cursor pull)   ┌────────────────────────────┐
│  Expo app (SDK 57)           │◄───────────────────────────────────────────►│  Firestore                 │
│  expo-sqlite + Drizzle       │   Firebase Auth (Apple, Google, email link)  │  users/{uid}/… per user    │
│  packages/core (all zakat    │◄───────────────────────────────────────────►│  security rules: owner-only│
│  logic runs here)            │                                              │  append-only collections   │
│  Local notifications         │   HTTPS GET signed daily JSON                └────────────────────────────┘
│  FCM topic subscription (v2) │◄───────────────────────────────────────────►┌────────────────────────────┐
└──────────────────────────────┘   DELETE /account (Apple token revocation)   │  Cloudflare Worker (Hono)  │
                                                                              │  cron → KV: prices         │
                                                                              │  FCM topic sender (v2)     │
                                                                              └────────────────────────────┘
```

- **Expo app.** All zakat logic runs on-device in `packages/core`. The local SQLite database (expo-sqlite, Drizzle) is the source of truth for every user, signed in or not. Nothing leaves the device unless the user signs in.
- **Firebase Auth.** Apple (native on iOS via `expo-apple-authentication`, web flow on Android), Google (native), and email-link sign-in using the post-Dynamic-Links SDK path. Free to 50k MAU. Users are keyed by Firebase `uid`.
- **Firestore as sync target, not as store.** Signed-in users get `users/{uid}` with subcollections mirroring the local tables. Security rules: only `request.auth.uid == uid` may read or write; `ledgerEntries`, `assetValues`, `snapshots` allow `create` only (no `update`, no `delete`); `profile`, `assets`, `liabilities`, `periods`, `recipients` allow owner update; nothing allows delete except through account deletion, which removes the whole subtree. Firestore's own offline cache is disabled; the app never queries Firestore directly for UI.
- **Sync adapter (`packages/sync`).** Local-first: every write lands in SQLite and appends a row to `sync_outbox`. On foreground, after each write batch, and before period close, the adapter pushes outbox rows as Firestore document writes (batched, idempotent by row id), bumps per-table version counters in a single `users/{uid}/sync_meta` document, and pulls documents with `updated_at > last_pull_cursor` only from tables whose counter moved, so a pull on an unchanged day costs one read. Append-only tables merge by union; mutable tables resolve last-write-wins by `updated_at` with `device_id` as tiebreaker. A fresh device signs in, pulls everything, and rebuilds the local database. Sign-out keeps local data by default and offers "remove from this device".
- **Cloudflare Worker (Hono).** Price cron (daily, writes signed JSON to KV), `GET /prices/latest` and `GET /prices/:date`, and `DELETE /account`: verifies the Firebase ID token against Google's JWKS, revokes the Apple refresh token via Apple's REST API, then returns; the client deletes its Firestore subtree (allowed by rules for the owner) and calls Firebase `user.delete()`. From v2 the Worker also publishes FCM topic messages (per base currency) for nisab movement and Ramadan reminders via the FCM HTTP v1 API; topic messaging stores no device tokens server-side. No zakat data ever passes through the Worker.
- **Notifications.** v1: local scheduled only (30, 10, 1 days before the anniversary), rescheduled on every app open. v2: FCM topic subscriptions for broadcast alerts; hawl reminders stay local permanently because the device already knows the dates and local delivery cannot fail on a server outage.
- **Observability.** Sentry (React Native SDK with the Expo config plugin; Sentry for Workers), Sentry cron monitor on the price job, PostHog with event names only. Firebase Analytics and Crashlytics are not used.

### 4.2 Free-tier envelope and upgrade triggers

| Component | Free limit | Upgrade trigger |
|---|---|---|
| Firestore (Spark) | 1 GiB, 50k reads/day, 20k writes/day | Incremental syncs cost 1 read when nothing changed (via `sync_meta`), 2–3 writes on an ordinary day, ~30 writes on a period-close day, ~300 reads for a fresh-device first sync. Free plan therefore covers tens of thousands of daily active signed-in users, ~650 period closes per day, and ~150 fresh-device sign-ins per day. Trigger: Blaze pay-as-you-go with budget alerts (no hard cap) when any daily quota is approached |
| Firebase Auth | 50k MAU | not expected in v1 |
| Cloudflare Workers | 100k requests/day, 10 ms CPU | not expected in v1 |
| Workers KV | 100k reads/day, 1k writes/day | ~50k daily active price fetches; the app caches the file per day |
| EAS Build | 30 builds/month | solo dev cadence fits |
| EAS Update | 1,000 MAU | first Ramadan with >1,000 active users → Starter $19 or stop using OTA |
| metals.dev | paid from day one | Copper plan $1.79/month |

Users who never sign in consume no Firebase quota at all.

### 4.3 Monorepo layout (fresh scaffold)

```
/zakaat-app
├── apps/
│   ├── mobile/        # Expo SDK 57, Expo Router, Drizzle + expo-sqlite, TanStack Query, Firebase Auth
│   └── api/           # Cloudflare Worker: Hono, price cron, account deletion, FCM sender (v2)
├── packages/
│   ├── core/          # pure rules engine, Hijri, units, money; no I/O
│   ├── db/            # Drizzle schema + migrations for the on-device SQLite; shared by tests
│   ├── sync/          # outbox push / cursor pull adapter over Firestore; Firestore security rules + tests
│   ├── prices/        # price file schema, signature verify, fixtures (historical CSVs)
│   └── ui/            # design tokens, shared components
├── docs/
├── turbo.json         # Turborepo 2 `tasks`
└── pnpm-workspace.yaml
```

Tooling: pnpm 9, Turborepo 2, TypeScript 5.9 strict, Vitest, fast-check, Biome or ESLint+Prettier (decided in plan), Maestro for mobile E2E, Firebase Emulator Suite for rules and sync tests, Wrangler for the Worker, EAS for builds. `.gitignore` excludes `node_modules`, `.env*` (except `.env.example`), `.expo`, `dist`, `.wrangler`, `google-services.json`, `GoogleService-Info.plist`.

---

## 5. Data model

All amounts and weights are decimal strings in SQLite and `Decimal` (decimal.js) in code. Every table has `id TEXT (UUIDv7)`, `created_at`, `updated_at`, `device_id`. Soft retirement via `retired_at`; hard deletes only through account deletion. The same table shapes are mirrored one-to-one as Firestore documents under `users/{uid}/<table>/{id}` for signed-in users.

| Table | Key columns | Notes |
|---|---|---|
| `profile` | mode, base_currency, nisab_metal, nisab_grams, combine_metals, hijri_offset_days, anniversary_hijri (y/m/d), anniversary_gregorian, rule_overrides JSON (ruleId → option), notification_prefs JSON, engine_version_at_setup | single row |
| `asset` | category, label, currency, retired_at, plus category fields: `weight_entered`, `weight_unit` (g, tola, masha, oz), `weight_grams`, `karat`, `usage` (WORN, STORED, INVESTMENT, MENS), `excessive_flag`; `stock_intent` (TRADING, PASSIVE), `proxy_percent`; `retirement_vested`, `retirement_accessible`, `retirement_tax_pct`, `retirement_penalty_pct`, `retirement_voluntary_pct`; `re_type` (HOME, RENTAL, LAND_RESALE, PLOT_FILE), `re_specific_plot`, `re_resale_intent_at_purchase`; `receivable_strength` (STRONG, WEAK), `receivable_expected` | one row per item, carried across years |
| `asset_value` | asset_id, as_of_date, amount_or_weight, currency, metal_price_per_gram, metal_price_source, fx_rate, fx_source, price_file_hash, base_amount | append-only; newest row is current |
| `liability` | label, kind (IMMEDIATE, LONG_TERM), total_outstanding, due_within_year, interest_within_year, currency, retired_at | |
| `hawl_period` | index, start_hijri, start_gregorian, end_hijri, end_gregorian, status (OPEN, CLOSED, REOPENED, BROKEN), dip_attestation (NULL, NO, YES_FROM_DATE), carried_in, carried_out, authoritative_snapshot_id | |
| `calculation_snapshot` | period_id, is_authoritative, superseded_by, engine_version, ruleset_id, mode, inputs JSON, prices JSON, price_file_hash, outputs JSON, explanations JSON | immutable |
| `recipient` | name, default_category, notes | |
| `ledger_entry` | period_id, seq, kind (OBLIGATION, PAYMENT, ADJUSTMENT, REVERSAL, CARRY_FORWARD), amount (signed), currency, category (FUQARA, MASAKIN, AMILIN, MUALLAFAH, RIQAB, GHARIMIN, FI_SABILILLAH, IBN_SABIL), recipient_id, occurred_at, receipt_path, reverses_entry_id, note | append-only; app code has no UPDATE/DELETE path |
| `price_cache` | date, kind (METAL, FX), symbol, quote_currency, rate, source, file_hash | copied from the daily file |
| `sync_outbox` | table_name, row_id, op (UPSERT, APPEND), payload JSON, queued_at, attempts | drained by the sync adapter; empty for users who never sign in |
| `sync_state` | uid, last_pull_cursor, last_push_at, device_id, table_versions JSON | single row per signed-in account; mirrors the remote `sync_meta` document |

Derived, never stored: period balance = Σ obligation + Σ carry_in − Σ payment ± adjustments − reversals.

Period lifecycle: `OPEN` → (close) `CLOSED` with one authoritative snapshot and an `OBLIGATION` entry; or `BROKEN` in continuous modes with no obligation. `CLOSED` → (reopen) `REOPENED`: new entries allowed, a new authoritative snapshot supersedes the old, both kept. Closing with non-zero balance writes `CARRY_FORWARD` out and a matching `CARRY_FORWARD` into the next period; overpayment may be marked "sadaqah" instead, which writes an `ADJUSTMENT`.

---

## 6. Rules engine (`packages/core`)

- Pure functions, no I/O, deterministic. Exports `ENGINE_VERSION`, `rulesets` (by id, e.g. `hanafi@2026.1`), `calculate(input): Output`, `hijri` utilities, `units` (tola 11.6638038 g, masha 0.972 g, troy oz 31.1034768 g), `money` helpers.
- **Input:** profile settings and effective rule options, assets with current values, liabilities, period, price table, close date. **Output:** gross zakatable, deductions, net, nisab values (both metals, both standards, applicable one marked), zakat due, hawl status, and `Explanation[]`.
- **Explanation entry:** `{ ruleId, option, mode, subjectId, inputs: Record<string,string>, output: string, effect: INCLUDE|EXCLUDE|PARTIAL|DEDUCT|INFO|WARNING, citationIds: string[], messageKey }`.
- **Pipeline:** convert units and purity → value each asset in base currency (price × grams × karat/24; FX for foreign amounts) → apply category rule → sum gross → apply debt scope and surplus offset → net → nisab check → due = net ÷ 40 → round once (`ROUND_UP` to minor unit) → hawl status and labels.
- **Rulesets** are versioned files; old versions remain importable. A ruleset declares, per rule id, the default option and the overridable option list. Citations are data files keyed by `(ruleId, option)` with source name, reference, URL, and the quotation used.
- **Hijri:** vendored Umm al-Qura table (1356–1500 AH) with conversion both ways, plus `offsetDays`. `Intl` is used for display only.

---

## 7. App structure and flows

- **Navigation:** Expo Router; tabs Dashboard, Assets, Payments, Profile; modal stack for interceptors.
- **Onboarding:** Mode (5 cards with one-line descriptions and "help me choose") → Currency → Nisab (metal, standard, live values) → Anniversary (1 Ramadan shortcut, Gregorian or Hijri picker; explanation of what an anniversary means) → Optional sign-in ("Continue without account" always visible).
- **Dashboard:** hawl ring in days to anniversary, status by mode, obligation vs paid vs remaining, next notification date, quick actions (update assets, record payment, close period).
- **Assets:** grouped list; add/edit per category with category-specific forms; jewellery shows entered unit and grams; stocks show intent and proxy; real estate shows the plot-file questions; each item has a "Why?" affordance rendering its explanation entries.
- **Interceptors:** driven by rule metadata: Maliki/Hanbali surplus-asset question when a debt is entered with `DEBT_SURPLUS_OFFSET = ON`; dip attestation at close in continuous modes; plot-file specific-plot and resale-intent questions; excessive-jewellery flag in exempt modes; Maliki advance-payment warning when paying before the anniversary.
- **Close period:** review screen with full breakdown and explanation list → attestation questions → confirm → snapshot frozen → obligation created → next period opened.
- **Payments:** add entry (amount, currency, date, recipient, category, receipt photo); list with running balance; reverse an entry with reason.
- **Reports:** per-period PDF statement (mode, settings, assets, liabilities, prices used, due, payments); year-over-year chart; distribution by category.
- **Profile:** mode and settings; Advanced rules screen (every overridable rule with options, defaults marked, citations); account (sign in, sync status, delete account); methodology page (same citation data); about and sources.
- **Web:** static `/calculator` route reusing asset forms and `packages/core`, no persistence, SEO metadata.
- **Design:** Inter, emerald primary, gold accent, clean light theme; UI kit chosen in the plan (Tamagui vs React Native Paper).

---

## 8. Price pipeline (`apps/api` cron + `packages/prices`)

- Daily 06:00 UTC: metals.dev XAU/XAG in USD, PKR, INR, AED, SAR, GBP, EUR; gold-api.com XAU/XAG USD cross-check; open.er-api.com USD→{PKR, INR, AED, SAR, GBP, EUR}; frankfurter.dev cross-check; AED 3.6725 and SAR 3.75 pegs as sanity bounds.
- Validation: reject the day if gold sources differ >1% or FX sources >2%; keep the previous file; Sentry cron check-in fails.
- File: `{ date, generatedAt, perGram: {XAU: {USD, PKR, …}, XAG: {…}}, fx: {USD: {PKR, …}}, nisab: {silver: {g595: {…}, g612_36: {…}}, gold: {g85: {…}, g87_48: {…}}}, sources: [...], signature }` signed with Ed25519; public key in the app.
- App: fetches once per day, verifies signature, caches to `price_cache`, records `price_file_hash` in snapshots; bundled 30-day fallback; "prices are N days old" banner when stale.
- Local-market override: user may enter a per-tola or per-gram local rate with date; stored as `USER_ENTERED` and shown alongside spot.
- Historical CSVs: retained under `packages/prices/fixtures/` for hawl back-testing; never fetched in production (Investing.com terms prohibit redistribution).

---

## 9. Security and privacy

- No account required and no anonymous auth. Users who do not sign in keep all data on the device; the app makes no network calls carrying their data.
- Signed-in users: Firebase Auth identity; Firestore security rules restrict every document to its owner and make ledger entries, asset values and snapshots create-only. Rules are versioned in `packages/sync/firestore.rules` and tested in the Firebase Emulator on every PR.
- Firebase ID tokens are held by the Firebase SDK; the Worker verifies them against Google's public JWKS for the one endpoint that needs identity (account deletion).
- On-device data protected by iOS complete file protection and Android file-based encryption; optional biometric lock on app open (`expo-local-authentication`); SQLCipher via `useSQLCipher` is available since libSQL is no longer required, decided in the plan after measuring startup cost.
- The Worker never receives financial data. Worker secrets (metals.dev key, Ed25519 signing key, Apple Services ID key, FCM service-account key from v2) in Wrangler secrets.
- Account deletion: Worker revokes the Apple refresh token; client deletes its Firestore subtree and the Firebase user; local data removed on request. Meets App Store 5.1.1(v).
- App Store positioning: "zakat calculator and record keeper"; no bank connections; no in-app donations; charity links open externally. Privacy labels: for users who sign in, financial info is collected and linked to identity for the purpose of sync and backup; stated plainly in-app before sign-in. Play data-safety form updated when FCM token registration ships in v2.
- No location permission. Firebase Analytics disabled. PostHog event names only, opt-in.
- Receipt photos stay on device; synced to Firestore as base64 only if under 200 KB, otherwise local-only with a note. (Firebase Storage is not used in v1.)
- Firestore region chosen at project creation: `europe-west3` (Frankfurt) for v1; cannot be changed later, so documented as a one-time decision.

---

## 10. Testing

- **Golden vectors** (`packages/core/test/vectors/<mode>/<rule>-<case>.json`): inputs, prices, expected outputs and explanation rule-id sequence, `reviewedBy`, `reviewedOn`, `sources`. Minimum: one per overridable option per mode, plus edge cases (exactly at nisab, zero assets, debt > assets, multi-currency, 18/21/22/24k, plot-file variants, broken hawl, carry-forward).
- **Property tests** (fast-check): due ≥ 0; due = 0 iff net < nisab; due monotone non-decreasing in zakatable assets; General due ≥ due in every other mode on the same inputs; base-currency round-trip within one minor unit; determinism.
- **Snapshot tests** on `Explanation[]` per vector.
- **Replay tests**: stored snapshot fixtures re-run through the pinned ruleset reproduce outputs byte for byte.
- **App**: component tests for forms and interceptors; Maestro E2E: onboard → add gold and cash → preview → close → pay → verify balance; sync E2E against the Firebase Emulator.
- **Sync**: Firestore rules tests in the Emulator (user A cannot read or write user B; create-only collections reject update and delete); adapter tests for push idempotency, pull cursor correctness, union merge of append-only tables, last-write-wins on mutable rows, and fresh-device rebuild equality (local DB after rebuild equals the original).
- **API**: Firebase ID-token verification, Apple revocation call, deletion completeness, price validation and signature.
- **Hijri**: conversion tests against published Umm al-Qura tables for 1440–1460 AH.

---

## 11. Delivery and operations

- GitHub Actions on every PR: typecheck, lint, Vitest for all packages, Maestro on a nightly schedule.
- Worker deploy via Wrangler from `main`; Firestore rules deployed via the Firebase CLI from `main` after emulator tests pass; prices cron verified by the Sentry monitor.
- Mobile: EAS Build free tier; EAS Update for JS-only fixes within Apple DPLA 3.3.1(B); Play closed test with 12 testers for 14 days starting at the first build; individual developer accounts for v1; D-U-N-S application started in parallel for a later entity transfer.
- Launch target: public release 4–6 weeks before Ramadan 2027 (≈ mid-February 2027).

---

## 12. Risks and open items

| Risk | Mitigation |
|---|---|
| Hand-written sync adapter bugs | Append-only tables make merge trivial; emulator tests for every merge case; rebuild-equality test; outbox is replayable |
| Firestore Blaze has no hard spending cap | Budget alerts at $5 and $20; per-day read/write quotas monitored; sync pulls only changed documents |
| Conflicts on mutable rows (profile, assets) | last-write-wins by `updated_at` with `device_id` tiebreak; settings changes also logged as ledger adjustments |
| Firebase email-link sign-in on mobile after Dynamic Links shutdown | use the current SDK migration path; email link is the fallback behind Apple and Google, not the primary |
| Hermes Intl Hijri formatting | vendored Umm al-Qura table; Intl for display only |
| Scholar sign-off latency | ship with institutional citations; add named-scholar reviews to vectors as they arrive |
| Rule defaults for Maliki/Hanbali retirement and plot files have thin school-specific sourcing | marked Low/Medium confidence in the matrix; shown to the user as institutional defaults with the option to change |
| Price vendor outage | two independent sources per figure; bundled 30-day fallback; stale banner |
| Firestore region is permanent | chosen once (`europe-west3`) and recorded here |

---

## 13. Decision log

| Decision | Choice | Date |
|---|---|---|
| Backend shape | Local-first SQLite for all users; Firestore as sync/backup target for signed-in users via a hand-written outbox/cursor adapter; no anonymous auth | 2026-10-21 (replaces Turso per-user sync, 2026-10-07) |
| Auth | Firebase Auth (Apple, Google, email link) | 2026-10-21 (replaces Better Auth) |
| Hosting | Cloudflare Workers + KV for prices, account deletion and (v2) FCM topic sends; Firebase Spark free tier | 2026-10-21 |
| Notifications | v1 local scheduled only; v2 FCM topics sent from the Worker; hawl reminders stay local | 2026-10-21 |
| Hawl detection | Year-end self-attestation; settings toggle reserved | 2026-10-07 |
| Hawl model | One anniversary per user; annex everything; label advance in non-Hanafi modes | 2026-10-07 |
| General mode | Maximum-zakat option per contested rule; majority-view mode deferred | 2026-10-07 |
| Market | Pakistan-first rules and data; English UI; Arabic/Urdu later | 2026-10-07 |
| Fiqh sourcing | Established institutions, traceable; named scholars added when available | 2026-10-07 |
| Overrides | Mode sets defaults; Advanced screen overrides | 2026-10-07 |
| Scope | Business inventory and crypto out; "Other zakatable asset" category in | 2026-10-07 |
| Entity | Individual developer accounts for v1 | 2026-10-07 |
| Stack | Expo SDK 57, Drizzle + expo-sqlite, Hono, Firebase SDK, Vitest, Firebase Emulator; fresh scaffold | 2026-10-21 |
| Prices | metals.dev + gold-api.com + open.er-api.com + frankfurter.dev; no scraping | 2026-10-07 |
| Rule options | Engine rule options simplified as above; spec amended to match implementation (Plan 1 final review) | 2026-10-23 |
