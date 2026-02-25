import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewSessionService } from '../../src/domain/session';
import { createMockStorage } from '../helpers/mock-storage';
import type { LoopKitStorage } from '../../src/interfaces/storage';
import type { SRSAlgorithm, SRSState } from '../../src/domain/srs/srs-algorithm';
import type { DeckConfig } from '../../src/types/config';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';
import type { CardBase, ReviewLog, CardStateSnapshot } from '../../src/types/entities';
import { UndoNotAvailableError, EntityNotFoundError } from '../../src/errors/errors';

const now = new Date('2026-01-15T12:00:00Z');

function makeCard(overrides: Partial<CardBase> = {}): CardBase {
    return {
        id: 'card-1',
        noteId: 'note-1',
        templateId: 'tpl-1',
        deckId: 'deck-1',
        state: 'new',
        easeFactor: 2.5,
        interval: 0,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeReviewLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
    const snap: CardStateSnapshot = {
        state: 'new',
        easeFactor: 2.5,
        interval: 0,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 0,
    };
    return {
        id: 'log-1',
        cardId: 'card-1',
        deckId: 'deck-1',
        grade: 'good',
        prevState: { ...snap },
        newState: { ...snap, state: 'learning', currentStep: 1, reviewCount: 1 },
        reviewedAt: now,
        timeTakenMs: 5000,
        ...overrides,
    };
}

describe('ReviewSessionService', () => {
    let storage: ReturnType<typeof createMockStorage>;
    let algorithm: SRSAlgorithm;
    let service: ReviewSessionService;
    const config: DeckConfig = { ...DEFAULT_DECK_CONFIG };

    beforeEach(() => {
        storage = createMockStorage();

        algorithm = {
            calculateNextState: vi.fn().mockReturnValue({
                state: 'learning',
                easeFactor: 2.5,
                interval: 0,
                dueDate: new Date(now.getTime() + 600000),
                currentStep: 1,
                lapseCount: 0,
                reviewCount: 1,
            } satisfies SRSState),
            getInitialState: vi.fn().mockReturnValue({
                state: 'new',
                easeFactor: 2.5,
                interval: 0,
                dueDate: now,
                currentStep: 0,
                lapseCount: 0,
                reviewCount: 0,
            } satisfies SRSState),
        };

        service = new ReviewSessionService(
            storage as unknown as LoopKitStorage,
            algorithm,
            async () => config,
        );
    });

    describe('buildQueue', () => {
        it('includes learning, review, and new cards in correct order', async () => {
            const learning = makeCard({ id: 'learn-1', state: 'learning' });
            const review = makeCard({ id: 'review-1', state: 'review' });
            const newCard = makeCard({ id: 'new-1', state: 'new' });

            storage.findLearningCards.mockResolvedValue([learning]);
            storage.findDueCards.mockResolvedValue([review]);
            storage.findNewCards.mockResolvedValue([newCard]);

            const queue = await service.buildQueue('deck-1');

            expect(queue.cards).toHaveLength(3);
            expect(queue.cards[0]!.id).toBe('learn-1');
            expect(queue.cards[1]!.id).toBe('review-1');
            expect(queue.cards[2]!.id).toBe('new-1');
        });

        it('respects maxReviewsPerDay limit', async () => {
            storage.countReviewsToday.mockResolvedValue(190);

            await service.buildQueue('deck-1');

            expect(storage.findDueCards).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Date),
                10, // 200 - 190
            );
        });

        it('respects newCardsPerDay limit', async () => {
            storage.countNewCardsToday.mockResolvedValue(15);

            await service.buildQueue('deck-1');

            expect(storage.findNewCards).toHaveBeenCalledWith(
                expect.any(Array),
                5, // 20 - 15
            );
        });

        it('includes descendant deck IDs', async () => {
            storage.getDescendantDeckIds.mockResolvedValue(['child-1', 'child-2']);

            await service.buildQueue('deck-1');

            expect(storage.findLearningCards).toHaveBeenCalledWith(
                ['deck-1', 'child-1', 'child-2'],
                expect.any(Date),
            );
        });

        it('allows overriding limits via options', async () => {
            await service.buildQueue('deck-1', { newCardsLimit: 5, reviewCardsLimit: 10 });

            expect(storage.findDueCards).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Date),
                10,
            );
            expect(storage.findNewCards).toHaveBeenCalledWith(
                expect.any(Array),
                5,
            );
        });

        it('returns correct counts', async () => {
            storage.findLearningCards.mockResolvedValue([makeCard()]);
            storage.findDueCards.mockResolvedValue([makeCard(), makeCard()]);
            storage.findNewCards.mockResolvedValue([makeCard(), makeCard(), makeCard()]);

            const queue = await service.buildQueue('deck-1');

            expect(queue.counts).toEqual({ new: 3, learning: 1, review: 2 });
        });
    });

    describe('gradeCard', () => {
        it('calls algorithm, updates card, and creates review log', async () => {
            const card = makeCard();
            const updatedCard = makeCard({ state: 'learning', currentStep: 1, reviewCount: 1 });
            const log = makeReviewLog();

            storage.getCard.mockResolvedValue(card);
            storage.updateCard.mockResolvedValue(updatedCard);
            storage.createReviewLog.mockResolvedValue(log);

            const result = await service.gradeCard('card-1', 'good', 5000);

            expect(algorithm.calculateNextState).toHaveBeenCalledWith(
                expect.objectContaining({ state: 'new', easeFactor: 2.5 }),
                'good',
                config,
                expect.any(Date),
            );
            expect(storage.updateCard).toHaveBeenCalledWith('card-1', expect.objectContaining({
                state: 'learning',
                currentStep: 1,
                reviewCount: 1,
            }));
            expect(storage.createReviewLog).toHaveBeenCalledWith(expect.objectContaining({
                cardId: 'card-1',
                grade: 'good',
                timeTakenMs: 5000,
            }));
            expect(result.card).toEqual(updatedCard);
            expect(result.reviewLog).toEqual(log);
            expect(result.nextIntervals).toBeDefined();
        });

        it('stores prev and new state snapshots in review log', async () => {
            const card = makeCard({ state: 'review', easeFactor: 2.5, interval: 10 });
            storage.getCard.mockResolvedValue(card);
            storage.updateCard.mockResolvedValue(card);
            storage.createReviewLog.mockResolvedValue(makeReviewLog());

            await service.gradeCard('card-1', 'good', 3000);

            const logInput = storage.createReviewLog.mock.calls[0]![0];
            expect(logInput.prevState.state).toBe('review');
            expect(logInput.prevState.easeFactor).toBe(2.5);
            expect(logInput.prevState.interval).toBe(10);
        });

        it('rejects invalid grade', async () => {
            await expect(service.gradeCard('card-1', 'excellent' as any, 3000)).rejects.toThrow();
        });
    });

    describe('undoLastReview', () => {
        it('restores card to previous state and deletes log', async () => {
            const prevState: CardStateSnapshot = {
                state: 'new',
                easeFactor: 2.5,
                interval: 0,
                dueDate: now,
                currentStep: 0,
                lapseCount: 0,
                reviewCount: 0,
            };
            const log = makeReviewLog({ prevState });
            storage.getReviewLog.mockResolvedValue(log);

            await service.undoLastReview('log-1');

            expect(storage.updateCard).toHaveBeenCalledWith('card-1', expect.objectContaining({
                state: 'new',
                easeFactor: 2.5,
                interval: 0,
            }));
            expect(storage.deleteReviewLog).toHaveBeenCalledWith('log-1');
        });

        it('throws UndoNotAvailableError when log not found', async () => {
            storage.getReviewLog.mockRejectedValue(new EntityNotFoundError('ReviewLog', 'log-x'));

            await expect(service.undoLastReview('log-x')).rejects.toThrow(UndoNotAvailableError);
        });
    });

    describe('getSessionSummary', () => {
        it('returns zeros for empty logs', () => {
            const summary = service.getSessionSummary([]);
            expect(summary.totalReviewed).toBe(0);
            expect(summary.correctCount).toBe(0);
            expect(summary.averageTimeMsPerCard).toBe(0);
        });

        it('calculates correct/incorrect counts', () => {
            const summary = service.getSessionSummary([
                makeReviewLog({ grade: 'good' }),
                makeReviewLog({ grade: 'easy' }),
                makeReviewLog({ grade: 'again' }),
            ]);
            expect(summary.totalReviewed).toBe(3);
            expect(summary.correctCount).toBe(2);
            expect(summary.incorrectCount).toBe(1);
        });

        it('calculates grade distribution', () => {
            const summary = service.getSessionSummary([
                makeReviewLog({ grade: 'again' }),
                makeReviewLog({ grade: 'hard' }),
                makeReviewLog({ grade: 'good' }),
                makeReviewLog({ grade: 'good' }),
                makeReviewLog({ grade: 'easy' }),
            ]);
            expect(summary.gradeDistribution).toEqual({
                again: 1,
                hard: 1,
                good: 2,
                easy: 1,
            });
        });

        it('calculates average time per card', () => {
            const summary = service.getSessionSummary([
                makeReviewLog({ timeTakenMs: 3000 }),
                makeReviewLog({ timeTakenMs: 7000 }),
            ]);
            expect(summary.averageTimeMsPerCard).toBe(5000);
        });

        it('counts new cards studied and reviews completed', () => {
            const newSnap: CardStateSnapshot = {
                state: 'new', easeFactor: 2.5, interval: 0,
                dueDate: now, currentStep: 0, lapseCount: 0, reviewCount: 0,
            };
            const reviewSnap: CardStateSnapshot = {
                state: 'review', easeFactor: 2.5, interval: 10,
                dueDate: now, currentStep: 0, lapseCount: 0, reviewCount: 5,
            };
            const summary = service.getSessionSummary([
                makeReviewLog({ prevState: newSnap }),
                makeReviewLog({ prevState: reviewSnap }),
                makeReviewLog({ prevState: reviewSnap }),
            ]);
            expect(summary.newCardsStudied).toBe(1);
            expect(summary.reviewsCompleted).toBe(2);
        });
    });
});
