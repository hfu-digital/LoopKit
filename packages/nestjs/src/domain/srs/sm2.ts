import type { DeckConfig } from '../../types/config';
import type { Grade } from '../../types/grade';
import type { SRSAlgorithm, SRSState } from './srs-algorithm';

export function applyFuzz(interval: number, enabled: boolean): number {
    if (!enabled || interval < 3) return interval;
    const fuzzRange = Math.max(1, Math.round(interval * 0.05));
    const offset = Math.floor(Math.random() * (fuzzRange * 2 + 1)) - fuzzRange;
    return Math.max(1, interval + offset);
}

export function clampEase(ease: number): number {
    return Math.max(1.3, ease);
}

export function clampInterval(interval: number, max: number): number {
    return Math.max(0, Math.min(interval, max));
}

export function calculateDueDate(now: Date, intervalDays: number): Date {
    const due = new Date(now.getTime());
    due.setDate(due.getDate() + Math.round(intervalDays));
    return due;
}

export function calculateLearningDueDate(now: Date, stepMinutes: number): Date {
    return new Date(now.getTime() + stepMinutes * 60 * 1000);
}

function handleReviewGrade(card: SRSState, grade: Grade, config: DeckConfig, now: Date): SRSState {
    const reviewCount = card.reviewCount + 1;

    switch (grade) {
        case 'again': {
            const newInterval = Math.max(
                config.lapseMinInterval,
                Math.round(card.interval * config.lapseNewInterval),
            );
            const stepMinutes = config.relearningSteps[0] ?? 10;
            return {
                state: 'relearning',
                easeFactor: clampEase(card.easeFactor - 0.2),
                interval: newInterval,
                dueDate: calculateLearningDueDate(now, stepMinutes),
                currentStep: 0,
                lapseCount: card.lapseCount + 1,
                reviewCount,
            };
        }
        case 'hard': {
            const rawInterval = card.interval * config.hardIntervalMultiplier;
            const interval = applyFuzz(
                clampInterval(Math.round(rawInterval), config.maxInterval),
                config.enableFuzz,
            );
            return {
                state: 'review',
                easeFactor: clampEase(card.easeFactor - 0.15),
                interval,
                dueDate: calculateDueDate(now, interval),
                currentStep: 0,
                lapseCount: card.lapseCount,
                reviewCount,
            };
        }
        case 'good': {
            const rawInterval = card.interval * card.easeFactor;
            const interval = applyFuzz(
                clampInterval(Math.round(rawInterval), config.maxInterval),
                config.enableFuzz,
            );
            return {
                state: 'review',
                easeFactor: card.easeFactor,
                interval,
                dueDate: calculateDueDate(now, interval),
                currentStep: 0,
                lapseCount: card.lapseCount,
                reviewCount,
            };
        }
        case 'easy': {
            const rawInterval = card.interval * card.easeFactor * config.easyBonus;
            const interval = applyFuzz(
                clampInterval(Math.round(rawInterval), config.maxInterval),
                config.enableFuzz,
            );
            return {
                state: 'review',
                easeFactor: clampEase(card.easeFactor + 0.15),
                interval,
                dueDate: calculateDueDate(now, interval),
                currentStep: 0,
                lapseCount: card.lapseCount,
                reviewCount,
            };
        }
    }
}

function handleLearningGrade(
    card: SRSState,
    grade: Grade,
    config: DeckConfig,
    now: Date,
): SRSState {
    const steps =
        card.state === 'relearning' ? config.relearningSteps : config.learningSteps;
    const reviewCount = card.reviewCount + 1;

    switch (grade) {
        case 'again': {
            const stepMinutes = steps[0] ?? 1;
            return {
                ...card,
                currentStep: 0,
                dueDate: calculateLearningDueDate(now, stepMinutes),
                reviewCount,
            };
        }
        case 'hard': {
            const currentStepMinutes = steps[card.currentStep] ?? steps[steps.length - 1] ?? 1;
            const stepMinutes = Math.round(currentStepMinutes * 1.5);
            return {
                ...card,
                dueDate: calculateLearningDueDate(now, stepMinutes),
                reviewCount,
            };
        }
        case 'good': {
            const nextStep = card.currentStep + 1;
            if (nextStep >= steps.length) {
                // Graduate
                const interval =
                    card.state === 'relearning'
                        ? Math.max(config.lapseMinInterval, Math.round(card.interval))
                        : config.graduatingInterval;
                return {
                    state: 'review',
                    easeFactor: card.easeFactor,
                    interval,
                    dueDate: calculateDueDate(now, interval),
                    currentStep: 0,
                    lapseCount: card.lapseCount,
                    reviewCount,
                };
            }
            const stepMinutes = steps[nextStep] ?? 10;
            return {
                ...card,
                currentStep: nextStep,
                dueDate: calculateLearningDueDate(now, stepMinutes),
                reviewCount,
            };
        }
        case 'easy': {
            // Immediately graduate with easyInterval
            const interval =
                card.state === 'relearning'
                    ? Math.max(config.lapseMinInterval, Math.round(card.interval))
                    : config.easyInterval;
            return {
                state: 'review',
                easeFactor: clampEase(card.easeFactor + 0.15),
                interval,
                dueDate: calculateDueDate(now, interval),
                currentStep: 0,
                lapseCount: card.lapseCount,
                reviewCount,
            };
        }
    }
}

export class SM2Algorithm implements SRSAlgorithm {
    calculateNextState(
        card: SRSState,
        grade: Grade,
        config: DeckConfig,
        now: Date = new Date(),
    ): SRSState {
        if (card.state === 'new') {
            // Treat new cards like learning cards entering step 0
            const learningCard: SRSState = {
                ...card,
                state: 'learning',
                currentStep: 0,
            };
            return handleLearningGrade(learningCard, grade, config, now);
        }

        if (card.state === 'learning' || card.state === 'relearning') {
            return handleLearningGrade(card, grade, config, now);
        }

        return handleReviewGrade(card, grade, config, now);
    }

    getInitialState(config: DeckConfig, now: Date = new Date()): SRSState {
        return {
            state: 'new',
            easeFactor: config.startingEaseFactor,
            interval: 0,
            dueDate: now,
            currentStep: 0,
            lapseCount: 0,
            reviewCount: 0,
        };
    }
}
