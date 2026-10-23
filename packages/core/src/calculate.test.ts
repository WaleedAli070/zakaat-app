import { describe, expect, it } from 'vitest';
import { calculate } from './calculate.js';
import { PRICES } from './testing/fixtures.js';
import type { AssetInput, CalculationInput, LiabilityInput } from './types.js';
import { ENGINE_VERSION } from './version.js';

const gold = (usage: 'WORN' | 'INVESTMENT', grams = '100'): AssetInput => ({
  id: 'g',
  label: 'Gold',
  currency: 'USD',
  category: 'GOLD',
  weightGrams: grams,
  purity: '1',
  usage,
});
const cash = (amount: string): AssetInput => ({
  id: 'c',
  label: 'Cash',
  currency: 'USD',
  category: 'CASH',
  amount,
});
const hawlDue = { startISO: '2025-03-01', closeISO: '2026-02-18', dipBelowNisab: 'NO' as const };

function run(partial: Partial<CalculationInput> & Pick<CalculationInput, 'mode' | 'assets'>) {
  return calculate({
    baseCurrency: 'USD',
    liabilities: [],
    hawl: hawlDue,
    prices: PRICES,
    ...partial,
  });
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
    const big: LiabilityInput = {
      id: 'l',
      label: 'Loan',
      kind: 'IMMEDIATE',
      currency: 'USD',
      totalOutstanding: '5000',
      currentlyDue: '5000',
      dueWithinYear: '5000',
      interestWithinYear: '0',
    };
    const out = run({ mode: 'HANAFI', assets: [cash('1000')], liabilities: [big] });
    expect(out.deductions).toBe('1000');
    expect(out.net).toBe('0');
    expect(out.zakatDue).toBe('0');
    expect(
      out.explanations.some(
        (e) => e.ruleId === 'FIXED' && e.option === 'DEDUCTIONS_CAPPED_AT_GROSS',
      ),
    ).toBe(true);
  });

  it('Shafii SEPARATE: buckets below their own nisab are not assessed', () => {
    const out = run({ mode: 'SHAFII', assets: [gold('INVESTMENT', '50'), cash('9000')] });
    expect(out.net).toBe('14000');
    expect(out.meetsNisab).toBe(true);
    expect(out.zakatDue).toBe('225');
    const combined = run({
      mode: 'SHAFII',
      assets: [gold('INVESTMENT', '50'), cash('9000')],
      overrides: { NISAB_COMBINE_METALS: 'COMBINE' },
    });
    expect(combined.zakatDue).toBe('350');
  });

  it('a broken hawl produces no due even above nisab', () => {
    const out = run({
      mode: 'SHAFII',
      assets: [cash('20000')],
      hawl: { ...hawlDue, dipBelowNisab: 'YES', regainedISO: '2025-10-01' },
    });
    expect(out.hawlStatus).toBe('BROKEN');
    expect(out.zakatDue).toBe('0');
  });

  it('General never undercuts any school on the same inputs', () => {
    const assets: AssetInput[] = [
      gold('WORN'),
      cash('20000'),
      {
        id: 's',
        label: 'VOO',
        currency: 'USD',
        category: 'STOCK',
        marketValue: '10000',
        intent: 'PASSIVE',
      },
      {
        id: 'r',
        label: '401k',
        currency: 'USD',
        category: 'RETIREMENT',
        vestedBalance: '10000',
        accessible: false,
        taxPercent: '20',
        penaltyPercent: '10',
        voluntaryPercent: '40',
      },
    ];
    const liabilities: LiabilityInput[] = [
      {
        id: 'l',
        label: 'Card',
        kind: 'IMMEDIATE',
        currency: 'USD',
        totalOutstanding: '8000',
        currentlyDue: '8000',
        dueWithinYear: '8000',
        interestWithinYear: '0',
      },
    ];
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
    const input: CalculationInput = {
      mode: 'MALIKI',
      baseCurrency: 'PKR',
      assets: [cash('5000')],
      liabilities: [],
      hawl: hawlDue,
      prices: PRICES,
    };
    expect(calculate(input)).toEqual(calculate(input));
  });
});
