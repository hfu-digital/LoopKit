import { describe, it, expect } from 'vitest';
import { formatInterval, previewNextIntervals } from '../../src/domain/srs/interval-preview';
import { SM2Algorithm } from '../../src/domain/srs/sm2';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';
import type { SRSState } from '../../src/domain/srs/srs-algorithm';

describe('formatInterval', () => {
    it('formats minutes', () => {
        expect(formatInterval(1 / (24 * 60))).toBe('1m');
        expect(formatInterval(10 / (24 * 60))).toBe('10m');
        expect(formatInterval(30 / (24 * 60))).toBe('30m');
    });

    it('formats hours', () => {
        expect(formatInterval(1 / 24)).toBe('1h');
        expect(formatInterval(6 / 24)).toBe('6h');
        expect(formatInterval(23 / 24)).toBe('23h');
    });

    it('formats days', () => {
        expect(formatInterval(1)).toBe('1d');
        expect(formatInterval(15)).toBe('15d');
        expect(formatInterval(30)).toBe('30d');
    });

    it('formats months', () => {
        expect(formatInterval(31)).toBe('1mo');
        expect(formatInterval(90)).toBe('3mo');
        expect(formatInterval(180)).toBe('6mo');
    });

    it('formats years', () => {
        expect(formatInterval(365)).toBe('1y');
        expect(formatInterval(730)).toBe('2y');
    });
});

describe('previewNextIntervals', () => {
    const algorithm = new SM2Algorithm();
    const config = { ...DEFAULT_DECK_CONFIG, enableFuzz: false };
    const now = new Date('2025-06-01T12:00:00Z');

    it('returns intervals for all grades on a new card', () => {
        const card: SRSState = algorithm.getInitialState(config, now);
        const previews = previewNextIntervals(card, config, algorithm, now);

        expect(previews.again).toBe('1m');
        expect(previews.good).toBe('10m');
        expect(previews.easy).toBeDefined();
        expect(typeof previews.hard).toBe('string');
    });

    it('returns intervals for a review card', () => {
        const card: SRSState = {
            state: 'review',
            easeFactor: 2.5,
            interval: 10,
            dueDate: now,
            currentStep: 0,
            lapseCount: 0,
            reviewCount: 5,
        };
        const previews = previewNextIntervals(card, config, algorithm, now);

        expect(previews.again).toBeDefined();
        expect(previews.hard).toBeDefined();
        expect(previews.good).toBe('25d');
        expect(previews.easy).toBeDefined();
    });
});
