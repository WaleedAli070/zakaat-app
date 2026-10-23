import { explain } from '../explain.js';
import { D, toDS } from '../money.js';
import { fxToBase } from '../prices.js';
import type { MoneyAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueMoney(a: MoneyAsset, ctx: ValuationContext): Valued {
  const base = fxToBase(D(a.amount), a.currency, ctx.base, ctx.prices);
  const option = a.category === 'OTHER' ? 'OTHER_ASSET_FULL_VALUE' : 'MONEY_FULL_VALUE';
  const e = explain({
    ruleId: 'FIXED',
    option,
    mode: ctx.mode,
    subjectId: a.id,
    inputs: { amount: a.amount, currency: a.currency, baseValue: base },
    output: base,
    effect: 'INCLUDE',
  });
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(base),
      zakatableValue: toDS(base),
      effect: 'INCLUDE',
    },
    explanations: [e],
  };
}
