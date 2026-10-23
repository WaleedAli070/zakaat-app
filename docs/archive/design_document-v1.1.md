# **Software Design Document: Zakaat App**

## **1. Metadata**

- **Architect:** Senior Solutions Architect (Gemini AI)
- **Version:** 1.1
- **Target Stack:** React Native (Expo) | Node.js (TypeScript) | PostgreSQL
- **Development Model:** AI-Agent Assisted Development

---

## **2. System Architecture**

### **2.1 High-Level Architecture**

The system uses a **Serverless-First** approach to minimize maintenance and infrastructure costs.

- **Frontend:** React Native (Expo) - Shared codebase for iOS & Android.
- **Backend:** Node.js (NestJS) deployed on AWS Lambda(Serverless). Use @vendia/serverless-express to wrap the NestJS API for Lambda execution.
- **Database:** PostgreSQL (Neon) with Row-Level Security (RLS). Enable Connection Pooling in the Neon dashboard. Ensure Prisma is configured with ?pgbouncer=true in the connection string.
- **Auth:** OAuth 2.0 (Google/Apple) via Supabase Auth.
- **Secrets Management:** Use AWS Systems Manager (SSM) Parameter Store (Standard tier is free) to store the DB connection string and OAuth secrets.

### **2.2 Design Patterns**

- **Strategy Pattern:** For decoupled Fiqh calculation logic.
- **Repository Pattern:** For database access abstraction via Prisma.
- **DTO (Data Transfer Object) Pattern:** For strict API input validation.

### 2.3 **Project Structure & Workspace Configuration**

**Architectural Pattern:** Monorepo (Turborepo)

**Package Manager:** `pnpm`

**Workspace Root:**

```text
/zakaat-master
├── apps/
│   ├── mobile/          # React Native (Expo) - Mobile Frontend
│   └── api/             # NestJS (Node.js) - Backend API
├── packages/
│   ├── core/            # Shared Fiqh Calculation Strategies & Business Logic
│   ├── database/        # Prisma Schema & Client (PostgreSQL)
│   ├── types/           # Shared TS Enums (Madhhab, Currency, AssetCategory)
│   └── ui-config/       # Shared Tailwind/Theme configuration
├── turbo.json           # Build Pipeline configuration
└── pnpm-workspace.yaml  # Workspace definitions`
```

**Development Logic:**  Both the `mobile` app and the `api` must consume the `core` package for all Zakaat math. This ensures that the calculation engine is the single source of truth for both the UI preview and the server-side persistence.

---

## **3. Database Schema (Prisma/PostgreSQL)**

Code snippet

```text
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Fiqh {
  HANAFI
  SHAFII
  MALIKI
  HANBALI
  GENERAL
}

enum AssetCategory {
  CASH
  GOLD
  SILVER
  STOCK           // Individual Shares / Mutual Funds
  RETIREMENT      // 401k, IRA, Provident Fund (Applies 'Net Withdrawable' logic)
  REAL_ESTATE
}

enum Currency {
    USD
    PKR
    INR
    GBP
    EUR
    AED
    SAR
}

enum NisabStandard {
    SILVER
    GOLD
}

enum MasarifCategory { // Qur'anic Category (Poor, Needy, etc.)
    Poor // Fuqara
    Needy // Masakin
    ZakaatAdministrators
    ReconciliationOfHearts
    FreeingCaptives
    Debtors
    InTheCauseOfGod
    TheWayfarer
}

model User {
  id                String         @id @default(uuid())
  email             String         @unique
  fiqh              Fiqh           @default(GENERAL)
  baseCurrency      Currency       @default(USD)
  nisabStandard     NisabStandard  @default(SILVER)
  hawlStartDate     DateTime
  assets            Asset[]
  liabilities       Liability[]
  payments          Payment[]
  periods           ZakaatPeriod[]
  createdAt         DateTime       @default(now())
}

model Asset {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  category        AssetCategory
  name            String
  weightGrams     Decimal?      @db.Decimal(10, 4)
  purityKarat     Int?          // 18, 21, 22, 24
  cashValue       Decimal?      @db.Decimal(15, 2)
  isInvestment    Boolean       @default(false)
  hasPossession   Boolean       @default(true) // For Pakistan Plot Files
  stockType       String?       // "TRADER" or "PASSIVE"
  currencyCode    Currency?
  createdAt       DateTime      @default(now())
}

model Liability {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  type            String   // "IMMEDIATE" or "LONG_TERM"
  amount          Decimal  @db.Decimal(15, 2)
  monthlyPayment  Decimal? @db.Decimal(15, 2)
  description     String?
}

model Payment {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  amount          Decimal  @db.Decimal(15, 2)
  category        MasarifCategory
  recipient       String?
  paidAt          DateTime @default(now())
}

model ZakaatPeriod {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  startDate       DateTime
  status          String   @default("ACTIVE") // "ACTIVE" or "CLOSED"
  status          String   @default("ACTIVE") // "ACTIVE" or "CLOSED"
  totalDue        Decimal  @default(0) @db.Decimal(15, 2)
}

model DailyMetalRate {
  id           String        @id @default(uuid())
  metal        AssetCategory // GOLD, SILVER
  currency     Currency
  date         DateTime      @db.Date
  pricePerGram Decimal       @db.Decimal(10, 4)

  @@unique([metal, currency, date])
}

model DailyExchangeRate {
  id             String   @id @default(uuid())
  sourceCurrency Currency // e.g. USD
  targetCurrency Currency // e.g. PKR
  date           DateTime @db.Date
  rate           Decimal  @db.Decimal(10, 4)

  @@unique([sourceCurrency, targetCurrency, date])
}
```

---

## **4. Fiqh Calculation Logic (Strategy Pattern)**

### **4.1 Core Strategy Interface**

TypeScript

```typescript
export interface IFiqhStrategy {
  calculateGold(asset: Asset, marketPricePerGram: number): number;
  calculateCash(asset: Asset, exchangeRate: number): number;
  calculateDebtDeduction(liability: Liability): number;
  shouldResetHawl(currentBalance: number, nisab: number): boolean;
}`
```

### **4.2 Rule Implementation Table**

This table provides the logic requirements for the Calculation Engine. Use this as the "Source of Truth" for coding the IFiqhStrategy implementations.

| **Component** | **Hanafi** | **Shafi'i** | **Maliki / Hanbali** | **General (Safe) Mode** |
| --- | --- | --- | --- | --- |
| **Personal Jewelry** | **Taxed:** 100% Market Value. | **Exempt:** $0 (unless for investment). | **Exempt:** $0 (unless for investment). | **Taxed:** 100% Market Value (Safer). |
| **Debt Deduction** | **Full Deduction:** (Immediate + 12 months of long-term). | **No Deduction:** $0 (Pay on assets in hand). | **Conditional:** Deduct only if no fixed assets (house/car) cover it. | **Full Deduction:** (Allows for easier payment). |
| **Retirement (401k)** | **Net Value:** (Total Balance - 30% for Tax/Penalty). | **Net Value:** (Total Balance - 30% for Tax/Penalty). | **Net Value:** (Total Balance - 30% for Tax/Penalty). | **Net Value:** (Total Balance - 30% for Tax/Penalty). |
| **Stocks (Passive)** | **Proxy:** 25% of Market Value. | **Proxy:** 25% of Market Value. | **Proxy:** 25% of Market Value. | **Proxy:** 25% of Market Value. |
| **Stocks (Active)** | **100%** Market Value. | **100%** Market Value. | **100%** Market Value. | **100%** Market Value. |
| **Plot Files** | **Exempt** (until possession is taken). | **Exempt** (until possession is taken). | **Exempt** (until possession is taken). | **Exempt** (until possession is taken). |
| **Hawl (Year)** | **Start/End Rule:** Mid-year dips ignored. | **Continuous:** Resets if balance < Nisab. | **Continuous:** Resets if balance < Nisab. | **Start/End Rule:** Simple annual check. |

---

## **5. API Endpoints (REST)**

### **5.1 Auth & Profile**

- `POST /auth/signup`: Create user and set `fiqh` and `hawlStartDate`.
- `PATCH /user/settings`: Update Fiqh mode or Nisab standard.

### **5.2 Asset Management**

- `GET /assets`: Return itemized list of assets grouped by category.
- `POST /assets`: Add a new asset (Gold, Bank, File, etc.).
- `DELETE /assets/:id`: Remove an asset record.

### **5.3 Calculation & Payments**

- `GET /zakaat/summary`: The most critical endpoint. Returns:JSON

    ```json
    {
      "totalAssets": 10500.00,
      "totalLiabilities": 500.00,
      "netWealth": 10000.00,
      "zakaatDue": 250.00,
      "totalPaid": 100.00,
      "remainingBalance": 150.00,
      "auditTrail": ["Gold taxed per Hanafi rule", "Debt deducted per user request"]
    }
    ```

- `POST /zakaat/payments`: Log a payment with a Qur'anic category.

---

## **6. UI/UX Specifications**

### **6.1 Design Tokens**

- **Primary:** `#0F5132` (Emerald Green)
- **Secondary:** `#FFD700` (Gold)
- **Neutral:** `#F8F9FA` (Off-White/Grey)
- **Typography:** Inter (Sans-Serif)

### **6.2 Key UI Components**

1. **Dashboard Hero:** Progress bar showing `$PAID / $TOTAL_DUE`.
2. **Asset List:** Accordion-style list grouped by "Cash", "Gold", "Investments".
3. **The Fiqh Explainer:** A "Why am I being taxed?" info icon next to every line item that displays the specific fiqh ruling.

---

## **7. Infrastructure & Security**

### **7.1 Security Policy**

- **Data Encryption:** Use Prisma middleware to encrypt sensitive `cashValue` fields if possible, or ensure Supabase TDE (Transparent Data Encryption) is active.
- **Authorization:** Row Level Security (RLS) in PostgreSQL:SQL

    ```sql
    CREATE POLICY "Users can only access their own assets"
    ON assets FOR ALL
    USING (auth.uid() = user_id);
    ```

### **7.2 Cost Optimization (Free Tier Strategy)**

- **Database:** Supabase or Neon Free Tier (500MB is sufficient for ~100k users).
- **Hosting:** Vercel or Cloudflare for API, GitHub Actions for CI/CD.
- **Price Fetching:** Cache Gold rates in-DB for 12 hours to stay within the free limits of MetalPriceAPI.
