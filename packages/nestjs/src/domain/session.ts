import type { LoopKitStorage } from '../interfaces/storage';
import type { SRSAlgorithm, SRSState } from './srs/srs-algorithm';
import type { CardBase, ReviewLog, CardStateSnapshot } from '../types/entities';
import type { Grade } from '../types/grade';
import type {
    SessionOptions,
    SessionQueue,
    GradeResult,
    SessionSummary,
} from '../types/inputs';
import { getDayStart } from './srs/day-boundary';
import { previewNextIntervals } from './srs/interval-preview';
import { validateGrade } from '../dto/validation';
import { UndoNotAvailableError } from '../errors/errors';

function cardToSRSState(card: CardBase): SRSState {
    return {
        state: card.state,
        easeFactor: card.easeFactor,
        interval: card.interval,
        dueDate: card.dueDate,
        currentStep: card.currentStep,
        lapseCount: card.lapseCount,
        reviewCount: card.reviewCount,
    };
}

function srsStateToSnapshot(state: SRSState): CardStateSnapshot {
    return {
        state: state.state,
        easeFactor: state.easeFactor,
        interval: state.interval,
        dueDate: state.dueDate,
        currentStep: state.currentStep,
        lapseCount: state.lapseCount,
        reviewCount: state.reviewCount,
    };
}

export class ReviewSessionService {
    constructor(
        private readonly storage: LoopKitStorage,
        private readonly algorithm: SRSAlgorithm,
        private readonly getEffectiveConfig: (deckId: string) => Promise<import('../types/config').DeckConfig>,
    ) {}

    async buildQueue(deckId: string, options?: SessionOptions): Promise<SessionQueue> {
        const config = await this.getEffectiveConfig(deckId);
        const deckIds = [deckId, ...(await this.storage.getDescendantDeckIds(deckId))];
        const dayStart = getDayStart(new Date(), config.nextDayStartsAt);

        // Always include overdue learning/relearning cards
        const learningCards = await this.storage.findLearningCards(deckIds, new Date());

        // Review cards — respect daily limit
        const reviewsDoneToday = await this.storage.countReviewsToday(deckIds, dayStart);
        const reviewLimit = options?.reviewCardsLimit ??
            Math.max(0, config.maxReviewsPerDay - reviewsDoneToday);
        const reviewCards = await this.storage.findDueCards(deckIds, new Date(), reviewLimit);

        // New cards — respect daily limit
        const newCardsDoneToday = await this.storage.countNewCardsToday(deckIds, dayStart);
        const newLimit = options?.newCardsLimit ??
            Math.max(0, config.newCardsPerDay - newCardsDoneToday);
        const newCards = await this.storage.findNewCards(deckIds, newLimit);

        // Merge: learning first, then review (most overdue first), then new
        const allCards = [...learningCards, ...reviewCards, ...newCards];

        return {
            cards: allCards,
            counts: {
                new: newCards.length,
                learning: learningCards.length,
                review: reviewCards.length,
            },
        };
    }

    async gradeCard(
        cardId: string,
        grade: Grade,
        timeTakenMs: number,
    ): Promise<GradeResult> {
        const validGrade = validateGrade(grade);
        const card = await this.storage.getCard(cardId);
        const config = await this.getEffectiveConfig(card.deckId);

        const prevState = srsStateToSnapshot(cardToSRSState(card));
        const now = new Date();
        const nextState = this.algorithm.calculateNextState(
            cardToSRSState(card),
            validGrade,
            config,
            now,
        );

        const updatedCard = await this.storage.updateCard(cardId, {
            state: nextState.state,
            easeFactor: nextState.easeFactor,
            interval: nextState.interval,
            dueDate: nextState.dueDate,
            currentStep: nextState.currentStep,
            lapseCount: nextState.lapseCount,
            reviewCount: nextState.reviewCount,
        });

        const reviewLog = await this.storage.createReviewLog({
            cardId: card.id,
            deckId: card.deckId,
            grade: validGrade,
            prevState,
            newState: srsStateToSnapshot(nextState),
            timeTakenMs,
        });

        const nextIntervals = previewNextIntervals(
            cardToSRSState(updatedCard),
            config,
            this.algorithm,
            now,
        );

        return { card: updatedCard, reviewLog, nextIntervals };
    }

    async undoLastReview(reviewLogId: string): Promise<void> {
        let log: ReviewLog;
        try {
            log = await this.storage.getReviewLog(reviewLogId);
        } catch {
            throw new UndoNotAvailableError();
        }

        // Restore card to previous state
        await this.storage.updateCard(log.cardId, {
            state: log.prevState.state,
            easeFactor: log.prevState.easeFactor,
            interval: log.prevState.interval,
            dueDate: log.prevState.dueDate,
            currentStep: log.prevState.currentStep,
            lapseCount: log.prevState.lapseCount,
            reviewCount: log.prevState.reviewCount,
        });

        await this.storage.deleteReviewLog(reviewLogId);
    }

    getSessionSummary(logs: ReviewLog[]): SessionSummary {
        const totalReviewed = logs.length;
        const correctCount = logs.filter((l) => l.grade !== 'again').length;
        const incorrectCount = logs.filter((l) => l.grade === 'again').length;
        const totalTimeMs = logs.reduce((sum, l) => sum + l.timeTakenMs, 0);
        const averageTimeMsPerCard = totalReviewed > 0 ? totalTimeMs / totalReviewed : 0;

        const gradeDistribution: Record<Grade, number> = {
            again: 0,
            hard: 0,
            good: 0,
            easy: 0,
        };
        for (const log of logs) {
            gradeDistribution[log.grade]++;
        }

        const newCardsStudied = logs.filter((l) => l.prevState.state === 'new').length;
        const reviewsCompleted = logs.filter((l) => l.prevState.state === 'review').length;

        return {
            totalReviewed,
            correctCount,
            incorrectCount,
            averageTimeMsPerCard,
            gradeDistribution,
            newCardsStudied,
            reviewsCompleted,
        };
    }
}
