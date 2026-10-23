import uq from '@umalqura/core';

export type HijriDate = { hy: number; hm: number; hd: number };
export type ISODate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function fromISODate(s: ISODate): Date {
  const m = ISO.exec(s);
  if (!m) throw new RangeError(`Not an ISO date: ${s}`);
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new RangeError(`Invalid date: ${s}`);
  }
  return date;
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shift(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function gregorianToHijri(iso: ISODate, offsetDays = 0): HijriDate {
  const u = uq(shift(fromISODate(iso), -offsetDays));
  return { hy: u.hy, hm: u.hm, hd: u.hd };
}

export function hijriToGregorian(h: HijriDate, offsetDays = 0): ISODate {
  return toISODate(shift(uq(h.hy, h.hm, h.hd).date, offsetDays));
}

export function daysInHijriMonth(hy: number, hm: number): number {
  return uq(hy, hm, 1).daysInMonth;
}

export function addHijriYears(h: HijriDate, years: number): HijriDate {
  const hy = h.hy + years;
  const hd = Math.min(h.hd, daysInHijriMonth(hy, h.hm));
  return { hy, hm: h.hm, hd };
}

export function nextAnniversary(anniversary: HijriDate, fromISO: ISODate, offsetDays = 0): ISODate {
  const from = gregorianToHijri(fromISO, offsetDays);
  const base: HijriDate = { hy: from.hy, hm: anniversary.hm, hd: anniversary.hd };
  const candidateISO = hijriToGregorian(addHijriYears(base, 0), offsetDays);
  if (candidateISO > fromISO) return candidateISO;
  return hijriToGregorian(addHijriYears(base, 1), offsetDays);
}

export function periodEnd(startISO: ISODate, offsetDays = 0): ISODate {
  const start = gregorianToHijri(startISO, offsetDays);
  const nextStart = hijriToGregorian(addHijriYears(start, 1), offsetDays);
  return toISODate(shift(fromISODate(nextStart), -1));
}
