# Plan 1 of 5: Monorepo Scaffold and Core Rules Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale scaffold with a fresh pnpm + Turborepo 2 monorepo and deliver `packages/core`: a pure, fully tested TypeScript zakat rules engine (money, units, Hijri, rulesets, valuation, liabilities, hawl, nisab, `calculate()`, structured explanations, citations, golden vectors, property tests) that every later plan consumes.

**Architecture:** `packages/core` has no I/O and no platform dependencies: plain input objects in, plain output objects out, decimal strings everywhere. Rules are data (a registry of rule ids and options) plus versioned rulesets that map mode → default option; `resolveRules()` applies user overrides; valuation modules consult the resolved options and emit `Explanation` entries with rule ids and citation ids. `calculate()` composes valuation → deductions → nisab → hawl → due, rounding once at the end.

**Tech Stack:** pnpm 9, Turborepo 2.11, TypeScript 5.9 (pinned; not 7.x), Vitest 5, fast-check 4, decimal.js 10.6, @umalqura/core 0.0.7, Biome 2 for lint/format.

**Spec:** `docs/superpowers/specs/2026-10-07-zakaat-app-design.md` (sections 3, 4.3, 6, 10 govern this plan).

**Plan sequence:** 1 core engine (this) → 2 device database + price pipeline + Worker → 3 mobile app on local SQLite → 4 Firebase auth and Firestore sync → 5 web calculator, PDF reports, store release.

## Global Constraints

- Package manager `pnpm@9`; Turborepo 2 config uses the `tasks` key, never `pipeline`.
- TypeScript `~5.9.2`, `"strict": true`, `"exactOptionalPropertyTypes": true`, `"noUncheckedIndexedAccess": true`.
- `packages/core` must not import Node built-ins, React, Expo, or Firebase. Only `decimal.js` and `@umalqura/core` at runtime.
- All money and weights are decimal strings (`DecimalString`) at the boundary and `Decimal` inside. Never `number` for money or grams. Never floats in arithmetic.
- Rate is `net / 40`; rounding happens once, on `zakatDue`, with `ROUND_UP` to the currency's minor unit (all seven v1 currencies have 2 decimals).
- Rule ids, option names, mode names and currency codes are exactly as in spec §3.1 and `src/types.ts` below; later plans depend on them.
- No `Co-Authored-By` or "Generated with" lines in commit messages (repo owner's rule). Commit author is the repo-local identity already configured.
- Historical price CSVs are test fixtures only; nothing in `packages/core` reads files.
- The nisab gram constants are exactly: gold 85 / 87.48 g, silver 595 / 612.36 g. Unit constants exactly: tola 11.6638038 g, masha 0.972 g, troy ounce 31.1034768 g.

## Review Focus

Inputs the spec implies that no task originally exercised; each has a test added to the owning task below.

1. **Net wealth exactly equal to nisab** must count as meeting nisab (≥, not >). Test in Task 11.
2. **An asset in a currency with no FX rate in the price table** must throw a typed `MissingRateError` naming the currency, never silently value at zero. Test in Task 8.
3. **A liability larger than gross zakatable wealth** must floor net at zero and produce `zakatDue = "0.00"`, not a negative due. Test in Task 11.
4. **General mode with user overrides** must ignore the overrides (General is defined as maximum-of-opinions and the Advanced screen is disabled for it); `resolveRules('GENERAL', overrides)` returns the General defaults. Test in Task 6.
5. **Hijri anniversary on 30 Dhul-Hijjah in a year where that month has 29 days** must clamp to the last day of the month rather than rolling into Muharram. Test in Task 4.

---

### Task 1: Fresh monorepo scaffold

**Files:**
- Delete: `apps/mobile/`, `apps/api/`, `packages/core/`, `packages/database/`, `packages/types/`, `node_modules/`, `pnpm-lock.yaml`, `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- Move: `packages/database/historical-data/*.csv` → `packages/prices/fixtures/historical/` ; `design_document.md` → `docs/archive/design_document-v1.1.md` ; `mockups/*.png` → `docs/mockups/`
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `.nvmrc`, `.gitignore` (keep existing, add `*.tsbuildinfo`), `README.md`

**Interfaces:**
- Produces: workspace globs `apps/*`, `packages/*`; root scripts `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` that fan out through Turborepo.

- [ ] **Step 1: Remove the stale scaffold and preserve the fixtures and archive**

```bash
cd /Users/waleed.ali/work/zakaat-app
mkdir -p packages/prices/fixtures/historical docs/archive docs/mockups
git mv packages/database/historical-data/*.csv packages/prices/fixtures/historical/
git mv design_document.md docs/archive/design_document-v1.1.md
git mv mockups/*.png docs/mockups/
git rm -r -q apps packages/core packages/database packages/types package.json turbo.json pnpm-workspace.yaml pnpm-lock.yaml
rm -rf node_modules mockups packages/database packages/core packages/types apps
git status --short | head -20
```

Expected: the `docs/`, `.gitignore`, and `packages/prices/fixtures/historical/*.csv` remain; nothing else tracked outside `docs/`.

- [ ] **Step 2: Write the root workspace files**

`package.json`:
```json
{
  "name": "zakaat-app",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^2.6.2",
    "turbo": "^2.11.10",
    "typescript": "~5.9.2"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.2/schema.json",
  "files": { "includes": ["**", "!**/dist", "!**/node_modules", "!**/fixtures/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true, "suspicious": { "noExplicitAny": "error" } } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" } }
}
```

`.nvmrc`:
```
22
```

Append to `.gitignore`:
```
*.tsbuildinfo
```

`README.md`:
```markdown
# Zakaat App

Madhhab-aware Zakat calculator and year-round tracker. See `docs/superpowers/specs/2026-10-07-zakaat-app-design.md`.

## Layout
- `packages/core` — pure rules engine (no I/O). Plan 1.
- `packages/prices` — price file schema and fixtures. Plan 2.
- `apps/api` — Cloudflare Worker. Plan 2.
- `apps/mobile` — Expo app. Plan 3.

## Commands
`pnpm install` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`
```

- [ ] **Step 3: Install and verify Turborepo accepts the config**

Run: `pnpm install && pnpm exec turbo run test --dry-run`
Expected: no "Found `pipeline` field" error; dry run lists zero packages (none exist yet) and exits 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Rebuild monorepo scaffold: pnpm, Turborepo 2, TypeScript 5.9, Biome

Archive the v1.1 design document and mockups under docs/, keep the
historical price CSVs as fixtures under packages/prices."
```

---

### Task 2: `packages/core` package and the money module

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/index.ts`, `packages/core/src/money.ts`
- Test: `packages/core/src/money.test.ts`

**Interfaces:**
- Produces:
  - `type DecimalString = string` (canonical: optional `-`, digits, optional `.digits`; no exponent)
  - `D(value: DecimalString | Decimal): Decimal` — parse, throws `InvalidDecimalError` on non-canonical input
  - `toDS(d: Decimal): DecimalString` — canonical string, no exponent, trailing zeros trimmed except keeps at least `0`
  - `sum(values: Decimal[]): Decimal`
  - `roundUpToMinorUnit(amount: Decimal, currency: Currency): Decimal`
  - `minorUnitDigits(currency: Currency): number` (2 for all v1 currencies)
  - `ZERO: Decimal`, `RATE_DIVISOR: Decimal` (= 40)

- [ ] **Step 1: Create the package files**

`packages/core/package.json`:
```json
{
  "name": "@zakaat/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@umalqura/core": "0.0.7",
    "decimal.js": "^10.6.0"
  },
  "devDependencies": {
    "fast-check": "^4.10.2",
    "typescript": "~5.9.2",
    "vitest": "^5.0.5"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": [] },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/core/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

`packages/core/src/index.ts` (grows in later tasks):
```ts
export * from './money.js';
```

- [ ] **Step 2: Write the failing money tests**

`packages/core/src/money.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { D, InvalidDecimalError, RATE_DIVISOR, ZERO, roundUpToMinorUnit, sum, toDS } from './money.js';

describe('D / toDS', () => {
  it('parses canonical decimal strings exactly', () => {
    expect(toDS(D('1234.5600'))).toBe('1234.56');
    expect(toDS(D('-0.10'))).toBe('-0.1');
    expect(toDS(D('0'))).toBe('0');
    expect(toDS(D('1000000000000.000001'))).toBe('1000000000000.000001');
  });

  it('rejects non-canonical input', () => {
    expect(() => D('1e5')).toThrow(InvalidDecimalError);
    expect(() => D('1,000')).toThrow(InvalidDecimalError);
    expect(() => D('')).toThrow(InvalidDecimalError);
    expect(() => D('abc')).toThrow(InvalidDecimalError);
    expect(() => D('NaN')).toThrow(InvalidDecimalError);
  });

  it('never produces exponent notation', () => {
    expect(toDS(D('0.0000001'))).toBe('0.0000001');
    expect(toDS(D('123456789012345678901234'))).toBe('123456789012345678901234');
  });
});

describe('sum', () => {
  it('adds exactly without float drift', () => {
    expect(toDS(sum([D('0.1'), D('0.2')]))).toBe('0.3');
    expect(toDS(sum([]))).toBe('0');
  });
});

describe('roundUpToMinorUnit', () => {
  it('rounds up (away from zero) to 2 decimals for PKR', () => {
    expect(toDS(roundUpToMinorUnit(D('100.001'), 'PKR'))).toBe('100.01');
    expect(toDS(roundUpToMinorUnit(D('100.00'), 'PKR'))).toBe('100');
    expect(toDS(roundUpToMinorUnit(D('0.0001'), 'USD'))).toBe('0.01');
  });

  it('divides by 40 exactly for the zakat rate', () => {
    expect(toDS(D('1000').div(RATE_DIVISOR))).toBe('25');
    expect(toDS(ZERO.div(RATE_DIVISOR))).toBe('0');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm install && pnpm --filter @zakaat/core test`
Expected: FAIL with "Cannot find module './money.js'".

- [ ] **Step 4: Implement `money.ts`**

```ts
import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -40, toExpPos: 40 });

export type DecimalString = string;
export type Currency = 'USD' | 'PKR' | 'INR' | 'GBP' | 'EUR' | 'AED' | 'SAR';
export const CURRENCIES: readonly Currency[] = ['USD', 'PKR', 'INR', 'GBP', 'EUR', 'AED', 'SAR'];

export class InvalidDecimalError extends Error {
  constructor(value: unknown) {
    super(`Invalid decimal string: ${String(value)}`);
    this.name = 'InvalidDecimalError';
  }
}

const CANONICAL = /^-?\d+(\.\d+)?$/;

export function D(value: DecimalString | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value !== 'string' || !CANONICAL.test(value)) throw new InvalidDecimalError(value);
  return new Decimal(value);
}

export function toDS(d: Decimal): DecimalString {
  return d.toFixed().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export const ZERO = new Decimal(0);
export const RATE_DIVISOR = new Decimal(40);

export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

const MINOR_UNIT_DIGITS: Record<Currency, number> = {
  USD: 2, PKR: 2, INR: 2, GBP: 2, EUR: 2, AED: 2, SAR: 2,
};

export function minorUnitDigits(currency: Currency): number {
  return MINOR_UNIT_DIGITS[currency];
}

export function roundUpToMinorUnit(amount: Decimal, currency: Currency): Decimal {
  return amount.toDecimalPlaces(minorUnitDigits(currency), Decimal.ROUND_UP);
}

export { Decimal };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @zakaat/core test`
Expected: PASS (all money tests).

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm --filter @zakaat/core typecheck
git add packages/core pnpm-lock.yaml
git commit -m "core: add package skeleton and exact money helpers"
```

---

### Task 3: Units module (weights and purity)

**Files:**
- Create: `packages/core/src/units.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './units.js';`)
- Test: `packages/core/src/units.test.ts`

**Interfaces:**
- Produces:
  - `type WeightUnit = 'G' | 'TOLA' | 'MASHA' | 'OZT'`
  - `GRAMS_PER: Record<WeightUnit, Decimal>` with exact constants
  - `toGrams(value: Decimal, unit: WeightUnit): Decimal`
  - `karatToPurity(karat: number): Decimal` (karat/24; throws `RangeError` outside 1..24)
  - `permilleToPurity(permille: number): Decimal` (permille/1000; throws outside 1..1000)

- [ ] **Step 1: Write the failing tests**

`packages/core/src/units.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { D, toDS } from './money.js';
import { GRAMS_PER, karatToPurity, permilleToPurity, toGrams } from './units.js';

describe('units', () => {
  it('uses the exact spec constants', () => {
    expect(toDS(GRAMS_PER.TOLA)).toBe('11.6638038');
    expect(toDS(GRAMS_PER.MASHA)).toBe('0.972');
    expect(toDS(GRAMS_PER.OZT)).toBe('31.1034768');
    expect(toDS(GRAMS_PER.G)).toBe('1');
  });

  it('converts tola and masha to grams exactly', () => {
    expect(toDS(toGrams(D('1'), 'TOLA'))).toBe('11.6638038');
    expect(toDS(toGrams(D('12'), 'MASHA'))).toBe('11.664');
    expect(toDS(toGrams(D('2.5'), 'OZT'))).toBe('77.758692');
  });

  it('maps karat and permille to purity fractions', () => {
    expect(toDS(karatToPurity(24))).toBe('1');
    expect(toDS(karatToPurity(22))).toBe('0.9166666666666666666666666666666666666667');
    expect(toDS(karatToPurity(18))).toBe('0.75');
    expect(toDS(permilleToPurity(925))).toBe('0.925');
    expect(() => karatToPurity(25)).toThrow(RangeError);
    expect(() => karatToPurity(0)).toThrow(RangeError);
    expect(() => permilleToPurity(1001)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- units`
Expected: FAIL with "Cannot find module './units.js'".

- [ ] **Step 3: Implement `units.ts`**

```ts
import { D, Decimal } from './money.js';

export type WeightUnit = 'G' | 'TOLA' | 'MASHA' | 'OZT';

export const GRAMS_PER: Record<WeightUnit, Decimal> = {
  G: D('1'),
  TOLA: D('11.6638038'),
  MASHA: D('0.972'),
  OZT: D('31.1034768'),
};

export function toGrams(value: Decimal, unit: WeightUnit): Decimal {
  return value.mul(GRAMS_PER[unit]);
}

export function karatToPurity(karat: number): Decimal {
  if (!Number.isInteger(karat) || karat < 1 || karat > 24) throw new RangeError(`karat out of range: ${karat}`);
  return new Decimal(karat).div(24);
}

export function permilleToPurity(permille: number): Decimal {
  if (!Number.isInteger(permille) || permille < 1 || permille > 1000) throw new RangeError(`permille out of range: ${permille}`);
  return new Decimal(permille).div(1000);
}
```

Add to `index.ts`: `export * from './units.js';`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @zakaat/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add weight unit and purity conversions"
```

---

### Task 4: Hijri module

**Files:**
- Create: `packages/core/src/hijri.ts`
- Modify: `packages/core/src/index.ts` (add `export * from './hijri.js';`)
- Test: `packages/core/src/hijri.test.ts`

**Interfaces:**
- Produces:
  - `type HijriDate = { hy: number; hm: number; hd: number }`
  - `type ISODate = string` (`YYYY-MM-DD`)
  - `toISODate(d: Date): ISODate` (local calendar fields)
  - `fromISODate(s: ISODate): Date` (local midnight; throws `RangeError` on bad format)
  - `gregorianToHijri(iso: ISODate, offsetDays?: number): HijriDate` — `offsetDays` shifts the Gregorian date before conversion (−2..+2) to model local sighting
  - `hijriToGregorian(h: HijriDate, offsetDays?: number): ISODate`
  - `daysInHijriMonth(hy: number, hm: number): number`
  - `addHijriYears(h: HijriDate, years: number): HijriDate` — clamps `hd` to the target month length
  - `nextAnniversary(anniversary: HijriDate, fromISO: ISODate, offsetDays?: number): ISODate` — first occurrence of the anniversary's `hm/hd` strictly after `fromISO`
  - `periodEnd(startISO: ISODate, offsetDays?: number): ISODate` — the day before the same Hijri date one year later

- [ ] **Step 1: Write the failing tests**

`packages/core/src/hijri.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  addHijriYears, daysInHijriMonth, fromISODate, gregorianToHijri, hijriToGregorian,
  nextAnniversary, periodEnd, toISODate,
} from './hijri.js';

describe('iso helpers', () => {
  it('round-trips ISO dates', () => {
    expect(toISODate(fromISODate('2019-07-03'))).toBe('2019-07-03');
    expect(() => fromISODate('03/07/2019')).toThrow(RangeError);
  });
});

describe('gregorian <-> hijri (Umm al-Qura)', () => {
  it('matches the @umalqura/core documented anchor: 2019-07-03 = 1440-10-30', () => {
    expect(gregorianToHijri('2019-07-03')).toEqual({ hy: 1440, hm: 10, hd: 30 });
    expect(hijriToGregorian({ hy: 1440, hm: 10, hd: 30 })).toBe('2019-07-03');
  });

  it('applies a sighting offset in days', () => {
    // offset +1 means the local community is one day behind Umm al-Qura
    expect(gregorianToHijri('2019-07-03', 1)).toEqual({ hy: 1440, hm: 10, hd: 29 });
    expect(hijriToGregorian({ hy: 1440, hm: 10, hd: 30 }, 1)).toBe('2019-07-04');
  });

  it('round-trips every day of a year', () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(2024, 0, 1);
      d.setDate(d.getDate() + i);
      const iso = toISODate(d);
      expect(hijriToGregorian(gregorianToHijri(iso))).toBe(iso);
    }
  });
});

describe('year arithmetic', () => {
  it('adds hijri years and clamps the day to the month length', () => {
    expect(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1).hy).toBe(1441);
    const len = daysInHijriMonth(1441, 10);
    expect(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1).hd).toBe(Math.min(30, len));
  });

  it('clamps a 30 Dhul-Hijjah anniversary to 29 in a short year rather than rolling into Muharram', () => {
    // find a year where month 12 has 29 days
    let hy = 1440;
    while (daysInHijriMonth(hy, 12) !== 29) hy++;
    const prev = hy - 1;
    while (daysInHijriMonth(prev, 12) !== 30) throw new Error('fixture assumption failed');
    const r = addHijriYears({ hy: prev, hm: 12, hd: 30 }, 1);
    expect(r).toEqual({ hy, hm: 12, hd: 29 });
  });

  it('computes the next anniversary strictly after a date', () => {
    const next = nextAnniversary({ hy: 1440, hm: 9, hd: 1 }, '2019-07-03');
    expect(gregorianToHijri(next)).toEqual({ hy: 1441, hm: 9, hd: 1 });
    const same = nextAnniversary({ hy: 1440, hm: 10, hd: 30 }, '2019-07-02');
    expect(same).toBe('2019-07-03');
  });

  it('computes period end as the day before the next same hijri date', () => {
    const end = periodEnd('2019-07-03');
    const next = hijriToGregorian(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1));
    const expected = new Date(fromISODate(next));
    expected.setDate(expected.getDate() - 1);
    expect(end).toBe(toISODate(expected));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- hijri`
Expected: FAIL with "Cannot find module './hijri.js'".

- [ ] **Step 3: Implement `hijri.ts`**

```ts
import uq from '@umalqura/core';

export type HijriDate = { hy: number; hm: number; hd: number };
export type ISODate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function fromISODate(s: ISODate): Date {
  const m = ISO.exec(s);
  if (!m) throw new RangeError(`Not an ISO date: ${s}`);
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date: ${s}`);
  return date;
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shift(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function gregorianToHijri(iso: ISODate, offsetDays = 0): HijriDate {
  const u = uq(shift(fromISODate(iso), -offsetDays));
  return { hy: u.hy, hm: u.hm, hd: u.hd };
}

export function hijriToGregorian(h: HijriDate, offsetDays = 0): ISODate {
  return toISODate(shift(uq(h.hy, h.hm, h.hd).date, offsetDays));
}

export function daysInHijriMonth(hy: number, hm: number): number {
  return uq(hy, hm, 1).daysInMonth;
}

export function addHijriYears(h: HijriDate, years: number): HijriDate {
  const hy = h.hy + years;
  const hd = Math.min(h.hd, daysInHijriMonth(hy, h.hm));
  return { hy, hm: h.hm, hd };
}

export function nextAnniversary(anniversary: HijriDate, fromISO: ISODate, offsetDays = 0): ISODate {
  const from = gregorianToHijri(fromISO, offsetDays);
  let candidate: HijriDate = { hy: from.hy, hm: anniversary.hm, hd: anniversary.hd };
  candidate = addHijriYears(candidate, 0);
  const candidateISO = hijriToGregorian(candidate, offsetDays);
  if (candidateISO > fromISO) return candidateISO;
  return hijriToGregorian(addHijriYears(candidate, 1), offsetDays);
}

export function periodEnd(startISO: ISODate, offsetDays = 0): ISODate {
  const start = gregorianToHijri(startISO, offsetDays);
  const nextStart = hijriToGregorian(addHijriYears(start, 1), offsetDays);
  return toISODate(shift(fromISODate(nextStart), -1));
}
```

Add to `index.ts`: `export * from './hijri.js';`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @zakaat/core test`
Expected: PASS. If the "short year" fixture search throws, widen the search loop start year; the Umm al-Qura table has 29-day Dhul-Hijjah years within a few years of 1440.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add Umm al-Qura hijri conversions and anniversary arithmetic"
```

---

### Task 5: Domain types and the rule registry

**Files:**
- Create: `packages/core/src/types.ts`, `packages/core/src/rules/registry.ts`, `packages/core/src/version.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/rules/registry.test.ts`

**Interfaces:**
- Produces (used verbatim by every later task and by Plans 2–5):

`packages/core/src/version.ts`:
```ts
export const ENGINE_VERSION = '0.1.0';
```

`packages/core/src/rules/registry.ts`:
```ts
export const RULES = {
  NISAB_METAL: { options: ['SILVER', 'GOLD'], overridable: true },
  NISAB_GRAMS: { options: ['STD_85_595', 'STD_87_612', 'LOWER_VALUE'], overridable: true },
  NISAB_COMBINE_METALS: { options: ['COMBINE', 'SEPARATE'], overridable: true },
  HAWL_MODEL: { options: ['START_END', 'CONTINUOUS'], overridable: false },
  HAWL_NEW_WEALTH: { options: ['ANNEX', 'ANNEX_LABEL_ADVANCE'], overridable: false },
  JEWELLERY_PERSONAL: { options: ['ZAKATABLE', 'EXEMPT_IF_WORN'], overridable: true },
  DEBT_DEDUCTION_SCOPE: { options: ['NONE', 'DUE_INSTALMENT', 'TWELVE_MONTHS', 'FULL'], overridable: true },
  DEBT_SURPLUS_OFFSET: { options: ['OFF', 'ON'], overridable: true },
  RECEIVABLE_TIMING: { options: ['YEARLY_IF_STRONG', 'YEARLY_ALL', 'ON_RECEIPT'], overridable: true },
  RETIREMENT_METHOD: {
    options: ['FULL_VESTED', 'NET_WITHDRAWABLE', 'ZAKATABLE_PROPORTION', 'NONE_UNTIL_ACCESS', 'COMPULSORY_DEFERRED_VOLUNTARY_YEARLY'],
    overridable: true,
  },
  STOCK_PASSIVE_METHOD: { options: ['PROXY_25', 'PROXY_30', 'FULL_MARKET_VALUE', 'DIVIDENDS_ONLY'], overridable: true },
  RENTAL_METHOD: { options: ['SAVED_RENT', 'QARADAWI_NET_RENT_10', 'HIGHER'], overridable: true },
  PLOT_FILE: { options: ['FROM_PURCHASE', 'FROM_POSSESSION'], overridable: true },
  ADVANCE_PAYMENT: { options: ['ALLOWED', 'ALLOWED_ONE_YEAR', 'ALLOWED_TWO_YEARS', 'RESTRICTED'], overridable: false },
  QADA_PRIOR_UNPAID: { options: ['DEDUCT', 'NO_DEDUCT'], overridable: true },
} as const;

export type RuleId = keyof typeof RULES;
export type RuleOption<R extends RuleId> = (typeof RULES)[R]['options'][number];
export type RuleSelection = { readonly [R in RuleId]: RuleOption<R> };
export const RULE_IDS = Object.keys(RULES) as RuleId[];

export function isOption<R extends RuleId>(ruleId: R, value: unknown): value is RuleOption<R> {
  return (RULES[ruleId].options as readonly string[]).includes(value as string);
}
```

`packages/core/src/types.ts`:
```ts
import type { Currency, DecimalString } from './money.js';
import type { ISODate } from './hijri.js';
import type { RuleId, RuleSelection } from './rules/registry.js';

export type Mode = 'HANAFI' | 'SHAFII' | 'MALIKI' | 'HANBALI' | 'GENERAL';
export const MODES: readonly Mode[] = ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI', 'GENERAL'];

export type Metal = 'XAU' | 'XAG';
export type NisabMetal = 'SILVER' | 'GOLD';
export type NisabStandard = 'STD_85_595' | 'STD_87_612';

export const NISAB_GRAMS: Record<NisabMetal, Record<NisabStandard, DecimalString>> = {
  GOLD: { STD_85_595: '85', STD_87_612: '87.48' },
  SILVER: { STD_85_595: '595', STD_87_612: '612.36' },
};

export type PriceTable = {
  asOf: ISODate;
  /** price of one gram of pure metal, keyed by quote currency */
  perGram: Record<Metal, Partial<Record<Currency, DecimalString>>>;
  /** units of each currency per 1 USD; USD itself is '1' */
  fx: { USD: Partial<Record<Currency, DecimalString>> };
  fileHash?: string;
};

export type JewelleryUsage = 'WORN' | 'STORED' | 'INVESTMENT' | 'MENS';
export type StockIntent = 'TRADING' | 'PASSIVE';
export type RealEstateType = 'HOME' | 'RENTAL' | 'LAND_RESALE' | 'PLOT_FILE';
export type ReceivableStrength = 'STRONG' | 'WEAK';

type AssetBase = { id: string; label: string; currency: Currency };

export type MoneyAsset = AssetBase & {
  category: 'CASH' | 'BANK' | 'FOREIGN_CURRENCY' | 'OTHER';
  amount: DecimalString;
};
export type MetalAsset = AssetBase & {
  category: 'GOLD' | 'SILVER';
  weightGrams: DecimalString;
  /** fraction 0..1, e.g. 22k = 22/24 */
  purity: DecimalString;
  usage: JewelleryUsage;
  excessive?: boolean;
};
export type StockAsset = AssetBase & {
  category: 'STOCK';
  marketValue: DecimalString;
  intent: StockIntent;
  /** user-supplied zakatable-asset ratio 0..100; overrides the mode's proxy when present */
  proxyPercent?: DecimalString;
  dividendsReceived?: DecimalString;
};
export type RetirementAsset = AssetBase & {
  category: 'RETIREMENT';
  vestedBalance: DecimalString;
  accessible: boolean;
  taxPercent: DecimalString;
  penaltyPercent: DecimalString;
  /** share 0..100 of the balance that came from voluntary contributions */
  voluntaryPercent: DecimalString;
  zakatableProportionPercent?: DecimalString;
};
export type RealEstateAsset = AssetBase & {
  category: 'REAL_ESTATE';
  type: RealEstateType;
  marketValue: DecimalString;
  savedRent?: DecimalString;
  netAnnualRent?: DecimalString;
  specificPlot?: boolean;
  resaleIntentAtPurchase?: boolean;
  possessionTaken?: boolean;
  amountPaid?: DecimalString;
};
export type ReceivableAsset = AssetBase & {
  category: 'RECEIVABLE';
  amount: DecimalString;
  strength: ReceivableStrength;
};
export type AssetInput = MoneyAsset | MetalAsset | StockAsset | RetirementAsset | RealEstateAsset | ReceivableAsset;
export type AssetCategory = AssetInput['category'];

export type LiabilityInput = {
  id: string;
  label: string;
  kind: 'IMMEDIATE' | 'LONG_TERM';
  currency: Currency;
  totalOutstanding: DecimalString;
  /** the instalment or arrears presently payable */
  currentlyDue: DecimalString;
  /** principal + interest falling due in the next 12 lunar months */
  dueWithinYear: DecimalString;
  interestWithinYear: DecimalString;
};

export type HawlInput = {
  startISO: ISODate;
  closeISO: ISODate;
  /** continuous modes: did wealth fall below nisab during the year? */
  dipBelowNisab?: 'NO' | 'YES';
  /** start/end modes: did wealth fall to zero or basic needs during the year? */
  wealthHitZero?: 'NO' | 'YES';
  /** when the answer above is YES: the date nisab was regained */
  regainedISO?: ISODate;
};

export type CalculationInput = {
  mode: Mode;
  baseCurrency: Currency;
  overrides?: Partial<RuleSelection>;
  assets: readonly AssetInput[];
  liabilities: readonly LiabilityInput[];
  /** base currency; value of surplus non-zakatable assets beyond basic needs (Maliki/Hanbali offset) */
  surplusNonZakatableAssets?: DecimalString;
  /** base currency; zakat from earlier years still unpaid */
  priorUnpaidZakat?: DecimalString;
  hawl: HawlInput;
  prices: PriceTable;
  hijriOffsetDays?: number;
};

export type Effect = 'INCLUDE' | 'EXCLUDE' | 'PARTIAL' | 'DEDUCT' | 'INFO' | 'WARNING';

export type Explanation = {
  ruleId: RuleId | 'FIXED';
  option: string;
  mode: Mode;
  subjectId: string;
  inputs: Record<string, string>;
  output: DecimalString;
  effect: Effect;
  citationIds: readonly string[];
  messageKey: string;
};

export type AssetLine = {
  assetId: string;
  category: AssetCategory;
  label: string;
  baseValue: DecimalString;
  zakatableValue: DecimalString;
  effect: Effect;
};

export type NisabBreakdown = {
  silver: Record<NisabStandard, DecimalString>;
  gold: Record<NisabStandard, DecimalString>;
  applicable: { metal: NisabMetal; standard: NisabStandard; value: DecimalString };
};

export type HawlStatus = 'DUE' | 'BROKEN' | 'RESET';

export type CalculationOutput = {
  engineVersion: string;
  rulesetId: string;
  mode: Mode;
  baseCurrency: Currency;
  effectiveRules: RuleSelection;
  lines: readonly AssetLine[];
  grossZakatable: DecimalString;
  deductions: DecimalString;
  net: DecimalString;
  nisab: NisabBreakdown;
  meetsNisab: boolean;
  hawlStatus: HawlStatus;
  zakatDue: DecimalString;
  explanations: readonly Explanation[];
};
```

- [ ] **Step 1: Write the failing registry test**

`packages/core/src/rules/registry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RULES, RULE_IDS, isOption } from './registry.js';

describe('rule registry', () => {
  it('has the 15 spec rule ids', () => {
    expect(RULE_IDS).toEqual([
      'NISAB_METAL', 'NISAB_GRAMS', 'NISAB_COMBINE_METALS', 'HAWL_MODEL', 'HAWL_NEW_WEALTH',
      'JEWELLERY_PERSONAL', 'DEBT_DEDUCTION_SCOPE', 'DEBT_SURPLUS_OFFSET', 'RECEIVABLE_TIMING',
      'RETIREMENT_METHOD', 'STOCK_PASSIVE_METHOD', 'RENTAL_METHOD', 'PLOT_FILE', 'ADVANCE_PAYMENT',
      'QADA_PRIOR_UNPAID',
    ]);
  });

  it('every rule has at least two distinct options', () => {
    for (const id of RULE_IDS) {
      const opts = RULES[id].options;
      expect(opts.length).toBeGreaterThanOrEqual(2);
      expect(new Set(opts).size).toBe(opts.length);
    }
  });

  it('isOption guards values', () => {
    expect(isOption('NISAB_METAL', 'SILVER')).toBe(true);
    expect(isOption('NISAB_METAL', 'PLATINUM')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- registry`
Expected: FAIL with "Cannot find module './registry.js'".

- [ ] **Step 3: Create `version.ts`, `rules/registry.ts`, `types.ts` exactly as in Interfaces above, and export them**

Add to `index.ts`:
```ts
export * from './version.js';
export * from './rules/registry.js';
export * from './types.js';
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add domain types, rule registry and engine version"
```

---

### Task 6: Rulesets and `resolveRules`

**Files:**
- Create: `packages/core/src/rulesets/hanafi.ts`, `shafii.ts`, `maliki.ts`, `hanbali.ts`, `general.ts`, `packages/core/src/rulesets/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/rulesets/rulesets.test.ts`

**Interfaces:**
- Produces:
  - `type Ruleset = { id: string; mode: Mode; version: string; defaults: RuleSelection; overridable: readonly RuleId[] }`
  - `RULESETS: Record<Mode, Ruleset>` (current versions)
  - `getRuleset(mode: Mode): Ruleset`
  - `resolveRules(mode: Mode, overrides?: Partial<RuleSelection>): { rulesetId: string; rules: RuleSelection; appliedOverrides: RuleId[] }` — applies only overridable rules with valid options; General ignores all overrides.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/rulesets/rulesets.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RULES, RULE_IDS, isOption } from '../rules/registry.js';
import { MODES } from '../types.js';
import { RULESETS, getRuleset, resolveRules } from './index.js';

describe('rulesets', () => {
  it('every mode has a valid default for every rule', () => {
    for (const mode of MODES) {
      const rs = getRuleset(mode);
      expect(rs.mode).toBe(mode);
      expect(rs.id).toBe(`${mode.toLowerCase()}@2026.1`);
      for (const id of RULE_IDS) expect(isOption(id, rs.defaults[id])).toBe(true);
    }
  });

  it('pins the spec defaults that matter most', () => {
    expect(RULESETS.HANAFI.defaults.JEWELLERY_PERSONAL).toBe('ZAKATABLE');
    expect(RULESETS.SHAFII.defaults.JEWELLERY_PERSONAL).toBe('EXEMPT_IF_WORN');
    expect(RULESETS.SHAFII.defaults.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(RULESETS.MALIKI.defaults.HAWL_MODEL).toBe('CONTINUOUS');
    expect(RULESETS.MALIKI.defaults.DEBT_SURPLUS_OFFSET).toBe('ON');
    expect(RULESETS.HANBALI.defaults.NISAB_COMBINE_METALS).toBe('SEPARATE');
    expect(RULESETS.HANAFI.defaults.NISAB_GRAMS).toBe('STD_87_612');
    expect(RULESETS.GENERAL.defaults.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(RULESETS.GENERAL.defaults.STOCK_PASSIVE_METHOD).toBe('FULL_MARKET_VALUE');
    expect(RULESETS.GENERAL.defaults.HAWL_MODEL).toBe('START_END');
    expect(RULESETS.MALIKI.defaults.ADVANCE_PAYMENT).toBe('RESTRICTED');
  });

  it('applies overridable overrides and ignores invalid or non-overridable ones', () => {
    const r = resolveRules('HANAFI', {
      JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
      HAWL_MODEL: 'CONTINUOUS',
      NISAB_METAL: 'PLATINUM' as never,
    });
    expect(r.rules.JEWELLERY_PERSONAL).toBe('EXEMPT_IF_WORN');
    expect(r.rules.HAWL_MODEL).toBe('START_END');
    expect(r.rules.NISAB_METAL).toBe('SILVER');
    expect(r.appliedOverrides).toEqual(['JEWELLERY_PERSONAL']);
    expect(r.rulesetId).toBe('hanafi@2026.1');
  });

  it('GENERAL ignores every override', () => {
    const r = resolveRules('GENERAL', { DEBT_DEDUCTION_SCOPE: 'FULL', JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN' });
    expect(r.rules.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(r.rules.JEWELLERY_PERSONAL).toBe('ZAKATABLE');
    expect(r.appliedOverrides).toEqual([]);
  });

  it('overridable lists match the registry', () => {
    for (const mode of MODES) {
      const rs = getRuleset(mode);
      const fromRegistry = RULE_IDS.filter((id) => RULES[id].overridable);
      expect(rs.overridable).toEqual(mode === 'GENERAL' ? [] : fromRegistry);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- rulesets`
Expected: FAIL with "Cannot find module './index.js'".

- [ ] **Step 3: Implement the rulesets**

`packages/core/src/rulesets/hanafi.ts`:
```ts
import type { RuleSelection } from '../rules/registry.js';

export const HANAFI_2026_1: RuleSelection = {
  NISAB_METAL: 'SILVER',
  NISAB_GRAMS: 'STD_87_612',
  NISAB_COMBINE_METALS: 'COMBINE',
  HAWL_MODEL: 'START_END',
  HAWL_NEW_WEALTH: 'ANNEX',
  JEWELLERY_PERSONAL: 'ZAKATABLE',
  DEBT_DEDUCTION_SCOPE: 'TWELVE_MONTHS',
  DEBT_SURPLUS_OFFSET: 'OFF',
  RECEIVABLE_TIMING: 'YEARLY_IF_STRONG',
  RETIREMENT_METHOD: 'COMPULSORY_DEFERRED_VOLUNTARY_YEARLY',
  STOCK_PASSIVE_METHOD: 'PROXY_30',
  RENTAL_METHOD: 'SAVED_RENT',
  PLOT_FILE: 'FROM_PURCHASE',
  ADVANCE_PAYMENT: 'ALLOWED',
  QADA_PRIOR_UNPAID: 'DEDUCT',
};
```

`packages/core/src/rulesets/shafii.ts`:
```ts
import type { RuleSelection } from '../rules/registry.js';

export const SHAFII_2026_1: RuleSelection = {
  NISAB_METAL: 'GOLD',
  NISAB_GRAMS: 'STD_85_595',
  NISAB_COMBINE_METALS: 'SEPARATE',
  HAWL_MODEL: 'CONTINUOUS',
  HAWL_NEW_WEALTH: 'ANNEX_LABEL_ADVANCE',
  JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
  DEBT_DEDUCTION_SCOPE: 'NONE',
  DEBT_SURPLUS_OFFSET: 'OFF',
  RECEIVABLE_TIMING: 'YEARLY_IF_STRONG',
  RETIREMENT_METHOD: 'NONE_UNTIL_ACCESS',
  STOCK_PASSIVE_METHOD: 'PROXY_30',
  RENTAL_METHOD: 'SAVED_RENT',
  PLOT_FILE: 'FROM_PURCHASE',
  ADVANCE_PAYMENT: 'ALLOWED_ONE_YEAR',
  QADA_PRIOR_UNPAID: 'NO_DEDUCT',
};
```

`packages/core/src/rulesets/maliki.ts`:
```ts
import type { RuleSelection } from '../rules/registry.js';

export const MALIKI_2026_1: RuleSelection = {
  NISAB_METAL: 'GOLD',
  NISAB_GRAMS: 'STD_85_595',
  NISAB_COMBINE_METALS: 'COMBINE',
  HAWL_MODEL: 'CONTINUOUS',
  HAWL_NEW_WEALTH: 'ANNEX_LABEL_ADVANCE',
  JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
  DEBT_DEDUCTION_SCOPE: 'TWELVE_MONTHS',
  DEBT_SURPLUS_OFFSET: 'ON',
  RECEIVABLE_TIMING: 'YEARLY_IF_STRONG',
  RETIREMENT_METHOD: 'NET_WITHDRAWABLE',
  STOCK_PASSIVE_METHOD: 'PROXY_30',
  RENTAL_METHOD: 'SAVED_RENT',
  PLOT_FILE: 'FROM_PURCHASE',
  ADVANCE_PAYMENT: 'RESTRICTED',
  QADA_PRIOR_UNPAID: 'NO_DEDUCT',
};
```

`packages/core/src/rulesets/hanbali.ts`:
```ts
import type { RuleSelection } from '../rules/registry.js';

export const HANBALI_2026_1: RuleSelection = {
  NISAB_METAL: 'GOLD',
  NISAB_GRAMS: 'STD_85_595',
  NISAB_COMBINE_METALS: 'SEPARATE',
  HAWL_MODEL: 'CONTINUOUS',
  HAWL_NEW_WEALTH: 'ANNEX_LABEL_ADVANCE',
  JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
  DEBT_DEDUCTION_SCOPE: 'TWELVE_MONTHS',
  DEBT_SURPLUS_OFFSET: 'ON',
  RECEIVABLE_TIMING: 'YEARLY_IF_STRONG',
  RETIREMENT_METHOD: 'NONE_UNTIL_ACCESS',
  STOCK_PASSIVE_METHOD: 'PROXY_30',
  RENTAL_METHOD: 'SAVED_RENT',
  PLOT_FILE: 'FROM_PURCHASE',
  ADVANCE_PAYMENT: 'ALLOWED_TWO_YEARS',
  QADA_PRIOR_UNPAID: 'NO_DEDUCT',
};
```

`packages/core/src/rulesets/general.ts`:
```ts
import type { RuleSelection } from '../rules/registry.js';

/** Precaution (ihtiyat): the option yielding the most zakat on every contested rule. */
export const GENERAL_2026_1: RuleSelection = {
  NISAB_METAL: 'SILVER',
  NISAB_GRAMS: 'LOWER_VALUE',
  NISAB_COMBINE_METALS: 'COMBINE',
  HAWL_MODEL: 'START_END',
  HAWL_NEW_WEALTH: 'ANNEX',
  JEWELLERY_PERSONAL: 'ZAKATABLE',
  DEBT_DEDUCTION_SCOPE: 'NONE',
  DEBT_SURPLUS_OFFSET: 'OFF',
  RECEIVABLE_TIMING: 'YEARLY_ALL',
  RETIREMENT_METHOD: 'FULL_VESTED',
  STOCK_PASSIVE_METHOD: 'FULL_MARKET_VALUE',
  RENTAL_METHOD: 'HIGHER',
  PLOT_FILE: 'FROM_PURCHASE',
  ADVANCE_PAYMENT: 'ALLOWED',
  QADA_PRIOR_UNPAID: 'NO_DEDUCT',
};
```

`packages/core/src/rulesets/index.ts`:
```ts
import { RULES, RULE_IDS, isOption, type RuleId, type RuleSelection } from '../rules/registry.js';
import type { Mode } from '../types.js';
import { GENERAL_2026_1 } from './general.js';
import { HANAFI_2026_1 } from './hanafi.js';
import { HANBALI_2026_1 } from './hanbali.js';
import { MALIKI_2026_1 } from './maliki.js';
import { SHAFII_2026_1 } from './shafii.js';

export type Ruleset = {
  id: string;
  mode: Mode;
  version: string;
  defaults: RuleSelection;
  overridable: readonly RuleId[];
};

const OVERRIDABLE = RULE_IDS.filter((id) => RULES[id].overridable);

function make(mode: Mode, version: string, defaults: RuleSelection): Ruleset {
  return {
    id: `${mode.toLowerCase()}@${version}`,
    mode,
    version,
    defaults,
    overridable: mode === 'GENERAL' ? [] : OVERRIDABLE,
  };
}

export const RULESETS: Record<Mode, Ruleset> = {
  HANAFI: make('HANAFI', '2026.1', HANAFI_2026_1),
  SHAFII: make('SHAFII', '2026.1', SHAFII_2026_1),
  MALIKI: make('MALIKI', '2026.1', MALIKI_2026_1),
  HANBALI: make('HANBALI', '2026.1', HANBALI_2026_1),
  GENERAL: make('GENERAL', '2026.1', GENERAL_2026_1),
};

export function getRuleset(mode: Mode): Ruleset {
  return RULESETS[mode];
}

export function resolveRules(
  mode: Mode,
  overrides?: Partial<RuleSelection>,
): { rulesetId: string; rules: RuleSelection; appliedOverrides: RuleId[] } {
  const rs = getRuleset(mode);
  const rules: Record<string, string> = { ...rs.defaults };
  const applied: RuleId[] = [];
  if (overrides) {
    for (const id of rs.overridable) {
      const value = overrides[id];
      if (value !== undefined && isOption(id, value)) {
        rules[id] = value;
        applied.push(id);
      }
    }
  }
  return { rulesetId: rs.id, rules: rules as unknown as RuleSelection, appliedOverrides: applied };
}
```

Add to `index.ts`: `export * from './rulesets/index.js';`

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add versioned rulesets per mode and resolveRules"
```

---

### Task 7: Prices, FX conversion and nisab

**Files:**
- Create: `packages/core/src/prices.ts`, `packages/core/src/nisab.ts`, `packages/core/src/testing/fixtures.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/prices.test.ts`, `packages/core/src/nisab.test.ts`

**Interfaces:**
- Produces:
  - `class MissingRateError extends Error { kind: 'FX' | 'METAL'; symbol: string; currency: Currency }`
  - `fxToBase(amount: Decimal, from: Currency, base: Currency, prices: PriceTable): Decimal`
  - `metalPricePerGram(metal: Metal, base: Currency, prices: PriceTable): Decimal` — direct quote in base if present, else USD quote × fx
  - `computeNisab(rules: RuleSelection, base: Currency, prices: PriceTable): NisabBreakdown`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/testing/fixtures.ts` (shared by every later test; not exported from the package index):
```ts
import type { PriceTable } from '../types.js';

export const PRICES: PriceTable = {
  asOf: '2026-10-01',
  perGram: { XAU: { USD: '100' }, XAG: { USD: '1', PKR: '280' } },
  fx: { USD: { USD: '1', PKR: '280', GBP: '0.8' } },
};
```

`packages/core/src/prices.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { D, toDS } from './money.js';
import { MissingRateError, fxToBase, metalPricePerGram } from './prices.js';
import { PRICES } from './testing/fixtures.js';

describe('fxToBase', () => {
  it('returns the amount unchanged in the base currency', () => {
    expect(toDS(fxToBase(D('10'), 'USD', 'USD', PRICES))).toBe('10');
  });
  it('converts via USD cross rates', () => {
    expect(toDS(fxToBase(D('280'), 'PKR', 'USD', PRICES))).toBe('1');
    expect(toDS(fxToBase(D('1'), 'USD', 'PKR', PRICES))).toBe('280');
    expect(toDS(fxToBase(D('0.8'), 'GBP', 'PKR', PRICES))).toBe('280');
  });
  it('throws a typed error naming the missing currency', () => {
    expect(() => fxToBase(D('1'), 'INR', 'USD', PRICES)).toThrow(MissingRateError);
    try { fxToBase(D('1'), 'INR', 'USD', PRICES); } catch (e) {
      expect((e as MissingRateError).currency).toBe('INR');
      expect((e as MissingRateError).kind).toBe('FX');
    }
  });
});

describe('metalPricePerGram', () => {
  it('prefers a direct quote in the base currency', () => {
    expect(toDS(metalPricePerGram('XAG', 'PKR', PRICES))).toBe('280');
  });
  it('derives from USD when no direct quote exists', () => {
    expect(toDS(metalPricePerGram('XAU', 'PKR', PRICES))).toBe('28000');
  });
  it('throws when neither a direct nor a USD route exists', () => {
    expect(() => metalPricePerGram('XAU', 'INR', PRICES)).toThrow(MissingRateError);
  });
});
```

`packages/core/src/nisab.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeNisab } from './nisab.js';
import { PRICES } from './testing/fixtures.js';
import { resolveRules } from './rulesets/index.js';

describe('computeNisab', () => {
  it('computes all four thresholds in base currency', () => {
    const n = computeNisab(resolveRules('HANAFI').rules, 'USD', PRICES);
    expect(n.silver).toEqual({ STD_85_595: '595', STD_87_612: '612.36' });
    expect(n.gold).toEqual({ STD_85_595: '8500', STD_87_612: '8748' });
    expect(n.applicable).toEqual({ metal: 'SILVER', standard: 'STD_87_612', value: '612.36' });
  });

  it('follows the mode defaults for metal and standard', () => {
    const n = computeNisab(resolveRules('SHAFII').rules, 'USD', PRICES);
    expect(n.applicable).toEqual({ metal: 'GOLD', standard: 'STD_85_595', value: '8500' });
  });

  it('LOWER_VALUE picks the standard with the lower threshold', () => {
    const n = computeNisab(resolveRules('GENERAL').rules, 'PKR', PRICES);
    expect(n.applicable).toEqual({ metal: 'SILVER', standard: 'STD_85_595', value: '166600' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @zakaat/core test -- prices nisab`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `prices.ts` and `nisab.ts`**

`packages/core/src/prices.ts`:
```ts
import { D, type Currency, type Decimal } from './money.js';
import type { Metal, PriceTable } from './types.js';

export class MissingRateError extends Error {
  constructor(
    public readonly kind: 'FX' | 'METAL',
    public readonly symbol: string,
    public readonly currency: Currency,
  ) {
    super(`Missing ${kind} rate for ${symbol} in ${currency}`);
    this.name = 'MissingRateError';
  }
}

function usdRate(currency: Currency, prices: PriceTable): Decimal {
  if (currency === 'USD') return D('1');
  const r = prices.fx.USD[currency];
  if (r === undefined) throw new MissingRateError('FX', 'USD', currency);
  return D(r);
}

export function fxToBase(amount: Decimal, from: Currency, base: Currency, prices: PriceTable): Decimal {
  if (from === base) return amount;
  return amount.div(usdRate(from, prices)).mul(usdRate(base, prices));
}

export function metalPricePerGram(metal: Metal, base: Currency, prices: PriceTable): Decimal {
  const direct = prices.perGram[metal][base];
  if (direct !== undefined) return D(direct);
  const usd = prices.perGram[metal].USD;
  if (usd === undefined) throw new MissingRateError('METAL', metal, base);
  return fxToBase(D(usd), 'USD', base, prices);
}
```

`packages/core/src/nisab.ts`:
```ts
import { D, toDS, type Currency } from './money.js';
import { metalPricePerGram } from './prices.js';
import type { RuleSelection } from './rules/registry.js';
import { NISAB_GRAMS, type NisabBreakdown, type NisabMetal, type NisabStandard, type PriceTable } from './types.js';

const STANDARDS: readonly NisabStandard[] = ['STD_85_595', 'STD_87_612'];

export function computeNisab(rules: RuleSelection, base: Currency, prices: PriceTable): NisabBreakdown {
  const gold = metalPricePerGram('XAU', base, prices);
  const silver = metalPricePerGram('XAG', base, prices);
  const table = {
    GOLD: Object.fromEntries(STANDARDS.map((s) => [s, toDS(D(NISAB_GRAMS.GOLD[s]).mul(gold))])) as Record<NisabStandard, string>,
    SILVER: Object.fromEntries(STANDARDS.map((s) => [s, toDS(D(NISAB_GRAMS.SILVER[s]).mul(silver))])) as Record<NisabStandard, string>,
  };
  const metal: NisabMetal = rules.NISAB_METAL;
  let standard: NisabStandard;
  if (rules.NISAB_GRAMS === 'LOWER_VALUE') {
    standard = D(table[metal].STD_85_595).lte(D(table[metal].STD_87_612)) ? 'STD_85_595' : 'STD_87_612';
  } else {
    standard = rules.NISAB_GRAMS;
  }
  return {
    silver: table.SILVER,
    gold: table.GOLD,
    applicable: { metal, standard, value: table[metal][standard] },
  };
}
```

Add to `index.ts`: `export * from './prices.js'; export * from './nisab.js';`

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add FX conversion, metal pricing and nisab computation"
```

---

### Task 8: Explanation builder and asset valuation

**Files:**
- Create: `packages/core/src/explain.ts`, `packages/core/src/citations/index.ts` (structure only; data completed in Task 12), `packages/core/src/valuation/index.ts`, `money.ts`, `metal.ts`, `stock.ts`, `retirement.ts`, `realEstate.ts`, `receivable.ts` (all under `packages/core/src/valuation/`)
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/valuation/valuation.test.ts`

**Interfaces:**
- Produces:
  - `type ValuationContext = { mode: Mode; rules: RuleSelection; base: Currency; prices: PriceTable }`
  - `type Valued = { line: AssetLine; explanations: Explanation[] }`
  - `valueAsset(asset: AssetInput, ctx: ValuationContext): Valued`
  - `explain(args: { ruleId: RuleId | 'FIXED'; option: string; mode: Mode; subjectId: string; inputs: Record<string, Decimal | string | boolean>; output: Decimal; effect: Effect; messageSuffix?: string }): Explanation` — stringifies inputs, fills `citationIds` from `citationIdsFor(ruleId, option)`, builds `messageKey = rule.<ruleId>.<option>.<effect>[.<suffix>]`
  - `citationIdsFor(ruleId: RuleId | 'FIXED', option: string): string[]`
  - `type Citation = { id: string; source: string; ref: string; url: string; quote?: string }` and `CITATIONS: Record<string, Citation[]>` keyed `${ruleId}:${option}`

- [ ] **Step 1: Write the failing valuation tests**

`packages/core/src/valuation/valuation.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { resolveRules } from '../rulesets/index.js';
import { PRICES } from '../testing/fixtures.js';
import type { AssetInput, JewelleryUsage, Mode } from '../types.js';
import { valueAsset, type ValuationContext } from './index.js';

function ctx(mode: Mode, overrides?: Parameters<typeof resolveRules>[1]): ValuationContext {
  return { mode, rules: resolveRules(mode, overrides).rules, base: 'USD', prices: PRICES };
}

const gold100 = (usage: JewelleryUsage, excessive = false): AssetInput => ({
  id: 'g1', label: 'Bangles', currency: 'USD', category: 'GOLD', weightGrams: '100', purity: '1', usage, excessive,
});

describe('money assets', () => {
  it('includes cash at full value converted to base', () => {
    const v = valueAsset({ id: 'c1', label: 'Meezan', currency: 'PKR', category: 'BANK', amount: '280000' }, ctx('HANAFI'));
    expect(v.line.zakatableValue).toBe('1000');
    expect(v.line.effect).toBe('INCLUDE');
    expect(v.explanations[0]?.ruleId).toBe('FIXED');
    expect(v.explanations[0]?.messageKey).toBe('rule.FIXED.MONEY_FULL_VALUE.INCLUDE');
  });
  it('throws MissingRateError for an unknown currency instead of valuing at zero', () => {
    expect(() => valueAsset({ id: 'c2', label: 'x', currency: 'INR', category: 'CASH', amount: '1' }, ctx('HANAFI'))).toThrow('Missing FX rate for USD in INR');
  });
});

describe('gold and silver', () => {
  it('Hanafi taxes worn jewellery in full', () => {
    const v = valueAsset(gold100('WORN'), ctx('HANAFI'));
    expect(v.line.baseValue).toBe('10000');
    expect(v.line.zakatableValue).toBe('10000');
    expect(v.explanations[0]).toMatchObject({ ruleId: 'JEWELLERY_PERSONAL', option: 'ZAKATABLE', effect: 'INCLUDE' });
  });
  it('Shafii exempts worn jewellery unless excessive', () => {
    expect(valueAsset(gold100('WORN'), ctx('SHAFII')).line.zakatableValue).toBe('0');
    expect(valueAsset(gold100('WORN'), ctx('SHAFII')).line.effect).toBe('EXCLUDE');
    const ex = valueAsset(gold100('WORN', true), ctx('SHAFII'));
    expect(ex.line.zakatableValue).toBe('10000');
    expect(ex.explanations[0]?.messageKey).toBe('rule.JEWELLERY_PERSONAL.EXEMPT_IF_WORN.INCLUDE.excessive');
  });
  it("men's gold and stored or investment metal are zakatable in every mode", () => {
    for (const mode of ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI', 'GENERAL'] as const) {
      expect(valueAsset(gold100('MENS'), ctx(mode)).line.zakatableValue).toBe('10000');
      expect(valueAsset(gold100('STORED'), ctx(mode)).line.zakatableValue).toBe('10000');
      expect(valueAsset(gold100('INVESTMENT'), ctx(mode)).line.zakatableValue).toBe('10000');
    }
  });
  it('applies purity and the silver price', () => {
    const v = valueAsset({ id: 's1', label: 'Ring', currency: 'USD', category: 'SILVER', weightGrams: '200', purity: '0.925', usage: 'INVESTMENT' }, ctx('HANAFI'));
    expect(v.line.zakatableValue).toBe('185');
  });
  it('a user override to EXEMPT_IF_WORN applies in Hanafi mode', () => {
    expect(valueAsset(gold100('WORN'), ctx('HANAFI', { JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN' })).line.zakatableValue).toBe('0');
  });
});

describe('stocks', () => {
  const stock = (intent: 'TRADING' | 'PASSIVE', extra: Partial<AssetInput> = {}): AssetInput =>
    ({ id: 's', label: 'VOO', currency: 'USD', category: 'STOCK', marketValue: '10000', intent, ...extra }) as AssetInput;
  it('trading stock is 100% in every mode', () => {
    expect(valueAsset(stock('TRADING'), ctx('SHAFII')).line.zakatableValue).toBe('10000');
  });
  it('passive stock uses the 30% proxy by default and the user ratio when given', () => {
    expect(valueAsset(stock('PASSIVE'), ctx('HANAFI')).line.zakatableValue).toBe('3000');
    expect(valueAsset(stock('PASSIVE', { proxyPercent: '24.8' }), ctx('HANAFI')).line.zakatableValue).toBe('2480');
    expect(valueAsset(stock('PASSIVE'), ctx('HANAFI', { STOCK_PASSIVE_METHOD: 'PROXY_25' })).line.zakatableValue).toBe('2500');
    expect(valueAsset(stock('PASSIVE', { dividendsReceived: '120' }), ctx('HANAFI', { STOCK_PASSIVE_METHOD: 'DIVIDENDS_ONLY' })).line.zakatableValue).toBe('120');
  });
  it('General values passive stock in full', () => {
    expect(valueAsset(stock('PASSIVE', { proxyPercent: '24.8' }), ctx('GENERAL')).line.zakatableValue).toBe('10000');
  });
});

describe('retirement', () => {
  const ret = (accessible: boolean): AssetInput => ({
    id: 'r', label: '401k', currency: 'USD', category: 'RETIREMENT', vestedBalance: '10000', accessible,
    taxPercent: '20', penaltyPercent: '10', voluntaryPercent: '40',
  });
  it('implements each method', () => {
    expect(valueAsset(ret(false), ctx('GENERAL')).line.zakatableValue).toBe('10000');
    expect(valueAsset(ret(false), ctx('MALIKI')).line.zakatableValue).toBe('7000');
    expect(valueAsset(ret(true), ctx('MALIKI')).line.zakatableValue).toBe('8000');
    expect(valueAsset(ret(false), ctx('SHAFII')).line.zakatableValue).toBe('0');
    expect(valueAsset(ret(true), ctx('SHAFII')).line.zakatableValue).toBe('10000');
    expect(valueAsset(ret(false), ctx('HANAFI')).line.zakatableValue).toBe('4000');
    expect(valueAsset(ret(true), ctx('HANAFI')).line.zakatableValue).toBe('10000');
    expect(valueAsset(ret(false), ctx('HANAFI', { RETIREMENT_METHOD: 'ZAKATABLE_PROPORTION' })).line.zakatableValue).toBe('3000');
  });
});

describe('real estate', () => {
  const re = (extra: Partial<AssetInput>): AssetInput =>
    ({ id: 're', label: 'Plot', currency: 'PKR', category: 'REAL_ESTATE', type: 'PLOT_FILE', marketValue: '2800000', ...extra }) as AssetInput;
  it('home is always exempt', () => {
    expect(valueAsset(re({ type: 'HOME' }), ctx('GENERAL')).line.zakatableValue).toBe('0');
  });
  it('rental: saved rent, Qaradawi equivalent base, or higher', () => {
    const r = re({ type: 'RENTAL', savedRent: '280000', netAnnualRent: '560000' });
    expect(valueAsset(r, ctx('HANAFI')).line.zakatableValue).toBe('1000');
    expect(valueAsset(r, ctx('HANAFI', { RENTAL_METHOD: 'QARADAWI_NET_RENT_10' })).line.zakatableValue).toBe('8000');
    expect(valueAsset(r, ctx('GENERAL')).line.zakatableValue).toBe('8000');
    expect(valueAsset(r, ctx('HANAFI')).line.baseValue).toBe('10000');
  });
  it('land for resale depends on intention at purchase', () => {
    expect(valueAsset(re({ type: 'LAND_RESALE', resaleIntentAtPurchase: true }), ctx('HANAFI')).line.zakatableValue).toBe('10000');
    expect(valueAsset(re({ type: 'LAND_RESALE', resaleIntentAtPurchase: false }), ctx('HANAFI')).line.zakatableValue).toBe('0');
  });
  it('plot files: intent, specific plot, possession', () => {
    expect(valueAsset(re({ resaleIntentAtPurchase: false, specificPlot: true }), ctx('HANAFI')).line.zakatableValue).toBe('0');
    expect(valueAsset(re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: false }), ctx('HANAFI')).line.zakatableValue).toBe('10000');
    expect(valueAsset(re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: false }), ctx('HANAFI', { PLOT_FILE: 'FROM_POSSESSION' })).line.zakatableValue).toBe('0');
    expect(valueAsset(re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: true }), ctx('HANAFI', { PLOT_FILE: 'FROM_POSSESSION' })).line.zakatableValue).toBe('10000');
    const pure = valueAsset(re({ resaleIntentAtPurchase: true, specificPlot: false, amountPaid: '560000' }), ctx('HANAFI'));
    expect(pure.line.zakatableValue).toBe('2000');
    expect(pure.line.effect).toBe('PARTIAL');
  });
});

describe('receivables', () => {
  const rc = (strength: 'STRONG' | 'WEAK'): AssetInput => ({ id: 'rc', label: 'Loan to Ali', currency: 'USD', category: 'RECEIVABLE', amount: '500', strength });
  it('strong receivables count yearly; weak only in General; none on ON_RECEIPT', () => {
    expect(valueAsset(rc('STRONG'), ctx('HANAFI')).line.zakatableValue).toBe('500');
    expect(valueAsset(rc('WEAK'), ctx('HANAFI')).line.zakatableValue).toBe('0');
    expect(valueAsset(rc('WEAK'), ctx('GENERAL')).line.zakatableValue).toBe('500');
    expect(valueAsset(rc('STRONG'), ctx('HANAFI', { RECEIVABLE_TIMING: 'ON_RECEIPT' })).line.zakatableValue).toBe('0');
  });
});

describe('explanations', () => {
  it('every valuation emits at least one explanation with string inputs and a citation list', () => {
    const v = valueAsset(gold100('WORN'), ctx('SHAFII'));
    expect(v.explanations.length).toBeGreaterThan(0);
    for (const e of v.explanations) {
      expect(typeof e.output).toBe('string');
      expect(Array.isArray(e.citationIds)).toBe(true);
      for (const val of Object.values(e.inputs)) expect(typeof val).toBe('string');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- valuation`
Expected: FAIL with "Cannot find module './index.js'".

- [ ] **Step 3: Implement the citation structure and the explanation builder**

`packages/core/src/citations/index.ts` (data is completed in Task 12; this task only needs the shape and lookup):
```ts
export type Citation = { id: string; source: string; ref: string; url: string; quote?: string };

/** keyed `${ruleId}:${option}`; FIXED rules use `FIXED:${option}` */
export const CITATIONS: Record<string, Citation[]> = {};

export function citationIdsFor(ruleId: string, option: string): string[] {
  return (CITATIONS[`${ruleId}:${option}`] ?? []).map((c) => c.id);
}
```

`packages/core/src/explain.ts`:
```ts
import { citationIdsFor } from './citations/index.js';
import { type Decimal, toDS } from './money.js';
import type { RuleId } from './rules/registry.js';
import type { Effect, Explanation, Mode } from './types.js';

type InputValue = Decimal | string | boolean | number;

export function explain(args: {
  ruleId: RuleId | 'FIXED';
  option: string;
  mode: Mode;
  subjectId: string;
  inputs: Record<string, InputValue>;
  output: Decimal;
  effect: Effect;
  messageSuffix?: string;
}): Explanation {
  const inputs: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.inputs)) {
    inputs[k] = typeof v === 'object' ? toDS(v) : String(v);
  }
  const suffix = args.messageSuffix ? `.${args.messageSuffix}` : '';
  return {
    ruleId: args.ruleId,
    option: args.option,
    mode: args.mode,
    subjectId: args.subjectId,
    inputs,
    output: toDS(args.output),
    effect: args.effect,
    citationIds: citationIdsFor(args.ruleId, args.option),
    messageKey: `rule.${args.ruleId}.${args.option}.${args.effect}${suffix}`,
  };
}
```

- [ ] **Step 4: Implement the valuation modules**

`packages/core/src/valuation/index.ts`:
```ts
import type { Currency } from '../money.js';
import type { RuleSelection } from '../rules/registry.js';
import type { AssetInput, AssetLine, Explanation, Mode, PriceTable } from '../types.js';
import { valueMetal } from './metal.js';
import { valueMoney } from './money.js';
import { valueRealEstate } from './realEstate.js';
import { valueReceivable } from './receivable.js';
import { valueRetirement } from './retirement.js';
import { valueStock } from './stock.js';

export type ValuationContext = { mode: Mode; rules: RuleSelection; base: Currency; prices: PriceTable };
export type Valued = { line: AssetLine; explanations: Explanation[] };

export function valueAsset(asset: AssetInput, ctx: ValuationContext): Valued {
  switch (asset.category) {
    case 'CASH':
    case 'BANK':
    case 'FOREIGN_CURRENCY':
    case 'OTHER':
      return valueMoney(asset, ctx);
    case 'GOLD':
    case 'SILVER':
      return valueMetal(asset, ctx);
    case 'STOCK':
      return valueStock(asset, ctx);
    case 'RETIREMENT':
      return valueRetirement(asset, ctx);
    case 'REAL_ESTATE':
      return valueRealEstate(asset, ctx);
    case 'RECEIVABLE':
      return valueReceivable(asset, ctx);
  }
}
```

`packages/core/src/valuation/money.ts`:
```ts
import { explain } from '../explain.js';
import { D, toDS } from '../money.js';
import { fxToBase } from '../prices.js';
import type { MoneyAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueMoney(a: MoneyAsset, ctx: ValuationContext): Valued {
  const base = fxToBase(D(a.amount), a.currency, ctx.base, ctx.prices);
  const option = a.category === 'OTHER' ? 'OTHER_ASSET_FULL_VALUE' : 'MONEY_FULL_VALUE';
  const e = explain({
    ruleId: 'FIXED', option, mode: ctx.mode, subjectId: a.id,
    inputs: { amount: a.amount, currency: a.currency, baseValue: base },
    output: base, effect: 'INCLUDE',
  });
  return {
    line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(base), zakatableValue: toDS(base), effect: 'INCLUDE' },
    explanations: [e],
  };
}
```

`packages/core/src/valuation/metal.ts`:
```ts
import { explain } from '../explain.js';
import { D, ZERO, toDS, type Decimal } from '../money.js';
import { metalPricePerGram } from '../prices.js';
import type { Explanation, MetalAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueMetal(a: MetalAsset, ctx: ValuationContext): Valued {
  const metal = a.category === 'GOLD' ? 'XAU' : 'XAG';
  const price = metalPricePerGram(metal, ctx.base, ctx.prices);
  const value = D(a.weightGrams).mul(D(a.purity)).mul(price);
  const inputs = { weightGrams: a.weightGrams, purity: a.purity, pricePerGram: price, usage: a.usage, excessive: a.excessive ?? false };
  let zakatable: Decimal;
  let e: Explanation;

  const usage = a.category === 'SILVER' && a.usage === 'MENS' ? 'WORN' : a.usage;

  if (usage === 'MENS') {
    zakatable = value;
    e = explain({ ruleId: 'FIXED', option: 'MENS_GOLD_ZAKATABLE', mode: ctx.mode, subjectId: a.id, inputs, output: value, effect: 'INCLUDE' });
  } else if (usage === 'STORED' || usage === 'INVESTMENT') {
    zakatable = value;
    e = explain({ ruleId: 'FIXED', option: 'METAL_HELD_AS_WEALTH', mode: ctx.mode, subjectId: a.id, inputs, output: value, effect: 'INCLUDE' });
  } else if (ctx.rules.JEWELLERY_PERSONAL === 'ZAKATABLE') {
    zakatable = value;
    e = explain({ ruleId: 'JEWELLERY_PERSONAL', option: 'ZAKATABLE', mode: ctx.mode, subjectId: a.id, inputs, output: value, effect: 'INCLUDE' });
  } else if (a.excessive) {
    zakatable = value;
    e = explain({ ruleId: 'JEWELLERY_PERSONAL', option: 'EXEMPT_IF_WORN', mode: ctx.mode, subjectId: a.id, inputs, output: value, effect: 'INCLUDE', messageSuffix: 'excessive' });
  } else {
    zakatable = ZERO;
    e = explain({ ruleId: 'JEWELLERY_PERSONAL', option: 'EXEMPT_IF_WORN', mode: ctx.mode, subjectId: a.id, inputs, output: ZERO, effect: 'EXCLUDE' });
  }
  return {
    line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(value), zakatableValue: toDS(zakatable), effect: e.effect },
    explanations: [e],
  };
}
```

`packages/core/src/valuation/stock.ts`:
```ts
import { explain } from '../explain.js';
import { D, ZERO, toDS, type Decimal } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, StockAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueStock(a: StockAsset, ctx: ValuationContext): Valued {
  const mv = fxToBase(D(a.marketValue), a.currency, ctx.base, ctx.prices);
  let zakatable: Decimal;
  let effect: Effect = 'INCLUDE';
  const base = { mode: ctx.mode, subjectId: a.id };

  if (a.intent === 'TRADING') {
    zakatable = mv;
    const e = explain({ ...base, ruleId: 'FIXED', option: 'STOCK_TRADING_FULL_VALUE', inputs: { marketValue: mv }, output: mv, effect });
    return finish(a, mv, zakatable, effect, [e]);
  }

  const method = ctx.rules.STOCK_PASSIVE_METHOD;
  let inputs: Record<string, Decimal | string> = { marketValue: mv };
  if (method === 'FULL_MARKET_VALUE') {
    zakatable = mv;
  } else if (method === 'DIVIDENDS_ONLY') {
    zakatable = fxToBase(D(a.dividendsReceived ?? '0'), a.currency, ctx.base, ctx.prices);
    effect = 'PARTIAL';
    inputs = { ...inputs, dividendsReceived: a.dividendsReceived ?? '0' };
  } else {
    const pct = a.proxyPercent !== undefined ? D(a.proxyPercent) : D(method === 'PROXY_25' ? '25' : '30');
    zakatable = mv.mul(pct).div(100);
    effect = 'PARTIAL';
    inputs = { ...inputs, proxyPercent: pct, proxySource: a.proxyPercent !== undefined ? 'USER' : 'MODE' };
  }
  const e = explain({ ...base, ruleId: 'STOCK_PASSIVE_METHOD', option: method, inputs, output: zakatable, effect });
  return finish(a, mv, zakatable.isNegative() ? ZERO : zakatable, effect, [e]);
}

function finish(a: StockAsset, mv: Decimal, zak: Decimal, effect: Effect, explanations: Valued['explanations']): Valued {
  return { line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(mv), zakatableValue: toDS(zak), effect }, explanations };
}
```

`packages/core/src/valuation/retirement.ts`:
```ts
import { explain } from '../explain.js';
import { D, ZERO, toDS, type Decimal } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, RetirementAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueRetirement(a: RetirementAsset, ctx: ValuationContext): Valued {
  const vb = fxToBase(D(a.vestedBalance), a.currency, ctx.base, ctx.prices);
  const method = ctx.rules.RETIREMENT_METHOD;
  const hundred = D('100');
  let zakatable: Decimal;
  switch (method) {
    case 'FULL_VESTED':
      zakatable = vb; break;
    case 'NET_WITHDRAWABLE': {
      const haircut = D(a.taxPercent).plus(a.accessible ? ZERO : D(a.penaltyPercent));
      zakatable = vb.mul(hundred.minus(haircut)).div(hundred); break;
    }
    case 'ZAKATABLE_PROPORTION':
      zakatable = vb.mul(D(a.zakatableProportionPercent ?? '30')).div(hundred); break;
    case 'NONE_UNTIL_ACCESS':
      zakatable = a.accessible ? vb : ZERO; break;
    case 'COMPULSORY_DEFERRED_VOLUNTARY_YEARLY':
      zakatable = a.accessible ? vb : vb.mul(D(a.voluntaryPercent)).div(hundred); break;
  }
  if (zakatable.isNegative()) zakatable = ZERO;
  const effect: Effect = zakatable.isZero() ? 'EXCLUDE' : zakatable.eq(vb) ? 'INCLUDE' : 'PARTIAL';
  const e = explain({
    ruleId: 'RETIREMENT_METHOD', option: method, mode: ctx.mode, subjectId: a.id,
    inputs: { vestedBalance: vb, accessible: a.accessible, taxPercent: a.taxPercent, penaltyPercent: a.penaltyPercent, voluntaryPercent: a.voluntaryPercent, zakatableProportionPercent: a.zakatableProportionPercent ?? '30' },
    output: zakatable, effect,
  });
  return { line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(vb), zakatableValue: toDS(zakatable), effect }, explanations: [e] };
}
```

`packages/core/src/valuation/realEstate.ts`:
```ts
import { explain } from '../explain.js';
import { D, ZERO, toDS, type Decimal } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, Explanation, RealEstateAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueRealEstate(a: RealEstateAsset, ctx: ValuationContext): Valued {
  const conv = (s: string | undefined) => fxToBase(D(s ?? '0'), a.currency, ctx.base, ctx.prices);
  const mv = conv(a.marketValue);
  const base = { mode: ctx.mode, subjectId: a.id };
  let zakatable: Decimal = ZERO;
  let effect: Effect = 'EXCLUDE';
  let e: Explanation;

  switch (a.type) {
    case 'HOME':
      e = explain({ ...base, ruleId: 'FIXED', option: 'HOME_EXEMPT', inputs: { marketValue: mv }, output: ZERO, effect });
      break;
    case 'RENTAL': {
      const saved = conv(a.savedRent);
      const qaradawi = conv(a.netAnnualRent).mul(4);
      const method = ctx.rules.RENTAL_METHOD;
      zakatable = method === 'SAVED_RENT' ? saved : method === 'QARADAWI_NET_RENT_10' ? qaradawi : (saved.gte(qaradawi) ? saved : qaradawi);
      effect = zakatable.isZero() ? 'EXCLUDE' : 'PARTIAL';
      e = explain({ ...base, ruleId: 'RENTAL_METHOD', option: method, inputs: { marketValue: mv, savedRent: saved, netAnnualRent: conv(a.netAnnualRent), qaradawiEquivalentBase: qaradawi }, output: zakatable, effect });
      break;
    }
    case 'LAND_RESALE': {
      const intent = a.resaleIntentAtPurchase === true;
      zakatable = intent ? mv : ZERO;
      effect = intent ? 'INCLUDE' : 'EXCLUDE';
      e = explain({ ...base, ruleId: 'FIXED', option: intent ? 'LAND_RESALE_INTENT' : 'LAND_NO_RESALE_INTENT', inputs: { marketValue: mv, resaleIntentAtPurchase: intent }, output: zakatable, effect });
      break;
    }
    case 'PLOT_FILE': {
      const intent = a.resaleIntentAtPurchase === true;
      const option = ctx.rules.PLOT_FILE;
      const inputs = { marketValue: mv, resaleIntentAtPurchase: intent, specificPlot: a.specificPlot ?? false, possessionTaken: a.possessionTaken ?? false, amountPaid: conv(a.amountPaid) };
      if (!intent) {
        e = explain({ ...base, ruleId: 'PLOT_FILE', option, inputs, output: ZERO, effect, messageSuffix: 'no_intent' });
      } else if (a.specificPlot !== true) {
        zakatable = conv(a.amountPaid);
        effect = zakatable.isZero() ? 'EXCLUDE' : 'PARTIAL';
        e = explain({ ...base, ruleId: 'PLOT_FILE', option, inputs, output: zakatable, effect, messageSuffix: 'receivable' });
      } else if (option === 'FROM_PURCHASE' || a.possessionTaken === true) {
        zakatable = mv;
        effect = 'INCLUDE';
        e = explain({ ...base, ruleId: 'PLOT_FILE', option, inputs, output: mv, effect });
      } else {
        e = explain({ ...base, ruleId: 'PLOT_FILE', option, inputs, output: ZERO, effect, messageSuffix: 'awaiting_possession' });
      }
      break;
    }
  }
  return { line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(mv), zakatableValue: toDS(zakatable), effect }, explanations: [e] };
}
```

`packages/core/src/valuation/receivable.ts`:
```ts
import { explain } from '../explain.js';
import { D, ZERO, toDS } from '../money.js';
import { fxToBase } from '../prices.js';
import type { ReceivableAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueReceivable(a: ReceivableAsset, ctx: ValuationContext): Valued {
  const amt = fxToBase(D(a.amount), a.currency, ctx.base, ctx.prices);
  const option = ctx.rules.RECEIVABLE_TIMING;
  const include = option === 'YEARLY_ALL' || (option === 'YEARLY_IF_STRONG' && a.strength === 'STRONG');
  const zakatable = include ? amt : ZERO;
  const effect = include ? 'INCLUDE' : 'EXCLUDE';
  const e = explain({ ruleId: 'RECEIVABLE_TIMING', option, mode: ctx.mode, subjectId: a.id, inputs: { amount: amt, strength: a.strength }, output: zakatable, effect });
  return { line: { assetId: a.id, category: a.category, label: a.label, baseValue: toDS(amt), zakatableValue: toDS(zakatable), effect }, explanations: [e] };
}
```

Add to `index.ts`:
```ts
export * from './explain.js';
export * from './citations/index.js';
export * from './valuation/index.js';
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS. (Biome may flag the circular type import between `valuation/index.ts` and the category files; it is type-only and allowed under `verbatimModuleSyntax`.)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src
git commit -m "core: add explanation builder and per-category asset valuation"
```

---

### Task 9: Liabilities, surplus offset and prior unpaid zakat

**Files:**
- Create: `packages/core/src/liabilities.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/liabilities.test.ts`

**Interfaces:**
- Produces:
  - `computeDeductions(args: { liabilities: readonly LiabilityInput[]; surplusNonZakatableAssets?: DecimalString; priorUnpaidZakat?: DecimalString; ctx: ValuationContext }): { total: Decimal; explanations: Explanation[] }` — uncapped; `calculate()` caps at gross.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/liabilities.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeDeductions } from './liabilities.js';
import { toDS } from './money.js';
import { resolveRules } from './rulesets/index.js';
import { PRICES } from './testing/fixtures.js';
import type { LiabilityInput, Mode } from './types.js';
import type { ValuationContext } from './valuation/index.js';

const ctx = (mode: Mode, overrides?: Parameters<typeof resolveRules>[1]): ValuationContext =>
  ({ mode, rules: resolveRules(mode, overrides).rules, base: 'USD', prices: PRICES });

const mortgage: LiabilityInput = {
  id: 'm', label: 'Mortgage', kind: 'LONG_TERM', currency: 'USD',
  totalOutstanding: '100000', currentlyDue: '1000', dueWithinYear: '12000', interestWithinYear: '4000',
};
const card: LiabilityInput = {
  id: 'c', label: 'Card', kind: 'IMMEDIATE', currency: 'USD',
  totalOutstanding: '2000', currentlyDue: '2000', dueWithinYear: '2000', interestWithinYear: '0',
};

describe('computeDeductions', () => {
  it('Hanafi: immediate in full, long-term next 12 months net of interest', () => {
    const r = computeDeductions({ liabilities: [mortgage, card], ctx: ctx('HANAFI') });
    expect(toDS(r.total)).toBe('10000');
  });
  it('Shafii: nothing', () => {
    const r = computeDeductions({ liabilities: [mortgage, card], ctx: ctx('SHAFII') });
    expect(toDS(r.total)).toBe('0');
    expect(r.explanations.every((e) => e.effect === 'EXCLUDE')).toBe(true);
  });
  it('DUE_INSTALMENT and FULL scopes', () => {
    expect(toDS(computeDeductions({ liabilities: [mortgage], ctx: ctx('HANAFI', { DEBT_DEDUCTION_SCOPE: 'DUE_INSTALMENT' }) }).total)).toBe('1000');
    expect(toDS(computeDeductions({ liabilities: [mortgage], ctx: ctx('HANAFI', { DEBT_DEDUCTION_SCOPE: 'FULL' }) }).total)).toBe('100000');
  });
  it('Maliki offsets surplus non-zakatable assets first', () => {
    const r = computeDeductions({ liabilities: [card], surplusNonZakatableAssets: '1500', ctx: ctx('MALIKI') });
    expect(toDS(r.total)).toBe('500');
    expect(r.explanations.some((e) => e.ruleId === 'DEBT_SURPLUS_OFFSET' && e.option === 'ON')).toBe(true);
    const r2 = computeDeductions({ liabilities: [card], surplusNonZakatableAssets: '5000', ctx: ctx('MALIKI') });
    expect(toDS(r2.total)).toBe('0');
  });
  it('converts foreign liabilities to base', () => {
    const r = computeDeductions({ liabilities: [{ ...card, currency: 'PKR', totalOutstanding: '280000', currentlyDue: '280000', dueWithinYear: '280000' }], ctx: ctx('HANAFI') });
    expect(toDS(r.total)).toBe('1000');
  });
  it('prior unpaid zakat is a deduction only under DEDUCT', () => {
    expect(toDS(computeDeductions({ liabilities: [], priorUnpaidZakat: '250', ctx: ctx('HANAFI') }).total)).toBe('250');
    expect(toDS(computeDeductions({ liabilities: [], priorUnpaidZakat: '250', ctx: ctx('SHAFII') }).total)).toBe('0');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- liabilities`
Expected: FAIL with "Cannot find module './liabilities.js'".

- [ ] **Step 3: Implement `liabilities.ts`**

```ts
import { explain } from './explain.js';
import { D, ZERO, sum, type Decimal, type DecimalString } from './money.js';
import { fxToBase } from './prices.js';
import type { Explanation, LiabilityInput } from './types.js';
import type { ValuationContext } from './valuation/index.js';

export function computeDeductions(args: {
  liabilities: readonly LiabilityInput[];
  surplusNonZakatableAssets?: DecimalString;
  priorUnpaidZakat?: DecimalString;
  ctx: ValuationContext;
}): { total: Decimal; explanations: Explanation[] } {
  const { ctx } = args;
  const scope = ctx.rules.DEBT_DEDUCTION_SCOPE;
  const explanations: Explanation[] = [];
  const parts: Decimal[] = [];

  for (const l of args.liabilities) {
    const conv = (s: DecimalString) => fxToBase(D(s), l.currency, ctx.base, ctx.prices);
    let amount = ZERO;
    if (scope !== 'NONE') {
      if (l.kind === 'IMMEDIATE') amount = conv(l.totalOutstanding);
      else if (scope === 'DUE_INSTALMENT') amount = conv(l.currentlyDue);
      else if (scope === 'TWELVE_MONTHS') amount = conv(l.dueWithinYear).minus(conv(l.interestWithinYear));
      else amount = conv(l.totalOutstanding);
      if (amount.isNegative()) amount = ZERO;
    }
    parts.push(amount);
    explanations.push(explain({
      ruleId: 'DEBT_DEDUCTION_SCOPE', option: scope, mode: ctx.mode, subjectId: l.id,
      inputs: { kind: l.kind, totalOutstanding: conv(l.totalOutstanding), currentlyDue: conv(l.currentlyDue), dueWithinYear: conv(l.dueWithinYear), interestWithinYear: conv(l.interestWithinYear) },
      output: amount, effect: amount.isZero() ? 'EXCLUDE' : 'DEDUCT',
    }));
  }

  let total = sum(parts);

  if (ctx.rules.DEBT_SURPLUS_OFFSET === 'ON' && total.gt(ZERO)) {
    const surplus = D(args.surplusNonZakatableAssets ?? '0');
    const after = total.minus(surplus);
    const offsetTotal = after.isNegative() ? ZERO : after;
    explanations.push(explain({
      ruleId: 'DEBT_SURPLUS_OFFSET', option: 'ON', mode: ctx.mode, subjectId: 'liabilities',
      inputs: { deductibleBeforeOffset: total, surplusNonZakatableAssets: surplus }, output: offsetTotal,
      effect: offsetTotal.lt(total) ? 'PARTIAL' : 'INFO',
    }));
    total = offsetTotal;
  }

  const prior = D(args.priorUnpaidZakat ?? '0');
  if (prior.gt(ZERO)) {
    const option = ctx.rules.QADA_PRIOR_UNPAID;
    const deducted = option === 'DEDUCT' ? prior : ZERO;
    explanations.push(explain({
      ruleId: 'QADA_PRIOR_UNPAID', option, mode: ctx.mode, subjectId: 'priorUnpaidZakat',
      inputs: { priorUnpaidZakat: prior }, output: deducted, effect: deducted.isZero() ? 'EXCLUDE' : 'DEDUCT',
    }));
    total = total.plus(deducted);
  }

  return { total, explanations };
}
```

Add to `index.ts`: `export * from './liabilities.js';`

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add liability deductions with surplus offset and prior-unpaid zakat"
```

---

### Task 10: Hawl evaluation

**Files:**
- Create: `packages/core/src/hawl.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/hawl.test.ts`

**Interfaces:**
- Produces:
  - `class AttestationRequiredError extends Error { field: 'dipBelowNisab' }`
  - `evaluateHawl(hawl: HawlInput, ctx: { mode: Mode; rules: RuleSelection; hijriOffsetDays?: number }): { status: HawlStatus; periodEndISO: ISODate; explanations: Explanation[] }`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/hawl.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AttestationRequiredError, evaluateHawl } from './hawl.js';
import { periodEnd } from './hijri.js';
import { resolveRules } from './rulesets/index.js';
import type { HawlInput, Mode } from './types.js';

const ctx = (mode: Mode) => ({ mode, rules: resolveRules(mode).rules });
const start = '2025-03-01';
const end = periodEnd(start);

describe('evaluateHawl', () => {
  it('START_END: due unless wealth hit zero', () => {
    expect(evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).status).toBe('DUE');
    const r = evaluateHawl({ startISO: start, closeISO: end, wealthHitZero: 'YES', regainedISO: '2025-09-01' }, ctx('HANAFI'));
    expect(r.status).toBe('RESET');
    expect(r.explanations.some((e) => e.ruleId === 'HAWL_MODEL' && e.option === 'START_END')).toBe(true);
  });

  it('CONTINUOUS: requires the dip attestation and breaks on YES', () => {
    expect(() => evaluateHawl({ startISO: start, closeISO: end }, ctx('SHAFII'))).toThrow(AttestationRequiredError);
    expect(evaluateHawl({ startISO: start, closeISO: end, dipBelowNisab: 'NO' }, ctx('SHAFII')).status).toBe('DUE');
    expect(evaluateHawl({ startISO: start, closeISO: end, dipBelowNisab: 'YES', regainedISO: '2025-10-01' }, ctx('MALIKI')).status).toBe('BROKEN');
  });

  it('reports the derived period end', () => {
    expect(evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).periodEndISO).toBe(end);
  });

  it('warns on early close per the advance-payment rule', () => {
    const early = evaluateHawl({ startISO: start, closeISO: '2025-12-01', dipBelowNisab: 'NO' }, ctx('MALIKI'));
    const w = early.explanations.find((e) => e.ruleId === 'ADVANCE_PAYMENT');
    expect(w?.effect).toBe('WARNING');
    expect(w?.option).toBe('RESTRICTED');
    const hanafi = evaluateHawl({ startISO: start, closeISO: '2025-12-01' }, ctx('HANAFI'));
    expect(hanafi.explanations.find((e) => e.ruleId === 'ADVANCE_PAYMENT')?.option).toBe('ALLOWED');
    expect(evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).explanations.some((e) => e.ruleId === 'ADVANCE_PAYMENT')).toBe(false);
  });

  it('labels annexed new wealth as advance in non-Hanafi modes', () => {
    const r = evaluateHawl({ startISO: start, closeISO: end, dipBelowNisab: 'NO' }, ctx('SHAFII'));
    expect(r.explanations.some((e) => e.ruleId === 'HAWL_NEW_WEALTH' && e.option === 'ANNEX_LABEL_ADVANCE')).toBe(true);
    const h = evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI'));
    expect(h.explanations.some((e) => e.ruleId === 'HAWL_NEW_WEALTH' && e.option === 'ANNEX_LABEL_ADVANCE')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- hawl`
Expected: FAIL with "Cannot find module './hawl.js'".

- [ ] **Step 3: Implement `hawl.ts`**

```ts
import { explain } from './explain.js';
import { periodEnd, type ISODate } from './hijri.js';
import { ZERO } from './money.js';
import type { RuleSelection } from './rules/registry.js';
import type { Explanation, HawlInput, HawlStatus, Mode } from './types.js';

export class AttestationRequiredError extends Error {
  constructor(public readonly field: 'dipBelowNisab') {
    super(`Attestation required: ${field}`);
    this.name = 'AttestationRequiredError';
  }
}

export function evaluateHawl(
  hawl: HawlInput,
  ctx: { mode: Mode; rules: RuleSelection; hijriOffsetDays?: number },
): { status: HawlStatus; periodEndISO: ISODate; explanations: Explanation[] } {
  const explanations: Explanation[] = [];
  const model = ctx.rules.HAWL_MODEL;
  const periodEndISO = periodEnd(hawl.startISO, ctx.hijriOffsetDays ?? 0);
  let status: HawlStatus = 'DUE';

  if (model === 'START_END') {
    if (hawl.wealthHitZero === 'YES') status = 'RESET';
    explanations.push(explain({
      ruleId: 'HAWL_MODEL', option: model, mode: ctx.mode, subjectId: 'period',
      inputs: { startISO: hawl.startISO, closeISO: hawl.closeISO, wealthHitZero: hawl.wealthHitZero ?? 'NO', regainedISO: hawl.regainedISO ?? '' },
      output: ZERO, effect: status === 'DUE' ? 'INFO' : 'WARNING',
    }));
  } else {
    if (hawl.dipBelowNisab === undefined) throw new AttestationRequiredError('dipBelowNisab');
    if (hawl.dipBelowNisab === 'YES') status = 'BROKEN';
    explanations.push(explain({
      ruleId: 'HAWL_MODEL', option: model, mode: ctx.mode, subjectId: 'period',
      inputs: { startISO: hawl.startISO, closeISO: hawl.closeISO, dipBelowNisab: hawl.dipBelowNisab, regainedISO: hawl.regainedISO ?? '' },
      output: ZERO, effect: status === 'DUE' ? 'INFO' : 'WARNING',
    }));
  }

  if (ctx.rules.HAWL_NEW_WEALTH === 'ANNEX_LABEL_ADVANCE') {
    explanations.push(explain({
      ruleId: 'HAWL_NEW_WEALTH', option: 'ANNEX_LABEL_ADVANCE', mode: ctx.mode, subjectId: 'period',
      inputs: {}, output: ZERO, effect: 'INFO',
    }));
  }

  if (hawl.closeISO < periodEndISO) {
    explanations.push(explain({
      ruleId: 'ADVANCE_PAYMENT', option: ctx.rules.ADVANCE_PAYMENT, mode: ctx.mode, subjectId: 'period',
      inputs: { closeISO: hawl.closeISO, periodEndISO }, output: ZERO, effect: 'WARNING',
    }));
  } else if (hawl.closeISO > periodEndISO) {
    explanations.push(explain({
      ruleId: 'FIXED', option: 'HAWL_LATE_CLOSE', mode: ctx.mode, subjectId: 'period',
      inputs: { closeISO: hawl.closeISO, periodEndISO }, output: ZERO, effect: 'INFO',
    }));
  }

  return { status, periodEndISO, explanations };
}
```

Add to `index.ts`: `export * from './hawl.js';`

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add hawl evaluation with attestations and advance-payment warnings"
```

---

### Task 11: `calculate()` pipeline

**Files:**
- Create: `packages/core/src/calculate.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/calculate.test.ts`

**Interfaces:**
- Produces: `calculate(input: CalculationInput): CalculationOutput` (pure, deterministic). Internal rule: under `NISAB_COMBINE_METALS = SEPARATE`, zakat is assessed on the sum of the buckets (gold, silver, everything else) that individually meet their nisab; `net` in the output is always `gross − deductions`, and the assessed amount is recorded in the `NISAB_COMBINE_METALS` explanation.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/calculate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculate } from './calculate.js';
import { ENGINE_VERSION } from './version.js';
import { PRICES } from './testing/fixtures.js';
import type { AssetInput, CalculationInput, LiabilityInput } from './types.js';

const gold = (usage: 'WORN' | 'INVESTMENT', grams = '100'): AssetInput =>
  ({ id: 'g', label: 'Gold', currency: 'USD', category: 'GOLD', weightGrams: grams, purity: '1', usage });
const cash = (amount: string): AssetInput => ({ id: 'c', label: 'Cash', currency: 'USD', category: 'CASH', amount });
const hawlDue = { startISO: '2025-03-01', closeISO: '2026-02-18', dipBelowNisab: 'NO' as const };

function run(partial: Partial<CalculationInput> & Pick<CalculationInput, 'mode' | 'assets'>) {
  return calculate({ baseCurrency: 'USD', liabilities: [], hawl: hawlDue, prices: PRICES, ...partial });
}

describe('calculate', () => {
  it('Hanafi: worn gold plus cash, no debts', () => {
    const out = run({ mode: 'HANAFI', assets: [gold('WORN'), cash('5000')] });
    expect(out.grossZakatable).toBe('15000');
    expect(out.deductions).toBe('0');
    expect(out.net).toBe('15000');
    expect(out.meetsNisab).toBe(true);
    expect(out.hawlStatus).toBe('DUE');
    expect(out.zakatDue).toBe('375');
    expect(out.engineVersion).toBe(ENGINE_VERSION);
    expect(out.rulesetId).toBe('hanafi@2026.1');
    expect(out.lines.map((l) => l.zakatableValue)).toEqual(['10000', '5000']);
  });

  it('net exactly equal to nisab meets nisab and rounds the due up once', () => {
    const out = run({ mode: 'HANAFI', assets: [cash('612.36')] });
    expect(out.nisab.applicable.value).toBe('612.36');
    expect(out.meetsNisab).toBe(true);
    expect(out.zakatDue).toBe('15.31');
  });

  it('below nisab yields zero due', () => {
    const out = run({ mode: 'HANAFI', assets: [cash('612.35')] });
    expect(out.meetsNisab).toBe(false);
    expect(out.zakatDue).toBe('0');
  });

  it('liabilities larger than gross are capped; net floors at zero', () => {
    const big: LiabilityInput = { id: 'l', label: 'Loan', kind: 'IMMEDIATE', currency: 'USD', totalOutstanding: '5000', currentlyDue: '5000', dueWithinYear: '5000', interestWithinYear: '0' };
    const out = run({ mode: 'HANAFI', assets: [cash('1000')], liabilities: [big] });
    expect(out.deductions).toBe('1000');
    expect(out.net).toBe('0');
    expect(out.zakatDue).toBe('0');
    expect(out.explanations.some((e) => e.ruleId === 'FIXED' && e.option === 'DEDUCTIONS_CAPPED_AT_GROSS')).toBe(true);
  });

  it('Shafii SEPARATE: buckets below their own nisab are not assessed', () => {
    const out = run({ mode: 'SHAFII', assets: [gold('INVESTMENT', '50'), cash('9000')] });
    expect(out.net).toBe('14000');
    expect(out.meetsNisab).toBe(true);
    expect(out.zakatDue).toBe('225');
    const combined = run({ mode: 'SHAFII', assets: [gold('INVESTMENT', '50'), cash('9000')], overrides: { NISAB_COMBINE_METALS: 'COMBINE' } });
    expect(combined.zakatDue).toBe('350');
  });

  it('a broken hawl produces no due even above nisab', () => {
    const out = run({ mode: 'SHAFII', assets: [cash('20000')], hawl: { ...hawlDue, dipBelowNisab: 'YES', regainedISO: '2025-10-01' } });
    expect(out.hawlStatus).toBe('BROKEN');
    expect(out.zakatDue).toBe('0');
  });

  it('General never undercuts any school on the same inputs', () => {
    const assets: AssetInput[] = [
      gold('WORN'), cash('20000'),
      { id: 's', label: 'VOO', currency: 'USD', category: 'STOCK', marketValue: '10000', intent: 'PASSIVE' },
      { id: 'r', label: '401k', currency: 'USD', category: 'RETIREMENT', vestedBalance: '10000', accessible: false, taxPercent: '20', penaltyPercent: '10', voluntaryPercent: '40' },
    ];
    const liabilities: LiabilityInput[] = [{ id: 'l', label: 'Card', kind: 'IMMEDIATE', currency: 'USD', totalOutstanding: '8000', currentlyDue: '8000', dueWithinYear: '8000', interestWithinYear: '0' }];
    const general = run({ mode: 'GENERAL', assets, liabilities });
    expect(general.zakatDue).toBe('1250');
    for (const mode of ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI'] as const) {
      const other = run({ mode, assets, liabilities, surplusNonZakatableAssets: '0' });
      expect(Number(general.zakatDue)).toBeGreaterThanOrEqual(Number(other.zakatDue));
    }
  });

  it('emits rate and rounding explanations last and keeps asset explanations in asset order', () => {
    const out = run({ mode: 'HANAFI', assets: [cash('5000'), gold('WORN')] });
    const ids = out.explanations.map((e) => `${e.ruleId}:${e.option}`);
    expect(ids.slice(0, 2)).toEqual(['FIXED:MONEY_FULL_VALUE', 'JEWELLERY_PERSONAL:ZAKATABLE']);
    expect(ids.slice(-2)).toEqual(['FIXED:RATE_LUNAR_2_5', 'FIXED:ROUND_UP_FINAL_MINOR_UNIT']);
  });

  it('is deterministic', () => {
    const input: CalculationInput = { mode: 'MALIKI', baseCurrency: 'PKR', assets: [cash('5000')], liabilities: [], hawl: hawlDue, prices: PRICES };
    expect(calculate(input)).toEqual(calculate(input));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- calculate`
Expected: FAIL with "Cannot find module './calculate.js'".

- [ ] **Step 3: Implement `calculate.ts`**

```ts
import { explain } from './explain.js';
import { evaluateHawl } from './hawl.js';
import { computeDeductions } from './liabilities.js';
import { D, RATE_DIVISOR, ZERO, roundUpToMinorUnit, sum, toDS, type Decimal } from './money.js';
import { computeNisab } from './nisab.js';
import { resolveRules } from './rulesets/index.js';
import type { AssetLine, CalculationInput, CalculationOutput, Explanation } from './types.js';
import { valueAsset, type ValuationContext } from './valuation/index.js';
import { ENGINE_VERSION } from './version.js';

export function calculate(input: CalculationInput): CalculationOutput {
  const { rulesetId, rules } = resolveRules(input.mode, input.overrides);
  const ctx: ValuationContext = { mode: input.mode, rules, base: input.baseCurrency, prices: input.prices };
  const explanations: Explanation[] = [];
  const lines: AssetLine[] = [];

  for (const asset of input.assets) {
    const v = valueAsset(asset, ctx);
    lines.push(v.line);
    explanations.push(...v.explanations);
  }
  const gross = sum(lines.map((l) => D(l.zakatableValue)));

  const ded = computeDeductions({
    liabilities: input.liabilities,
    ...(input.surplusNonZakatableAssets !== undefined ? { surplusNonZakatableAssets: input.surplusNonZakatableAssets } : {}),
    ...(input.priorUnpaidZakat !== undefined ? { priorUnpaidZakat: input.priorUnpaidZakat } : {}),
    ctx,
  });
  explanations.push(...ded.explanations);
  let deductions = ded.total;
  if (deductions.gt(gross)) {
    explanations.push(explain({ ruleId: 'FIXED', option: 'DEDUCTIONS_CAPPED_AT_GROSS', mode: input.mode, subjectId: 'liabilities', inputs: { requested: deductions, gross }, output: gross, effect: 'INFO' }));
    deductions = gross;
  }
  const net = gross.minus(deductions);

  const nisab = computeNisab(rules, input.baseCurrency, input.prices);
  const threshold = D(nisab.applicable.value);
  explanations.push(explain({ ruleId: 'NISAB_METAL', option: rules.NISAB_METAL, mode: input.mode, subjectId: 'nisab', inputs: { standard: nisab.applicable.standard, threshold, net }, output: threshold, effect: 'INFO' }));
  explanations.push(explain({ ruleId: 'NISAB_GRAMS', option: rules.NISAB_GRAMS, mode: input.mode, subjectId: 'nisab', inputs: { resolvedStandard: nisab.applicable.standard }, output: threshold, effect: 'INFO' }));

  let assessable: Decimal;
  let meetsNisab: boolean;
  if (rules.NISAB_COMBINE_METALS === 'COMBINE') {
    assessable = net;
    meetsNisab = net.gte(threshold);
    explanations.push(explain({ ruleId: 'NISAB_COMBINE_METALS', option: 'COMBINE', mode: input.mode, subjectId: 'nisab', inputs: { net, threshold }, output: assessable, effect: 'INFO' }));
  } else {
    const goldBucket = sum(lines.filter((l) => l.category === 'GOLD').map((l) => D(l.zakatableValue)));
    const silverBucket = sum(lines.filter((l) => l.category === 'SILVER').map((l) => D(l.zakatableValue)));
    let moneyBucket = gross.minus(goldBucket).minus(silverBucket).minus(deductions);
    if (moneyBucket.isNegative()) moneyBucket = ZERO;
    const std = nisab.applicable.standard;
    const goldMeets = goldBucket.gt(ZERO) && goldBucket.gte(D(nisab.gold[std]));
    const silverMeets = silverBucket.gt(ZERO) && silverBucket.gte(D(nisab.silver[std]));
    const moneyMeets = moneyBucket.gt(ZERO) && moneyBucket.gte(threshold);
    assessable = sum([goldMeets ? goldBucket : ZERO, silverMeets ? silverBucket : ZERO, moneyMeets ? moneyBucket : ZERO]);
    meetsNisab = goldMeets || silverMeets || moneyMeets;
    explanations.push(explain({
      ruleId: 'NISAB_COMBINE_METALS', option: 'SEPARATE', mode: input.mode, subjectId: 'nisab',
      inputs: { goldBucket, goldNisab: nisab.gold[std], goldMeets, silverBucket, silverNisab: nisab.silver[std], silverMeets, moneyBucket, moneyNisab: threshold, moneyMeets },
      output: assessable, effect: 'INFO',
    }));
  }

  const hawl = evaluateHawl(input.hawl, { mode: input.mode, rules, ...(input.hijriOffsetDays !== undefined ? { hijriOffsetDays: input.hijriOffsetDays } : {}) });
  explanations.push(...hawl.explanations);

  let zakatDue = ZERO;
  const unrounded = assessable.div(RATE_DIVISOR);
  if (meetsNisab && hawl.status === 'DUE') {
    zakatDue = roundUpToMinorUnit(unrounded, input.baseCurrency);
  }
  explanations.push(explain({ ruleId: 'FIXED', option: 'RATE_LUNAR_2_5', mode: input.mode, subjectId: 'due', inputs: { assessable, meetsNisab, hawlStatus: hawl.status }, output: meetsNisab && hawl.status === 'DUE' ? unrounded : ZERO, effect: 'INFO' }));
  explanations.push(explain({ ruleId: 'FIXED', option: 'ROUND_UP_FINAL_MINOR_UNIT', mode: input.mode, subjectId: 'due', inputs: { unrounded, currency: input.baseCurrency }, output: zakatDue, effect: 'INFO' }));

  return {
    engineVersion: ENGINE_VERSION,
    rulesetId,
    mode: input.mode,
    baseCurrency: input.baseCurrency,
    effectiveRules: rules,
    lines,
    grossZakatable: toDS(gross),
    deductions: toDS(deductions),
    net: toDS(net),
    nisab,
    meetsNisab,
    hawlStatus: hawl.status,
    zakatDue: toDS(zakatDue),
    explanations,
  };
}
```

Add to `index.ts`: `export * from './calculate.js';`

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @zakaat/core test && pnpm --filter @zakaat/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add calculate() pipeline with nisab buckets, hawl and final rounding"
```

---

### Task 12: Citation data and completeness test

**Files:**
- Modify: `packages/core/src/citations/index.ts` (fill `CITATIONS`)
- Test: `packages/core/src/citations/citations.test.ts`

**Interfaces:**
- Produces: `CITATIONS` populated for every `(ruleId, option)` in the registry and every `FIXED` option used by the engine; `FIXED_OPTIONS` constant listing the latter.

- [ ] **Step 1: Write the failing completeness test**

`packages/core/src/citations/citations.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RULES, RULE_IDS } from '../rules/registry.js';
import { CITATIONS, FIXED_OPTIONS, citationIdsFor } from './index.js';

describe('citations', () => {
  it('every registry option has at least one citation with a URL', () => {
    for (const id of RULE_IDS) {
      for (const opt of RULES[id].options) {
        const list = CITATIONS[`${id}:${opt}`] ?? [];
        expect(list.length, `${id}:${opt}`).toBeGreaterThan(0);
        for (const c of list) {
          expect(c.url, c.id).toMatch(/^https?:\/\//);
          expect(c.source.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every FIXED option used by the engine has a citation', () => {
    for (const opt of FIXED_OPTIONS) {
      expect(citationIdsFor('FIXED', opt).length, opt).toBeGreaterThan(0);
    }
  });

  it('citation ids are unique and match their key', () => {
    const seen = new Set<string>();
    for (const [key, list] of Object.entries(CITATIONS)) {
      for (const c of list) {
        expect(seen.has(c.id), c.id).toBe(false);
        seen.add(c.id);
        expect(c.id.startsWith(key.replace(':', '.'))).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @zakaat/core test -- citations`
Expected: FAIL: `FIXED_OPTIONS` is not exported and every option has zero citations.

- [ ] **Step 3: Fill `citations/index.ts`**

Replace the file with the following. Every URL below comes from `docs/research-fiqh-2026-10-07.md`; keep the quotations short.

```ts
export type Citation = { id: string; source: string; ref: string; url: string; quote?: string };

export const FIXED_OPTIONS = [
  'MONEY_FULL_VALUE', 'OTHER_ASSET_FULL_VALUE', 'MENS_GOLD_ZAKATABLE', 'METAL_HELD_AS_WEALTH',
  'STOCK_TRADING_FULL_VALUE', 'HOME_EXEMPT', 'LAND_RESALE_INTENT', 'LAND_NO_RESALE_INTENT',
  'HAWL_LATE_CLOSE', 'DEDUCTIONS_CAPPED_AT_GROSS', 'RATE_LUNAR_2_5', 'ROUND_UP_FINAL_MINOR_UNIT',
] as const;

const c = (key: string, n: number, source: string, ref: string, url: string, quote?: string): Citation =>
  ({ id: `${key.replace(':', '.')}.${n}`, source, ref, url, ...(quote ? { quote } : {}) });

const SPEC = 'Zakaat App design spec';
const SPEC_URL = 'https://github.com/WaleedAli070/zakaat-app/blob/main/docs/superpowers/specs/2026-10-07-zakaat-app-design.md';

/** keyed `${ruleId}:${option}`; FIXED rules use `FIXED:${option}` */
export const CITATIONS: Record<string, Citation[]> = {
  'NISAB_METAL:SILVER': [
    c('NISAB_METAL:SILVER', 1, 'National Zakat Foundation UK', 'Nisab', 'https://nzf.org.uk/nisab/', 'using silver is safer and more beneficial for the recipients'),
    c('NISAB_METAL:SILVER', 2, 'IslamQA.info', 'Answer 2795', 'https://islamqa.info/en/answers/2795'),
    c('NISAB_METAL:SILVER', 3, 'Askimam (Mufti Ebrahim Desai)', 'Fatwa 1346', 'https://islamqa.org/hanafi/askimam/1346/'),
  ],
  'NISAB_METAL:GOLD': [
    c('NISAB_METAL:GOLD', 1, 'Zakat Foundation of America', 'Nisab and zakat calculation in a nutshell', 'https://www.zakat.org/nisab-and-zakat-calculation-in-a-nutshell'),
    c('NISAB_METAL:GOLD', 2, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 p. 131', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
  ],
  'NISAB_GRAMS:STD_85_595': [
    c('NISAB_GRAMS:STD_85_595', 1, 'IslamQA.info', 'Answer 370380', 'https://islamqa.info/en/answers/370380'),
    c('NISAB_GRAMS:STD_85_595', 2, 'AMJA', 'Fatwa 79050', 'https://www.amjaonline.org/fatwa/en/79050/how-much-is-the-nisab-for-zakat-now'),
    c('NISAB_GRAMS:STD_85_595', 3, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 p. 130', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
  ],
  'NISAB_GRAMS:STD_87_612': [
    c('NISAB_GRAMS:STD_87_612', 1, 'National Zakat Foundation UK', 'Nisab', 'https://nzf.org.uk/nisab/', '87.48 grams of gold and 612.36 grams of silver'),
    c('NISAB_GRAMS:STD_87_612', 2, 'Qibla / Shaykh Ilyas Patel', 'The minimum zakatable amount (nisab)', 'https://islamqa.org/hanafi/qibla-hanafi/34746/the-minimum-zakatable-amount-nisab/'),
  ],
  'NISAB_GRAMS:LOWER_VALUE': [
    c('NISAB_GRAMS:LOWER_VALUE', 1, 'IslamQA.info', 'Answer 64 (most conservative threshold)', 'https://islamqa.info/en/answers/64'),
  ],
  'NISAB_COMBINE_METALS:COMBINE': [
    c('NISAB_COMBINE_METALS:COMBINE', 1, 'Darul Ifta Birmingham', 'Combining the value of gold and silver for zakat', 'https://islamqa.org/hanafi/daruliftaa-birmingham/171143/combining-the-value-of-gold-and-silver-for-zakat/'),
    c('NISAB_COMBINE_METALS:COMBINE', 2, 'IslamQA.info quoting al-Mughni', 'Answer 144734', 'https://islamqa.info/en/answers/144734'),
  ],
  'NISAB_COMBINE_METALS:SEPARATE': [
    c('NISAB_COMBINE_METALS:SEPARATE', 1, 'IslamQA.info quoting al-Nawawi', 'Answer 144734', 'https://islamqa.info/en/answers/144734', 'Gold cannot be added to silver or vice versa'),
    c('NISAB_COMBINE_METALS:SEPARATE', 2, 'IslamQA.info', 'Answer 201807', 'https://islamqa.info/en/answers/201807'),
  ],
  'HAWL_MODEL:START_END': [
    c('HAWL_MODEL:START_END', 1, 'National Zakat Foundation UK', 'Is it necessary to own zakatable assets above nisab for the entire year?', 'https://nzf.org.uk/knowledge/is-it-necessary-to-own-zakatable-assets-above-the-nisab-threshold-for-the-entire-year/'),
    c('HAWL_MODEL:START_END', 2, 'SeekersGuidance (Hanafi)', 'Do I pay zakat only on money I have had for over a year?', 'https://seekersguidance.org/answers/hanafi-fiqh/do-i-pay-zakat-only-on-money-ive-had-for-over-a-year/'),
  ],
  'HAWL_MODEL:CONTINUOUS': [
    c('HAWL_MODEL:CONTINUOUS', 1, 'IslamQA.info quoting al-Nawawi and al-Buhuti', 'Answer 99381', 'https://islamqa.info/en/answers/99381', 'it is essential that the nisaab be present throughout the year'),
    c('HAWL_MODEL:CONTINUOUS', 2, 'IslamQA.info', 'Answer 128168', 'https://islamqa.info/en/answers/128168'),
  ],
  'HAWL_NEW_WEALTH:ANNEX': [
    c('HAWL_NEW_WEALTH:ANNEX', 1, 'Darul Ifta Birmingham', 'Zakat on goods and merchandise', 'https://islamqa.org/hanafi/daruliftaa-birmingham/77184/zakat-on-goods-and-merchandise-2/'),
  ],
  'HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE': [
    c('HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE', 1, 'Darul Iftaa Jordan (Shafi\'i)', 'Ruling on money earned during hawl', 'https://islamqa.org/shafii/darul-iftaa-jordan/227971/ruling-on-money-earned-during-hawl/'),
    c('HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE', 2, 'IslamQA.info (Ibn Uthaymin)', 'Answer 50801: choose a month and pay on all of it', 'https://islamqa.info/en/answers/50801'),
    c('HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE', 3, 'IslamQA.info', 'Answer 93414', 'https://islamqa.info/en/answers/93414/zakaah-on-wealth-earned-during-the-year'),
  ],
  'JEWELLERY_PERSONAL:ZAKATABLE': [
    c('JEWELLERY_PERSONAL:ZAKATABLE', 1, 'Askimam', 'Zakat on gold jewellery', 'https://islamqa.org/hanafi/askimam/124146/zakat-on-gold-jewellery-2/'),
    c('JEWELLERY_PERSONAL:ZAKATABLE', 2, 'IslamQA.info', 'Answer 19901', 'https://islamqa.info/en/answers/19901'),
  ],
  'JEWELLERY_PERSONAL:EXEMPT_IF_WORN': [
    c('JEWELLERY_PERSONAL:EXEMPT_IF_WORN', 1, 'SeekersGuidance (Shafi\'i)', 'What constitutes jewellery wearing that obviates zakat', 'https://seekersguidance.org/answers/zakat-shafii-fiqh/what-constitutes-the-type-of-jewellery-wearing-that-obviates-the-need-to-pay-zakat-thereon/'),
    c('JEWELLERY_PERSONAL:EXEMPT_IF_WORN', 2, 'Shaykh Taha Karaan (Shafi\'i)', 'Zakah on extravagant jewelry', 'https://islamqa.org/shafii/shafiifiqh/30157/questions-regarding-zakah-on-extravagant-jewelry/'),
    c('JEWELLERY_PERSONAL:EXEMPT_IF_WORN', 3, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 pp. 147-148 (Maliki and Hanbali positions)', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
  ],
  'DEBT_DEDUCTION_SCOPE:NONE': [
    c('DEBT_DEDUCTION_SCOPE:NONE', 1, 'Qibla / Hamza Karamali (Shafi\'i)', 'Zakat, debts, and sadaqa', 'https://islamqa.org/shafii/qibla-shafii/33932/zakat-debts-zakat-and-sadaqa/', 'being in debt does not exempt one from paying zakat'),
    c('DEBT_DEDUCTION_SCOPE:NONE', 2, 'IslamQA.info (Ibn Uthaymin)', 'Answer 22426', 'https://islamqa.info/en/answers/22426'),
  ],
  'DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT': [
    c('DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT', 1, 'Darul Iftaa Leicester', 'Zakat on long and short term loans', 'https://islamqa.org/hanafi/daruliftaa/8395/zakat-on-long-and-short-term-loans/'),
    c('DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT', 2, 'AMJA / Dr Main Al-Qudah', 'Fatwa 21598', 'https://www.amjaonline.org/fatwa/en/21598/how-to-pay-zakat-while-still-paying-off-a-mortgage'),
  ],
  'DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS': [
    c('DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS', 1, 'National Zakat Foundation UK', 'Deductible liabilities', 'https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/', 'Up to 12 lunar months of instalments of longer-term debts'),
    c('DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS', 2, 'Askimam', 'Zakaat on debt', 'https://islamqa.org/hanafi/askimam/124321/zakaat-on-debt/'),
    c('DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS', 3, 'SeekersGuidance (Hanafi)', 'Calculating zakat with long-term debts', 'https://seekersguidance.org/answers/hanafi-fiqh/calculating-zakat-with-long-term-debts/'),
  ],
  'DEBT_DEDUCTION_SCOPE:FULL': [
    c('DEBT_DEDUCTION_SCOPE:FULL', 1, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 p. 70', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf', 'all debts, immediate and deferred are deductible'),
    c('DEBT_DEDUCTION_SCOPE:FULL', 2, 'FatwaCentre', 'Zakat on mortgage payments', 'https://islamqa.org/hanafi/fatwacentre/179105/zakat-on-mortgage-payments/'),
  ],
  'DEBT_SURPLUS_OFFSET:OFF': [
    c('DEBT_SURPLUS_OFFSET:OFF', 1, 'Darul Iftaa Leicester', 'Zakat and the subtraction of loans', 'https://islamqa.org/hanafi/daruliftaa/8382/zakat-and-the-subtraction-of-loans/'),
  ],
  'DEBT_SURPLUS_OFFSET:ON': [
    c('DEBT_SURPLUS_OFFSET:ON', 1, 'Islamweb (Maliki)', 'Fatwa 324727', 'https://www.islamweb.net/en/fatwa/324727/calculating-zakah-when-one-is-creditor-and-debtor'),
    c('DEBT_SURPLUS_OFFSET:ON', 2, 'Islamweb quoting Ibn Qudamah (Hanbali)', 'Fatwa 426541', 'https://www.islamweb.net/en/fatwa/426541/deducting-the-value-of-debt-from-the-nisaab-when-paying-zakaah'),
  ],
  'RECEIVABLE_TIMING:YEARLY_IF_STRONG': [
    c('RECEIVABLE_TIMING:YEARLY_IF_STRONG', 1, 'Darul Ifta Birmingham', 'Zakah on debts (qawi / da\'if)', 'https://islamqa.org/hanafi/daruliftaa-birmingham/87011/zakah-on-debts/'),
    c('RECEIVABLE_TIMING:YEARLY_IF_STRONG', 2, 'SeekersGuidance (Shafi\'i)', 'Zakat on debts not expected to be repaid', 'https://seekersguidance.org/answers/shafii-fiqh/is-zakat-obligatory-on-debts-that-are-not-expected-to-be-repaid/'),
  ],
  'RECEIVABLE_TIMING:YEARLY_ALL': [
    c('RECEIVABLE_TIMING:YEARLY_ALL', 1, 'Joe Bradford', 'How to calculate your zakat (include receivables expected back)', 'https://joebradford.substack.com/p/how-to-calculate-your-zakat'),
  ],
  'RECEIVABLE_TIMING:ON_RECEIPT': [
    c('RECEIVABLE_TIMING:ON_RECEIPT', 1, 'IslamQA.info', 'Answer 125854 (bad debt: pay once on receipt)', 'https://islamqa.info/en/answers/125854/scholarly-views-concerning-zakah-on-debts-and-the-most-correct-view'),
    c('RECEIVABLE_TIMING:ON_RECEIPT', 2, 'IslamQA.info', 'Answer 1817 (Islamic Fiqh Council)', 'https://islamqa.info/en/answers/1817/paying-zakaah-on-loans'),
  ],
  'RETIREMENT_METHOD:FULL_VESTED': [
    c('RETIREMENT_METHOD:FULL_VESTED', 1, 'SeekersGuidance / Faraz A. Khan', 'Zakat on 401k retirement plans', 'https://seekersguidance.org/answers/hanafi-fiqh/zakat-on-401kretirement-plans/'),
  ],
  'RETIREMENT_METHOD:NET_WITHDRAWABLE': [
    c('RETIREMENT_METHOD:NET_WITHDRAWABLE', 1, 'AMJA / Dr Main Al-Qudah', 'Zakat and the 401k retirement plan', 'https://www.amjaonline.org/fatwa/en/23284/zakat-and-the-401k-retirement-plan'),
    c('RETIREMENT_METHOD:NET_WITHDRAWABLE', 2, 'Fiqh Council of North America', 'Zakat on retirement accounts (Feb 2024)', 'https://fiqhcouncil.org/wp-content/uploads/2024/02/Zakat-on-Retirement-Accounts.pdf'),
  ],
  'RETIREMENT_METHOD:ZAKATABLE_PROPORTION': [
    c('RETIREMENT_METHOD:ZAKATABLE_PROPORTION', 1, 'Fiqh Council of North America', 'Zakah on retirement funds (Feb 2026)', 'https://fiqhcouncil.org/zakah-on-retirement-funds/'),
    c('RETIREMENT_METHOD:ZAKATABLE_PROPORTION', 2, 'National Zakat Foundation UK', 'Pensions', 'https://nzf.org.uk/knowledge/pensions/'),
  ],
  'RETIREMENT_METHOD:NONE_UNTIL_ACCESS': [
    c('RETIREMENT_METHOD:NONE_UNTIL_ACCESS', 1, 'Joe Bradford', 'Pay zakat on 401k?', 'https://joebradford.net/pay-zakat-on-401k/'),
    c('RETIREMENT_METHOD:NONE_UNTIL_ACCESS', 2, 'IslamQA.info', 'Answer 97442', 'https://islamqa.info/en/answers/97442'),
    c('RETIREMENT_METHOD:NONE_UNTIL_ACCESS', 3, 'Darul Iftaa Jordan (Shafi\'i)', 'Fatwa 228649', 'https://islamqa.org/shafii/darul-iftaa-jordan/228649/'),
  ],
  'RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY': [
    c('RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY', 1, 'Darul Ifta Deoband', 'Fatwa 26346', 'https://islamqa.org/hanafi/darulifta-deoband/26346/'),
    c('RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY', 2, 'Askimam', 'Fatwa 102466', 'https://islamqa.org/hanafi/askimam/102466/'),
  ],
  'STOCK_PASSIVE_METHOD:PROXY_25': [
    c('STOCK_PASSIVE_METHOD:PROXY_25', 1, 'National Zakat Foundation UK', 'Determining a proxy for share investments', 'https://nzf.org.uk/knowledge/zakat-on-share-investments-determining-a-proxy-for-calculation/'),
  ],
  'STOCK_PASSIVE_METHOD:PROXY_30': [
    c('STOCK_PASSIVE_METHOD:PROXY_30', 1, 'Fiqh Council of North America', 'Zakah on stocks (Nov 2025)', 'https://fiqhcouncil.org/zakah-on-stocks/'),
    c('STOCK_PASSIVE_METHOD:PROXY_30', 2, 'Joe Bradford', 'How we calculate zakat on stocks', 'https://joebradford.net/how-we-calculate-zakat-on-stocks/'),
    c('STOCK_PASSIVE_METHOD:PROXY_30', 3, 'National Zakat Foundation Canada', 'Zakat calculator', 'https://www.nzfcanada.com/zakat-calculator'),
  ],
  'STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE': [
    c('STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE', 1, 'Zaytuna College', 'Zakat calculator', 'https://zakatcalculator.zaytuna.edu/'),
    c('STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE', 2, 'IslamQA.info', 'Answer 69912', 'https://islamqa.info/en/answers/69912'),
  ],
  'STOCK_PASSIVE_METHOD:DIVIDENDS_ONLY': [
    c('STOCK_PASSIVE_METHOD:DIVIDENDS_ONLY', 1, 'AMJA / Dr Main Al-Qudah', 'Fatwa 82475', 'https://www.amjaonline.org/fatwa/en/82475/zakat-on-401k-shares'),
  ],
  'RENTAL_METHOD:SAVED_RENT': [
    c('RENTAL_METHOD:SAVED_RENT', 1, 'IslamQA.info', 'Answer 231858', 'https://islamqa.info/en/answers/231858/how-to-pay-zakah-on-real-estate'),
    c('RENTAL_METHOD:SAVED_RENT', 2, 'National Zakat Foundation UK', 'Zakat on property', 'https://nzf.org.uk/knowledge/zakat-on-property/'),
  ],
  'RENTAL_METHOD:QARADAWI_NET_RENT_10': [
    c('RENTAL_METHOD:QARADAWI_NET_RENT_10', 1, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 ch. 8 pp. 245-247', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
  ],
  'RENTAL_METHOD:HIGHER': [
    c('RENTAL_METHOD:HIGHER', 1, 'IslamQA.info', 'Answer 128168 (giving zakat to avoid scholarly difference is better)', 'https://islamqa.info/en/answers/128168'),
  ],
  'PLOT_FILE:FROM_PURCHASE': [
    c('PLOT_FILE:FROM_PURCHASE', 1, 'Jamia Banuri Town', 'Fatwa 144109201332', 'https://www.banuri.edu.pk/readquestion/qisto-par-kharede-gay-pilot-main-zakat-ka-hukum-144109201332/06-05-2020'),
    c('PLOT_FILE:FROM_PURCHASE', 2, 'Jamia tur Rasheed', 'Fatwa mRq', 'https://darulifta.info/d/jamiaturrasheed/fatwa/mRq/x'),
    c('PLOT_FILE:FROM_PURCHASE', 3, 'Jamia Binoria', 'Fatwa csHz (pure file = receivable)', 'https://darulifta.info/d/onlinefatawa/fatwa/csHz/'),
  ],
  'PLOT_FILE:FROM_POSSESSION': [
    c('PLOT_FILE:FROM_POSSESSION', 1, 'Jamia tur Rasheed citing Ahsan al-Fatawa 4/294', 'Fatwa 3nv', 'https://www.darulifta.info/d/jamiaturrasheed/fatwa/3nv/'),
  ],
  'ADVANCE_PAYMENT:ALLOWED': [
    c('ADVANCE_PAYMENT:ALLOWED', 1, 'Askimam', 'Fatwa 85041', 'https://islamqa.org/hanafi/askimam/85041/'),
  ],
  'ADVANCE_PAYMENT:ALLOWED_ONE_YEAR': [
    c('ADVANCE_PAYMENT:ALLOWED_ONE_YEAR', 1, 'SeekersGuidance (Shafi\'i)', 'Is advance payment of zakat permissible in the Shafi\'i school?', 'https://seekersguidance.org/answers/shafii-fiqh/is-advance-payment-of-zakat-permissible-in-the-shafii-school/'),
  ],
  'ADVANCE_PAYMENT:ALLOWED_TWO_YEARS': [
    c('ADVANCE_PAYMENT:ALLOWED_TWO_YEARS', 1, 'Islamweb quoting al-Mardawi', 'Fatwa 51830', 'https://www.islamweb.net/en/fatwa/51830/'),
  ],
  'ADVANCE_PAYMENT:RESTRICTED': [
    c('ADVANCE_PAYMENT:RESTRICTED', 1, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 2 p. 152 (Malik does not allow pre-payment)', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol2.pdf'),
    c('ADVANCE_PAYMENT:RESTRICTED', 2, 'Islamweb', 'Fatwa 51830', 'https://www.islamweb.net/en/fatwa/51830/'),
  ],
  'QADA_PRIOR_UNPAID:DEDUCT': [
    c('QADA_PRIOR_UNPAID:DEDUCT', 1, 'SeekersGuidance (Hanafi)', 'How do I pay zakat from previous years?', 'https://seekersguidance.org/answers/hanafi-fiqh/how-do-i-pay-zakat-from-previous-years/'),
    c('QADA_PRIOR_UNPAID:DEDUCT', 2, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 p. 70', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
  ],
  'QADA_PRIOR_UNPAID:NO_DEDUCT': [
    c('QADA_PRIOR_UNPAID:NO_DEDUCT', 1, 'IslamQA.info', 'Answer 26119', 'https://islamqa.info/en/answers/26119/making-up-zakaah-from-past-years'),
  ],
  'FIXED:MONEY_FULL_VALUE': [
    c('FIXED:MONEY_FULL_VALUE', 1, 'IslamQA.info', 'Answer 145600 (2.5% on money)', 'https://islamqa.info/en/answers/145600'),
  ],
  'FIXED:OTHER_ASSET_FULL_VALUE': [
    c('FIXED:OTHER_ASSET_FULL_VALUE', 1, SPEC, 'Section 2.1, Other zakatable asset', SPEC_URL),
    c('FIXED:OTHER_ASSET_FULL_VALUE', 2, 'National Zakat Foundation UK', 'Is zakat due on Bitcoin? (full value)', 'https://nzf.org.uk/knowledge/is-zakat-due-on-bitcoin/'),
  ],
  'FIXED:MENS_GOLD_ZAKATABLE': [
    c('FIXED:MENS_GOLD_ZAKATABLE', 1, 'IslamQA.info', 'Answer 59866', 'https://islamqa.info/en/answers/59866/zakaah-on-jewellery-that-has-been-prepared-for-use', 'zakah is obligatory on gold and silver jewellery if it is a kind of adornment that it is prohibited to use'),
  ],
  'FIXED:METAL_HELD_AS_WEALTH': [
    c('FIXED:METAL_HELD_AS_WEALTH', 1, 'Yusuf al-Qaradawi', 'Fiqh al-Zakah vol. 1 pp. 147-148 (unworn or hoarded jewellery)', 'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf'),
    c('FIXED:METAL_HELD_AS_WEALTH', 2, 'IslamQA.info', 'Answer 59866', 'https://islamqa.info/en/answers/59866/zakaah-on-jewellery-that-has-been-prepared-for-use'),
  ],
  'FIXED:STOCK_TRADING_FULL_VALUE': [
    c('FIXED:STOCK_TRADING_FULL_VALUE', 1, 'Mufti Taqi Usmani', 'How to pay zakat', 'https://muftitaqiusmani.com/en/how-to-pay-zakat/'),
    c('FIXED:STOCK_TRADING_FULL_VALUE', 2, 'Fiqh Council of North America', 'Zakah on stocks', 'https://fiqhcouncil.org/zakah-on-stocks/'),
  ],
  'FIXED:HOME_EXEMPT': [
    c('FIXED:HOME_EXEMPT', 1, 'IslamQA.info', 'Answer 231858', 'https://islamqa.info/en/answers/231858/how-to-pay-zakah-on-real-estate'),
  ],
  'FIXED:LAND_RESALE_INTENT': [
    c('FIXED:LAND_RESALE_INTENT', 1, 'Mufti Taqi Usmani', 'How to pay zakat', 'https://muftitaqiusmani.com/en/how-to-pay-zakat/'),
    c('FIXED:LAND_RESALE_INTENT', 2, 'SeekersGuidance (Shafi\'i)', 'Do I have to pay zakat on land?', 'https://seekersguidance.org/answers/shafii-fiqh/do-i-have-to-pay-zakat-on-land/'),
  ],
  'FIXED:LAND_NO_RESALE_INTENT': [
    c('FIXED:LAND_NO_RESALE_INTENT', 1, 'IslamQA.info quoting Ibn Qudamah', 'Answer 249774', 'https://islamqa.info/en/answers/249774'),
    c('FIXED:LAND_NO_RESALE_INTENT', 2, 'Jamia Banuri Town', 'Plot bought without firm intention of trade', 'https://www.banuri.edu.pk/readquestion/پلاٹ-کے-خریدتے-وقت-تجارت-کی-حتمی-نیت-نہ-ہو-تو-اس-پر-زکو-ۃ-کا-حکم/27-12-2018'),
  ],
  'FIXED:HAWL_LATE_CLOSE': [
    c('FIXED:HAWL_LATE_CLOSE', 1, 'IslamQA.info', 'Answer 169899 (delaying zakat past its due date is not permitted)', 'https://islamqa.info/en/answers/169899'),
  ],
  'FIXED:DEDUCTIONS_CAPPED_AT_GROSS': [
    c('FIXED:DEDUCTIONS_CAPPED_AT_GROSS', 1, SPEC, 'Section 6, pipeline (net floors at zero)', SPEC_URL),
  ],
  'FIXED:RATE_LUNAR_2_5': [
    c('FIXED:RATE_LUNAR_2_5', 1, 'IslamQA.info', 'Answer 145600', 'https://islamqa.info/en/answers/145600'),
    c('FIXED:RATE_LUNAR_2_5', 2, 'National Zakat Foundation UK', 'Can a solar year be used? (lunar advised)', 'https://nzf.org.uk/knowledge/can-a-solar-year-be-used-for-zakat-calculation/'),
  ],
  'FIXED:ROUND_UP_FINAL_MINOR_UNIT': [
    c('FIXED:ROUND_UP_FINAL_MINOR_UNIT', 1, SPEC, 'Section 3.1, ROUNDING', SPEC_URL),
    c('FIXED:ROUND_UP_FINAL_MINOR_UNIT', 2, 'IslamQA.info', 'Answer 128168 (pay to avoid the difference of scholars)', 'https://islamqa.info/en/answers/128168'),
  ],
};

export function citationIdsFor(ruleId: string, option: string): string[] {
  return (CITATIONS[`${ruleId}:${option}`] ?? []).map((c) => c.id);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @zakaat/core test`
Expected: PASS, including the earlier valuation and calculate tests (their `citationIds` arrays are now non-empty, which no test asserted against).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "core: add sourced citations for every rule option"
```

---

### Task 13: Golden vectors

**Files:**
- Create: `packages/core/test/vectors.test.ts`, `packages/core/test/vectors/<mode>/<name>.json` (nine files below)
- Modify: `packages/core/vitest.config.ts` (include `test/**/*.test.ts`)

**Interfaces:**
- Produces the vector schema every later vector (including scholar-reviewed ones) must follow:
```ts
type Vector = {
  name: string;
  reviewedBy: { name: string; organisation: string; date: string } | null;
  sources: string[];
  input: CalculationInput;
  expected: {
    grossZakatable: string; deductions: string; net: string; zakatDue: string;
    meetsNisab: boolean; hawlStatus: 'DUE' | 'BROKEN' | 'RESET';
    explanationIncludes: { ruleId: string; option: string; subjectId: string; effect: string }[];
  };
};
```

- [ ] **Step 1: Update the Vitest include and write the loader test**

`packages/core/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'], environment: 'node' },
});
```

`packages/core/test/vectors.test.ts`:
```ts
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { calculate, type CalculationInput } from '../src/index.js';

type Vector = {
  name: string;
  reviewedBy: { name: string; organisation: string; date: string } | null;
  sources: string[];
  input: CalculationInput;
  expected: {
    grossZakatable: string; deductions: string; net: string; zakatDue: string;
    meetsNisab: boolean; hawlStatus: 'DUE' | 'BROKEN' | 'RESET';
    explanationIncludes: { ruleId: string; option: string; subjectId: string; effect: string }[];
  };
};

const files = import.meta.glob<{ default: Vector }>('./vectors/**/*.json', { eager: true });
const vectors = Object.entries(files).map(([path, mod]) => ({ path, vector: mod.default }));

describe('golden vectors', () => {
  it('loads at least nine vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(9);
  });

  for (const { path, vector } of vectors) {
    it(`${vector.name} (${path})`, () => {
      const out = calculate(vector.input);
      expect(out.grossZakatable).toBe(vector.expected.grossZakatable);
      expect(out.deductions).toBe(vector.expected.deductions);
      expect(out.net).toBe(vector.expected.net);
      expect(out.zakatDue).toBe(vector.expected.zakatDue);
      expect(out.meetsNisab).toBe(vector.expected.meetsNisab);
      expect(out.hawlStatus).toBe(vector.expected.hawlStatus);
      for (const want of vector.expected.explanationIncludes) {
        const found = out.explanations.some((e) =>
          e.ruleId === want.ruleId && e.option === want.option && e.subjectId === want.subjectId && e.effect === want.effect);
        expect(found, `${vector.name}: ${JSON.stringify(want)}`).toBe(true);
      }
      expect(Array.isArray(vector.sources) && vector.sources.length > 0).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @zakaat/core test -- vectors`
Expected: FAIL on "loads at least nine vectors" (zero files).

- [ ] **Step 3: Write the nine vectors**

All vectors share this price table and hawl unless stated:
```json
"prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
"hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" }
```

`test/vectors/hanafi/jewellery-worn-and-cash.json`:
```json
{
  "name": "Hanafi: worn gold jewellery is zakatable alongside cash",
  "reviewedBy": null,
  "sources": ["https://islamqa.org/hanafi/askimam/124146/zakat-on-gold-jewellery-2/", "https://nzf.org.uk/nisab/"],
  "input": {
    "mode": "HANAFI", "baseCurrency": "USD",
    "assets": [
      { "id": "g1", "label": "Bangles", "currency": "USD", "category": "GOLD", "weightGrams": "100", "purity": "1", "usage": "WORN" },
      { "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "5000" }
    ],
    "liabilities": [],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "15000", "deductions": "0", "net": "15000", "zakatDue": "375",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [
      { "ruleId": "JEWELLERY_PERSONAL", "option": "ZAKATABLE", "subjectId": "g1", "effect": "INCLUDE" },
      { "ruleId": "NISAB_METAL", "option": "SILVER", "subjectId": "nisab", "effect": "INFO" }
    ]
  }
}
```

`test/vectors/shafii/jewellery-worn-exempt.json`:
```json
{
  "name": "Shafii: worn jewellery exempt; cash alone below gold nisab",
  "reviewedBy": null,
  "sources": ["https://seekersguidance.org/answers/zakat-shafii-fiqh/what-constitutes-the-type-of-jewellery-wearing-that-obviates-the-need-to-pay-zakat-thereon/", "https://islamqa.info/en/answers/144734"],
  "input": {
    "mode": "SHAFII", "baseCurrency": "USD",
    "assets": [
      { "id": "g1", "label": "Bangles", "currency": "USD", "category": "GOLD", "weightGrams": "100", "purity": "1", "usage": "WORN" },
      { "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "5000" }
    ],
    "liabilities": [],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "5000", "deductions": "0", "net": "5000", "zakatDue": "0",
    "meetsNisab": false, "hawlStatus": "DUE",
    "explanationIncludes": [
      { "ruleId": "JEWELLERY_PERSONAL", "option": "EXEMPT_IF_WORN", "subjectId": "g1", "effect": "EXCLUDE" },
      { "ruleId": "NISAB_COMBINE_METALS", "option": "SEPARATE", "subjectId": "nisab", "effect": "INFO" }
    ]
  }
}
```

`test/vectors/hanafi/mortgage-twelve-months.json`:
```json
{
  "name": "Hanafi: long-term mortgage deducts next 12 months net of interest",
  "reviewedBy": null,
  "sources": ["https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/", "https://islamqa.org/hanafi/askimam/124321/zakaat-on-debt/"],
  "input": {
    "mode": "HANAFI", "baseCurrency": "PKR",
    "assets": [{ "id": "b1", "label": "Meezan", "currency": "PKR", "category": "BANK", "amount": "1000000" }],
    "liabilities": [{ "id": "m1", "label": "House loan", "kind": "LONG_TERM", "currency": "PKR", "totalOutstanding": "5000000", "currentlyDue": "50000", "dueWithinYear": "600000", "interestWithinYear": "100000" }],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "1000000", "deductions": "500000", "net": "500000", "zakatDue": "12500",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [{ "ruleId": "DEBT_DEDUCTION_SCOPE", "option": "TWELVE_MONTHS", "subjectId": "m1", "effect": "DEDUCT" }]
  }
}
```

`test/vectors/shafii/no-debt-deduction.json`:
```json
{
  "name": "Shafii: debts do not reduce zakat",
  "reviewedBy": null,
  "sources": ["https://islamqa.org/shafii/qibla-shafii/33932/zakat-debts-zakat-and-sadaqa/"],
  "input": {
    "mode": "SHAFII", "baseCurrency": "PKR",
    "assets": [{ "id": "b1", "label": "Bank", "currency": "PKR", "category": "BANK", "amount": "3000000" }],
    "liabilities": [{ "id": "m1", "label": "House loan", "kind": "LONG_TERM", "currency": "PKR", "totalOutstanding": "5000000", "currentlyDue": "50000", "dueWithinYear": "600000", "interestWithinYear": "100000" }],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "3000000", "deductions": "0", "net": "3000000", "zakatDue": "75000",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [{ "ruleId": "DEBT_DEDUCTION_SCOPE", "option": "NONE", "subjectId": "m1", "effect": "EXCLUDE" }]
  }
}
```

`test/vectors/maliki/surplus-offset.json`:
```json
{
  "name": "Maliki: debt offset against surplus non-zakatable assets before deduction",
  "reviewedBy": null,
  "sources": ["https://www.islamweb.net/en/fatwa/324727/calculating-zakah-when-one-is-creditor-and-debtor"],
  "input": {
    "mode": "MALIKI", "baseCurrency": "USD",
    "assets": [{ "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "20000" }],
    "liabilities": [{ "id": "l1", "label": "Personal loan", "kind": "IMMEDIATE", "currency": "USD", "totalOutstanding": "8000", "currentlyDue": "8000", "dueWithinYear": "8000", "interestWithinYear": "0" }],
    "surplusNonZakatableAssets": "5000",
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "20000", "deductions": "3000", "net": "17000", "zakatDue": "425",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [{ "ruleId": "DEBT_SURPLUS_OFFSET", "option": "ON", "subjectId": "liabilities", "effect": "PARTIAL" }]
  }
}
```

`test/vectors/general/maximum-of-opinions.json`:
```json
{
  "name": "General: every contested rule resolves to the maximum-zakat option",
  "reviewedBy": null,
  "sources": ["https://islamqa.info/en/answers/128168", "https://islamqa.info/en/answers/64"],
  "input": {
    "mode": "GENERAL", "baseCurrency": "USD",
    "assets": [
      { "id": "g1", "label": "Bangles", "currency": "USD", "category": "GOLD", "weightGrams": "100", "purity": "1", "usage": "WORN" },
      { "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "20000" },
      { "id": "s1", "label": "Index fund", "currency": "USD", "category": "STOCK", "marketValue": "10000", "intent": "PASSIVE" },
      { "id": "r1", "label": "401k", "currency": "USD", "category": "RETIREMENT", "vestedBalance": "10000", "accessible": false, "taxPercent": "20", "penaltyPercent": "10", "voluntaryPercent": "40" }
    ],
    "liabilities": [{ "id": "l1", "label": "Card", "kind": "IMMEDIATE", "currency": "USD", "totalOutstanding": "8000", "currentlyDue": "8000", "dueWithinYear": "8000", "interestWithinYear": "0" }],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "50000", "deductions": "0", "net": "50000", "zakatDue": "1250",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [
      { "ruleId": "STOCK_PASSIVE_METHOD", "option": "FULL_MARKET_VALUE", "subjectId": "s1", "effect": "INCLUDE" },
      { "ruleId": "RETIREMENT_METHOD", "option": "FULL_VESTED", "subjectId": "r1", "effect": "INCLUDE" },
      { "ruleId": "DEBT_DEDUCTION_SCOPE", "option": "NONE", "subjectId": "l1", "effect": "EXCLUDE" },
      { "ruleId": "NISAB_GRAMS", "option": "LOWER_VALUE", "subjectId": "nisab", "effect": "INFO" }
    ]
  }
}
```

`test/vectors/hanafi/plot-file-from-purchase.json`:
```json
{
  "name": "Hanafi (Deobandi majority): specific plot bought to resell is zakatable before possession",
  "reviewedBy": null,
  "sources": ["https://www.banuri.edu.pk/readquestion/qisto-par-kharede-gay-pilot-main-zakat-ka-hukum-144109201332/06-05-2020"],
  "input": {
    "mode": "HANAFI", "baseCurrency": "PKR",
    "assets": [{ "id": "p1", "label": "DHA file", "currency": "PKR", "category": "REAL_ESTATE", "type": "PLOT_FILE", "marketValue": "2000000", "specificPlot": true, "resaleIntentAtPurchase": true, "possessionTaken": false }],
    "liabilities": [],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "2000000", "deductions": "0", "net": "2000000", "zakatDue": "50000",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [{ "ruleId": "PLOT_FILE", "option": "FROM_PURCHASE", "subjectId": "p1", "effect": "INCLUDE" }]
  }
}
```

`test/vectors/shafii/hawl-broken.json`:
```json
{
  "name": "Shafii: a dip below nisab during the year breaks the hawl",
  "reviewedBy": null,
  "sources": ["https://islamqa.info/en/answers/99381", "https://islamqa.info/en/answers/128168"],
  "input": {
    "mode": "SHAFII", "baseCurrency": "USD",
    "assets": [{ "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "20000" }],
    "liabilities": [],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "YES", "regainedISO": "2025-10-01" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "20000", "deductions": "0", "net": "20000", "zakatDue": "0",
    "meetsNisab": true, "hawlStatus": "BROKEN",
    "explanationIncludes": [{ "ruleId": "HAWL_MODEL", "option": "CONTINUOUS", "subjectId": "period", "effect": "WARNING" }]
  }
}
```

`test/vectors/hanbali/separate-metals.json`:
```json
{
  "name": "Hanbali: metals not combined; only the silver bucket meets its own nisab",
  "reviewedBy": null,
  "sources": ["https://islamqa.info/en/answers/144734", "https://www.islamweb.net/en/fatwa/81848/adding-gold-and-silver-together-for-zakah"],
  "input": {
    "mode": "HANBALI", "baseCurrency": "USD",
    "assets": [
      { "id": "g1", "label": "Gold coins", "currency": "USD", "category": "GOLD", "weightGrams": "50", "purity": "1", "usage": "INVESTMENT" },
      { "id": "s1", "label": "Silver bars", "currency": "USD", "category": "SILVER", "weightGrams": "1000", "purity": "1", "usage": "INVESTMENT" },
      { "id": "c1", "label": "Cash", "currency": "USD", "category": "CASH", "amount": "1000" }
    ],
    "liabilities": [],
    "hawl": { "startISO": "2025-03-01", "closeISO": "2026-02-18", "dipBelowNisab": "NO" },
    "prices": { "asOf": "2026-10-01", "perGram": { "XAU": { "USD": "100" }, "XAG": { "USD": "1", "PKR": "280" } }, "fx": { "USD": { "USD": "1", "PKR": "280", "GBP": "0.8" } } }
  },
  "expected": {
    "grossZakatable": "7000", "deductions": "0", "net": "7000", "zakatDue": "25",
    "meetsNisab": true, "hawlStatus": "DUE",
    "explanationIncludes": [{ "ruleId": "NISAB_COMBINE_METALS", "option": "SEPARATE", "subjectId": "nisab", "effect": "INFO" }]
  }
}
```

- [ ] **Step 4: Run the vectors**

Run: `pnpm --filter @zakaat/core test -- vectors`
Expected: PASS, nine vectors. If a vector fails, the engine is wrong, not the vector: the expected numbers above were derived by hand from the spec rules (worked arithmetic: vector 3 deduction = 600000 − 100000 = 500000; vector 9 silver bucket 1000 ≥ 595 so assessable 1000 → 25).

- [ ] **Step 5: Commit**

```bash
git add packages/core/test packages/core/vitest.config.ts
git commit -m "core: add golden vector harness and nine hand-derived vectors"
```

---

### Task 14: Property-based tests and explanation snapshots

**Files:**
- Create: `packages/core/test/properties.test.ts`, `packages/core/test/snapshots.test.ts`

**Interfaces:**
- Consumes `calculate`, `MODES`, the vector loader pattern from Task 13.

- [ ] **Step 1: Write the property tests**

`packages/core/test/properties.test.ts`:
```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MODES, calculate, type AssetInput, type CalculationInput, type JewelleryUsage, type LiabilityInput, type Mode } from '../src/index.js';

const PRICES: CalculationInput['prices'] = {
  asOf: '2026-10-01',
  perGram: { XAU: { USD: '100' }, XAG: { USD: '1', PKR: '280' } },
  fx: { USD: { USD: '1', PKR: '280', GBP: '0.8' } },
};
const HAWL = { startISO: '2025-03-01', closeISO: '2026-02-18', dipBelowNisab: 'NO' as const };

const cents = fc.integer({ min: 0, max: 1_000_000_000 }).map((n) => `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`);
const grams = fc.integer({ min: 0, max: 5_000_000 }).map((n) => `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, '0')}`);

const moneyAsset = (id: string) => cents.map<AssetInput>((amount) => ({ id, label: id, currency: 'USD', category: 'CASH', amount }));
const goldAsset = (id: string) => fc.tuple(grams, fc.constantFrom<JewelleryUsage>('WORN', 'STORED', 'INVESTMENT', 'MENS'))
  .map<AssetInput>(([weightGrams, usage]) => ({ id, label: id, currency: 'USD', category: 'GOLD', weightGrams, purity: '1', usage }));
const liability = (id: string) => fc.tuple(cents, fc.constantFrom<LiabilityInput['kind']>('IMMEDIATE', 'LONG_TERM')).map<LiabilityInput>(([amt, kind]) => ({
  id, label: id, kind, currency: 'USD', totalOutstanding: amt, currentlyDue: amt, dueWithinYear: amt, interestWithinYear: '0',
}));

const scenario = fc.record({
  mode: fc.constantFrom(...MODES),
  assets: fc.tuple(moneyAsset('c1'), moneyAsset('c2'), goldAsset('g1')).map((t) => [...t]),
  liabilities: fc.array(liability('l1'), { maxLength: 1 }),
});

function run(mode: Mode, assets: AssetInput[], liabilities: LiabilityInput[]) {
  return calculate({ mode, baseCurrency: 'USD', assets, liabilities, hawl: HAWL, prices: PRICES, surplusNonZakatableAssets: '0' });
}

describe('engine invariants', () => {
  it('due is non-negative and canonical; zero iff nisab unmet or hawl not due', () => {
    fc.assert(fc.property(scenario, ({ mode, assets, liabilities }) => {
      const out = run(mode, assets, liabilities);
      expect(out.zakatDue).toMatch(/^\d+(\.\d+)?$/);
      expect(out.zakatDue === '0').toBe(!(out.meetsNisab && out.hawlStatus === 'DUE'));
    }), { numRuns: 300 });
  });

  it('adding cash never decreases the due (monotone)', () => {
    fc.assert(fc.property(scenario, cents, ({ mode, assets, liabilities }, extra) => {
      const base = run(mode, assets, liabilities);
      const more = run(mode, [...assets, { id: 'x', label: 'x', currency: 'USD', category: 'CASH', amount: extra }], liabilities);
      expect(Number(more.zakatDue)).toBeGreaterThanOrEqual(Number(base.zakatDue));
    }), { numRuns: 300 });
  });

  it('General never undercuts any other mode', () => {
    fc.assert(fc.property(scenario, ({ assets, liabilities }) => {
      const general = Number(run('GENERAL', assets, liabilities).zakatDue);
      for (const mode of ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI'] as const) {
        expect(general).toBeGreaterThanOrEqual(Number(run(mode, assets, liabilities).zakatDue));
      }
    }), { numRuns: 200 });
  });

  it('changing base currency changes the due by the FX rate within one minor unit', () => {
    fc.assert(fc.property(scenario, ({ mode, assets, liabilities }) => {
      const usd = calculate({ mode, baseCurrency: 'USD', assets, liabilities, hawl: HAWL, prices: PRICES, surplusNonZakatableAssets: '0' });
      const pkr = calculate({ mode, baseCurrency: 'PKR', assets, liabilities, hawl: HAWL, prices: PRICES, surplusNonZakatableAssets: '0' });
      const diff = Math.abs(Number(pkr.zakatDue) - Number(usd.zakatDue) * 280);
      expect(diff).toBeLessThanOrEqual(0.01 * 280 + 0.01); // USD rounding (<= 1 cent x 280) plus PKR rounding (<= 1 paisa)
    }), { numRuns: 200 });
  });

  it('is deterministic', () => {
    fc.assert(fc.property(scenario, ({ mode, assets, liabilities }) => {
      expect(run(mode, assets, liabilities)).toEqual(run(mode, assets, liabilities));
    }), { numRuns: 100 });
  });
});
```

- [ ] **Step 2: Write the snapshot test**

`packages/core/test/snapshots.test.ts`:
```ts
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { calculate, type CalculationInput } from '../src/index.js';

const files = import.meta.glob<{ default: { name: string; input: CalculationInput } }>('./vectors/**/*.json', { eager: true });

describe('explanation snapshots', () => {
  for (const [path, mod] of Object.entries(files)) {
    it(`${mod.default.name} (${path})`, () => {
      const out = calculate(mod.default.input);
      expect(out.explanations.map((e) => ({ ruleId: e.ruleId, option: e.option, subjectId: e.subjectId, effect: e.effect, output: e.output, messageKey: e.messageKey }))).toMatchSnapshot();
    });
  }
});
```

- [ ] **Step 3: Run both; the first run writes the snapshot files**

Run: `pnpm --filter @zakaat/core test`
Expected: PASS; `packages/core/test/__snapshots__/snapshots.test.ts.snap` is created. Open it and confirm every vector's sequence ends with `RATE_LUNAR_2_5` then `ROUND_UP_FINAL_MINOR_UNIT`.

- [ ] **Step 4: Commit including the snapshot file**

```bash
git add packages/core/test
git commit -m "core: add property-based invariants and explanation snapshots"
```

---

### Task 15: Build output, CI, package README

**Files:**
- Create: `.github/workflows/ci.yml`, `packages/core/README.md`
- Modify: `packages/core/src/index.ts` (final export list check)

**Interfaces:**
- Produces: `pnpm build` emits `packages/core/dist` with `.d.ts`; CI runs lint, typecheck, test on every push and pull request.

- [ ] **Step 1: Verify the public surface and the build**

`packages/core/src/index.ts` must be exactly:
```ts
export * from './money.js';
export * from './units.js';
export * from './hijri.js';
export * from './version.js';
export * from './rules/registry.js';
export * from './types.js';
export * from './rulesets/index.js';
export * from './prices.js';
export * from './nisab.js';
export * from './explain.js';
export * from './citations/index.js';
export * from './valuation/index.js';
export * from './liabilities.js';
export * from './hawl.js';
export * from './calculate.js';
```

Run: `pnpm build && ls packages/core/dist/index.d.ts && node -e "import('./packages/core/dist/index.js').then(m => console.log(m.ENGINE_VERSION, typeof m.calculate))"`
Expected: `0.1.0 function`.

- [ ] **Step 2: Add the CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 3: Write the package README**

`packages/core/README.md`:
```markdown
# @zakaat/core

Pure zakat rules engine. No I/O, no platform APIs. Inputs and outputs are plain objects with decimal strings.

## Usage
```ts
import { calculate } from '@zakaat/core';

const out = calculate({
  mode: 'HANAFI',
  baseCurrency: 'PKR',
  assets: [{ id: 'g1', label: 'Bangles', currency: 'PKR', category: 'GOLD', weightGrams: '116.638038', purity: '0.9166666667', usage: 'WORN' }],
  liabilities: [],
  hawl: { startISO: '2025-03-01', closeISO: '2026-02-18' },
  prices: { asOf: '2026-02-18', perGram: { XAU: { PKR: '36000' }, XAG: { PKR: '400' } }, fx: { USD: { USD: '1', PKR: '280' } } },
});
console.log(out.zakatDue, out.explanations.map((e) => e.messageKey));
```

## Concepts
- **Modes**: HANAFI, SHAFII, MALIKI, HANBALI, GENERAL (precaution: maximum-zakat option per contested rule).
- **Rules**: `RULES` registry of rule ids and options; `RULESETS` map each mode to defaults; `resolveRules(mode, overrides)` applies user overrides to overridable rules only.
- **Explanations**: every rule application emits `{ ruleId, option, subjectId, inputs, output, effect, citationIds, messageKey }`. UI renders `messageKey`; `CITATIONS` resolves ids to sources.
- **Hawl**: `evaluateHawl` applies START_END or CONTINUOUS with year-end attestations; Hijri arithmetic via Umm al-Qura with a per-user day offset.
- **Money**: `Decimal` end to end; rate is `net / 40`; rounded up once to the currency minor unit.

## Tests
`pnpm --filter @zakaat/core test` runs unit tests, golden vectors (`test/vectors/**`), property tests and explanation snapshots. Vectors carry a `reviewedBy` block for scholar sign-off; changing a vector is a fiqh decision.
```

- [ ] **Step 4: Run the full pipeline and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

```bash
git add .github packages/core/README.md packages/core/src/index.ts
git commit -m "core: finalize exports, add CI workflow and package README"
```

Do not push; the repository owner pushes.

---

## Self-review notes

- **Spec coverage (§3, §6, §10):** every rule id in spec §3.1 is in the registry (Task 5) with the spec's defaults (Task 6); hawl semantics §3.2 (Task 10); nisab §3.3 (Task 7, Task 11); engine contract §6 (Tasks 8–11); explanations §6 (Task 8); citations (Task 12); golden vectors, property tests, snapshots and determinism §10 (Tasks 13–14). Hijri conversions §6 (Task 4). `MINORS` is informational in the spec and intentionally has no engine rule. The solar 2.577% rate is excluded per spec. The `BALANCE_SHEET` stock option from the spec is implemented as a user-supplied `proxyPercent` on the asset rather than a separate option; the spec table's wording should be updated to match in Plan 5's documentation pass.
- **Type consistency:** `ValuationContext` is defined in Task 8 and consumed by Tasks 9 and 11; `Explanation`, `AssetLine`, `HawlStatus`, `NisabBreakdown` defined in Task 5 and used unchanged; `PRICES` fixture lives in `src/testing/fixtures.ts` (Task 7) and is imported by Tasks 7–11.
- **Review Focus mapping:** 1 → Task 11 ("net exactly equal to nisab"); 2 → Task 8 ("throws MissingRateError"); 3 → Task 11 ("liabilities larger than gross"); 4 → Task 6 ("GENERAL ignores every override"); 5 → Task 4 ("clamps a 30 Dhul-Hijjah anniversary").
- **Known judgement calls recorded for the scholar review:** `STORED` jewellery treated as held wealth in all modes; under `SEPARATE`, buckets below their own nisab are excluded from assessment; Qaradawi rental method expressed as an equivalent base (net rent × 4); `MENS` usage on silver treated as worn.
