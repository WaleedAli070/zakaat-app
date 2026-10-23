import { explain } from './explain.js';
import { D, type Decimal, type DecimalString, sum, ZERO } from './money.js';
import { fxToBase } from './prices.js';
import type { Explanation, LiabilityInput } from './types.js';
import type { ValuationContext } from './valuation/index.js';

export function computeDeductions(args: {
  liabilities: readonly LiabilityInput[];
  surplusNonZakatableAssets?: DecimalString;
  priorUnpaidZakat?: DecimalString;
  ctx: ValuationContext;
}): { total: Decimal; explanations: Explanation[] } {
  const { ctx } = args;
  const scope = ctx.rules.DEBT_DEDUCTION_SCOPE;
  const explanations: Explanation[] = [];
  const parts: Decimal[] = [];

  for (const l of args.liabilities) {
    const conv = (s: DecimalString) => fxToBase(D(s), l.currency, ctx.base, ctx.prices);
    let amount = ZERO;
    if (scope !== 'NONE') {
      if (l.kind === 'IMMEDIATE') amount = conv(l.totalOutstanding);
      else if (scope === 'DUE_INSTALMENT') amount = conv(l.currentlyDue);
      else if (scope === 'TWELVE_MONTHS')
        amount = conv(l.dueWithinYear).minus(conv(l.interestWithinYear));
      else amount = conv(l.totalOutstanding);
      if (amount.isNegative()) amount = ZERO;
    }
    parts.push(amount);
    explanations.push(
      explain({
        ruleId: 'DEBT_DEDUCTION_SCOPE',
        option: scope,
        mode: ctx.mode,
        subjectId: l.id,
        inputs: {
          kind: l.kind,
          totalOutstanding: conv(l.totalOutstanding),
          currentlyDue: conv(l.currentlyDue),
          dueWithinYear: conv(l.dueWithinYear),
          interestWithinYear: conv(l.interestWithinYear),
        },
        output: amount,
        effect: amount.isZero() ? 'EXCLUDE' : 'DEDUCT',
      }),
    );
  }

  let total = sum(parts);

  if (ctx.rules.DEBT_SURPLUS_OFFSET === 'ON' && total.gt(ZERO)) {
    const surplus = D(args.surplusNonZakatableAssets ?? '0');
    const after = total.minus(surplus);
    const offsetTotal = after.isNegative() ? ZERO : after;
    explanations.push(
      explain({
        ruleId: 'DEBT_SURPLUS_OFFSET',
        option: 'ON',
        mode: ctx.mode,
        subjectId: 'liabilities',
        inputs: { deductibleBeforeOffset: total, surplusNonZakatableAssets: surplus },
        output: offsetTotal,
        effect: offsetTotal.lt(total) ? 'PARTIAL' : 'INFO',
      }),
    );
    total = offsetTotal;
  }

  const prior = D(args.priorUnpaidZakat ?? '0');
  if (prior.gt(ZERO)) {
    const option = ctx.rules.QADA_PRIOR_UNPAID;
    const deducted = option === 'DEDUCT' ? prior : ZERO;
    explanations.push(
      explain({
        ruleId: 'QADA_PRIOR_UNPAID',
        option,
        mode: ctx.mode,
        subjectId: 'priorUnpaidZakat',
        inputs: { priorUnpaidZakat: prior },
        output: deducted,
        effect: deducted.isZero() ? 'EXCLUDE' : 'DEDUCT',
      }),
    );
    total = total.plus(deducted);
  }

  return { total, explanations };
}
