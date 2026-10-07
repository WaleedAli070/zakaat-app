# Zakat calculator/tracker apps: competitive and market research (2026-10-07)

Research pass run for the design review. Verified from store listings and vendor sites on 2026-10-07; "?" = could not verify.

## Bottom line
- No product verified does all four of: madhhab-specific rule switching + hawl continuity tracking + itemised assets carried forward + payment ledger. Several do two or three.
- Madhhab selection alone is not a differentiator (Sidq, Prolaxies, Zaqat, GiveDirectly, Zaytuna all have it). Hawl-anniversary reminders are common.
- Real gaps: per-school hawl continuity; per-item intent; audit trail of applied rulings; PKR/INR/AED/SAR with Pakistani asset types; on-device storage.
- Demand for a standalone tracker is unproven; distribution is the main risk.

## Comparison (abridged)
| Product | Platform | Model | Madhhab | Ledger | Multi-year | Storage | Notes |
|---|---|---|---|---|---|---|---|
| Sidq (iOS) | iOS | Free | 4 schools | Pledged/settled/remaining, 8 asnaf, receipts | Hijri years | Device (SQLite, biometric, optional iCloud/Drive) | Closest match; no itemisation by weight/purity or intent |
| Ismat ZakatTracker | Android | Free | No | Yes (recipient, date) | PDF export | Device (SQLCipher AES-256, no network) | 30+ categories incl. PKR; no fiqh switching |
| Zaqat (zaqat.org) | Web | Free core; $50/yr premium | 6 schools incl. Jaʿfari | Not described | YoY history | Server (Plaid, Stripe) | "Shariah review in progress" |
| Mizan (mizan.family) | Web+mobile beta | Donation-supported | No UI (85 g default) | Multi-year ledger + sadaqah ledger | Yes | E2E server | Scholar-reviewed versioned methodology with changelog |
| Zakati | iOS | Freemium ~100 zł/yr | No | Transactions | Archived years | Local-first | Budget app first |
| HalalWallet | iOS | $69.99/yr | "respects your madhab" | Partial | Hawl anniversary | Server (Plaid) | US-centric |
| TARRA Zakat Calculator | Android | Free | No | Yes | Yes | No data collected | 4.9, 1K+ installs |
| Zakat Calculator · Islamic (Javid Lone) | iOS | Free + Pro | 4 schools (no detail) | Giving history | Pro | Device | |
| Prolaxies Zakat Calculator | Android | Free | 4 schools | No | No | Server | AI fiqh chat; collects data |
| Zakat Tracker (Innovative Ideas, PK) | Android | Free | No | Yes | ? | ? | Only app with a "House/Plot" field; no intent logic |
| Zaytuna calculator | Web | Free | Hanafi/Maliki/Shafiʿi; explains start/end vs continuous | No | No | Nothing stored | Best fiqh exposition |
| GiveDirectly calculator | Web | Free | 4 schools with per-ruling override | No | No | None | Closest to the audit-trail idea, one-shot |
| NZF UK | Web | Charity-funded | Hanafi positions | No | No | Web | Native app abandoned 2019; pension fund lookup, 25% shares, strong/weak receivables |
| Zoya / Musaffa / Wahed | iOS/Android | Fintech | No | Give via partners | No | Server | Stocks only / calculator as a feature / Wahed uses 30% long-term equities, 2.577% solar |
| Zakaty (Saudi ZATCA) | iOS/Android | Government | No | Pay to state | Donor history | Government | 500K+ installs, 3.3★, SAR only |
| ZakatFlow (GitHub) | Web OSS | Free | Engine only | Yes | Yes | Supabase | Lots, FIFO, hawl per lot, explainable assessment lines; read its README |
| Zakatify | iOS/Android | Defunct 2017–2024 | No | Giving marketplace | n/a | Server | "did not achieve the scale … hoped for" |

Pakistan/India: Alkhidmat calculator (PKR, tola, no madhhab, no plots); Baithuzzakath Kerala iOS (last update 2023). Deoband confirms plot zakatability hinges on resale intention, which no app models.

## Market signals
- Pakistan: >Rs619bn/yr, 50M+ payers, <2% via the state, most given directly (ICTD/LUMS survey, Mar 2025). State nisab 1445-46: Rs179,689.
- UK: 3.9M Muslims; zakat estimates £262m–£1.5bn+; Ramadan giving >£200m; gold-price rises lift zakat.
- Gulf: Zakaty cumulative SAR 790m–1bn+; UAE Zakat Fund traffic +49% month-on-month in Ramadan.
- Seasonality: installs up 7–18% in Ramadan with two peaks; expect 80%+ of acquisition in a 6-week window. Ramadan 2027 ≈ mid-February 2027.

## Monetisation and trust
- Willingness to pay is weak (modal acceptable price "< $1/month" in a Muslim super-app survey); the one paid zakat app with traction was abandoned in 2022.
- Charity sensitivity: LaunchGood "zakat-verified" backlash (fees of ~31% on raised zakat). Rule: never touch the zakat flow; if charging, charge for the tool.
- Trust incidents: Muslim Pro / X-Mode (Nov 2020) location data sold to military contractors; Salaat First, Qibla Compass also implicated. 63% of Muslim prayer apps request storage access.
- Abandonment pattern: side projects and charity apps die after 1–2 Ramadans. A visible maintenance cadence is itself a feature.

## URLs
Apps: https://apps.apple.com/app/id6757312243 · https://www.ismatapps.fyi/pages/zakattracker · https://www.zaqat.org/ · https://mizan.family/ · https://zakatcalculator.zaytuna.edu/ · https://www.givedirectly.org/zakat-calculator · https://nzf.org.uk/zakat-calculator/ · https://github.com/oalhalabioa-ux/zakatflow · https://play.google.com/store/apps/details?id=com.stc.zakattracker · https://www.wahed.com/mme/introducing-waheds-revamped-zakat-calculator · https://zoya.finance/
Market/trust: https://www.arabnews.pk/pakistan/pakistanis-paying-over-2-billion-in-zakat-annually-women-majority-recipients-study-2595327 · https://ids.ac.uk/publications/zakat-payments-in-pakistan-exceed-state-social-protection · https://hyphenonline.com/2025/05/01/zakat-british-muslims-total-donations-money-ramadan/ · https://www.purrweb.com/blog/how-we-evaluated-muslim-super-app-idea-saving-client-over-150000/ · https://ehsan.substack.com/p/launchgoods-zakat-verified-is-worthless · https://vice.com/en/article/muslim-apps-location-data-military-xmode · https://www.adjust.com/blog/ramadan-insights-and-tips-for-app-marketers-in-2023/
