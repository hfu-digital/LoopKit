import { describe, it, expect } from 'vitest';
import {
    reviewsPerDay,
    retentionRate,
    reviewForecast,
    deckBreakdown,
    studyStreak,
    averageEase,
    lapseRate,
    sessionSummary,
} from '../../src/domain/stats';
import type { CardBase, ReviewLog, CardStateSnapshot } from '../../src/types/entities';

function makeLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
    const now = new Date();
    const snap: CardStateSnapshot = {
        state: 'review',
        easeFactor: 2.5,
        interval: 1,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 1,
    };
    return {
        id: 'log-1',
        cardId: 'card-1',
        deckId: 'deck-1',
        grade: 'good',
        prevState: { ...snap },
        newState: { ...snap, interval: 3 },
        reviewedAt: now,
        timeTakenMs: 5000,
        ...overrides,
    };
}

function makeCard(overrides: Partial<CardBase> = {}): CardBase {
    const now = new Date();
    return {
        id: 'card-1',
        noteId: 'note-1',
        templateId: 'tpl-1',
        deckId: 'deck-1',
        state: 'review',
        easeFactor: 2.5,
        interval: 10,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 5,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('reviewsPerDay', () => {
    it('returns empty map for no logs', () => {
        const map = reviewsPerDay([]);
        expect(map.size).toBe(0);
    });

    it('groups logs by date', () => {
        const day1 = new Date('2026-01-15T10:00:00Z');
        const day1b = new Date('2026-01-15T14:00:00Z');
        const day2 = new Date('2026-01-16T10:00:00Z');

        const map = reviewsPerDay([
            makeLog({ reviewedAt: day1 }),
            makeLog({ reviewedAt: day1b }),
            makeLog({ reviewedAt: day2 }),
        ]);
        expect(map.get('2026-01-15')).toBe(2);
        expect(map.get('2026-01-16')).toBe(1);
    });
});

describe('retentionRate', () => {
    it('returns 0 for empty logs', () => {
        expect(retentionRate([])).toBe(0);
    });

    it('only counts review-state cards', () => {
        const learningSnap: CardStateSnapshot = {
            state: 'learning',
            easeFactor: 2.5,
            interval: 0,
            dueDate: new Date(),
            currentStep: 0,
            lapseCount: 0,
            reviewCount: 0,
        };
        // All logs have prevState = learning, so retention should be 0
        expect(retentionRate([makeLog({ prevState: learningSnap })])).toBe(0);
    });

    it('calculates correctly for all correct', () => {
        expect(retentionRate([
            makeLog({ grade: 'good' }),
            makeLog({ grade: 'easy' }),
        ])).toBe(1);
    });

    it('calculates correctly for all wrong', () => {
        expect(retentionRate([
            makeLog({ grade: 'again' }),
            makeLog({ grade: 'again' }),
        ])).toBe(0);
    });

    it('calculates mixed grades', () => {
        const rate = retentionRate([
            makeLog({ grade: 'good' }),
            makeLog({ grade: 'again' }),
        ]);
        expect(rate).toBe(0.5);
    });
});

describe('reviewForecast', () => {
    it('returns empty day entries for no cards', () => {
        const map = reviewForecast([], 7);
        expect(map.size).toBe(7);
        for (const count of map.values()) {
            expect(count).toBe(0);
        }
    });

    it('counts cards due within forecast window', () => {
        const tomorrow = new Date(Date.now() + 86400000);
        const map = reviewForecast([makeCard({ dueDate: tomorrow })], 7);
        const tomorrowKey = tomorrow.toISOString().split('T')[0]!;
        expect(map.get(tomorrowKey)).toBe(1);
    });
});

describe('deckBreakdown', () => {
    it('returns zeros for empty array', () => {
        expect(deckBreakdown([])).toEqual({ new: 0, learning: 0, review: 0, relearning: 0 });
    });

    it('counts all states', () => {
        const result = deckBreakdown([
            makeCard({ state: 'new' }),
            makeCard({ state: 'new' }),
            makeCard({ state: 'learning' }),
            makeCard({ state: 'review' }),
            makeCard({ state: 'relearning' }),
        ]);
        expect(result).toEqual({ new: 2, learning: 1, review: 1, relearning: 1 });
    });
});

describe('studyStreak', () => {
    it('returns 0 for no logs', () => {
        expect(studyStreak([])).toBe(0);
    });

    it('counts consecutive days including today', () => {
        const today = new Date();
        const yesterday = new Date(Date.now() - 86400000);
        const dayBefore = new Date(Date.now() - 2 * 86400000);

        expect(studyStreak([
            makeLog({ reviewedAt: today }),
            makeLog({ reviewedAt: yesterday }),
            makeLog({ reviewedAt: dayBefore }),
        ])).toBe(3);
    });

    it('returns 0 if last study was more than a day ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
        expect(studyStreak([makeLog({ reviewedAt: threeDaysAgo })])).toBe(0);
    });
});

describe('averageEase', () => {
    it('returns 0 for empty array', () => {
        expect(averageEase([])).toBe(0);
    });

    it('averages ease factors', () => {
        const avg = averageEase([
            makeCard({ easeFactor: 2.0 }),
            makeCard({ easeFactor: 3.0 }),
        ]);
        expect(avg).toBe(2.5);
    });
});

describe('lapseRate', () => {
    it('returns 0 for no review logs', () => {
        expect(lapseRate([])).toBe(0);
    });

    it('calculates lapse percentage', () => {
        const rate = lapseRate([
            makeLog({ grade: 'again' }),
            makeLog({ grade: 'good' }),
            makeLog({ grade: 'good' }),
            makeLog({ grade: 'again' }),
        ]);
        expect(rate).toBe(0.5);
    });
});

describe('sessionSummary', () => {
    it('returns zeros for empty logs', () => {
        const result = sessionSummary([]);
        expect(result).toEqual({ totalReviewed: 0, averageTimeMs: 0, retention: 0 });
    });

    it('calculates summary stats', () => {
        const result = sessionSummary([
            makeLog({ grade: 'good', timeTakenMs: 4000 }),
            makeLog({ grade: 'again', timeTakenMs: 6000 }),
        ]);
        expect(result.totalReviewed).toBe(2);
        expect(result.averageTimeMs).toBe(5000);
        expect(result.retention).toBe(0.5);
    });
});
