import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { useDeck, useDecks, useDeckTree } from '../../src/hooks/useDeck';
import { mockFetch, mockFetchRoute, mockFetchError, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

const mockDeck = {
    id: 'deck-1',
    name: 'Test Deck',
    description: 'A test deck',
    parentDeckId: null,
    presetId: null,
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
};

const mockCounts = { new: 5, learning: 2, review: 10, relearning: 1, total: 18 };

describe('useDeck', () => {
    beforeEach(() => clearFetchMocks());

    it('fetches deck and counts', async () => {
        mockFetchRoute('/decks/deck-1/counts', mockCounts);
        mockFetchRoute(/\/decks\/deck-1$/, mockDeck);

        const { result } = renderHook(() => useDeck('deck-1'), { wrapper });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.deck?.name).toBe('Test Deck');
        expect(result.current.counts?.total).toBe(18);
        expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
        mockFetchRoute(/\/decks\/bad-id/, null, 404);
        mockFetchRoute(/\/decks\/bad-id/, null, 404);

        const { result } = renderHook(() => useDeck('bad-id'), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.deck).toBeNull();
    });
});

describe('useDecks', () => {
    beforeEach(() => clearFetchMocks());

    it('fetches list of decks', async () => {
        mockFetchRoute('/decks', [mockDeck, { ...mockDeck, id: 'deck-2', name: 'Deck 2' }]);

        const { result } = renderHook(() => useDecks(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.decks).toHaveLength(2);
        expect(result.current.error).toBeNull();
    });

    it('handles error', async () => {
        mockFetchRoute('/decks', 'Server error', 500);

        const { result } = renderHook(() => useDecks(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeTruthy();
    });
});

describe('useDeckTree', () => {
    beforeEach(() => clearFetchMocks());

    it('fetches tree structure', async () => {
        const tree = [
            {
                ...mockDeck,
                children: [{ ...mockDeck, id: 'child-1', name: 'Child', children: [] }],
                counts: mockCounts,
            },
        ];
        mockFetchRoute('/decks/tree', tree);

        const { result } = renderHook(() => useDeckTree(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.tree).toHaveLength(1);
        expect(result.current.tree[0]!.children).toHaveLength(1);
    });
});
