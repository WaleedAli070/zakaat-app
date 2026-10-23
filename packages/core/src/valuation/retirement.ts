import { explain } from '../explain.js';
import { D, type Decimal, toDS, ZERO } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, RetirementAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueRetirement(a: RetirementAsset, ctx: ValuationContext): Valued {
  const vb = fxToBase(D(a.vestedBalance), a.currency, ctx.base, ctx.prices);
  const method = ctx.rules.RETIREMENT_METHOD;
  const hundred = D('100');
  let zakatable: Decimal;
  switch (method) {
    case 'FULL_VESTED':
      zakatable = vb;
      break;
    case 'NET_WITHDRAWABLE': {
      const haircut = D(a.taxPercent).plus(a.accessible ? ZERO : D(a.penaltyPercent));
      zakatable = vb.mul(hundred.minus(haircut)).div(hundred);
      break;
    }
    case 'ZAKATABLE_PROPORTION':
      zakatable = vb.mul(D(a.zakatableProportionPercent ?? '30')).div(hundred);
      break;
    case 'NONE_UNTIL_ACCESS':
      zakatable = a.accessible ? vb : ZERO;
      break;
    case 'COMPULSORY_DEFERRED_VOLUNTARY_YEARLY':
      zakatable = a.accessible ? vb : vb.mul(D(a.voluntaryPercent)).div(hundred);
      break;
  }
  if (zakatable.isNegative()) zakatable = ZERO;
  const effect: Effect = zakatable.isZero() ? 'EXCLUDE' : zakatable.eq(vb) ? 'INCLUDE' : 'PARTIAL';
  const e = explain({
    ruleId: 'RETIREMENT_METHOD',
    option: method,
    mode: ctx.mode,
    subjectId: a.id,
    inputs: {
      vestedBalance: vb,
      accessible: a.accessible,
      taxPercent: a.taxPercent,
      penaltyPercent: a.penaltyPercent,
      voluntaryPercent: a.voluntaryPercent,
      zakatableProportionPercent: a.zakatableProportionPercent ?? '30',
    },
    output: zakatable,
    effect,
  });
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(vb),
      zakatableValue: toDS(zakatable),
      effect,
    },
    explanations: [e],
  };
}
