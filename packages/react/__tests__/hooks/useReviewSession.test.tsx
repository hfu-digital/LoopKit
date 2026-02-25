import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { useReviewSession } from '../../src/hooks/useReviewSession';
import { mockFetch, mockFetchResponse, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

const mockCard = {
    id: 'card-1',
    noteId: 'note-1',
    templateId: 'tpl-1',
    deckId: 'deck-1',
    state: 'new',
    easeFactor: 2.5,
    interval: 0,
    dueDate: '2026-01-15',
    currentStep: 0,
    lapseCount: 0,
    reviewCount: 0,
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
};

const mockCard2 = { ...mockCard, id: 'card-2' };

const mockRendered = {
    renderedContent: { front: '<p>Q</p>', back: '<p>A</p>' },
    nextIntervals: { again: '1m', hard: '6m', good: '10m', easy: '4d' },
};

describe('useReviewSession', () => {
    beforeEach(() => {
        clearFetchMocks();
    });

    it('starts in idle state', () => {
        const { result } = renderHook(() => useReviewSession(), { wrapper });
        expect(result.current.sessionState).toBe('idle');
        expect(result.current.currentCard).toBeNull();
    });

    it('transitions to loading then reviewing on startSession', async () => {
        mockFetchResponse({ cards: [mockCard, mockCard2], counts: { new: 2, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        const { result } = renderHook(() => useReviewSession(), { wrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        expect(result.current.sessionState).toBe('reviewing');
        expect(result.current.currentCard?.id).toBe('card-1');
        expect(result.current.renderedContent?.front).toBe('<p>Q</p>');
        expect(result.current.progress.total).toBe(2);
    });

    it('transitions to answered on showAnswer', async () => {
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        const { result } = renderHook(() => useReviewSession(), { wrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        act(() => {
            result.current.showAnswer();
        });

        expect(result.current.sessionState).toBe('answered');
    });

    it('completes session when last card is graded', async () => {
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        const { result } = renderHook(() => useReviewSession(), { wrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        // Mock grade response + summary
        const gradeResult = {
            card: { ...mockCard, state: 'learning' },
            reviewLog: { id: 'log-1', cardId: 'card-1', deckId: 'deck-1', grade: 'good', reviewedAt: '2026-01-15', timeTakenMs: 5000 },
            nextIntervals: { again: '1m', hard: '6m', good: '10m', easy: '4d' },
        };
        const summary = {
            totalReviewed: 1, correctCount: 1, incorrectCount: 0,
            averageTimeMsPerCard: 5000,
            gradeDistribution: { again: 0, hard: 0, good: 1, easy: 0 },
            newCardsStudied: 1, reviewsCompleted: 0,
        };
        mockFetchResponse(gradeResult);
        mockFetchResponse(summary);

        await act(async () => {
            await result.current.grade('good');
        });

        await waitFor(() => {
            expect(result.current.sessionState).toBe('complete');
        });
        expect(result.current.summary?.totalReviewed).toBe(1);
    });

    it('completes immediately when queue is empty', async () => {
        mockFetchResponse({ cards: [], counts: { new: 0, learning: 0, review: 0 } });

        const { result } = renderHook(() => useReviewSession(), { wrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        expect(result.current.sessionState).toBe('complete');
        expect(result.current.summary?.totalReviewed).toBe(0);
    });

    it('handles API errors gracefully', async () => {
        mockFetchResponse(null); // will result in a failed fetch

        // Override with a fetch that rejects
        const errorFetch = async () => {
            throw new Error('Network error');
        };

        const errorWrapper = ({ children }: { children: ReactNode }) => (
            <LoopKitProvider apiUrl="http://test.local/api" fetcher={errorFetch as unknown as typeof fetch}>
                {children}
            </LoopKitProvider>
        );

        const { result } = renderHook(() => useReviewSession(), { wrapper: errorWrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        expect(result.current.error).toBe('Network error');
    });

    it('resets state on endSession', async () => {
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        const { result } = renderHook(() => useReviewSession(), { wrapper });

        await act(async () => {
            await result.current.startSession('deck-1');
        });

        act(() => {
            result.current.endSession();
        });

        expect(result.current.sessionState).toBe('idle');
        expect(result.current.currentCard).toBeNull();
    });
});
