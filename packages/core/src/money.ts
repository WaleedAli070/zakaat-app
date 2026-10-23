import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -40, toExpPos: 40 });

export type DecimalString = string;
export type Currency = 'USD' | 'PKR' | 'INR' | 'GBP' | 'EUR' | 'AED' | 'SAR';
export const CURRENCIES: readonly Currency[] = ['USD', 'PKR', 'INR', 'GBP', 'EUR', 'AED', 'SAR'];

export class InvalidDecimalError extends Error {
  constructor(value: unknown) {
    super(`Invalid decimal string: ${String(value)}`);
    this.name = 'InvalidDecimalError';
  }
}

const CANONICAL = /^-?\d+(\.\d+)?$/;

export function D(value: DecimalString | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value !== 'string' || !CANONICAL.test(value)) throw new InvalidDecimalError(value);
  return new Decimal(value);
}

export function toDS(d: Decimal): DecimalString {
  return d
    .toFixed()
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

export const ZERO = new Decimal(0);
export const RATE_DIVISOR = new Decimal(40);

export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

const MINOR_UNIT_DIGITS: Record<Currency, number> = {
  USD: 2,
  PKR: 2,
  INR: 2,
  GBP: 2,
  EUR: 2,
  AED: 2,
  SAR: 2,
};

export function minorUnitDigits(currency: Currency): number {
  return MINOR_UNIT_DIGITS[currency];
}

export function roundUpToMinorUnit(amount: Decimal, currency: Currency): Decimal {
  return amount.toDecimalPlaces(minorUnitDigits(currency), Decimal.ROUND_UP);
}

export { Decimal };
