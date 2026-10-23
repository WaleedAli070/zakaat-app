import type { PriceTable } from '../types.js';

export const PRICES: PriceTable = {
  asOf: '2026-10-01',
  perGram: { XAU: { USD: '100' }, XAG: { USD: '1', PKR: '280' } },
  fx: { USD: { USD: '1', PKR: '280', GBP: '0.8' } },
};
