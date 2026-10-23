import { describe, expect, it } from 'vitest';
import { computeDeductions } from './liabilities.js';
import { toDS } from './money.js';
import { resolveRules } from './rulesets/index.js';
import { PRICES } from './testing/fixtures.js';
import type { LiabilityInput, Mode } from './types.js';
import type { ValuationContext } from './valuation/index.js';

const ctx = (mode: Mode, overrides?: Parameters<typeof resolveRules>[1]): ValuationContext => ({
  mode,
  rules: resolveRules(mode, overrides).rules,
  base: 'USD',
  prices: PRICES,
});

const mortgage: LiabilityInput = {
  id: 'm',
  label: 'Mortgage',
  kind: 'LONG_TERM',
  currency: 'USD',
  totalOutstanding: '100000',
  currentlyDue: '1000',
  dueWithinYear: '12000',
  interestWithinYear: '4000',
};
const card: LiabilityInput = {
  id: 'c',
  label: 'Card',
  kind: 'IMMEDIATE',
  currency: 'USD',
  totalOutstanding: '2000',
  currentlyDue: '2000',
  dueWithinYear: '2000',
  interestWithinYear: '0',
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
    expect(
      toDS(
        computeDeductions({
          liabilities: [mortgage],
          ctx: ctx('HANAFI', { DEBT_DEDUCTION_SCOPE: 'DUE_INSTALMENT' }),
        }).total,
      ),
    ).toBe('1000');
    expect(
      toDS(
        computeDeductions({
          liabilities: [mortgage],
          ctx: ctx('HANAFI', { DEBT_DEDUCTION_SCOPE: 'FULL' }),
        }).total,
      ),
    ).toBe('100000');
  });
  it('Maliki offsets surplus non-zakatable assets first', () => {
    const r = computeDeductions({
      liabilities: [card],
      surplusNonZakatableAssets: '1500',
      ctx: ctx('MALIKI'),
    });
    expect(toDS(r.total)).toBe('500');
    expect(
      r.explanations.some((e) => e.ruleId === 'DEBT_SURPLUS_OFFSET' && e.option === 'ON'),
    ).toBe(true);
    const r2 = computeDeductions({
      liabilities: [card],
      surplusNonZakatableAssets: '5000',
      ctx: ctx('MALIKI'),
    });
    expect(toDS(r2.total)).toBe('0');
  });
  it('converts foreign liabilities to base', () => {
    const r = computeDeductions({
      liabilities: [
        {
          ...card,
          currency: 'PKR',
          totalOutstanding: '280000',
          currentlyDue: '280000',
          dueWithinYear: '280000',
        },
      ],
      ctx: ctx('HANAFI'),
    });
    expect(toDS(r.total)).toBe('1000');
  });
  it('prior unpaid zakat is a deduction only under DEDUCT', () => {
    expect(
      toDS(
        computeDeductions({ liabilities: [], priorUnpaidZakat: '250', ctx: ctx('HANAFI') }).total,
      ),
    ).toBe('250');
    expect(
      toDS(
        computeDeductions({ liabilities: [], priorUnpaidZakat: '250', ctx: ctx('SHAFII') }).total,
      ),
    ).toBe('0');
  });
});
