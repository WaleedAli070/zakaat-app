import { describe, expect, it } from 'vitest';
import {
  addHijriYears,
  daysInHijriMonth,
  fromISODate,
  gregorianToHijri,
  hijriToGregorian,
  nextAnniversary,
  periodEnd,
  toISODate,
} from './hijri.js';

describe('iso helpers', () => {
  it('round-trips ISO dates', () => {
    expect(toISODate(fromISODate('2019-07-03'))).toBe('2019-07-03');
    expect(() => fromISODate('03/07/2019')).toThrow(RangeError);
  });
});

describe('gregorian <-> hijri (Umm al-Qura)', () => {
  it('matches the @umalqura/core documented anchor: 2019-07-03 = 1440-10-30', () => {
    expect(gregorianToHijri('2019-07-03')).toEqual({ hy: 1440, hm: 10, hd: 30 });
    expect(hijriToGregorian({ hy: 1440, hm: 10, hd: 30 })).toBe('2019-07-03');
  });

  it('applies a sighting offset in days', () => {
    // offset +1 means the local community is one day behind Umm al-Qura
    expect(gregorianToHijri('2019-07-03', 1)).toEqual({ hy: 1440, hm: 10, hd: 29 });
    expect(hijriToGregorian({ hy: 1440, hm: 10, hd: 30 }, 1)).toBe('2019-07-04');
  });

  it('round-trips every day of a year', () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(2024, 0, 1);
      d.setDate(d.getDate() + i);
      const iso = toISODate(d);
      expect(hijriToGregorian(gregorianToHijri(iso))).toBe(iso);
    }
  });
});

describe('year arithmetic', () => {
  it('adds hijri years and clamps the day to the month length', () => {
    expect(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1).hy).toBe(1441);
    const len = daysInHijriMonth(1441, 10);
    expect(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1).hd).toBe(Math.min(30, len));
  });

  it('clamps a 30 Dhul-Hijjah anniversary to 29 in a short year rather than rolling into Muharram', () => {
    // find the first adjacent pair (prev has 30-day month 12, hy has 29-day month 12)
    let prev = 1440;
    while (!(daysInHijriMonth(prev, 12) === 30 && daysInHijriMonth(prev + 1, 12) === 29)) {
      prev++;
      if (prev > 1500) throw new Error('fixture assumption failed');
    }
    const hy = prev + 1;
    const r = addHijriYears({ hy: prev, hm: 12, hd: 30 }, 1);
    expect(r).toEqual({ hy, hm: 12, hd: 29 });
  });

  it('computes the next anniversary strictly after a date', () => {
    const next = nextAnniversary({ hy: 1440, hm: 9, hd: 1 }, '2019-07-03');
    expect(gregorianToHijri(next)).toEqual({ hy: 1441, hm: 9, hd: 1 });
    const same = nextAnniversary({ hy: 1440, hm: 10, hd: 30 }, '2019-07-02');
    expect(same).toBe('2019-07-03');
  });

  it('computes period end as the day before the next same hijri date', () => {
    const end = periodEnd('2019-07-03');
    const next = hijriToGregorian(addHijriYears({ hy: 1440, hm: 10, hd: 30 }, 1));
    const expected = new Date(fromISODate(next));
    expected.setDate(expected.getDate() - 1);
    expect(end).toBe(toISODate(expected));
  });
});
