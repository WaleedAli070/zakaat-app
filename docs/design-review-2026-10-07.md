# Zakaat App — Design Document Review (2026-10-07)

**Scope.** Review of `design_document.md` v1.1 and the repo scaffold against (1) fiqh accuracy across the four madhhabs and (2) technical design: security, financial accounting, authentication, hosting/deployment, packaging/distribution. Inputs: the two Gemini conversations (PRD lineage and the Deep Research audit), the four mockups, the scaffold, and three research passes run today (fiqh sources, existing apps/market, technical stack). Every fiqh and pricing claim below carries a source URL or is marked unverified. Full research notes are in `docs/research-fiqh-2026-10-07.md`, `docs/research-technical-2026-10-07.md` and `docs/research-market-2026-10-07.md`; the fiqh matrix cites ~120 URLs.

**Status.** This is a review, not a rewrite. Nothing in the scaffold was changed. Decision questions for you are in section F; the next step after your answers is a v2 spec.

---

## A. Verdict: is a new app justified?

**Yes, but only as a fiqh-accurate, private, year-round ledger. Not as another calculator.**

- **No existing product does the combination** you scoped: madhhab-specific rule switching **and** hawl-continuity tracking **and** itemised assets carried year to year **and** a payment ledger against the obligation. Several do two or three.
- **Madhhab selection alone is not a differentiator.** Sidq (iOS), Prolaxies (Android), Zaqat (web), GiveDirectly and Zaytuna (web) all offer it.
- **The real gaps nobody fills:** per-school hawl continuity during the year; per-item intent (worn vs stored jewellery, trader vs passive per holding, plot file bought to resell vs to build); a line-by-line audit trail citing the ruling applied; PKR/INR/AED/SAR-native with Pakistani asset types (tola, plot files); on-device privacy.
- **Demand is unproven for standalone trackers.** No dedicated tracker has enough App Store ratings to display a score; Play trackers sit at 1K–5K installs. High-volume listings are government apps (Saudi Zakaty 500K+) or ad-supported generic calculators. The pattern of failure is abandonment after one or two Ramadans (NZF Android app 2019, Zakatify 2017–2024, Zakat Calculator PRO 2022).
- **Market signal that supports a personal tracker:** Pakistan alone pays >Rs619bn/yr in zakat across 50M+ payers, under 2% via the state; most is given directly to individuals, which is exactly the user who needs a private ledger. ([Arab News](https://www.arabnews.pk/pakistan/pakistanis-paying-over-2-billion-in-zakat-annually-women-majority-recipients-study-2595327), [IDS](https://ids.ac.uk/publications/zakat-payments-in-pakistan-exceed-state-social-protection))
- **Trust constraints from the niche:** the Muslim Pro / X-Mode location-data sale (2020) and the LaunchGood "zakat-verified" fee backlash mean: no location permission, on-device by default, no account wall, never touch or route the zakat payment itself, publish the methodology with scholar sign-off and a changelog.
- **Distribution, not features, is the main risk.** 80%+ of acquisition happens in a 6-week Ramadan window (Ramadan 2027 ≈ mid-February 2027). Plan a scholar endorsement per madhhab, a static SEO web calculator, and a launch 4–6 weeks before Ramadan.

**Three incumbents to study:** Sidq (nearest feature match, local SQLite, pledged/settled/remaining), Zaqat + Ismat ZakatTracker (per-school rule surfacing; 30+ asset categories with PKR, on-device SQLCipher), and the NZF / Zaytuna / GiveDirectly web calculators (credibility benchmark; per-ruling overrides are the seed of your audit trail). Also read the open-source ZakatFlow README for a lots/hawl/snapshot data model. Full table: `docs/research-market-2026-10-07.md`.

---

## B. Fiqh accuracy

### B1. Headline corrections to the rule table (§4.2)

The design doc and the Gemini Deep Research report contradict each other on two cells; here is what the sources say.

| Cell | Design doc says | Deep Research says | Sources say | Confidence |
|---|---|---|---|---|
| **Hawl, Maliki** | Continuous (lumped with Hanbali) | Start/end (lumped with Hanafi) | **Continuous.** Al-Nawawi: "the view of Maalik, Ahmad and the majority … it is essential that the nisaab be present throughout the year. If it dips below the nisaab at any point during the year, the year is cancelled" ([islamqa 99381](https://islamqa.info/en/answers/99381), verified directly); Qaradawi, *Fiqh al-Zakah* vol.1 p.136. Malik tolerates a negligible shortfall. Exception for **trade goods**: year-end nisab only (Qaradawi p.168), which is probably where Gemini's confusion came from. | High |
| **Hawl, Hanbali** | Continuous | Continuous | **Continuous.** Al-Buhuti: "If the wealth dips below the nisab partway through the year, then it is cancelled" ([islamqa 99381](https://islamqa.info/en/answers/99381)). | High |
| **Debt, Maliki** | "Conditional: deduct only if no fixed assets (house/car) cover it" | Deductible | **Deductible, with an offset test.** Debts are first set against *surplus* non-zakatable assets beyond basic needs (spare property, not the family home or car), then the remainder is deducted from cash/gold/trade goods ([islamweb 324727](https://www.islamweb.net/en/fatwa/324727/), [298531](https://www.islamweb.net/en/fatwa/298531/)). The doc's "house/car" framing is wrong: a residence is a basic need and never offsets. | High |
| **Debt, Hanbali** | Same "conditional" | Deductible | **Classically deductible with the same surplus-asset offset** (Ibn Qudamah via [islamweb 426541](https://www.islamweb.net/en/fatwa/426541/)). **But** the contemporary Saudi body islamqa.info / Ibn ʿUthaymīn says *no* deduction except debts currently demanded ([islamqa 22426](https://islamqa.info/en/answers/22426)). Label the latter as "Ibn ʿUthaymīn / islamqa.info", not "the Hanbali madhhab", and expose as a choice. | Medium-High |
| **Debt, Shafiʿi** | None | None | **None** (relied-upon "new" view): "being in debt does not exempt one from paying zakat, even if one's debts outweigh all of one's assets" ([Qibla/Karamali](https://islamqa.org/shafii/qibla-shafii/33932/)). | High |
| **Debt, Hanafi** | "Full: immediate + 12 months of long-term" | Deductible | **Deductible classically**, but the "12 months of long-term instalments" is a *contemporary institutional rule* (NZF UK, Askimam, SeekersGuidance), not a classical Hanafi position. A rival camp allows only the instalment currently due (Darul Iftaa Leicester, AMJA, Zakat Foundation of America); a third allows nothing for mortgages (NZF Australia). The attribution to Mufti Taqi Usmani could not be verified from his own text. ([NZF UK](https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/), [Leicester 8395](https://islamqa.org/hanafi/daruliftaa/8395/)) | High that it is contested |
| **Retirement: balance − 30%, all schools** | Yes | Yes | **No body uses a flat 30%.** The only "30%" found is Canada's RRSP withholding tier. Four real positions: (a) annual on full vested balance (SeekersGuidance Khan, precautionary); (b) annual on *withdrawable net of actual tax + penalty* (AMJA, Fiqh Council NA 2024, Zaytuna) — FCNA's Feb-2026 update now defaults instead to the fund's zakatable-asset proportion with no tax deduction ([FCNA 2026](https://fiqhcouncil.org/zakah-on-retirement-funds/)); (c) nothing until accessible, then one year (Joe Bradford, islamqa.info, Deoband on provident funds, Darul Iftaa Jordan); (d) annual only on voluntary contributions (Deoband, Askimam). Tax and penalty must be **user inputs with a jurisdiction default**, never a constant. | High |
| **Stocks passive: 25% proxy, all schools** | 25% / 25.7% "AAOIFI" | 25% | **25% is NZF UK's number only** ([NZF](https://nzf.org.uk/knowledge/zakat-on-share-investments-determining-a-proxy-for-calculation/)). FCNA uses **30%** (approved Nov 2025), Joe Bradford 30%, NZF Canada 30%, Zaytuna and Zakat Foundation of America **100%**, AMJA long-term = company's zakatable assets or dividends. AAOIFI Standard 35 prescribes the zakatable-assets *method*, not a percentage (second-hand; aaoifi.org unreachable). The proxy is an institutional estimate and must be presented as such and editable. Active trading = 100% market value everywhere. | High |
| **Plot files: exempt until possession, all schools** | Yes | Yes | **Wrong as a default for the Deobandi/Pakistani majority.** The deciding variables are whether a *specific plot* is identified and whether there was a *firm intention to resell at purchase*, not physical possession (qabza). Specific plot + resale intent → zakatable on current market value from purchase whether or not possession has been taken, with only the instalments due within that zakat year deductible ([Banuri Town 144109201332](https://www.banuri.edu.pk/readquestion/qisto-par-kharede-gay-pilot-main-zakat-ka-hukum-144109201332/06-05-2020), verified directly); Jamia tur Rasheed adds that payment may be deferred until possession and then made for all past years ([mRq](https://darulifta.info/d/jamiaturrasheed/fatwa/mRq/x)). Pure file with no plot number → the amount paid is a *receivable* owed by the developer ([Jamia Binoria](https://darulifta.info/d/onlinefatawa/fatwa/csHz/)). For own house or undecided → nothing. Only a minority (Jamia tur Rasheed 3nv, citing Ahsan al-Fatawa) exempts until qabza. No Shafiʿi/Maliki/Hanbali file-specific rulings exist; the general trade-goods rule applies. | High (Hanafi); Low (others) |
| **Jewellery: Shafiʿi/Maliki/Hanbali exempt unless investment** | Yes | Yes | Correct but incomplete: add **"or excessive by custom, or unlawful to wear (men's gold is zakatable in all four schools)"** ([islamqa 59866](https://islamqa.info/en/answers/59866/)). The "200 mithqal" threshold is an *illustration* of extravagance, not a rule; do not hard-code it ([Karaan](https://islamqa.org/shafii/shafiifiqh/30157/)). Hanafi 100% is correct ([Askimam](https://islamqa.org/hanafi/askimam/124146/)). Note islamqa.info (Hanbali-leaning body) departs from its own madhhab and taxes all jewellery. | High |
| **General/Safe mode** | Tax jewellery + **full debt deduction** ("easier payment") + start/end hawl | Silver nisab, tax jewellery, start/end, 25% stocks, 12-month debt | **Internally inconsistent in the doc.** Full debt deduction is the *lenient* choice; the cautious choice is no deduction. A "safe" mode must be defined as "pay the maximum across candidate opinions" (always valid as advance zakat or sadaqah) and labelled precaution (iḥtiyāṭ), not "the correct ruling". Choosing the stricter view per issue is *not* blameworthy talfīq; what scholars condemn is hunting for the easiest view ([islamqa 128168](https://islamqa.info/en/answers/128168), [Hellyer on talfiq](https://seekersguidance.org/articles/featured-articles/clarifying-the-issue-of-talfiq-in-islamic-law-dr-hisham-hellyer/)). The doc's start/end hawl choice for safe mode *is* the max-payment choice and should be kept. | High |

### B2. Rules the design document omits entirely

1. **Annexation of new wealth mid-year.** Hanafi: salary, gifts, etc. of the same genus are added to the existing hawl and paid on the one anniversary ([SeekersGuidance](https://seekersguidance.org/answers/hanafi-fiqh/do-i-pay-zakat-only-on-money-ive-had-for-over-a-year/)). Shafiʿi and Hanbali: each acquisition has its own hawl (profit of existing capital is annexed by consensus) ([Darul Iftaa Jordan](https://islamqa.org/shafii/darul-iftaa-jordan/227971/), [islamqa 93414](https://islamqa.info/en/answers/93414/)). Maliki: own hawl for money, annexed for livestock (Qaradawi p.73). Non-Hanafi bodies permit paying everything on one date as *voluntary advance* ([islamqa 50801](https://islamqa.info/en/answers/50801)). The app can default to one anniversary in all modes but must label the surplus as advance zakat in non-Hanafi modes. This is critical to the data model: it is the difference between one hawl per user and one hawl per lot.
2. **Nisab grams and combining.** Two gram standards: 85 g gold / 595 g silver (islamqa.info, Zakat Foundation, Zaytuna, AMJA, NZF Australia/Canada, Qaradawi) versus 87.48 g / 612.36 g (Deobandi bodies, NZF UK, Islamic Relief, SeekersGuidance). Combining gold + silver to reach nisab: Hanafi yes, Maliki yes, **Shafiʿi never**, Hanbali disputed (two narrations from Ahmad). Cash combines with metals in all schools. Silver is the majority institutional default and "better for the poor"; the gold argument (Qaradawi, Zakat Foundation of America) is that silver makes the poor pay. ([islamqa 144734](https://islamqa.info/en/answers/144734), [NZF nisab](https://nzf.org.uk/nisab/), [Bradford](https://joebradford.net/newsletter/nisab-what-it-is-and-how-to-calculate-it/))
3. **Hanafi hawl reset condition.** "Mid-year dips ignored" needs "unless wealth falls to zero or to only basic living needs" ([NZF UK](https://nzf.org.uk/knowledge/is-it-necessary-to-own-zakatable-assets-above-the-nisab-threshold-for-the-entire-year/)).
4. **Debts owed *to* the user** (loans to friends, deposits, unpaid salary, developer receivables for pure plot files). Hanafi three-tier (qawī / mutawassiṭ / ḍaʿīf), Shafiʿi good vs bad debt, Hanbali and Maliki differ on whether a recovered bad debt is zakated for all past years or one. ([Birmingham 87011](https://islamqa.org/hanafi/daruliftaa-birmingham/87011/), [islamqa 125854](https://islamqa.info/en/answers/125854/)) Business owners are a stated target user and this category is absent.
5. **Business/trade assets** (inventory at market value; valuation basis contested: wholesale per Hanafi Leicester and Qaradawi, retail per NZF UK, method-of-sale per Maliki/Ibn Baz) and **crypto** (currency, full value, 2.5%: NZF UK, Mufti Faraz Adam, Zakat Foundation).
6. **Rental property:** zakat on saved rent only, not building value, in all schools; Qaradawi's 10% of net rent is a documented minority method.
7. **Land with unclear intention:** no zakat in all four schools; Hanafi requires the resale intention at the moment of purchase ([Banuri Town](https://www.banuri.edu.pk/readquestion/پلاٹ-کے-خریدتے-وقت-تجارت-کی-حتمی-نیت-نہ-ہو-تو-اس-پر-زکو-ۃ-کا-حکم/27-12-2018)).
8. **Advance payment:** Hanafi yes (multi-year); Shafiʿi one year; Hanbali up to two years; **Maliki not permitted except shortly before year-end and disliked** (Qaradawi vol.2 p.152). Relevant because "pay in Ramadan" is advance payment for most users and the Maliki mode must warn.
9. **Who pays:** minors' wealth exempt in Hanafi, due with guardian paying in the other three; each spouse is a separate payer, no pooling to reach nisab; husband may pay the wife's zakat only with her permission.
10. **Missed years (qaḍāʾ):** compute per year on that year's anniversary wealth; Hanafi deducts prior unpaid zakat from the next year's base (it is a debt), islamqa.info does not.
11. **Solar-year rate 2.577%:** attributed to AAOIFI by NZF UK, who nonetheless advise lunar; Bradford uses 2.578%; *not* found on Zakat Foundation, Zaytuna, FCNA, AMJA or islamqa.info; zero hits in Qaradawi's text. Treat as an NZF/AAOIFI convenience, not a madhhab rule.
12. **Hijri handling:** store the hawl start as a Hijri date; Umm al-Qura tabular anniversary with a ±1–2 day user offset is defensible (no zakat-specific ruling exists; islamqa.info accepts calendar-based dates outside Ramadan).

### B3. Items that must be surfaced as "scholarly difference — you choose" rather than silently defaulted

Nisab metal and gram standard · gold+silver combining · hawl model and dip handling · annexation vs own hawl · jewellery exemption and what counts as excessive · debt deduction scope (none / due instalment / 12 months / full) and the surplus-asset offset · mortgages and student loans specifically · receivables timing · retirement treatment, with tax and penalty as inputs · passive-stock method (25% / 30% / balance sheet / 100% / dividends) · plot files (from purchase vs from possession; pure file as receivable) · rental method · inventory valuation basis · minors · advance payment (warn in Maliki) · lunar vs solar rate · qaḍāʾ deduction · the definition of "safe mode".

### B4. Process recommendation

The user's own bar was "only what is established by the Ulema". The way to meet it in software is: encode every rule with a `ruleId`, a madhhab, and a citation; write **golden test vectors** per rule per madhhab; have a named reviewing scholar per madhhab sign the vectors (a committed `reviewedBy` block); publish the methodology page with a changelog, as Mizan and Zaqat do. Changes to vectors are then visibly fiqh decisions, not code changes. Mufti Taqi Usmani's own text on provident funds, EOBI, or plot files was not located; Pakistani rulings above come from Banuri Town, Jamia Binoria, Jamia tur Rasheed and Deoband.

---
## C. Technical design review

Prices, quotas and guideline text below were fetched from the official pages on 2026-10-07 unless marked unverified.

### C1. Headline technical verdicts

1. **The security section is not implementable as written.** `auth.uid()` is a Supabase-only SQL function and does not exist on Neon; "Supabase TDE" is not a product anyone can switch on (both vendors have cloud-provider disk encryption, nothing column-level); Prisma `$use` middleware was removed in Prisma 7; `prisma-field-encryption` supports Prisma ≤6.13 and String fields only, so it cannot encrypt the `Decimal` columns the doc wants to protect. ([Supabase auth schema](https://github.com/supabase/postgres/blob/develop/migrations/db/init-scripts/00000000000001-auth-schema.sql), [pgsodium deprecation](https://supabase.com/docs/guides/database/extensions/pgsodium), [Prisma 7 upgrade](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7), [prisma-field-encryption](https://github.com/47ng/prisma-field-encryption))
2. **The hosting section contradicts itself** (Lambda + Neon in §2.1; "Vercel or Cloudflare" in §7.2; Supabase in §7.1). NestJS cannot be assumed to run on Cloudflare Workers; Vercel Hobby is non-commercial only. For this traffic shape (one burst per year) the honest options are a single always-on container at $2–7/month, or no user-data backend at all.
3. **v1 does not need a backend for user data.** The data is a few hundred rows per user, written a dozen times a year, read once a year. The only genuine server-side needs are a daily price/FX file (public data, no auth) and backup, which iCloud Documents / Google Drive appData provide without your own server. A backend adds a login wall (an Apple 5.1.1(v) rejection risk for a calculator), a "Financial Info linked to identity" privacy label, GDPR controller duties, and a breach surface, in exchange for multi-device sync that is a v2 request at best.
4. **If a backend is built:** Better Auth (self-hosted, same Postgres, zero per-MAU cost) or Supabase as a whole platform; Drizzle rather than Prisma (runs on-device with expo-sqlite too); one container on Railway/Fly; application-level `userId` scoping as the primary control with RLS via `set_config('app.user_id', …, true)` inside each transaction as defence-in-depth.
5. **Money must be `Decimal` end to end.** The schema uses `Decimal(15,2)` but `packages/core` computes in `number` (IEEE-754 floats).
6. **Expo SDK 54 is three releases behind** (SDK 57 / RN 0.86 current; Expo Go runs only the latest). Upgrade before writing UI.

### C2. Security

| Topic | Finding | Recommendation |
|---|---|---|
| Encryption at rest | Neon: AES-256 on storage, keys in cloud KMS. Supabase: same, no TDE product. Protects against stolen disks, not against a leaked connection string, SQL injection, a compromised admin, or the vendor. | **Local-first:** OS data protection (`NSFileProtectionComplete` / Android FBE) plus expo-sqlite with `useSQLCipher: true`, key in expo-secure-store. **Cloud:** app-side AES-256-GCM on amount/weight columns with a per-user data key wrapped by a master key in platform secrets; totals computed in the API after decryption. Skip KMS until there is a second engineer. |
| pgcrypto | Postgres itself warns keys and plaintext travel in SQL text and logs. | Do not use for user data. |
| RLS with Prisma on Neon | Needs a client extension wrapping every call in a transaction that first runs `SELECT set_config('app.user_id', $1, true)`; app role must be `NOBYPASSRLS` and not the table owner. Neon's pooler is PgBouncer in transaction mode: session-level `SET` leaks across tenants; `set_config(..., true)` inside an explicit transaction is safe. Drop `?pgbouncer=true` (Prisma now recommends against it on PgBouncer ≥1.21; Neon's guide never uses it). ([Prisma RLS example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security), [Neon pooling](https://neon.com/docs/connect/connection-pooling)) | RLS is defence-in-depth, not the primary control. Primary: a repository layer that takes `userId` as a mandatory argument, a lint rule forbidding raw table access outside it, and integration tests asserting cross-tenant reads return zero rows. |
| Secrets | SSM Parameter Store standard tier is free, but only makes sense on AWS. Platform-native secrets (Fly secrets, Railway sealed variables) are free. | Platform-native. Commit `.env.example` only. **The repo currently has two `.env` files, no root `.gitignore`, and is about to become a git repo.** |
| Identity model | `User.email @unique` with OAuth-only sign-in breaks for Apple "Hide My Email" relay addresses and Google accounts without verified email. | Key users by IdP `sub`, not email. |
| Client trust | Doc says "never trust the client-side total". Correct in the cloud design; moot in local-first, where the device *is* the authority and the integrity concern shifts to the price snapshot. | Sign the published daily price JSON (Ed25519) and store the file hash in each calculation snapshot. |
| Analytics / telemetry | Niche is hypersensitive after Muslim Pro / X-Mode. | No location permission; PostHog free with event names only, never amounts; opt-in. |
| Rate limiting, Helmet, validation | Earlier Gemini SDD mentioned Helmet, express-rate-limit, Zod/class-validator; v1.1 dropped them. | Keep if a backend exists; irrelevant in local-first. |

### C3. Financial accounting and money correctness

| Topic | Finding | Recommendation |
|---|---|---|
| Numeric types | Postgres `NUMERIC` is exact; `real/double` are not and round ties differently ([Postgres docs](https://www.postgresql.org/docs/current/datatype-numeric.html)). SQLite has no decimal type. decimal.js is what Prisma's `Decimal` already wraps. | `NUMERIC(20,6)` amounts + `currency` column (7 currencies with different exponents, plus grams, purity, FX rates); `NUMERIC(12,4)` grams; purity as `karat SMALLINT` or `permille SMALLINT`, never float. On device: TEXT decimal strings or integer micro-units, computed via decimal.js. |
| Rounding | Doc: "always round UP". Defensible fiqh choice (err toward the recipient) but must be applied **once**, on the final due figure, and recorded as a named rule (`ROUND_UP_TO_MINOR_UNIT`). Postgres `round()`, JS `Math.round` and decimal.js defaults all handle ties differently. | Compute 2.5% as `wealth.div(40)` in decimal.js; `ROUND_HALF_EVEN` for intermediate display. |
| Valuation snapshots | `ZakaatPeriod.totalDue` is a bare mutable number. Past years are not reproducible after prices or rules change, which contradicts the auditability principle. | Every valuation row is immutable and records original amount, original currency, FX rate + source + date, metal price per gram + source + date, base currency, base amount. Re-valuation inserts a new row. |
| Ledger | Mutable `Payment` rows, no period link, no obligation entity. The first "I entered last year's amount wrong" ticket breaks it. | Append-only journal: `hawl_period` (start/end Hijri + Gregorian, status open/closed/reopened, carried_in/out) · `calculation_snapshot` (engine version, ruleset id, madhhab, frozen inputs, prices used, outputs, explanation entries; many previews, exactly one `authoritative` at close) · `ledger_entry` (kind: obligation / payment / adjustment / reversal / carry_forward; signed amount; currency; masarif category; recipient; `reverses_entry_id`). `UPDATE`/`DELETE` revoked from the app role. Balance = view over entries. Close freezes the snapshot and writes the obligation; non-zero balance writes matching carry-forward entries (overpayment as advance zakat, with a UI option to treat it as sadaqah; shortfall as outstanding). Reopen never unlocks rows; it produces a new authoritative snapshot with `superseded_by`. |
| Rules-engine versioning | None. | `packages/core` exports `ENGINE_VERSION` and a `ruleset` id (e.g. `hanafi@2026.1`); old rulesets stay importable; a replay test re-runs every stored snapshot's inputs and asserts byte-identical outputs. |
| Audit trail shape | `auditTrail: ["Gold taxed per Hanafi rule"]` — free strings cannot be localised to Urdu/Arabic, tested, or diffed. | Structured entries: `{ ruleId, madhhab, subjectId, inputs (decimal strings), output, effect: INCLUDE/EXCLUDE/DEDUCT/PARTIAL/INFO, citation {source, ref, url}, messageKey, severity }`. The "Why am I being taxed?" UI renders `messageKey`. |
| Testing | None specified. | Golden vectors per rule per madhhab, scholar-signed (~28 base + edge cases: exactly at nisab, zero assets, debt > assets, multi-currency, 18/21/22/24k); property tests with fast-check (due ≥ 0; due = 0 iff net < nisab; monotone in assets; currency round-trip within 1 minor unit; safe mode never undercuts any madhhab); snapshot tests on `Explanation[]`; replay tests. |
| Migrations | `prisma db push`, no migration history. | Reviewed SQL migrations, including the `REVOKE` statements. |
| Seed data bug | `seed.ts` upserts international spot (`gold_pkr.csv`, per troy oz) and Karachi Sarafa (`gold_pkr_sarmaya.csv`, per tola) into the same `(GOLD, PKR, date)` unique row; whichever file is read last wins. The tola constant (11.6638 g) is correct. | Add `price_source` (`SPOT_USD_FX`, `PK_SARAFA`, `IN_IBJA`, `AE_DJG`, `USER_ENTERED`) to every price row and snapshot. Local-market gold runs 2% (Karachi, Dubai) to 16% (India, with duty) above spot × FX; zakat is on local market value, so let users override with the rate they can actually sell at, recorded as user-entered. |

### C4. Authentication

| Topic | Finding | Recommendation |
|---|---|---|
| Supabase Auth with DB on Neon | Works but wrong shape: Supabase Auth stores users in the Supabase project's own Postgres, so you run two databases and two vendors, and the free Supabase project **pauses after 7 days of inactivity**, fatal for an app used once a year. ([Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing)) | Either Supabase for everything (Pro $25/mo to avoid pausing) or Better Auth inside your API on the same Postgres. |
| Provider cost at 100k peak-month MAU | Supabase Pro $25 · Clerk ≈ $1,025 · Firebase ≈ $275 · Auth0 > $1k · Cognito Essentials ≈ $1,350 · Better Auth $0. Ramadan means nearly every user is active in one month, so price for peak MAU. ([Clerk](https://clerk.com/pricing), [Cognito](https://aws.amazon.com/cognito/pricing/), [Firebase](https://cloud.google.com/identity-platform/pricing)) | Better Auth if a backend exists (native Apple/Google ID-token sign-in, email-OTP and passkey plugins, Expo plugin stores session in expo-secure-store). |
| Apple Guideline 4.8 | Confirmed (June 2026 text): third-party login requires an equivalent privacy-preserving option; Sign in with Apple is the zero-argument path. `expo-apple-authentication` is iOS-only; Android falls back to Apple web OAuth. ([Guidelines](https://developer.apple.com/app-store/review/guidelines/)) | Offer Apple + Google + email OTP (deep-link magic links are brittle on mobile). |
| Guideline 5.1.1(v) | "If your app doesn't include significant account-based features, let people use it without a login." A calculator that demands Google/Apple sign-in before computing anything is a rejection risk. Account deletion must be in-app and, for Sign in with Apple, must revoke tokens via Apple's REST API. ([5.1.1 help](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)) | Local-first sidesteps this entirely: no account in v1. |
| Non-Google devices | Huawei is ~1.3–1.9% of Pakistan/UAE/Saudi mobile share and shrinking (StatCounter Sep 2026). | Not worth HMS work; email OTP covers it. |
| Token model | Short-lived access JWT in memory; refresh token in expo-secure-store with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; keep values under ~2 KB. Verify IdP JWTs in NestJS with `jose` (JWKS, issuer, audience). | As stated. |
| Backup identity (local-first) | iCloud Documents / Google Drive appData use the platform's own identity; no account of yours needed. `react-native-cloud-storage` 3.1 has an Expo plugin. Drive appData is hidden from the user and deleted on uninstall. | Encrypt the backup file with a device key escrowed in iCloud Keychain; also offer manual encrypted export via the share sheet. |

### C5. Hosting and deployment

| Option | Free tier (verified) | Floor cost | Notes |
|---|---|---|---|
| AWS Lambda + function URL | 1M req + 400k GB-s always free; API Gateway free only 12 months | $0 | NestJS bootstrap 80–200 ms + Neon wake (hundreds of ms) + DB connect = 0.5–1.5 s on the first Ramadan request per container. `@vendia/serverless-express` last published Dec 2023; maintained fork is `@codegenie/serverless-express`. Medium ops (IAM, bundling, SSM, EventBridge). |
| Railway | Hobby $5/mo incl. $5 usage | $5 | Lowest ops: git push, built-in cron, sealed variables. Regions US/Amsterdam/Singapore. |
| Fly.io | No free tier | $2.19–3.69 | Dockerfile deploy, `fly secrets`; no cron service. |
| Google Cloud Run | 2M req free, scale to zero | $0 | Only option with Doha/Dammam/Mumbai regions. |
| Vercel | Hobby is non-commercial only; Pro $20 | $0 / $20 | Dies with the first paid tier. |
| Cloudflare Workers | 100k req/day free | $0–5 | Node `http` servers supported since Sept 2025, but NestJS has no official support and its DI bootstrap is a poor fit for 10 ms CPU. Use Hono if you want Workers. |
| Supabase all-in-one | Free pauses after 7 days | $0 / $25 | Auth + DB + RLS + pg_cron + storage in one; drops NestJS. |

| Database | Free tier | Suspend | Backups on free | Regions |
|---|---|---|---|---|
| Neon | 1 GB, 100 CU-hours/project | Scale-to-zero after 5 min, cannot be disabled on free | 6 h restore | Frankfurt, London, Singapore, US; **no Middle East, no India** |
| Supabase | 500 MB | Paused after 7 days idle | **None** | EU, Mumbai, Singapore; no ME |
| PlanetScale Postgres | none | always-on | included | $5/mo single node |
| Aurora Serverless v2 / RDS | $100–200 credits for 6 months (no more 12-month free tier) | pauses to 0 ACU | automated | Bahrain, UAE, Mumbai |

Data residency: Pakistan has no enacted data-protection law (a 2023 bill would localise "critical personal data"); UAE and Saudi PDPLs allow transfer with safeguards; UK/EU adequacy holds. An EU region is fine today; nobody offers Pakistan.

**Recommendation.** Do not run user data on either Neon free (1 GB, forced suspend) or Supabase free (no backups, pauses). If a cloud DB is needed: Neon Launch (usage-based, ≈$0–3/mo until 10k users) or Supabase Pro ($25). Host the API as one container on Railway/Fly in Frankfurt/Amsterdam; NestJS-on-Lambda buys nothing at this traffic and adds a double cold start at the moment users are most impatient. IaC: none beyond Dockerfile + `fly.toml`/`railway.json`; SST v3 only if you insist on AWS. Observability: Sentry Developer (5k errors/mo) for mobile and API, Sentry cron monitor on the daily price job (the one failure users will notice), Axiom free for logs.

**Scheduled price job.** GitHub Actions daily (≈30 min/month of 2,000 free; public repos auto-disable after 60 idle days, so keep it private or push periodically), or Railway cron. Never per-request caching with a 12 h TTL: that burns the quota on every cold cache per currency.

**Price data.** MetalPriceAPI free tier (100 req/mo) is **"solely for personal exploration and evaluation … must not be used for any commercial activities"** per its terms, so the doc's plan violates the licence regardless of caching. Verified fits: **metals.dev Copper $1.79/mo** (direct PKR/INR/AED/SAR quotes, IBJA/LBMA authority endpoint, commercial publication allowed with subscription); **gold-api.com** (free, commercial use permitted, USD only) as the cross-check; **open.er-api.com** for FX (all six currencies, attribution link required) with **frankfurter.dev v2** or the CC0 fawazahmed0 feed as cross-check; AED and SAR are USD pegs, hard-code with a sanity check. Reject a day if gold sources disagree >1% or FX >2%. Do not scrape Kitco, goldprice.org, or sarmaaya.pk (terms forbid). Do not call the figure "LBMA price" without a licence. **Never embed a provider key in the mobile app**; the app reads only your published JSON.

**Hijri.** Hermes passes `calendar: 'islamic-umalqura'` through to platform ICU, but `resolvedOptions().calendar` was broken on iOS until a fix merged 2026-10-05, and no runtime evidence of correct Umm al-Qura formatting on Hermes was found. Put a pure, tested Umm al-Qura conversion in `packages/core` (vendor `@umalqura/core`'s table or port the Kuwaiti algorithm), expose a per-user `hijriOffsetDays` (−2..+2) for local sighting, store both Gregorian and Hijri hawl dates, and use `Intl` for display only.

### C6. Application packaging and distribution

| Topic | Finding (verified 2026-10-07) | Recommendation |
|---|---|---|
| EAS | Free: 15 Android + 15 iOS builds/month, 45-min timeout, 1 concurrent; EAS Update **1,000 MAU** free, Starter $19 (3,000 MAU, +$0.005/MAU), Production **$199** (50k MAU). EAS Submit included. ([Expo pricing](https://expo.dev/pricing)) | Free for builds is enough for a solo dev. EAS Update's 1,000-MAU cap is the first bill you hit: ≈$34 in the peak month at 10k users; ≈$249 at 100k, or drop OTA at that size. Local `expo prebuild` + Xcode is free. |
| OTA rule | Apple DPLA §3.3.1(B): interpreted code may be downloaded if it does not change the app's primary purpose or circumvent review. | OTA for bug fixes only; never ship a materially different feature set OTA. |
| Apple review | 3.2.1(viii): money-management apps must come from the licensed institution — the phrase "personal finance tracker" invites this clause. 5.1.1(ix): apps requiring sensitive user information "should be submitted by a legal entity … not an individual developer". 3.2.2(iv): collecting funds for charities in-app is prohibited unless an approved nonprofit; link out instead. Privacy label "Other Financial Info" is only required when data is **transmitted off device**. | Position as "zakat calculator and record keeper", never add bank connections, never take money in-app, link out for charity payments. Local-first declares nothing under Financial Info. |
| Google Play | Financial Features Declaration is mandatory; select "no financial features". Financial Services policy covers loans/EWA/crypto, not calculators. Target **API 36 (Android 16)** required since 2026-08-31. New personal accounts need a closed test with **12 testers for 14 days** before production (the "20 testers" figure is stale). ([Play testing](https://support.google.com/googleplay/android-developer/answer/14151465), [target API](https://support.google.com/googleplay/android-developer/answer/11926878)) | Start the 12-tester closed test the day you have a build. |
| Developer accounts | Apple $99/yr; Play $25 once; organisation accounts need a D-U-N-S (up to 30 days). Pakistan is listed as supported for Play merchant registration; Apple's Pakistan payout eligibility could not be verified. | Ship the free local-first v1 from an individual account to validate demand; start the D-U-N-S now; move to a legal entity (UAE free zone or UK) before holding cloud data or monetising. Apple supports app transfer. |
| Notifications | Expo push is free but needs a server and credentials. Local scheduled notifications need no server; Android exact alarms need a user-revocable permission. | Local only: 30/10/1 days before the Hijri anniversary, rescheduled on each app open, inexact scheduling. |
| Web | Expo Router static export; EAS Hosting free 100k req/mo; Cloudflare Pages free unlimited bandwidth. expo-sqlite on web is alpha and needs COOP/COEP. | A stateless `/calculator` route from the same codebase for Ramadan SEO; not the full record-keeping app. |
| Sync (if ever) | PowerSync free deactivates after a week idle, Pro $49; ElectricSQL is read-path only; Zero needs Postgres + a cache server; InstantDB is shutting down; Turso embedded sync works on the same SQLite schema at $4.99/mo. | If multi-device becomes real demand, Turso embedded sync on the existing SQLite schema is the least-work upgrade, not a REST rewrite. |

### C7. Recommended architecture v2 (two options)

**Option 1, recommended for v1: local-first, no user-data backend.**
Expo SDK 57 + Expo Router; expo-sqlite with SQLCipher; Drizzle with bundled migrations; `packages/core` runs every calculation on-device in decimal.js and writes structured explanations and immutable snapshots locally; no sign-in; optional encrypted backup to iCloud Documents / Google Drive appData plus manual export; a daily GitHub Actions job publishes a signed `prices/latest.json` and dated archive to Cloudflare Pages, with the last 30 days bundled in the binary as fallback; local notifications; static web calculator; Sentry + cron monitor; `apps/api` kept as an interface but not deployed.

| Monthly cost | 0 users | 1k | 10k | 100k (peak month) |
|---|---|---|---|---|
| Store accounts (amortised) | $8 | $8 | $8 | $8 |
| EAS Update | $0 | $0 | $34 | $249 (or $0 without OTA) |
| Price job + static hosting | $0 | $0 | $0 | $0 |
| metals.dev Copper | $1.79 | $1.79 | $1.79 | $1.79 |
| **Total** | **≈$10** | **≈$10** | **≈$44** | **≈$259 with OTA, ≈$36 without** |

**Option 2: classic cloud backend, when multi-device sync is actually demanded.**
Same app and core; SQLite stays the offline source of truth with a sync layer (Turso embedded sync $4.99) or a REST API: NestJS 11 or Hono in one Docker container on Railway Hobby / Fly, Drizzle to Neon Launch (eu-central-1) via the pooled host; Better Auth with Apple (native on iOS) + Google (native) + email OTP, account deletion that revokes Apple tokens; repository scoping + RLS via `set_config`; app-side AES-GCM on amount/weight columns; same price job as a Railway cron; Dockerfile + `railway.json` as IaC; Sentry/Axiom/PostHog free tiers.

| Monthly cost | 0 users | 1k | 10k | 100k (peak month) |
|---|---|---|---|---|
| Store accounts | $8 | $8 | $8 | $8 |
| EAS Update | $0 | $0 | $34 | $249 / $0 |
| API container | $5 | $5 | $5 | $5–10 |
| Neon Launch | $0.5 | $1 | ≈$3 | ≈$12–20 |
| Auth (Better Auth) | $0 | $0 | $0 | $0 (Supabase alt $25; Clerk alt ≈$1,025) |
| Price job + metals.dev | $1.79 | $1.79 | $1.79 | $1.79 |
| **Total** | **≈$16** | **≈$16** | **≈$52** | **≈$277 with OTA, ≈$30–55 without** |

Nothing in Option 1 is thrown away when Option 2 is added: `packages/core`, the SQLite schema, the price job and the Expo app all carry over.

---
## D. Defects in the current design document and scaffold (verified directly)

### D1. Internal contradictions in design_document.md
| # | Where | Problem |
|---|---|---|
| 1 | §2.1 vs §7.1 vs §7.2 | Three hosting stories: §2.1 says AWS Lambda + Neon + Supabase Auth; §7.1 says "ensure Supabase TDE is active" and an RLS policy using `auth.uid()` (a Supabase-only SQL function that does not exist on Neon); §7.2 says "Supabase or Neon" and "Vercel or Cloudflare for API". NestJS cannot run on Cloudflare Workers. Pick one. |
| 2 | §3 `ZakaatPeriod` | `status` field is declared twice (lines 170–171) in the design doc; Prisma would refuse to generate it. The repo `schema.prisma` has it once and is fine. |
| 3 | §3 `DailyMetalRate.metal` | Typed as `AssetCategory`, which admits CASH/STOCK/RETIREMENT/REAL_ESTATE as a "metal". Needs its own `Metal` enum. |
| 4 | §4.1 vs §4.2 | The interface has `calculateGold`, `calculateCash`, `calculateDebtDeduction`, `shouldResetHawl` but the rule table also needs stocks, retirement, real estate, silver, business assets. The interface is a fraction of the table. |
| 5 | §4.2 "General (Safe) Mode" | Taxes jewelry (strict) but allows full debt deduction with the stated reason "allows for easier payment". That is convenience, not precaution (ihtiyāṭ). A safe mode must be consistently cautious or it is a fifth madhhab of our own invention. |
| 6 | §4.2 "Maliki / Hanbali" lumped | The Gemini deep-research report (second link) says Hanafi+Maliki use start/end hawl and Shafi'i+Hanbali use continuous, and that Maliki and Hanbali DO deduct debts. The design doc says Maliki/Hanbali are continuous and deduct only conditionally. The two Gemini outputs contradict each other; neither cites a source for these cells. See section B for what the sources actually say. |
| 7 | §4.2 Retirement "Balance − 30%" for all schools | A flat 30% haircut is an arbitrary number, exactly what the user said to avoid. Positions among scholars differ materially (see B6). |
| 8 | §4.2 Stocks passive "25%" | Gemini variously wrote 30%, 25%, 25.7% "AAOIFI standard". AAOIFI Standard 35 does not prescribe a 25.7% proxy; the proxy figures come from specific institutions. See B7. |
| 9 | §5 API | No asset update endpoint, no period endpoints, no payment list/edit/void, no export, no account deletion (Apple Guideline 5.1.1(v) requires in-app deletion), no price endpoints. |
| 10 | §7.2 "500MB is sufficient for ~100k users" | Unsupported arithmetic; with itemized assets, per-period snapshots and payment history, 5 KB/user is optimistic but plausible; the real free-tier limiter on Neon is compute hours and auto-suspend, not storage. |

### D2. Data model gaps (PRD requirements with no home in the schema)
| PRD requirement | Missing in schema |
|---|---|
| Auditability: "every number must show source asset, applied rule, fiqh reference" (PRD §13) | No `ZakaatCalculation` / snapshot entity. `ZakaatPeriod.totalDue` is a bare number with no frozen inputs, metal prices, FX rates, nisab used, or rule-engine version. Past years are not reproducible once prices or rules change. |
| "Payments reduce remaining balance in the current period" (PRD §9.2) | `Payment` has no `periodId`. Remaining balance for a given hawl cannot be computed correctly across years. |
| Itemized assets carried forward year to year (user's point 2) | `Asset` has no period linkage, no versioning, no "as-of" valuation history. Editing a weight destroys last year's record. |
| Recipient management (PRD §9.1) | No `Recipient` entity; `Payment.recipient` is a free string. |
| Business owners as target users; trade goods, receivables (PRD §8.2C) | `AssetCategory` has no BUSINESS_INVENTORY, RECEIVABLE, or CRYPTO. Debts owed TO the user are absent entirely. |
| Show entered unit and converted grams (PRD §8.0.4) | Only `weightGrams` stored; entered unit/value (tola, masha) lost. |
| Multi-currency liabilities and payments | `Liability` and `Payment` have no currency. |
| Hijri-aware hawl (PRD §6.1) | `hawlStartDate` is a plain DateTime; no Hijri representation, no calendar-source field, no "anniversary" logic. |
| Nisab constants | 85 / 87.48 g gold and 595 / 612.36 g silver appear nowhere. |
| Evidence/receipt upload (v3 §4.1) | No attachment field or storage design. |
| Notification preferences (PRD §4.2) | Not modelled. |
| Jewelry usage = Personal / Investment / Scrap, purity | `purityKarat` exists but no `usage` enum; `isInvestment` boolean conflates jewelry intent with real-estate intent and stock intent. |

### D3. Scaffold state (what is actually in the repo)
- Monorepo skeleton only: bare Expo 54 "Hello" app, NestJS hello-world, Prisma schema identical to the doc (plus a stray `OKT` currency value), empty `core` interface with two methods, 17 CSVs of daily gold/silver/FX history (investing.com format, plus a Sarmaya per-tola PKR series) and a seed script.
- Not a git repository. No root `.gitignore`. Two `.env` files present (localhost DB URL, plus an exchange-rate API key). Add ignore rules before `git init`.
- Seed script loads dotenv from `../../../../.env`, which resolves to the parent of the repo root (wrong path); it parses prices with `parseFloat` (float) before writing to `Decimal`.
- `turbo.json` uses the pre-v2 `pipeline` key; Turborepo 2 requires `tasks`.
- `packages/ui-config` is referenced in the doc but does not exist.
- `apps/mobile` contains its own nested `.git` repository ("Initial commit") and an npm `package-lock.json` inside a pnpm workspace. Delete both; init git at the root.
- `turbo run build --dry-run` fails today: "Found `pipeline` field instead of `tasks`" (Turborepo 2.8.3 installed). Fix with `npx @turbo/codemod rename-pipeline`.
- Prisma pinned at 5.22; current stable is 7.x with 8 in release candidate. Prisma 7 requires a driver adapter and removed `$use`.
- Expo pinned at SDK 54; SDK 57 is current. Expo Go only runs the latest SDK.
- `apps/api` has no Prisma, auth, or serverless dependency; the "wrapped with @vendia/serverless-express" claim is aspirational, and that package was last published Dec 2023 (maintained fork: `@codegenie/serverless-express`).
- The historical price CSVs (Feb 2025–Feb 2026 daily gold/silver/FX in 7 currencies, plus a Karachi Sarafa per-tola series) are a genuinely useful asset for hawl-continuity back-testing; keep them, but tag each series with its source and unit.

### D4. Mockups vs rules
- The "Calculation Summary" mockup shows "Gold: Exempt (Shafiʿi Rule)" and "Debt: Deducted (Maliki Rule)" in the same calculation. That is exactly the implicit school-mixing the PRD forbids (§1, §14). The audit trail must only ever cite the user's selected mode.
- The onboarding mockup shows 4 madhhab tiles; the PRD v3 has 5 modes (plus General/Safe). The nisab toggle shows "Silver (Recommended) ~$412 / Gold ~$6,100"; with gold near $4,100/oz (Oct 2026) the gold nisab is ≈$11,300 and silver ≈$1,170, so the live values must be fetched, never illustrative.
- The dashboard mockup has "Month 8 of 12" with a 12-month ring; a hawl is 354–355 days, so the ring should be day-based on the Hijri anniversary.

---

## E. What the design document gets right (keep these)

- Strategy pattern for per-madhhab rules; a shared `core` package consumed by both app and API; strong enums for madhhab, currency, category.
- Silver nisab as default with an explicit toggle and the "between silver and gold" warning.
- Separation of calculation from payment tracking; Qur'anic masarif categories on every payment.
- The "Fiqh explainer" next to every line item, and the ambition of a full audit trail.
- Itemised assets (multiple bank accounts, itemised jewellery with purity and usage), the plot-file category, the trader/passive split, the Hanafi start/end hawl in safe mode.
- Decimal columns in the schema; daily metal and FX rate tables with a unique (metal, currency, date) key; the collected historical price data.
- Round-up-in-favour-of-recipient as a stated principle (needs to be applied once, at the end).

---

## F. Decisions needed from you

These change the architecture or the rules engine materially, so I have not assumed answers. Each has my recommendation first.

**F1. Architecture: local-first v1 or cloud backend from day one?**
- (a) **Local-first, no account, optional encrypted cloud-drive backup (recommended).** ≈$10/month, no login wall, no financial-data privacy label, encryption question becomes OS-level. Costs: no multi-device sync in v1.
- (b) Cloud backend from the start (Better Auth + Neon + one container). ≈$16/month, multi-device and future server features, but you own auth, deletion, GDPR, encryption and a breach surface, and the login wall is an App Store risk for a calculator.
- (c) Hybrid: local-first with an optional "sign in to sync" later (same as (a) now, (b) as v2). Functionally identical to (a) for v1.

**F2. Hawl continuity tracking: how does the app know wealth dipped below nisab mid-year?**
The continuous rule (Shafiʿi, Maliki, Hanbali) needs the balance on every day of the year, and no bank feed exists. Options: (a) **self-attestation at year end** ("did your zakatable wealth fall below the nisab at any point this year?" with the nisab history shown for reference) **(recommended)**; (b) periodic check-ins (monthly prompt to update balances, with gaps treated as "unknown"); (c) continuous monitoring, which requires bank connections and is out of scope. The historical price CSVs make (a) and (b) richer because the app can show the nisab line over the year.

**F3. Hawl model for non-Hanafi modes: one anniversary or one hawl per acquisition?**
Shafiʿi/Hanbali/Maliki give each mid-year acquisition its own hawl. Options: (a) **one anniversary for everyone, with the surplus labelled "paid in advance" in non-Hanafi modes (recommended; endorsed by non-Hanafi bodies as voluntary advance)**; (b) true per-lot hawl tracking (each deposit/purchase is a lot with its own date; much heavier UX and data model; ZakatFlow does this).

**F4. Safe mode definition.** Define "General/Safe" as **pay the maximum across the candidate opinions on each issue** (silver nisab at the lower gram standard, tax all jewellery, no debt deduction, start/end hawl with everything annexed, 100% on passive stocks, retirement on full vested balance, plot files from purchase)? This is strictly cautious and always valid as advance zakat or sadaqah, but it will produce noticeably higher figures than the doc's current "safe" mode. Alternative: a "Majority/Jumhūr" mode that picks the majority view per issue (which is lenient on jewellery and debt). Yes to maximum, or do you want both modes?

**F5. Primary market for v1.** Pakistan-first (PKR, tola/masha, Sarafa rates, plot files, Deobandi rulings, Urdu), UK/US diaspora first (GBP/USD, pensions/401k, NZF/FCNA/AMJA positions, English), or Gulf first (AED/SAR, gratuity/EOBI)? This sets the default rulings, the first price sources, the first language, and which scholars to approach. My recommendation: Pakistan-first for rules and data, English UI with Urdu as the first translation, because that is where the gap and your context are.

**F6. Fiqh validation.** Who signs off the golden test vectors? Options: (a) one named mufti per madhhab reviews the vectors (recommended; also your distribution thesis); (b) rely on published institutional positions only (NZF, FCNA, AMJA, Banuri Town, Deoband) and cite them; (c) both. Do you already have scholars in mind?

**F7. Rule granularity exposed to the user.** The research found 18 issues that scholars differ on. How much of that should v1 expose? (a) **Madhhab picks the defaults; an "Advanced" screen lets the user override each contested rule with the alternatives and citations shown (recommended)**; (b) madhhab only, no overrides (simplest, but users of islamqa.info-style rulings in Hanbali mode will disagree with "their" defaults); (c) no madhhab, only per-issue choices.

**F8. Scope for v1.** Confirm in/out: business inventory and receivables (in the original PRD; business owners are a target user) — in or deferred? Crypto — in (trivial: full value) or out? Rental property — in? Debts owed to the user — in (needed for plot-file "pure file" cases)? Reports/PDF export — v1 or v2? Web calculator — v1 or v2?

**F9. Developer account and entity.** Publish v1 from an individual account (fast, fine for a free local-first app) and move to a legal entity before any cloud data or monetisation? And which jurisdiction for that entity (Pakistan, UAE, UK)? Apple's Pakistan payout eligibility could not be verified.

**F10. Expo and Prisma versions.** Approve upgrading to Expo SDK 57 now, and dropping Prisma for Drizzle (which runs on-device and server-side)? If you prefer to stay on Prisma, it must be 7.x with a driver adapter, not 5.22.

Items I will treat as decided unless you say otherwise: Hijri dates via a tested Umm al-Qura table in `core` with a user offset; `Decimal` end to end; append-only ledger with immutable calculation snapshots; structured explanation entries; scholar-reviewed golden vectors; no location permission; no in-app donations; MetalPriceAPI replaced by metals.dev + gold-api.com + open.er-api.com; prices published as a signed daily JSON; local notifications; `.gitignore` before `git init`; fix `turbo.json`; delete the nested `.git` in `apps/mobile`.

---

## G. Sources and method

Fiqh: Qaradawi *Fiqh al-Zakah* (Kahf translation, vols. 1–2, page-cited), islamqa.info, SeekersGuidance (Hanafi and Shafiʿi), Darul Iftaa Leicester, Askimam, Darul Ifta Birmingham, Banuri Town, Jamia Binoria, Jamia tur Rasheed, Deoband (via mirrors; site returned 403), islamweb, AMJA, Fiqh Council of North America (2024 and 2026 statements), NZF UK/Canada/Australia, Zakat Foundation of America, Zaytuna calculator, Joe Bradford, Mufti Faraz Adam, Mufti Taqi Usmani (muftitaqiusmani.com). AAOIFI SS35 was reachable only second-hand. Full per-cell URLs and confidence levels: `docs/research-fiqh-2026-10-07.md` (19-row matrix, ~120 URLs).
Technical: official pricing and docs pages for Expo/EAS, Apple App Store Review Guidelines (June 2026) and DPLA (Aug 2026), Google Play policy pages, Supabase, Neon, Prisma, Drizzle, Railway, Fly, Vercel, Cloudflare, AWS, Sentry, metals.dev, gold-api.com, MetalPriceAPI terms, exchangerate-api, frankfurter, Hermes source. Unverified items are marked inline; a full list is in `docs/research-technical-2026-10-07.md` §G.
Market: App Store and Play listings, vendor sites, Arab News/IDS (Pakistan zakat study), Hyphen (UK), ZATCA, Vice/Al Jazeera (Muslim Pro), Ehsan Substack (LaunchGood). Full comparison table: `docs/research-market-2026-10-07.md`.
