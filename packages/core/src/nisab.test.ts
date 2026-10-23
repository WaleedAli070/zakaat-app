import { describe, expect, it } from 'vitest';
import { computeNisab } from './nisab.js';
import { resolveRules } from './rulesets/index.js';
import { PRICES } from './testing/fixtures.js';

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
