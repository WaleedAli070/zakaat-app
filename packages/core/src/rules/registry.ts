export const RULES = {
  NISAB_METAL: { options: ['SILVER', 'GOLD'], overridable: true },
  NISAB_GRAMS: { options: ['STD_85_595', 'STD_87_612', 'LOWER_VALUE'], overridable: true },
  NISAB_COMBINE_METALS: { options: ['COMBINE', 'SEPARATE'], overridable: true },
  HAWL_MODEL: { options: ['START_END', 'CONTINUOUS'], overridable: false },
  HAWL_NEW_WEALTH: { options: ['ANNEX', 'ANNEX_LABEL_ADVANCE'], overridable: false },
  JEWELLERY_PERSONAL: { options: ['ZAKATABLE', 'EXEMPT_IF_WORN'], overridable: true },
  DEBT_DEDUCTION_SCOPE: {
    options: ['NONE', 'DUE_INSTALMENT', 'TWELVE_MONTHS', 'FULL'],
    overridable: true,
  },
  DEBT_SURPLUS_OFFSET: { options: ['OFF', 'ON'], overridable: true },
  RECEIVABLE_TIMING: {
    options: ['YEARLY_IF_STRONG', 'YEARLY_ALL', 'ON_RECEIPT'],
    overridable: true,
  },
  RETIREMENT_METHOD: {
    options: [
      'FULL_VESTED',
      'NET_WITHDRAWABLE',
      'ZAKATABLE_PROPORTION',
      'NONE_UNTIL_ACCESS',
      'COMPULSORY_DEFERRED_VOLUNTARY_YEARLY',
    ],
    overridable: true,
  },
  STOCK_PASSIVE_METHOD: {
    options: ['PROXY_25', 'PROXY_30', 'FULL_MARKET_VALUE', 'DIVIDENDS_ONLY'],
    overridable: true,
  },
  RENTAL_METHOD: { options: ['SAVED_RENT', 'QARADAWI_NET_RENT_10', 'HIGHER'], overridable: true },
  PLOT_FILE: { options: ['FROM_PURCHASE', 'FROM_POSSESSION'], overridable: true },
  ADVANCE_PAYMENT: {
    options: ['ALLOWED', 'ALLOWED_ONE_YEAR', 'ALLOWED_TWO_YEARS', 'RESTRICTED'],
    overridable: false,
  },
  QADA_PRIOR_UNPAID: { options: ['DEDUCT', 'NO_DEDUCT'], overridable: true },
} as const;

export type RuleId = keyof typeof RULES;
export type RuleOption<R extends RuleId> = (typeof RULES)[R]['options'][number];
export type RuleSelection = { readonly [R in RuleId]: RuleOption<R> };
export const RULE_IDS = Object.keys(RULES) as RuleId[];

export function isOption<R extends RuleId>(ruleId: R, value: unknown): value is RuleOption<R> {
  return (RULES[ruleId].options as readonly string[]).includes(value as string);
}
