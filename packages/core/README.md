# @zakaat/core

Pure zakat rules engine. No I/O, no platform APIs. Inputs and outputs are plain objects with decimal strings.

## Usage

```ts
import { calculate } from '@zakaat/core';

const out = calculate({
  mode: 'HANAFI',
  baseCurrency: 'PKR',
  assets: [
    {
      id: 'g1',
      label: 'Bangles',
      currency: 'PKR',
      category: 'GOLD',
      weightGrams: '116.638038',
      purity: '0.9166666667',
      usage: 'WORN',
    },
  ],
  liabilities: [],
  hawl: { startISO: '2025-03-01', closeISO: '2026-02-18' },
  prices: {
    asOf: '2026-02-18',
    perGram: { XAU: { PKR: '36000' }, XAG: { PKR: '400' } },
    fx: { USD: { USD: '1', PKR: '280' } },
  },
});
console.log(
  out.zakatDue,
  out.explanations.map((e) => e.messageKey),
);
```

## Concepts

- **Modes**: HANAFI, SHAFII, MALIKI, HANBALI, GENERAL (precaution: maximum-zakat option per contested rule).
- **Rules**: `RULES` registry of rule ids and options; `RULESETS` map each mode to defaults; `resolveRules(mode, overrides)` applies user overrides to overridable rules only.
- **Explanations**: every rule application emits `{ ruleId, option, subjectId, inputs, output, effect, citationIds, messageKey }`. UI renders `messageKey`; `CITATIONS` resolves ids to sources.
- **Hawl**: `evaluateHawl` applies START_END or CONTINUOUS with year-end attestations; Hijri arithmetic via Umm al-Qura with a per-user day offset.
- **Money / nisab**: `Decimal` end to end; the rate is `assessable / 40`, rounded up once to the currency minor unit. Under COMBINE, `assessable` equals `net`. Under SEPARATE, `net` is informational and `assessable` (the sum of the gold, silver and money buckets that each meet their own nisab, see `nisabBuckets`) is what the rate applies to.
- **Input contract**: `calculate()` runs `validateInput` first and throws `InvalidInputError` (field and subject id) on malformed decimals, negatives, out-of-range percentages or purity, duplicate ids and non-positive prices. Liability `totalOutstanding` and `currentlyDue` are principal only; `dueWithinYear` includes interest and `interestWithinYear` is subtracted under TWELVE_MONTHS. Pin a ruleset with `rulesetId` (`getRulesetById`).

## Tests

`pnpm --filter @zakaat/core test` runs unit tests, golden vectors (`test/vectors/**`), property tests and explanation snapshots. Vectors carry a `reviewedBy` block for scholar sign-off; changing a vector is a fiqh decision.
