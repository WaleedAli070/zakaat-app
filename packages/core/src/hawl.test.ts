import { describe, expect, it } from 'vitest';
import { AttestationRequiredError, evaluateHawl } from './hawl.js';
import { periodEnd } from './hijri.js';
import { resolveRules } from './rulesets/index.js';
import type { Mode } from './types.js';

const ctx = (mode: Mode) => ({ mode, rules: resolveRules(mode).rules });
const start = '2025-03-01';
const end = periodEnd(start);

describe('evaluateHawl', () => {
  it('START_END: due unless wealth hit zero', () => {
    expect(evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).status).toBe('DUE');
    const r = evaluateHawl(
      { startISO: start, closeISO: end, wealthHitZero: 'YES', regainedISO: '2025-09-01' },
      ctx('HANAFI'),
    );
    expect(r.status).toBe('RESET');
    expect(r.explanations.some((e) => e.ruleId === 'HAWL_MODEL' && e.option === 'START_END')).toBe(
      true,
    );
  });

  it('CONTINUOUS: requires the dip attestation and breaks on YES', () => {
    expect(() => evaluateHawl({ startISO: start, closeISO: end }, ctx('SHAFII'))).toThrow(
      AttestationRequiredError,
    );
    expect(
      evaluateHawl({ startISO: start, closeISO: end, dipBelowNisab: 'NO' }, ctx('SHAFII')).status,
    ).toBe('DUE');
    expect(
      evaluateHawl(
        { startISO: start, closeISO: end, dipBelowNisab: 'YES', regainedISO: '2025-10-01' },
        ctx('MALIKI'),
      ).status,
    ).toBe('BROKEN');
  });

  it('reports the derived period end', () => {
    expect(evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).periodEndISO).toBe(end);
  });

  it('warns on early close per the advance-payment rule', () => {
    const early = evaluateHawl(
      { startISO: start, closeISO: '2025-12-01', dipBelowNisab: 'NO' },
      ctx('MALIKI'),
    );
    const w = early.explanations.find((e) => e.ruleId === 'ADVANCE_PAYMENT');
    expect(w?.effect).toBe('WARNING');
    expect(w?.option).toBe('RESTRICTED');
    const hanafi = evaluateHawl({ startISO: start, closeISO: '2025-12-01' }, ctx('HANAFI'));
    expect(hanafi.explanations.find((e) => e.ruleId === 'ADVANCE_PAYMENT')?.option).toBe('ALLOWED');
    expect(
      evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI')).explanations.some(
        (e) => e.ruleId === 'ADVANCE_PAYMENT',
      ),
    ).toBe(false);
  });

  it('labels annexed new wealth as advance in non-Hanafi modes', () => {
    const r = evaluateHawl({ startISO: start, closeISO: end, dipBelowNisab: 'NO' }, ctx('SHAFII'));
    expect(
      r.explanations.some(
        (e) => e.ruleId === 'HAWL_NEW_WEALTH' && e.option === 'ANNEX_LABEL_ADVANCE',
      ),
    ).toBe(true);
    const h = evaluateHawl({ startISO: start, closeISO: end }, ctx('HANAFI'));
    expect(
      h.explanations.some(
        (e) => e.ruleId === 'HAWL_NEW_WEALTH' && e.option === 'ANNEX_LABEL_ADVANCE',
      ),
    ).toBe(false);
  });
});
