import { describe, it, expect, vi } from 'vitest';
import { SM2Algorithm, applyFuzz, clampEase, clampInterval } from '../../src/domain/srs/sm2';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';
import type { SRSState } from '../../src/domain/srs/srs-algorithm';
import type { DeckConfig } from '../../src/types/config';

const algorithm = new SM2Algorithm();
const now = new Date('2025-06-01T12:00:00Z');
const config: DeckConfig = { ...DEFAULT_DECK_CONFIG, enableFuzz: false };

function makeNewCard(): SRSState {
    return algorithm.getInitialState(config, now);
}

function makeLearningCard(step = 0): SRSState {
    return {
        state: 'learning',
        easeFactor: 2.5,
        interval: 0,
        dueDate: now,
        currentStep: step,
        lapseCount: 0,
        reviewCount: 0,
    };
}

function makeReviewCard(interval = 10, ease = 2.5): SRSState {
    return {
        state: 'review',
        easeFactor: ease,
        interval,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 5,
    };
}

function makeRelearningCard(step = 0, interval = 7): SRSState {
    return {
        state: 'relearning',
        easeFactor: 2.3,
        interval,
        dueDate: now,
        currentStep: step,
        lapseCount: 1,
        reviewCount: 5,
    };
}

describe('SM2Algorithm', () => {
    describe('getInitialState', () => {
        it('returns a new card state', () => {
            const state = algorithm.getInitialState(config, now);
            expect(state.state).toBe('new');
            expect(state.easeFactor).toBe(2.5);
            expect(state.interval).toBe(0);
            expect(state.currentStep).toBe(0);
            expect(state.lapseCount).toBe(0);
            expect(state.reviewCount).toBe(0);
        });
    });

    describe('new card grading', () => {
        it('Again — enters learning step 0', () => {
            const result = algorithm.calculateNextState(makeNewCard(), 'again', config, now);
            expect(result.state).toBe('learning');
            expect(result.currentStep).toBe(0);
            // Due in 1 minute (first learning step)
            expect(result.dueDate.getTime()).toBe(now.getTime() + 1 * 60 * 1000);
        });

        it('Good — advances to step 1', () => {
            const result = algorithm.calculateNextState(makeNewCard(), 'good', config, now);
            expect(result.state).toBe('learning');
            expect(result.currentStep).toBe(1);
            // Due in 10 minutes (second learning step)
            expect(result.dueDate.getTime()).toBe(now.getTime() + 10 * 60 * 1000);
        });

        it('Easy — immediately graduates with easyInterval', () => {
            const result = algorithm.calculateNextState(makeNewCard(), 'easy', config, now);
            expect(result.state).toBe('review');
            expect(result.interval).toBe(config.easyInterval);
        });
    });

    describe('learning card step progression', () => {
        it('Again — resets to step 0', () => {
            const card = makeLearningCard(1);
            const result = algorithm.calculateNextState(card, 'again', config, now);
            expect(result.currentStep).toBe(0);
            expect(result.dueDate.getTime()).toBe(now.getTime() + 1 * 60 * 1000);
        });

        it('Hard — repeats current step with 1.5x duration', () => {
            const card = makeLearningCard(0);
            const result = algorithm.calculateNextState(card, 'hard', config, now);
            expect(result.state).toBe('learning');
            expect(result.currentStep).toBe(0);
            // Step 0 = 1 min, hard = 1.5 min → rounds to 2 min
            expect(result.dueDate.getTime()).toBe(now.getTime() + 2 * 60 * 1000);
        });

        it('Good — advances to next step', () => {
            const card = makeLearningCard(0);
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.state).toBe('learning');
            expect(result.currentStep).toBe(1);
            expect(result.dueDate.getTime()).toBe(now.getTime() + 10 * 60 * 1000);
        });

        it('Good on last step — graduates with graduatingInterval', () => {
            const card = makeLearningCard(1); // step 1 is last step (steps: [1, 10])
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.state).toBe('review');
            expect(result.interval).toBe(config.graduatingInterval);
        });

        it('Easy — graduates immediately with easyInterval', () => {
            const card = makeLearningCard(0);
            const result = algorithm.calculateNextState(card, 'easy', config, now);
            expect(result.state).toBe('review');
            expect(result.interval).toBe(config.easyInterval);
            expect(result.easeFactor).toBe(2.65); // +0.15
        });
    });

    describe('review card grading', () => {
        it('Again — enters relearning, ease -0.20', () => {
            const card = makeReviewCard(10, 2.5);
            const result = algorithm.calculateNextState(card, 'again', config, now);
            expect(result.state).toBe('relearning');
            expect(result.easeFactor).toBe(2.3);
            expect(result.lapseCount).toBe(1);
            expect(result.interval).toBe(Math.max(
                config.lapseMinInterval,
                Math.round(10 * config.lapseNewInterval),
            ));
        });

        it('Hard — interval × hardIntervalMultiplier, ease -0.15', () => {
            const card = makeReviewCard(10, 2.5);
            const result = algorithm.calculateNextState(card, 'hard', config, now);
            expect(result.state).toBe('review');
            expect(result.easeFactor).toBe(2.35);
            expect(result.interval).toBe(Math.round(10 * config.hardIntervalMultiplier));
        });

        it('Good — interval × easeFactor, ease unchanged', () => {
            const card = makeReviewCard(10, 2.5);
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.state).toBe('review');
            expect(result.easeFactor).toBe(2.5);
            expect(result.interval).toBe(Math.round(10 * 2.5));
        });

        it('Easy — interval × easeFactor × easyBonus, ease +0.15', () => {
            const card = makeReviewCard(10, 2.5);
            const result = algorithm.calculateNextState(card, 'easy', config, now);
            expect(result.state).toBe('review');
            expect(result.easeFactor).toBe(2.65);
            expect(result.interval).toBe(Math.round(10 * 2.5 * config.easyBonus));
        });

        it('increments reviewCount', () => {
            const card = makeReviewCard(10, 2.5);
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.reviewCount).toBe(card.reviewCount + 1);
        });
    });

    describe('relearning card grading', () => {
        it('Again — resets to step 0', () => {
            const card = makeRelearningCard(0, 7);
            const result = algorithm.calculateNextState(card, 'again', config, now);
            expect(result.state).toBe('relearning');
            expect(result.currentStep).toBe(0);
        });

        it('Good on last step — graduates back to review', () => {
            // relearningSteps: [10] — only one step, so step 0 is last
            const card = makeRelearningCard(0, 7);
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.state).toBe('review');
            expect(result.interval).toBe(Math.max(config.lapseMinInterval, 7));
        });

        it('Easy — graduates immediately', () => {
            const card = makeRelearningCard(0, 7);
            const result = algorithm.calculateNextState(card, 'easy', config, now);
            expect(result.state).toBe('review');
        });
    });

    describe('ease factor bounds', () => {
        it('never drops below 1.3', () => {
            let card = makeReviewCard(10, 1.4);
            const result = algorithm.calculateNextState(card, 'again', config, now);
            expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
        });

        it('multiple Again presses keep ease at 1.3', () => {
            let card = makeReviewCard(10, 1.3);
            const result = algorithm.calculateNextState(card, 'again', config, now);
            expect(result.easeFactor).toBe(1.3);
        });
    });

    describe('interval bounds', () => {
        it('interval capped at maxInterval', () => {
            const card = makeReviewCard(30000, 2.5);
            const result = algorithm.calculateNextState(card, 'good', config, now);
            expect(result.interval).toBeLessThanOrEqual(config.maxInterval);
        });
    });

    describe('fuzz', () => {
        it('applies fuzz when enabled and interval >= 3', () => {
            const fuzzConfig = { ...config, enableFuzz: true };
            const card = makeReviewCard(100, 2.5);

            // Run multiple times — should not always produce the same result
            const intervals = new Set<number>();
            for (let i = 0; i < 50; i++) {
                const result = algorithm.calculateNextState(card, 'good', fuzzConfig, now);
                intervals.add(result.interval);
            }
            // With fuzz, we expect some variance
            expect(intervals.size).toBeGreaterThan(1);
        });

        it('does not apply fuzz when disabled', () => {
            const card = makeReviewCard(100, 2.5);
            const intervals = new Set<number>();
            for (let i = 0; i < 20; i++) {
                const result = algorithm.calculateNextState(card, 'good', config, now);
                intervals.add(result.interval);
            }
            expect(intervals.size).toBe(1);
        });
    });
});

describe('helper functions', () => {
    it('clampEase enforces minimum 1.3', () => {
        expect(clampEase(1.0)).toBe(1.3);
        expect(clampEase(1.3)).toBe(1.3);
        expect(clampEase(2.5)).toBe(2.5);
    });

    it('clampInterval enforces [0, max]', () => {
        expect(clampInterval(-5, 100)).toBe(0);
        expect(clampInterval(50, 100)).toBe(50);
        expect(clampInterval(200, 100)).toBe(100);
    });

    it('applyFuzz returns same value when disabled', () => {
        expect(applyFuzz(10, false)).toBe(10);
    });

    it('applyFuzz returns same value for small intervals', () => {
        expect(applyFuzz(2, true)).toBe(2);
    });
});
