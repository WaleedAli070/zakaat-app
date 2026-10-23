import { describe, expect, it } from 'vitest';
import { PRICES } from './testing/fixtures.js';
import type { AssetInput, CalculationInput, LiabilityInput } from './types.js';
import { InvalidInputError, validateInput } from './validate.js';

const cash: AssetInput = { id: 'c', label: 'Cash', currency: 'USD', category: 'CASH', amount: '1' };
const liability: LiabilityInput = {
  id: 'l',
  label: 'Loan',
  kind: 'IMMEDIATE',
  currency: 'USD',
  totalOutstanding: '1',
  currentlyDue: '1',
  dueWithinYear: '1',
  interestWithinYear: '0',
};
const base: CalculationInput = {
  mode: 'HANAFI',
  baseCurrency: 'USD',
  assets: [cash],
  liabilities: [liability],
  hawl: { startISO: '2025-03-01', closeISO: '2026-02-18' },
  prices: PRICES,
};

const gold = (over: Record<string, string>): AssetInput =>
  ({
    id: 'g',
    label: 'Gold',
    currency: 'USD',
    category: 'GOLD',
    weightGrams: '10',
    purity: '1',
    usage: 'WORN',
    ...over,
  }) as AssetInput;
const stock = (over: Record<string, string>): AssetInput =>
  ({
    id: 's',
    label: 'Stock',
    currency: 'USD',
    category: 'STOCK',
    marketValue: '10',
    intent: 'PASSIVE',
    ...over,
  }) as AssetInput;
const retirement = (over: Record<string, string>): AssetInput =>
  ({
    id: 'r',
    label: 'Pension',
    currency: 'USD',
    category: 'RETIREMENT',
    vestedBalance: '10',
    accessible: true,
    taxPercent: '0',
    penaltyPercent: '0',
    voluntaryPercent: '0',
    ...over,
  }) as AssetInput;
const realEstate = (over: Record<string, string>): AssetInput =>
  ({
    id: 'e',
    label: 'Flat',
    currency: 'USD',
    category: 'REAL_ESTATE',
    type: 'RENTAL',
    marketValue: '10',
    ...over,
  }) as AssetInput;

const withAssets = (...assets: AssetInput[]): CalculationInput => ({ ...base, assets });
const rejects = (input: CalculationInput, field?: string, id?: string) => {
  try {
    validateInput(input);
  } catch (e) {
    expect(e).toBeInstanceOf(InvalidInputError);
    if (field) expect((e as InvalidInputError).field).toBe(field);
    if (id) expect((e as InvalidInputError).subjectId).toBe(id);
    return;
  }
  throw new Error('expected validateInput to throw');
};

describe('validateInput', () => {
  it('accepts a valid input', () => {
    expect(() => validateInput(base)).not.toThrow();
  });

  it('rejects malformed decimal strings, naming field and id', () => {
    rejects(withAssets({ ...cash, amount: '1,000' } as AssetInput), 'amount', 'c');
    rejects(withAssets({ ...cash, amount: '' } as AssetInput), 'amount', 'c');
    rejects({ ...base, liabilities: [{ ...liability, dueWithinYear: 'x' }] }, 'dueWithinYear', 'l');
    expect(() =>
      validateInput(withAssets({ ...cash, amount: '1000.50' } as AssetInput)),
    ).not.toThrow();
  });

  it('rejects negative amounts on every asset category', () => {
    rejects(withAssets({ ...cash, amount: '-1' } as AssetInput), 'amount', 'c');
    rejects(withAssets(gold({ weightGrams: '-1' })), 'weightGrams', 'g');
    rejects(withAssets(stock({ marketValue: '-1' })), 'marketValue', 's');
    rejects(withAssets(stock({ dividendsReceived: '-1' })), 'dividendsReceived', 's');
    rejects(withAssets(retirement({ vestedBalance: '-1' })), 'vestedBalance', 'r');
    rejects(withAssets(realEstate({ marketValue: '-1' })), 'marketValue', 'e');
    rejects(withAssets(realEstate({ savedRent: '-1' })), 'savedRent', 'e');
    rejects(withAssets(realEstate({ netAnnualRent: '-1' })), 'netAnnualRent', 'e');
    rejects(withAssets(realEstate({ amountPaid: '-1' })), 'amountPaid', 'e');
    rejects(
      withAssets({
        id: 'rc',
        label: 'Loan',
        currency: 'USD',
        category: 'RECEIVABLE',
        amount: '-1',
        strength: 'STRONG',
      }),
      'amount',
      'rc',
    );
    expect(() => validateInput(withAssets(gold({ weightGrams: '0' })))).not.toThrow();
  });

  it('rejects negative liability fields and negative scalar inputs', () => {
    for (const f of ['totalOutstanding', 'currentlyDue', 'dueWithinYear', 'interestWithinYear']) {
      rejects({ ...base, liabilities: [{ ...liability, [f]: '-1' }] }, f, 'l');
    }
    rejects({ ...base, surplusNonZakatableAssets: '-1' }, 'surplusNonZakatableAssets');
    rejects({ ...base, priorUnpaidZakat: '-1' }, 'priorUnpaidZakat');
    expect(() => validateInput({ ...base, surplusNonZakatableAssets: '0' })).not.toThrow();
  });

  it('purity must be > 0 and <= 1', () => {
    rejects(withAssets(gold({ purity: '22' })), 'purity', 'g');
    rejects(withAssets(gold({ purity: '1.01' })), 'purity', 'g');
    rejects(withAssets(gold({ purity: '0' })), 'purity', 'g');
    expect(() => validateInput(withAssets(gold({ purity: '0.9166' })))).not.toThrow();
    expect(() => validateInput(withAssets(gold({ purity: '1' })))).not.toThrow();
  });

  it('percent fields must be within 0..100', () => {
    rejects(withAssets(stock({ proxyPercent: '101' })), 'proxyPercent', 's');
    rejects(withAssets(stock({ proxyPercent: '-1' })), 'proxyPercent', 's');
    for (const f of [
      'taxPercent',
      'penaltyPercent',
      'voluntaryPercent',
      'zakatableProportionPercent',
    ]) {
      rejects(withAssets(retirement({ [f]: '100.5' })), f, 'r');
      expect(() => validateInput(withAssets(retirement({ [f]: '100' })))).not.toThrow();
      expect(() => validateInput(withAssets(retirement({ [f]: '0' })))).not.toThrow();
    }
  });

  it('hijriOffsetDays must be an integer in -2..2', () => {
    rejects({ ...base, hijriOffsetDays: 3 }, 'hijriOffsetDays');
    rejects({ ...base, hijriOffsetDays: -3 }, 'hijriOffsetDays');
    rejects({ ...base, hijriOffsetDays: 0.5 }, 'hijriOffsetDays');
    for (const n of [-2, -1, 0, 1, 2]) {
      expect(() => validateInput({ ...base, hijriOffsetDays: n })).not.toThrow();
    }
  });

  it('dates must be valid ISO dates', () => {
    expect(() =>
      validateInput({ ...base, hawl: { ...base.hawl, startISO: '2025-02-30' } }),
    ).toThrow(RangeError);
    expect(() => validateInput({ ...base, hawl: { ...base.hawl, closeISO: 'soon' } })).toThrow(
      RangeError,
    );
    expect(() =>
      validateInput({ ...base, hawl: { ...base.hawl, regainedISO: '2025-13-01' } }),
    ).toThrow(RangeError);
    expect(() => validateInput({ ...base, prices: { ...PRICES, asOf: '10/01/2026' } })).toThrow(
      RangeError,
    );
    expect(() =>
      validateInput({ ...base, hawl: { ...base.hawl, regainedISO: '2025-06-01' } }),
    ).not.toThrow();
  });

  it('every present FX rate and metal price must be > 0', () => {
    rejects({ ...base, prices: { ...PRICES, fx: { USD: { USD: '1', PKR: '0' } } } }, 'fx.USD.PKR');
    rejects({ ...base, prices: { ...PRICES, fx: { USD: { USD: '1', PKR: '-5' } } } }, 'fx.USD.PKR');
    rejects(
      { ...base, prices: { ...PRICES, perGram: { XAU: { USD: '0' }, XAG: { USD: '1' } } } },
      'perGram.XAU.USD',
    );
    rejects(
      { ...base, prices: { ...PRICES, perGram: { XAU: { USD: '100' }, XAG: { PKR: 'abc' } } } },
      'perGram.XAG.PKR',
    );
    expect(() => validateInput(base)).not.toThrow();
  });

  it('rejects duplicate asset and liability ids', () => {
    rejects(withAssets(cash, { ...cash, label: 'Other' }), 'id', 'c');
    rejects({ ...base, liabilities: [liability, { ...liability }] }, 'id', 'l');
    expect(() => validateInput(withAssets(cash, { ...cash, id: 'c2' }))).not.toThrow();
  });
});
