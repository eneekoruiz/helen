import { describe, expect, it } from 'vitest';
import { describeInstant, localParts, zonedTimeToUtc } from '../src/assistant/time.js';
import { nextOccurrence, parseWhen, stripWhen, type Recurrence } from '../src/assistant/when.js';

// Tuesday 20 October 2026, 10:30 in Madrid (CEST, UTC+2). Clocks go back on Sunday 25 October.
const NOW = new Date('2026-10-20T08:30:00Z');
const TZ = 'Europe/Madrid';
const at = (text: string, locale = 'es-ES') => parseWhen(text, { now: NOW, timezone: TZ, locale })?.due.toISOString();

describe('time zones', () => {
  it('converts wall-clock time across the DST change', () => {
    expect(zonedTimeToUtc(2026, 10, 24, 9, 0, TZ).toISOString()).toBe('2026-10-24T07:00:00.000Z');
    expect(zonedTimeToUtc(2026, 10, 26, 9, 0, TZ).toISOString()).toBe('2026-10-26T08:00:00.000Z');
    expect(zonedTimeToUtc(2026, 3, 29, 12, 0, TZ).toISOString()).toBe('2026-03-29T10:00:00.000Z');
    expect(localParts(NOW, TZ)).toMatchObject({ year: 2026, month: 10, day: 20, hour: 10, minute: 30, weekday: 2 });
    expect(zonedTimeToUtc(2026, 10, 20, 9, 0, 'America/New_York').toISOString()).toBe('2026-10-20T13:00:00.000Z');
  });

  it('describes an instant in the owner language', () => {
    expect(describeInstant(new Date('2026-10-21T07:00:00Z'), TZ, 'es-ES', NOW)).toMatch(/^mañana \(miércoles, 21 de octubre\) a las 09:00$/);
    expect(describeInstant(new Date('2026-10-20T16:30:00Z'), TZ, 'en-US', NOW)).toMatch(/^today \(Tuesday, October 20\) at 18:30$/);
  });
});

describe('Spanish', () => {
  const cases: Array<[string, string]> = [
    ['mañana a las 9', '2026-10-21T07:00:00.000Z'],
    ['hoy a las 18:30', '2026-10-20T16:30:00.000Z'],
    ['a las 5', '2026-10-20T15:00:00.000Z'],
    ['a las 9', '2026-10-20T19:00:00.000Z'],
    ['a las 9 de la mañana', '2026-10-21T07:00:00.000Z'],
    ['en 2 horas', '2026-10-20T10:30:00.000Z'],
    ['en media hora', '2026-10-20T09:00:00.000Z'],
    ['dentro de 3 días', '2026-10-23T08:30:00.000Z'],
    ['en 3 días a las 9', '2026-10-23T07:00:00.000Z'],
    ['en una semana', '2026-10-27T09:30:00.000Z'],
    ['el viernes por la tarde', '2026-10-23T14:00:00.000Z'],
    ['el lunes a las 9', '2026-10-26T08:00:00.000Z'],
    ['el próximo martes', '2026-10-27T08:00:00.000Z'],
    ['pasado mañana a las 10', '2026-10-22T08:00:00.000Z'],
    ['el 15 de noviembre a las 17:30', '2026-11-15T16:30:00.000Z'],
    ['el 1 de enero', '2027-01-01T08:00:00.000Z'],
    ['15/11', '2026-11-15T08:00:00.000Z'],
    ['esta noche', '2026-10-20T19:00:00.000Z'],
    ['esta tarde', '2026-10-20T14:00:00.000Z'],
    ['a mediodía', '2026-10-20T10:00:00.000Z'],
    ['mañana por la mañana', '2026-10-21T07:00:00.000Z'],
    ['a las 9 y media de la noche', '2026-10-20T19:30:00.000Z'],
    ['a las 12 de la noche', '2026-10-20T22:00:00.000Z'],
    ['a las 8 menos cuarto', '2026-10-20T17:45:00.000Z'],
    ['2026-12-24 20:00', '2026-12-24T19:00:00.000Z'],
    ['en 15 minutos', '2026-10-20T08:45:00.000Z'],
    ['dentro de un mes', '2026-11-20T09:30:00.000Z'],
    // Voice assistants transcribe hours as words.
    ['mañana a las nueve', '2026-10-21T07:00:00.000Z'],
    ['a las diez y media de la noche', '2026-10-20T20:30:00.000Z'],
    ['a la una', '2026-10-20T11:00:00.000Z'],
    ['a las nueve menos diez', '2026-10-20T18:50:00.000Z'],
    ['a las dos y veinte', '2026-10-20T12:20:00.000Z'],
    ['a las cinco en punto de la tarde', '2026-10-20T15:00:00.000Z'],
    ['a las 21 horas', '2026-10-20T19:00:00.000Z'],
  ];
  for (const [text, expected] of cases) it(text, () => expect(at(text)).toBe(expected));
});

describe('English', () => {
  const cases: Array<[string, string]> = [
    ['tomorrow at 9am', '2026-10-21T07:00:00.000Z'],
    ['today at 6:30pm', '2026-10-20T16:30:00.000Z'],
    ['in 45 minutes', '2026-10-20T09:15:00.000Z'],
    ['in an hour', '2026-10-20T09:30:00.000Z'],
    ['next friday at 3pm', '2026-10-23T13:00:00.000Z'],
    ['on November 15 at 5:30 pm', '2026-11-15T16:30:00.000Z'],
    ['15th of November', '2026-11-15T08:00:00.000Z'],
    ['tonight', '2026-10-20T19:00:00.000Z'],
    ['in the morning', '2026-10-21T07:00:00.000Z'],
    ['the day after tomorrow at noon', '2026-10-22T10:00:00.000Z'],
    ['at midnight', '2026-10-20T22:00:00.000Z'],
    ['at nine thirty pm', '2026-10-20T19:30:00.000Z'],
    ["tomorrow at ten o'clock", '2026-10-21T08:00:00.000Z'],
  ];
  for (const [text, expected] of cases) it(text, () => expect(at(text)).toBe(expected));

  it('reads numeric dates by locale', () => {
    expect(at('11/12', 'en-US')).toBe('2026-11-12T08:00:00.000Z');
    expect(at('11/12', 'es-ES')).toBe('2026-12-11T08:00:00.000Z');
  });
});

describe('recurrence', () => {
  const rec = (text: string) => parseWhen(text, { now: NOW, timezone: TZ })!;
  it('every Monday at 8', () => {
    const parsed = rec('cada lunes a las 8');
    expect(parsed.recurrence).toMatchObject({ freq: 'weekly', byDay: [1], time: '08:00' });
    expect(parsed.due.toISOString()).toBe('2026-10-26T07:00:00.000Z');
  });
  it('every day at 7:30', () => {
    const parsed = rec('todos los días a las 7:30');
    expect(parsed.recurrence).toMatchObject({ freq: 'daily', interval: 1, time: '07:30' });
    expect(parsed.due.toISOString()).toBe('2026-10-21T05:30:00.000Z');
  });
  it('Tuesdays and Thursdays at 19', () => {
    const parsed = rec('los martes y jueves a las 19');
    expect(parsed.recurrence?.byDay).toEqual([2, 4]);
    expect(parsed.due.toISOString()).toBe('2026-10-20T17:00:00.000Z');
  });
  it('the 5th of every month', () => {
    const parsed = rec('el día 5 de cada mes');
    expect(parsed.recurrence).toMatchObject({ freq: 'monthly', dayOfMonth: 5 });
    expect(parsed.due.toISOString()).toBe('2026-11-05T08:00:00.000Z');
  });
  it('working days', () => {
    expect(rec('los días laborables a las 8').due.toISOString()).toBe('2026-10-21T06:00:00.000Z');
    expect(rec('every weekday at 7am').recurrence?.byDay).toEqual([1, 2, 3, 4, 5]);
  });
  it('every year on a date', () => {
    const parsed = rec('cada año el 3 de marzo');
    expect(parsed.recurrence).toMatchObject({ freq: 'yearly', month: 3, dayOfMonth: 3 });
    expect(parsed.due.toISOString()).toBe('2027-03-03T08:00:00.000Z');
  });
  it('every two weeks keeps the cadence', () => {
    const parsed = rec('cada 2 semanas el lunes a las 9');
    expect(parsed.recurrence).toMatchObject({ freq: 'weekly', interval: 2 });
  });
  it('English weekly list', () => {
    expect(rec('every monday and wednesday at 18:00').due.toISOString()).toBe('2026-10-21T16:00:00.000Z');
  });

  it('computes occurrences across DST and month ends', () => {
    const daily: Recurrence = { freq: 'daily', interval: 1, time: '09:00', anchor: '2026-10-20' };
    const first = nextOccurrence(daily, new Date('2026-10-24T08:00:00Z'), TZ)!;
    expect(first.toISOString()).toBe('2026-10-25T08:00:00.000Z');
    const monthly: Recurrence = { freq: 'monthly', interval: 1, dayOfMonth: 31, time: '09:00', anchor: '2027-01-31' };
    expect(nextOccurrence(monthly, new Date('2027-02-01T00:00:00Z'), TZ)!.toISOString()).toBe('2027-02-28T08:00:00.000Z');
    const fortnightly: Recurrence = { freq: 'weekly', interval: 2, byDay: [1], time: '09:00', anchor: '2026-10-26' };
    const a = nextOccurrence(fortnightly, new Date('2026-10-26T09:00:00Z'), TZ)!;
    expect(a.toISOString()).toBe('2026-11-09T08:00:00.000Z');
  });
});

describe('what is not a date, and what remains of the sentence', () => {
  it('ignores numbers that are not times', () => {
    expect(parseWhen('llamar a 3 personas', { now: NOW, timezone: TZ })).toBeNull();
    expect(parseWhen('comprar 2 kilos de manzanas', { now: NOW, timezone: TZ })).toBeNull();
    expect(parseWhen('buy 12 eggs and milk', { now: NOW, timezone: TZ })).toBeNull();
    expect(parseWhen('at one point he said no', { now: NOW, timezone: TZ })).toBeNull();
    expect(parseWhen('preguntar a las dos personas del equipo', { now: NOW, timezone: TZ })).toBeNull();
  });

  it('removes the date words and keeps the task', () => {
    const strip = (text: string) => stripWhen(text, parseWhen(text, { now: NOW, timezone: TZ })!.spans);
    expect(strip('llamar a mamá mañana a las 9')).toBe('llamar a mamá');
    expect(strip('mañana a las 9 llamar a mamá')).toBe('llamar a mamá');
    expect(strip('que tengo dentista el viernes por la tarde')).toBe('tengo dentista');
    expect(strip('to call mom tomorrow at 9am')).toBe('call mom');
    expect(strip('pagar el alquiler el día 5 de cada mes')).toBe('pagar el alquiler');
  });
});
