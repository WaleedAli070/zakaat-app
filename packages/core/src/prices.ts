import { type Currency, D, type Decimal } from './money.js';
import type { Metal, PriceTable } from './types.js';
import { InvalidInputError } from './validate.js';

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
  const rate = D(r);
  if (!rate.gt(0))
    throw new InvalidInputError(`fx.USD.${currency}`, 'prices', `must be > 0, got ${r}`);
  return rate;
}

export function fxToBase(
  amount: Decimal,
  from: Currency,
  base: Currency,
  prices: PriceTable,
): Decimal {
  if (from === base) return amount;
  return amount.mul(usdRate(base, prices)).div(usdRate(from, prices));
}

function positivePrice(value: string, metal: Metal, currency: Currency): Decimal {
  const price = D(value);
  if (!price.gt(0)) {
    throw new InvalidInputError(
      `perGram.${metal}.${currency}`,
      'prices',
      `must be > 0, got ${value}`,
    );
  }
  return price;
}

export function metalPricePerGram(metal: Metal, base: Currency, prices: PriceTable): Decimal {
  const direct = prices.perGram[metal][base];
  if (direct !== undefined) return positivePrice(direct, metal, base);
  const usd = prices.perGram[metal].USD;
  if (usd === undefined) throw new MissingRateError('METAL', metal, base);
  return fxToBase(positivePrice(usd, metal, 'USD'), 'USD', base, prices);
}
