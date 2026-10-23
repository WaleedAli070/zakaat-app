import { fromISODate } from './hijri.js';
import { D, type Decimal, type DecimalString, InvalidDecimalError } from './money.js';
import type { CalculationInput } from './types.js';

export class InvalidInputError extends Error {
  constructor(
    public readonly field: string,
    public readonly subjectId: string,
    message: string,
  ) {
    super(`Invalid input (${subjectId}.${field}): ${message}`);
    this.name = 'InvalidInputError';
  }
}

function parse(value: DecimalString, field: string, subjectId: string): Decimal {
  try {
    return D(value);
  } catch (e) {
    if (e instanceof InvalidDecimalError) {
      throw new InvalidInputError(field, subjectId, `not a decimal string: ${String(value)}`);
    }
    throw e;
  }
}

function nonNegative(value: DecimalString | undefined, field: string, subjectId: string): void {
  if (value === undefined) return;
  if (parse(value, field, subjectId).isNegative()) {
    throw new InvalidInputError(field, subjectId, `must be >= 0, got ${value}`);
  }
}

function percent(value: DecimalString | undefined, field: string, subjectId: string): void {
  if (value === undefined) return;
  const d = parse(value, field, subjectId);
  if (d.isNegative() || d.gt(100)) {
    throw new InvalidInputError(field, subjectId, `must be between 0 and 100, got ${value}`);
  }
}

function positive(value: DecimalString, field: string, subjectId: string): void {
  if (!parse(value, field, subjectId).gt(0)) {
    throw new InvalidInputError(field, subjectId, `must be > 0, got ${value}`);
  }
}

/** Throws InvalidInputError (or RangeError for impossible dates) on the first violation. */
export function validateInput(input: CalculationInput): void {
  const assetIds = new Set<string>();
  for (const a of input.assets) {
    if (assetIds.has(a.id)) throw new InvalidInputError('id', a.id, 'duplicate asset id');
    assetIds.add(a.id);
    switch (a.category) {
      case 'CASH':
      case 'BANK':
      case 'FOREIGN_CURRENCY':
      case 'OTHER':
        nonNegative(a.amount, 'amount', a.id);
        break;
      case 'GOLD':
      case 'SILVER': {
        nonNegative(a.weightGrams, 'weightGrams', a.id);
        const p = parse(a.purity, 'purity', a.id);
        if (!p.gt(0) || p.gt(1)) {
          throw new InvalidInputError('purity', a.id, `must be > 0 and <= 1, got ${a.purity}`);
        }
        break;
      }
      case 'STOCK':
        nonNegative(a.marketValue, 'marketValue', a.id);
        nonNegative(a.dividendsReceived, 'dividendsReceived', a.id);
        percent(a.proxyPercent, 'proxyPercent', a.id);
        break;
      case 'RETIREMENT':
        nonNegative(a.vestedBalance, 'vestedBalance', a.id);
        percent(a.taxPercent, 'taxPercent', a.id);
        percent(a.penaltyPercent, 'penaltyPercent', a.id);
        percent(a.voluntaryPercent, 'voluntaryPercent', a.id);
        percent(a.zakatableProportionPercent, 'zakatableProportionPercent', a.id);
        break;
      case 'REAL_ESTATE':
        nonNegative(a.marketValue, 'marketValue', a.id);
        nonNegative(a.savedRent, 'savedRent', a.id);
        nonNegative(a.netAnnualRent, 'netAnnualRent', a.id);
        nonNegative(a.amountPaid, 'amountPaid', a.id);
        break;
      case 'RECEIVABLE':
        nonNegative(a.amount, 'amount', a.id);
        break;
    }
  }

  const liabilityIds = new Set<string>();
  for (const l of input.liabilities) {
    if (liabilityIds.has(l.id)) throw new InvalidInputError('id', l.id, 'duplicate liability id');
    liabilityIds.add(l.id);
    nonNegative(l.totalOutstanding, 'totalOutstanding', l.id);
    nonNegative(l.currentlyDue, 'currentlyDue', l.id);
    nonNegative(l.dueWithinYear, 'dueWithinYear', l.id);
    nonNegative(l.interestWithinYear, 'interestWithinYear', l.id);
  }

  nonNegative(input.surplusNonZakatableAssets, 'surplusNonZakatableAssets', 'input');
  nonNegative(input.priorUnpaidZakat, 'priorUnpaidZakat', 'input');

  const off = input.hijriOffsetDays;
  if (off !== undefined && (!Number.isInteger(off) || off < -2 || off > 2)) {
    throw new InvalidInputError(
      'hijriOffsetDays',
      'input',
      `must be an integer in -2..2, got ${off}`,
    );
  }

  fromISODate(input.hawl.startISO);
  fromISODate(input.hawl.closeISO);
  if (input.hawl.regainedISO !== undefined) fromISODate(input.hawl.regainedISO);
  fromISODate(input.prices.asOf);

  for (const [cur, rate] of Object.entries(input.prices.fx.USD)) {
    if (rate !== undefined) positive(rate, `fx.USD.${cur}`, 'prices');
  }
  for (const metal of ['XAU', 'XAG'] as const) {
    for (const [cur, price] of Object.entries(input.prices.perGram[metal])) {
      if (price !== undefined) positive(price, `perGram.${metal}.${cur}`, 'prices');
    }
  }
}
