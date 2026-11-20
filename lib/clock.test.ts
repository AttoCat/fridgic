import { describe, expect, it } from 'vitest';
import { Clock, getFixedClock, parseCalendarDate, parseInstant } from './clock';

describe('Clock', () => {
  it('注入した関数から現在時刻を取得する', () => {
    const instant = parseInstant('2026-11-19T00:00:00Z');
    const clock = new Clock(() => instant);

    expect(clock.now().equals(instant)).toBe(true);
  });

  it('nowを呼ぶたびに時刻を取得し直す', () => {
    let current = parseInstant('2026-11-19T00:00:00Z');
    const clock = new Clock(() => current);

    expect(clock.now().toString()).toBe('2026-11-19T00:00:00Z');

    current = parseInstant('2026-11-19T01:00:00Z');

    expect(clock.now().toString()).toBe('2026-11-19T01:00:00Z');
  });
});

describe('getFixedClock', () => {
  it('何度呼んでも指定した時刻を返す', () => {
    const instant = parseInstant('2026-11-19T00:00:00Z');
    const clock = getFixedClock(instant);

    expect(clock.now().equals(instant)).toBe(true);
    expect(clock.now().equals(instant)).toBe(true);
  });
});

describe('parseInstant', () => {
  it.todo('オフセット付き文字列が正しいUTC時刻になる');
  it('不正な文字列で例外になる', () => {
    const wrongString = '2026-12-32T00:00:00Z';
    expect(() => parseInstant(wrongString)).toThrow(RangeError);
  });
});

describe('parseCalendarDate', () => {
  it.todo('オフセット付き文字列が正しいUTC日時になる');
  it('不正な文字列で例外になる', () => {
    const wrongString = '2026-12-32T00:00:00Z';
    expect(() => parseCalendarDate(wrongString)).toThrow(RangeError);
  });
});
