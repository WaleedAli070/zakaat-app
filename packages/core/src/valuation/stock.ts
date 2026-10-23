import { explain } from '../explain.js';
import { D, type Decimal, toDS, ZERO } from '../money.js';
import { fxToBase } from '../prices.js';
import type { Effect, StockAsset } from '../types.js';
import type { ValuationContext, Valued } from './index.js';

export function valueStock(a: StockAsset, ctx: ValuationContext): Valued {
  const mv = fxToBase(D(a.marketValue), a.currency, ctx.base, ctx.prices);
  let zakatable: Decimal;
  let effect: Effect = 'INCLUDE';
  const base = { mode: ctx.mode, subjectId: a.id };

  if (a.intent === 'TRADING') {
    zakatable = mv;
    const e = explain({
      ...base,
      ruleId: 'FIXED',
      option: 'STOCK_TRADING_FULL_VALUE',
      inputs: { marketValue: mv },
      output: mv,
      effect,
    });
    return finish(a, mv, zakatable, effect, [e]);
  }

  const method = ctx.rules.STOCK_PASSIVE_METHOD;
  let inputs: Record<string, Decimal | string> = { marketValue: mv };
  if (method === 'FULL_MARKET_VALUE') {
    zakatable = mv;
  } else if (method === 'DIVIDENDS_ONLY') {
    zakatable = fxToBase(D(a.dividendsReceived ?? '0'), a.currency, ctx.base, ctx.prices);
    effect = 'PARTIAL';
    inputs = { ...inputs, dividendsReceived: a.dividendsReceived ?? '0' };
  } else {
    const pct =
      a.proxyPercent !== undefined ? D(a.proxyPercent) : D(method === 'PROXY_25' ? '25' : '30');
    zakatable = mv.mul(pct).div(100);
    effect = 'PARTIAL';
    inputs = {
      ...inputs,
      proxyPercent: pct,
      proxySource: a.proxyPercent !== undefined ? 'USER' : 'MODE',
    };
  }
  const e = explain({
    ...base,
    ruleId: 'STOCK_PASSIVE_METHOD',
    option: method,
    inputs,
    output: zakatable,
    effect,
  });
  return finish(a, mv, zakatable.isNegative() ? ZERO : zakatable, effect, [e]);
}

function finish(
  a: StockAsset,
  mv: Decimal,
  zak: Decimal,
  effect: Effect,
  explanations: Valued['explanations'],
): Valued {
  return {
    line: {
      assetId: a.id,
      category: a.category,
      label: a.label,
      baseValue: toDS(mv),
      zakatableValue: toDS(zak),
      effect,
    },
    explanations,
  };
}
