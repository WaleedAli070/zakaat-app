import { describe, expect, it } from 'vitest';
import { isOption, RULE_IDS, RULES } from './registry.js';

describe('rule registry', () => {
  it('has the 15 spec rule ids', () => {
    expect(RULE_IDS).toEqual([
      'NISAB_METAL',
      'NISAB_GRAMS',
      'NISAB_COMBINE_METALS',
      'HAWL_MODEL',
      'HAWL_NEW_WEALTH',
      'JEWELLERY_PERSONAL',
      'DEBT_DEDUCTION_SCOPE',
      'DEBT_SURPLUS_OFFSET',
      'RECEIVABLE_TIMING',
      'RETIREMENT_METHOD',
      'STOCK_PASSIVE_METHOD',
      'RENTAL_METHOD',
      'PLOT_FILE',
      'ADVANCE_PAYMENT',
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
