import { type Currency, D, type Decimal } from './money.js';
import type { Metal, PriceTable } from './types.js';

export class MissingRateError extends Error {
  constructor(
    public readonly kind: 'FX' | 'METAL',
    public readonly symbol: string,
    public readonly currency: Currency,
  ) {
    super(`Missing ${kind} rate for ${symbol} in ${currency}`);
    this.name = 'MissingRateError';
  }
}

function usdRate(currency: Currency, prices: PriceTable): Decimal {
  if (currency === 'USD') return D('1');
  const r = prices.fx.USD[currency];
  if (r === undefined) throw new MissingRateError('FX', 'USD', currency);
  return D(r);
}

export function fxToBase(
  amount: Decimal,
  from: Currency,
  base: Currency,
  prices: PriceTable,
): Decimal {
  if (from === base) return amount;
  return amount.div(usdRate(from, prices)).mul(usdRate(base, prices));
}

export function metalPricePerGram(metal: Metal, base: Currency, prices: PriceTable): Decimal {
  const direct = prices.perGram[metal][base];
  if (direct !== undefined) return D(direct);
  const usd = prices.perGram[metal].USD;
  if (usd === undefined) throw new MissingRateError('METAL', metal, base);
  return fxToBase(D(usd), 'USD', base, prices);
}
