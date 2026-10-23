import { describe, expect, it } from 'vitest';
import { resolveRules } from '../rulesets/index.js';
import { PRICES } from '../testing/fixtures.js';
import type { AssetInput, JewelleryUsage, Mode } from '../types.js';
import { type ValuationContext, valueAsset } from './index.js';

function ctx(mode: Mode, overrides?: Parameters<typeof resolveRules>[1]): ValuationContext {
  return { mode, rules: resolveRules(mode, overrides).rules, base: 'USD', prices: PRICES };
}

const gold100 = (usage: JewelleryUsage, excessive = false): AssetInput => ({
  id: 'g1',
  label: 'Bangles',
  currency: 'USD',
  category: 'GOLD',
  weightGrams: '100',
  purity: '1',
  usage,
  excessive,
});

describe('money assets', () => {
  it('includes cash at full value converted to base', () => {
    const v = valueAsset(
      { id: 'c1', label: 'Meezan', currency: 'PKR', category: 'BANK', amount: '280000' },
      ctx('HANAFI'),
    );
    expect(v.line.zakatableValue).toBe('1000');
    expect(v.line.effect).toBe('INCLUDE');
    expect(v.explanations[0]?.ruleId).toBe('FIXED');
    expect(v.explanations[0]?.messageKey).toBe('rule.FIXED.MONEY_FULL_VALUE.INCLUDE');
  });
  it('throws MissingRateError for an unknown currency instead of valuing at zero', () => {
    expect(() =>
      valueAsset(
        { id: 'c2', label: 'x', currency: 'INR', category: 'CASH', amount: '1' },
        ctx('HANAFI'),
      ),
    ).toThrow('Missing FX rate for USD in INR');
  });
});

describe('gold and silver', () => {
  it('Hanafi taxes worn jewellery in full', () => {
    const v = valueAsset(gold100('WORN'), ctx('HANAFI'));
    expect(v.line.baseValue).toBe('10000');
    expect(v.line.zakatableValue).toBe('10000');
    expect(v.explanations[0]).toMatchObject({
      ruleId: 'JEWELLERY_PERSONAL',
      option: 'ZAKATABLE',
      effect: 'INCLUDE',
    });
  });
  it('Shafii exempts worn jewellery unless excessive', () => {
    expect(valueAsset(gold100('WORN'), ctx('SHAFII')).line.zakatableValue).toBe('0');
    expect(valueAsset(gold100('WORN'), ctx('SHAFII')).line.effect).toBe('EXCLUDE');
    const ex = valueAsset(gold100('WORN', true), ctx('SHAFII'));
    expect(ex.line.zakatableValue).toBe('10000');
    expect(ex.explanations[0]?.messageKey).toBe(
      'rule.JEWELLERY_PERSONAL.EXEMPT_IF_WORN.INCLUDE.excessive',
    );
  });
  it("men's gold and stored or investment metal are zakatable in every mode", () => {
    for (const mode of ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI', 'GENERAL'] as const) {
      expect(valueAsset(gold100('MENS'), ctx(mode)).line.zakatableValue).toBe('10000');
      expect(valueAsset(gold100('STORED'), ctx(mode)).line.zakatableValue).toBe('10000');
      expect(valueAsset(gold100('INVESTMENT'), ctx(mode)).line.zakatableValue).toBe('10000');
    }
  });
  it('applies purity and the silver price', () => {
    const v = valueAsset(
      {
        id: 's1',
        label: 'Ring',
        currency: 'USD',
        category: 'SILVER',
        weightGrams: '200',
        purity: '0.925',
        usage: 'INVESTMENT',
      },
      ctx('HANAFI'),
    );
    expect(v.line.zakatableValue).toBe('185');
  });
  it('a user override to EXEMPT_IF_WORN applies in Hanafi mode', () => {
    expect(
      valueAsset(gold100('WORN'), ctx('HANAFI', { JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN' })).line
        .zakatableValue,
    ).toBe('0');
  });
});

describe('stocks', () => {
  const stock = (intent: 'TRADING' | 'PASSIVE', extra: Partial<AssetInput> = {}): AssetInput =>
    ({
      id: 's',
      label: 'VOO',
      currency: 'USD',
      category: 'STOCK',
      marketValue: '10000',
      intent,
      ...extra,
    }) as AssetInput;
  it('trading stock is 100% in every mode', () => {
    expect(valueAsset(stock('TRADING'), ctx('SHAFII')).line.zakatableValue).toBe('10000');
  });
  it('passive stock uses the 30% proxy by default and the user ratio when given', () => {
    expect(valueAsset(stock('PASSIVE'), ctx('HANAFI')).line.zakatableValue).toBe('3000');
    expect(
      valueAsset(stock('PASSIVE', { proxyPercent: '24.8' }), ctx('HANAFI')).line.zakatableValue,
    ).toBe('2480');
    expect(
      valueAsset(stock('PASSIVE'), ctx('HANAFI', { STOCK_PASSIVE_METHOD: 'PROXY_25' })).line
        .zakatableValue,
    ).toBe('2500');
    expect(
      valueAsset(
        stock('PASSIVE', { dividendsReceived: '120' }),
        ctx('HANAFI', { STOCK_PASSIVE_METHOD: 'DIVIDENDS_ONLY' }),
      ).line.zakatableValue,
    ).toBe('120');
  });
  it('General values passive stock in full', () => {
    expect(
      valueAsset(stock('PASSIVE', { proxyPercent: '24.8' }), ctx('GENERAL')).line.zakatableValue,
    ).toBe('10000');
  });
});

describe('retirement', () => {
  const ret = (accessible: boolean): AssetInput => ({
    id: 'r',
    label: '401k',
    currency: 'USD',
    category: 'RETIREMENT',
    vestedBalance: '10000',
    accessible,
    taxPercent: '20',
    penaltyPercent: '10',
    voluntaryPercent: '40',
  });
  it('implements each method', () => {
    expect(valueAsset(ret(false), ctx('GENERAL')).line.zakatableValue).toBe('10000');
    expect(valueAsset(ret(false), ctx('MALIKI')).line.zakatableValue).toBe('7000');
    expect(valueAsset(ret(true), ctx('MALIKI')).line.zakatableValue).toBe('8000');
    expect(valueAsset(ret(false), ctx('SHAFII')).line.zakatableValue).toBe('0');
    expect(valueAsset(ret(true), ctx('SHAFII')).line.zakatableValue).toBe('10000');
    expect(valueAsset(ret(false), ctx('HANAFI')).line.zakatableValue).toBe('4000');
    expect(valueAsset(ret(true), ctx('HANAFI')).line.zakatableValue).toBe('10000');
    expect(
      valueAsset(ret(false), ctx('HANAFI', { RETIREMENT_METHOD: 'ZAKATABLE_PROPORTION' })).line
        .zakatableValue,
    ).toBe('3000');
  });
});

describe('real estate', () => {
  const re = (extra: Partial<AssetInput>): AssetInput =>
    ({
      id: 're',
      label: 'Plot',
      currency: 'PKR',
      category: 'REAL_ESTATE',
      type: 'PLOT_FILE',
      marketValue: '2800000',
      ...extra,
    }) as AssetInput;
  it('home is always exempt', () => {
    expect(valueAsset(re({ type: 'HOME' }), ctx('GENERAL')).line.zakatableValue).toBe('0');
  });
  it('rental: saved rent, Qaradawi equivalent base, or higher', () => {
    const r = re({ type: 'RENTAL', savedRent: '280000', netAnnualRent: '560000' });
    expect(valueAsset(r, ctx('HANAFI')).line.zakatableValue).toBe('1000');
    expect(
      valueAsset(r, ctx('HANAFI', { RENTAL_METHOD: 'QARADAWI_NET_RENT_10' })).line.zakatableValue,
    ).toBe('8000');
    expect(valueAsset(r, ctx('GENERAL')).line.zakatableValue).toBe('8000');
    expect(valueAsset(r, ctx('HANAFI')).line.baseValue).toBe('10000');
  });
  it('land for resale depends on intention at purchase', () => {
    expect(
      valueAsset(re({ type: 'LAND_RESALE', resaleIntentAtPurchase: true }), ctx('HANAFI')).line
        .zakatableValue,
    ).toBe('10000');
    expect(
      valueAsset(re({ type: 'LAND_RESALE', resaleIntentAtPurchase: false }), ctx('HANAFI')).line
        .zakatableValue,
    ).toBe('0');
  });
  it('plot files: intent, specific plot, possession', () => {
    expect(
      valueAsset(re({ resaleIntentAtPurchase: false, specificPlot: true }), ctx('HANAFI')).line
        .zakatableValue,
    ).toBe('0');
    expect(
      valueAsset(
        re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: false }),
        ctx('HANAFI'),
      ).line.zakatableValue,
    ).toBe('10000');
    expect(
      valueAsset(
        re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: false }),
        ctx('HANAFI', { PLOT_FILE: 'FROM_POSSESSION' }),
      ).line.zakatableValue,
    ).toBe('0');
    expect(
      valueAsset(
        re({ resaleIntentAtPurchase: true, specificPlot: true, possessionTaken: true }),
        ctx('HANAFI', { PLOT_FILE: 'FROM_POSSESSION' }),
      ).line.zakatableValue,
    ).toBe('10000');
    const pure = valueAsset(
      re({ resaleIntentAtPurchase: true, specificPlot: false, amountPaid: '560000' }),
      ctx('HANAFI'),
    );
    expect(pure.line.zakatableValue).toBe('2000');
    expect(pure.line.effect).toBe('PARTIAL');
  });
});

describe('receivables', () => {
  const rc = (strength: 'STRONG' | 'WEAK'): AssetInput => ({
    id: 'rc',
    label: 'Loan to Ali',
    currency: 'USD',
    category: 'RECEIVABLE',
    amount: '500',
    strength,
  });
  it('strong receivables count yearly; weak only in General; none on ON_RECEIPT', () => {
    expect(valueAsset(rc('STRONG'), ctx('HANAFI')).line.zakatableValue).toBe('500');
    expect(valueAsset(rc('WEAK'), ctx('HANAFI')).line.zakatableValue).toBe('0');
    expect(valueAsset(rc('WEAK'), ctx('GENERAL')).line.zakatableValue).toBe('500');
    expect(
      valueAsset(rc('STRONG'), ctx('HANAFI', { RECEIVABLE_TIMING: 'ON_RECEIPT' })).line
        .zakatableValue,
    ).toBe('0');
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
