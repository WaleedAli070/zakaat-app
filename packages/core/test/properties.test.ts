import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type AssetInput,
  type CalculationInput,
  calculate,
  type JewelleryUsage,
  type LiabilityInput,
  MODES,
  type Mode,
} from '../src/index.js';

const PRICES: CalculationInput['prices'] = {
  asOf: '2026-10-01',
  perGram: { XAU: { USD: '100' }, XAG: { USD: '1', PKR: '280' } },
  fx: { USD: { USD: '1', PKR: '280', GBP: '0.8' } },
};
const HAWL = { startISO: '2025-03-01', closeISO: '2026-02-18', dipBelowNisab: 'NO' as const };

const cents = fc
  .integer({ min: 0, max: 1_000_000_000 })
  .map((n) => `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`);
const grams = fc
  .integer({ min: 0, max: 5_000_000 })
  .map((n) => `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, '0')}`);

const moneyAsset = (id: string) =>
  cents.map<AssetInput>((amount) => ({ id, label: id, currency: 'USD', category: 'CASH', amount }));
const goldAsset = (id: string) =>
  fc
    .tuple(grams, fc.constantFrom<JewelleryUsage>('WORN', 'STORED', 'INVESTMENT', 'MENS'))
    .map<AssetInput>(([weightGrams, usage]) => ({
      id,
      label: id,
      currency: 'USD',
      category: 'GOLD',
      weightGrams,
      purity: '1',
      usage,
    }));
const liability = (id: string) =>
  fc
    .tuple(cents, fc.constantFrom<LiabilityInput['kind']>('IMMEDIATE', 'LONG_TERM'))
    .map<LiabilityInput>(([amt, kind]) => ({
      id,
      label: id,
      kind,
      currency: 'USD',
      totalOutstanding: amt,
      currentlyDue: amt,
      dueWithinYear: amt,
      interestWithinYear: '0',
    }));

const scenario = fc.record({
  mode: fc.constantFrom(...MODES),
  assets: fc.tuple(moneyAsset('c1'), moneyAsset('c2'), goldAsset('g1')).map((t) => [...t]),
  liabilities: fc.array(liability('l1'), { maxLength: 1 }),
});

function run(mode: Mode, assets: AssetInput[], liabilities: LiabilityInput[]) {
  return calculate({
    mode,
    baseCurrency: 'USD',
    assets,
    liabilities,
    hawl: HAWL,
    prices: PRICES,
    surplusNonZakatableAssets: '0',
  });
}

describe('engine invariants', () => {
  it('due is non-negative and canonical; zero iff nisab unmet or hawl not due', () => {
    fc.assert(
      fc.property(scenario, ({ mode, assets, liabilities }) => {
        const out = run(mode, assets, liabilities);
        expect(out.zakatDue).toMatch(/^\d+(\.\d+)?$/);
        expect(out.zakatDue === '0').toBe(!(out.meetsNisab && out.hawlStatus === 'DUE'));
      }),
      { numRuns: 300 },
    );
  });

  it('adding cash never decreases the due (monotone)', () => {
    fc.assert(
      fc.property(scenario, cents, ({ mode, assets, liabilities }, extra) => {
        const base = run(mode, assets, liabilities);
        const more = run(
          mode,
          [...assets, { id: 'x', label: 'x', currency: 'USD', category: 'CASH', amount: extra }],
          liabilities,
        );
        expect(Number(more.zakatDue)).toBeGreaterThanOrEqual(Number(base.zakatDue));
      }),
      { numRuns: 300 },
    );
  });

  it('General never undercuts any other mode', () => {
    fc.assert(
      fc.property(scenario, ({ assets, liabilities }) => {
        const general = Number(run('GENERAL', assets, liabilities).zakatDue);
        for (const mode of ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI'] as const) {
          expect(general).toBeGreaterThanOrEqual(Number(run(mode, assets, liabilities).zakatDue));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('changing base currency changes the due by the FX rate within one minor unit', () => {
    fc.assert(
      fc.property(scenario, ({ mode, assets, liabilities }) => {
        const usd = calculate({
          mode,
          baseCurrency: 'USD',
          assets,
          liabilities,
          hawl: HAWL,
          prices: PRICES,
          surplusNonZakatableAssets: '0',
        });
        const pkr = calculate({
          mode,
          baseCurrency: 'PKR',
          assets,
          liabilities,
          hawl: HAWL,
          prices: PRICES,
          surplusNonZakatableAssets: '0',
        });
        const diff = Math.abs(Number(pkr.zakatDue) - Number(usd.zakatDue) * 280);
        expect(diff).toBeLessThanOrEqual(0.01 * 280 + 0.01); // USD rounding (<= 1 cent x 280) plus PKR rounding (<= 1 paisa)
      }),
      { numRuns: 200 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(scenario, ({ mode, assets, liabilities }) => {
        expect(run(mode, assets, liabilities)).toEqual(run(mode, assets, liabilities));
      }),
      { numRuns: 100 },
    );
  });
});
