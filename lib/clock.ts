import { Temporal } from '@js-temporal/polyfill';

export type Instant = Temporal.Instant;
export type CalendarDate = Temporal.PlainDate;

export const parseInstant = (value: string): Instant => Temporal.Instant.from(value);
export const parseCalendarDate = (value: string): CalendarDate => Temporal.PlainDate.from(value);

export const isBefore = (a: Instant, b: Instant): boolean => Temporal.Instant.compare(a, b) < 0;
export const isAfter = (a: Instant, b: Instant): boolean => Temporal.Instant.compare(a, b) > 0;

export class Clock {
  constructor(private readonly getNow: () => Instant) {}

  now(): Instant {
    return this.getNow();
  }
}

export const clock = new Clock(() => Temporal.Now.instant());

export const getFixedClock = (instant: Instant) => new Clock(() => instant);
