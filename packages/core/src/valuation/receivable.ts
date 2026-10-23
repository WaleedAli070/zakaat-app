import { explain } from '../explain.js';
import { D, toDS, ZERO } from '../money.js';
import { fxToBase } from '../prices.js';
import type { ReceivableAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueReceivable(a: ReceivableAsset, ctx: ValuationContext): Valued {
  const amt = fxToBase(D(a.amount), a.currency, ctx.base, ctx.prices);
  const option = ctx.rules.RECEIVABLE_TIMING;
  const include =
    option === 'YEARLY_ALL' || (option === 'YEARLY_IF_STRONG' && a.strength === 'STRONG');
  const zakatable = include ? amt : ZERO;
  const effect = include ? 'INCLUDE' : 'EXCLUDE';
  const e = explain({
    ruleId: 'RECEIVABLE_TIMING',
    option,
    mode: ctx.mode,
    subjectId: a.id,
    inputs: { amount: amt, strength: a.strength },
    output: zakatable,
    effect,
    // excluded receivables fall due when the money is received; the UI surfaces this
    ...(include ? {} : { messageSuffix: 'due_on_receipt' }),
  });
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(amt),
      zakatableValue: toDS(zakatable),
      effect,
    },
    explanations: [e],
  };
}
