export type NewCardOrder = 'added' | 'random';
export type ReviewOrder = 'due' | 'random' | 'relative-overdueness';

export interface DeckConfig {
    newCardsPerDay: number;
    maxReviewsPerDay: number;
    learningSteps: number[];
    graduatingInterval: number;
    easyInterval: number;
    relearningSteps: number[];
    lapseNewInterval: number;
    lapseMinInterval: number;
    maxInterval: number;
    startingEaseFactor: number;
    hardIntervalMultiplier: number;
    easyBonus: number;
    newCardOrder: NewCardOrder;
    reviewOrder: ReviewOrder;
    nextDayStartsAt: number;
    enableFuzz: boolean;
}

export const DEFAULT_DECK_CONFIG: Readonly<DeckConfig> = Object.freeze({
    newCardsPerDay: 20,
    maxReviewsPerDay: 200,
    learningSteps: [1, 10],
    graduatingInterval: 1,
    easyInterval: 4,
    relearningSteps: [10],
    lapseNewInterval: 0.7,
    lapseMinInterval: 1,
    maxInterval: 36500,
    startingEaseFactor: 2.5,
    hardIntervalMultiplier: 1.2,
    easyBonus: 1.3,
    newCardOrder: 'added',
    reviewOrder: 'due',
    nextDayStartsAt: 4,
    enableFuzz: true,
});

export const DEFAULT_DECK_PRESET = Object.freeze({
    name: 'Default',
    config: DEFAULT_DECK_CONFIG,
});
