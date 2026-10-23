import { explain } from './explain.js';
import { type ISODate, periodEnd } from './hijri.js';
import { ZERO } from './money.js';
import type { RuleSelection } from './rules/registry.js';
import type { Explanation, HawlInput, HawlStatus, Mode } from './types.js';

export class AttestationRequiredError extends Error {
  constructor(public readonly field: 'dipBelowNisab') {
    super(`Attestation required: ${field}`);
    this.name = 'AttestationRequiredError';
  }
}

export function evaluateHawl(
  hawl: HawlInput,
  ctx: { mode: Mode; rules: RuleSelection; hijriOffsetDays?: number },
): { status: HawlStatus; periodEndISO: ISODate; explanations: Explanation[] } {
  const explanations: Explanation[] = [];
  const model = ctx.rules.HAWL_MODEL;
  const periodEndISO = periodEnd(hawl.startISO, ctx.hijriOffsetDays ?? 0);
  let status: HawlStatus = 'DUE';

  if (model === 'START_END') {
    if (hawl.wealthHitZero === 'YES') status = 'RESET';
    explanations.push(
      explain({
        ruleId: 'HAWL_MODEL',
        option: model,
        mode: ctx.mode,
        subjectId: 'period',
        inputs: {
          startISO: hawl.startISO,
          closeISO: hawl.closeISO,
          wealthHitZero: hawl.wealthHitZero ?? 'NO',
          regainedISO: hawl.regainedISO ?? '',
        },
        output: ZERO,
        effect: status === 'DUE' ? 'INFO' : 'WARNING',
      }),
    );
  } else {
    if (hawl.dipBelowNisab === undefined) throw new AttestationRequiredError('dipBelowNisab');
    if (hawl.dipBelowNisab === 'YES') status = 'BROKEN';
    explanations.push(
      explain({
        ruleId: 'HAWL_MODEL',
        option: model,
        mode: ctx.mode,
        subjectId: 'period',
        inputs: {
          startISO: hawl.startISO,
          closeISO: hawl.closeISO,
          dipBelowNisab: hawl.dipBelowNisab,
          regainedISO: hawl.regainedISO ?? '',
        },
        output: ZERO,
        effect: status === 'DUE' ? 'INFO' : 'WARNING',
      }),
    );
  }

  if (ctx.rules.HAWL_NEW_WEALTH === 'ANNEX_LABEL_ADVANCE') {
    explanations.push(
      explain({
        ruleId: 'HAWL_NEW_WEALTH',
        option: 'ANNEX_LABEL_ADVANCE',
        mode: ctx.mode,
        subjectId: 'period',
        inputs: {},
        output: ZERO,
        effect: 'INFO',
      }),
    );
  }

  if (hawl.closeISO < periodEndISO) {
    explanations.push(
      explain({
        ruleId: 'ADVANCE_PAYMENT',
        option: ctx.rules.ADVANCE_PAYMENT,
        mode: ctx.mode,
        subjectId: 'period',
        inputs: { closeISO: hawl.closeISO, periodEndISO },
        output: ZERO,
        effect: 'WARNING',
      }),
    );
  } else if (hawl.closeISO > periodEndISO) {
    explanations.push(
      explain({
        ruleId: 'FIXED',
        option: 'HAWL_LATE_CLOSE',
        mode: ctx.mode,
        subjectId: 'period',
        inputs: { closeISO: hawl.closeISO, periodEndISO },
        output: ZERO,
        effect: 'INFO',
      }),
    );
  }

  return { status, periodEndISO, explanations };
}
