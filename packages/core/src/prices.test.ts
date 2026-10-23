import { describe, expect, it } from 'vitest';
import { D, toDS } from './money.js';
import { fxToBase, MissingRateError, metalPricePerGram } from './prices.js';
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
    try {
      fxToBase(D('1'), 'INR', 'USD', PRICES);
    } catch (e) {
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
