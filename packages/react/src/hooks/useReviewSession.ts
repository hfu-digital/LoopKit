import { useReducer, useCallback, useRef } from 'react';
import { useApiClient } from '../utils/api-client';
import type {
    CardBase,
    RenderedCard,
    Grade,
    GradeResult,
    SessionSummary,
    SessionQueue,
} from '../types';

type SessionState = 'idle' | 'loading' | 'reviewing' | 'answered' | 'complete';

interface ReviewState {
    sessionState: SessionState;
    queue: CardBase[];
    currentCard: CardBase | null;
    renderedContent: RenderedCard | null;
    nextIntervals: Record<Grade, string> | null;
    progress: { reviewed: number; remaining: number; total: number };
    canUndo: boolean;
    lastReviewLogId: string | null;
    reviewLogs: string[];
    error: string | null;
    summary: SessionSummary | null;
    startTime: number | null;
}

type ReviewAction =
    | { type: 'START_LOADING' }
    | { type: 'QUEUE_LOADED'; queue: CardBase[]; card: CardBase; content: RenderedCard; intervals: Record<Grade, string> }
    | { type: 'SHOW_ANSWER' }
    | { type: 'GRADED'; result: GradeResult; nextCard: CardBase | null; nextContent: RenderedCard | null; nextIntervals: Record<Grade, string> | null }
    | { type: 'UNDONE'; card: CardBase; content: RenderedCard; intervals: Record<Grade, string> }
    | { type: 'SESSION_COMPLETE'; summary: SessionSummary }
    | { type: 'ERROR'; error: string }
    | { type: 'RESET' };

const initialState: ReviewState = {
    sessionState: 'idle',
    queue: [],
    currentCard: null,
    renderedContent: null,
    nextIntervals: null,
    progress: { reviewed: 0, remaining: 0, total: 0 },
    canUndo: false,
    lastReviewLogId: null,
    reviewLogs: [],
    error: null,
    summary: null,
    startTime: null,
};

function reducer(state: ReviewState, action: ReviewAction): ReviewState {
    switch (action.type) {
        case 'START_LOADING':
            return { ...state, sessionState: 'loading', error: null };

        case 'QUEUE_LOADED':
            return {
                ...state,
                sessionState: 'reviewing',
                queue: action.queue,
                currentCard: action.card,
                renderedContent: action.content,
                nextIntervals: action.intervals,
                progress: { reviewed: 0, remaining: action.queue.length, total: action.queue.length },
                startTime: Date.now(),
            };

        case 'SHOW_ANSWER':
            return { ...state, sessionState: 'answered' };

        case 'GRADED': {
            const reviewed = state.progress.reviewed + 1;
            const remaining = state.progress.remaining - 1;

            if (!action.nextCard) {
                return {
                    ...state,
                    sessionState: 'complete',
                    currentCard: null,
                    renderedContent: null,
                    nextIntervals: null,
                    progress: { reviewed, remaining: 0, total: state.progress.total },
                    canUndo: true,
                    lastReviewLogId: action.result.reviewLog.id,
                    reviewLogs: [...state.reviewLogs, action.result.reviewLog.id],
                };
            }

            return {
                ...state,
                sessionState: 'reviewing',
                currentCard: action.nextCard,
                renderedContent: action.nextContent,
                nextIntervals: action.nextIntervals,
                progress: { reviewed, remaining, total: state.progress.total },
                canUndo: true,
                lastReviewLogId: action.result.reviewLog.id,
                reviewLogs: [...state.reviewLogs, action.result.reviewLog.id],
            };
        }

        case 'UNDONE':
            return {
                ...state,
                sessionState: 'reviewing',
                currentCard: action.card,
                renderedContent: action.content,
                nextIntervals: action.intervals,
                progress: {
                    reviewed: Math.max(0, state.progress.reviewed - 1),
                    remaining: state.progress.remaining + 1,
                    total: state.progress.total,
                },
                canUndo: false,
                lastReviewLogId: null,
                reviewLogs: state.reviewLogs.slice(0, -1),
            };

        case 'SESSION_COMPLETE':
            return {
                ...state,
                sessionState: 'complete',
                summary: action.summary,
            };

        case 'ERROR':
            return { ...state, error: action.error };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

export interface UseReviewSessionReturn {
    sessionState: SessionState;
    currentCard: CardBase | null;
    renderedContent: RenderedCard | null;
    nextIntervals: Record<Grade, string> | null;
    progress: { reviewed: number; remaining: number; total: number };
    canUndo: boolean;
    error: string | null;
    summary: SessionSummary | null;
    startSession: (deckId: string) => Promise<void>;
    showAnswer: () => void;
    grade: (grade: Grade) => Promise<void>;
    undo: () => Promise<void>;
    endSession: () => void;
}

export function useReviewSession(): UseReviewSessionReturn {
    const [state, dispatch] = useReducer(reducer, initialState);
    const api = useApiClient();
    const queueRef = useRef<CardBase[]>([]);
    const cardTimerRef = useRef<number>(Date.now());

    const fetchCardContent = useCallback(
        async (cardId: string): Promise<{ content: RenderedCard; intervals: Record<Grade, string> }> => {
            const data = await api.get<{ renderedContent: RenderedCard; nextIntervals: Record<Grade, string> }>(
                `/cards/${cardId}/render`,
            );
            return { content: data.renderedContent, intervals: data.nextIntervals };
        },
        [api],
    );

    const startSession = useCallback(
        async (deckId: string) => {
            dispatch({ type: 'START_LOADING' });
            try {
                const sessionQueue = await api.post<SessionQueue>(`/decks/${deckId}/study`);
                const cards = sessionQueue.cards;

                if (cards.length === 0) {
                    dispatch({
                        type: 'SESSION_COMPLETE',
                        summary: {
                            totalReviewed: 0,
                            correctCount: 0,
                            incorrectCount: 0,
                            averageTimeMsPerCard: 0,
                            gradeDistribution: { again: 0, hard: 0, good: 0, easy: 0 },
                            newCardsStudied: 0,
                            reviewsCompleted: 0,
                        },
                    });
                    return;
                }

                queueRef.current = cards.slice(1);
                const firstCard = cards[0]!;
                const { content, intervals } = await fetchCardContent(firstCard.id);
                cardTimerRef.current = Date.now();

                dispatch({
                    type: 'QUEUE_LOADED',
                    queue: cards,
                    card: firstCard,
                    content,
                    intervals,
                });
            } catch (e) {
                dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : String(e) });
            }
        },
        [api, fetchCardContent],
    );

    const showAnswer = useCallback(() => {
        dispatch({ type: 'SHOW_ANSWER' });
    }, []);

    const gradeCard = useCallback(
        async (grade: Grade) => {
            if (!state.currentCard) return;

            const timeTakenMs = Date.now() - cardTimerRef.current;

            try {
                const result = await api.post<GradeResult>(`/cards/${state.currentCard.id}/grade`, {
                    grade,
                    timeTakenMs,
                });

                const nextCard = queueRef.current.shift() ?? null;
                let nextContent: RenderedCard | null = null;
                let nextIntervals: Record<Grade, string> | null = null;

                if (nextCard) {
                    const data = await fetchCardContent(nextCard.id);
                    nextContent = data.content;
                    nextIntervals = data.intervals;
                    cardTimerRef.current = Date.now();
                }

                dispatch({
                    type: 'GRADED',
                    result,
                    nextCard,
                    nextContent,
                    nextIntervals,
                });

                if (!nextCard) {
                    const summary = await api.get<SessionSummary>('/session/summary');
                    dispatch({ type: 'SESSION_COMPLETE', summary });
                }
            } catch (e) {
                dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : String(e) });
            }
        },
        [api, state.currentCard, fetchCardContent],
    );

    const undo = useCallback(async () => {
        if (!state.lastReviewLogId) return;

        try {
            await api.post(`/reviews/${state.lastReviewLogId}/undo`);
            const card = await api.get<CardBase>(`/cards/${state.lastReviewLogId}`);

            // Re-insert the current card back to queue front
            if (state.currentCard) {
                queueRef.current.unshift(state.currentCard);
            }

            const { content, intervals } = await fetchCardContent(card.id);
            cardTimerRef.current = Date.now();

            dispatch({ type: 'UNDONE', card, content, intervals });
        } catch (e) {
            dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : String(e) });
        }
    }, [api, state.lastReviewLogId, state.currentCard, fetchCardContent]);

    const endSession = useCallback(() => {
        dispatch({ type: 'RESET' });
        queueRef.current = [];
    }, []);

    return {
        sessionState: state.sessionState,
        currentCard: state.currentCard,
        renderedContent: state.renderedContent,
        nextIntervals: state.nextIntervals,
        progress: state.progress,
        canUndo: state.canUndo,
        error: state.error,
        summary: state.summary,
        startSession,
        showAnswer,
        grade: gradeCard,
        undo,
        endSession,
    };
}
