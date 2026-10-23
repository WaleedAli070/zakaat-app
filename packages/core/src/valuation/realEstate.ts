import { explain } from '../explain.js';
import { D, type Decimal, toDS, ZERO } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, Explanation, RealEstateAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueRealEstate(a: RealEstateAsset, ctx: ValuationContext): Valued {
  const conv = (s: string | undefined) => fxToBase(D(s ?? '0'), a.currency, ctx.base, ctx.prices);
  const mv = conv(a.marketValue);
  const base = { mode: ctx.mode, subjectId: a.id };
  let zakatable: Decimal = ZERO;
  let effect: Effect = 'EXCLUDE';
  let e: Explanation;

  switch (a.type) {
    case 'HOME':
      e = explain({
        ...base,
        ruleId: 'FIXED',
        option: 'HOME_EXEMPT',
        inputs: { marketValue: mv },
        output: ZERO,
        effect,
      });
      break;
    case 'RENTAL': {
      const saved = conv(a.savedRent);
      const qaradawi = conv(a.netAnnualRent).mul(4);
      const method = ctx.rules.RENTAL_METHOD;
      zakatable =
        method === 'SAVED_RENT'
          ? saved
          : method === 'QARADAWI_NET_RENT_10'
            ? qaradawi
            : saved.gte(qaradawi)
              ? saved
              : qaradawi;
      effect = zakatable.isZero() ? 'EXCLUDE' : 'PARTIAL';
      e = explain({
        ...base,
        ruleId: 'RENTAL_METHOD',
        option: method,
        inputs: {
          marketValue: mv,
          savedRent: saved,
          netAnnualRent: conv(a.netAnnualRent),
          qaradawiEquivalentBase: qaradawi,
        },
        output: zakatable,
        effect,
      });
      break;
    }
    case 'LAND_RESALE': {
      const intent = a.resaleIntentAtPurchase === true;
      zakatable = intent ? mv : ZERO;
      effect = intent ? 'INCLUDE' : 'EXCLUDE';
      e = explain({
        ...base,
        ruleId: 'FIXED',
        option: intent ? 'LAND_RESALE_INTENT' : 'LAND_NO_RESALE_INTENT',
        inputs: { marketValue: mv, resaleIntentAtPurchase: intent },
        output: zakatable,
        effect,
      });
      break;
    }
    case 'PLOT_FILE': {
      const intent = a.resaleIntentAtPurchase === true;
      const option = ctx.rules.PLOT_FILE;
      const inputs = {
        marketValue: mv,
        resaleIntentAtPurchase: intent,
        specificPlot: a.specificPlot ?? false,
        possessionTaken: a.possessionTaken ?? false,
        amountPaid: conv(a.amountPaid),
      };
      if (!intent) {
        e = explain({
          ...base,
          ruleId: 'PLOT_FILE',
          option,
          inputs,
          output: ZERO,
          effect,
          messageSuffix: 'no_intent',
        });
      } else if (a.specificPlot !== true) {
        zakatable = conv(a.amountPaid);
        effect = zakatable.isZero() ? 'EXCLUDE' : 'PARTIAL';
        e = explain({
          ...base,
          ruleId: 'PLOT_FILE',
          option,
          inputs,
          output: zakatable,
          effect,
          messageSuffix: 'receivable',
        });
      } else if (option === 'FROM_PURCHASE' || a.possessionTaken === true) {
        zakatable = mv;
        effect = 'INCLUDE';
        e = explain({ ...base, ruleId: 'PLOT_FILE', option, inputs, output: mv, effect });
      } else {
        e = explain({
          ...base,
          ruleId: 'PLOT_FILE',
          option,
          inputs,
          output: ZERO,
          effect,
          messageSuffix: 'awaiting_possession',
        });
      }
      break;
    }
  }
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(mv),
      zakatableValue: toDS(zakatable),
      effect,
    },
    explanations: [e],
  };
}
