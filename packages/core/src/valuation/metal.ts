import { explain } from '../explain.js';
import { D, type Decimal, toDS, ZERO } from '../money.js';
import { metalPricePerGram } from '../prices.js';
import type { Explanation, MetalAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueMetal(a: MetalAsset, ctx: ValuationContext): Valued {
  const metal = a.category === 'GOLD' ? 'XAU' : 'XAG';
  const price = metalPricePerGram(metal, ctx.base, ctx.prices);
  const value = D(a.weightGrams).mul(D(a.purity)).mul(price);
  const inputs = {
    weightGrams: a.weightGrams,
    purity: a.purity,
    pricePerGram: price,
    usage: a.usage,
    excessive: a.excessive ?? false,
  };
  let zakatable: Decimal;
  let e: Explanation;

  const usage = a.category === 'SILVER' && a.usage === 'MENS' ? 'WORN' : a.usage;

  if (usage === 'MENS') {
    zakatable = value;
    e = explain({
      ruleId: 'FIXED',
      option: 'MENS_GOLD_ZAKATABLE',
      mode: ctx.mode,
      subjectId: a.id,
      inputs,
      output: value,
      effect: 'INCLUDE',
    });
  } else if (usage === 'STORED' || usage === 'INVESTMENT') {
    zakatable = value;
    e = explain({
      ruleId: 'FIXED',
      option: 'METAL_HELD_AS_WEALTH',
      mode: ctx.mode,
      subjectId: a.id,
      inputs,
      output: value,
      effect: 'INCLUDE',
    });
  } else if (ctx.rules.JEWELLERY_PERSONAL === 'ZAKATABLE') {
    zakatable = value;
    e = explain({
      ruleId: 'JEWELLERY_PERSONAL',
      option: 'ZAKATABLE',
      mode: ctx.mode,
      subjectId: a.id,
      inputs,
      output: value,
      effect: 'INCLUDE',
    });
  } else if (a.excessive) {
    zakatable = value;
    e = explain({
      ruleId: 'JEWELLERY_PERSONAL',
      option: 'EXEMPT_IF_WORN',
      mode: ctx.mode,
      subjectId: a.id,
      inputs,
      output: value,
      effect: 'INCLUDE',
      messageSuffix: 'excessive',
    });
  } else {
    zakatable = ZERO;
    e = explain({
      ruleId: 'JEWELLERY_PERSONAL',
      option: 'EXEMPT_IF_WORN',
      mode: ctx.mode,
      subjectId: a.id,
      inputs,
      output: ZERO,
      effect: 'EXCLUDE',
    });
  }
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(value),
      zakatableValue: toDS(zakatable),
      effect: e.effect,
    },
    explanations: [e],
  };
}
