import { describe, expect, it } from 'vitest';
import { D, toDS } from './money.js';
import { fxToBase, MissingRateError, metalPricePerGram } from './prices.js';
import { PRICES } from './testing/fixtures.js';
import { InvalidInputError } from './validate.js';

describe('fxToBase', () => {
  it('returns the amount unchanged in the base currency', () => {
    expect(toDS(fxToBase(D('10'), 'USD', 'USD', PRICES))).toBe('10');
  });
  it('converts via USD cross rates', () => {
    expect(toDS(fxToBase(D('280'), 'PKR', 'USD', PRICES))).toBe('1');
    expect(toDS(fxToBase(D('1'), 'USD', 'PKR', PRICES))).toBe('280');
    expect(toDS(fxToBase(D('0.8'), 'GBP', 'PKR', PRICES))).toBe('280');
  });
  it('multiplies before dividing so exact cross conversions stay exact', () => {
    const table = { ...PRICES, fx: { USD: { USD: '1', GBP: '3', EUR: '6' } } };
    expect(toDS(fxToBase(D('200'), 'GBP', 'EUR', table))).toBe('400');
  });
  it('rejects a zero FX rate instead of yielding Infinity', () => {
    const zero = { ...PRICES, fx: { USD: { USD: '1', PKR: '0' } } };
    expect(() => fxToBase(D('1'), 'PKR', 'USD', zero)).toThrow(InvalidInputError);
    expect(() => fxToBase(D('1'), 'USD', 'PKR', zero)).toThrow(InvalidInputError);
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
  it('rejects a non-positive metal price', () => {
    const bad = { ...PRICES, perGram: { XAU: { USD: '0' }, XAG: { USD: '1' } } };
    expect(() => metalPricePerGram('XAU', 'USD', bad)).toThrow(InvalidInputError);
    expect(() => metalPricePerGram('XAU', 'PKR', bad)).toThrow(InvalidInputError);
  });
  it('throws when neither a direct nor a USD route exists', () => {
    expect(() => metalPricePerGram('XAU', 'INR', PRICES)).toThrow(MissingRateError);
  });
});
