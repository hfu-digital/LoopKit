import { describe, it, expect } from 'vitest';
import { getDayStart, isDueToday, getDaysSince } from '../../src/domain/srs/day-boundary';

describe('getDayStart', () => {
    it('returns day start when current time is after boundary', () => {
        const now = new Date('2025-06-01T10:00:00Z'); // 10 AM UTC
        const start = getDayStart(now, 4); // day starts at 4 AM
        expect(start.getUTCHours()).toBe(4);
        expect(start.getUTCDate()).toBe(1); // same day
    });

    it('returns previous day start when current time is before boundary', () => {
        const now = new Date('2025-06-01T03:00:00Z'); // 3 AM UTC
        const start = getDayStart(now, 4); // day starts at 4 AM
        expect(start.getUTCHours()).toBe(4);
        expect(start.getUTCDate()).toBe(31); // previous day (May 31)
    });

    it('works with midnight boundary', () => {
        const now = new Date('2025-06-01T23:00:00Z');
        const start = getDayStart(now, 0);
        expect(start.getUTCHours()).toBe(0);
        expect(start.getUTCDate()).toBe(1);
    });
});

describe('isDueToday', () => {
    it('returns true for cards due before next day boundary', () => {
        const now = new Date('2025-06-01T12:00:00Z');
        const dueDate = new Date('2025-06-01T15:00:00Z');
        expect(isDueToday(dueDate, now, 4)).toBe(true);
    });

    it('returns true for overdue cards', () => {
        const now = new Date('2025-06-01T12:00:00Z');
        const dueDate = new Date('2025-05-30T12:00:00Z');
        expect(isDueToday(dueDate, now, 4)).toBe(true);
    });

    it('returns false for cards due after next day boundary', () => {
        const now = new Date('2025-06-01T12:00:00Z');
        const dueDate = new Date('2025-06-03T12:00:00Z');
        expect(isDueToday(dueDate, now, 4)).toBe(false);
    });
});

describe('getDaysSince', () => {
    it('returns correct number of days', () => {
        const date = new Date('2025-06-01T12:00:00Z');
        const now = new Date('2025-06-04T12:00:00Z');
        expect(getDaysSince(date, now)).toBe(3);
    });

    it('returns 0 for same day', () => {
        const now = new Date('2025-06-01T12:00:00Z');
        expect(getDaysSince(now, now)).toBe(0);
    });

    it('floors partial days', () => {
        const date = new Date('2025-06-01T12:00:00Z');
        const now = new Date('2025-06-02T06:00:00Z');
        expect(getDaysSince(date, now)).toBe(0);
    });
});
