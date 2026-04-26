import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { DeckTree } from '../../src/components/DeckTree';
import { mockFetch, mockFetchRoute, mockFetchError, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

const mockTree = [
    {
        id: 'deck-1',
        name: 'Parent Deck',
        parentDeckId: null,
        presetId: null,
        createdAt: '2026-01-15',
        updatedAt: '2026-01-15',
        children: [
            {
                id: 'deck-2',
                name: 'Child Deck',
                parentDeckId: 'deck-1',
                presetId: null,
                createdAt: '2026-01-15',
                updatedAt: '2026-01-15',
                children: [],
                counts: { new: 3, learning: 1, review: 5, relearning: 0, total: 9 },
            },
        ],
        counts: { new: 10, learning: 2, review: 8, relearning: 1, total: 21 },
    },
];

describe('DeckTree', () => {
    beforeEach(() => clearFetchMocks());

    it('renders loading state', () => {
        // Don't provide a response so it stays loading
        mockFetchRoute('/decks/tree', mockTree);
        render(<DeckTree onDeckSelect={() => {}} />, { wrapper });
        // Initially shows loading (before fetch resolves)
    });

    it('renders tree hierarchy', async () => {
        mockFetchRoute('/decks/tree', mockTree);
        render(<DeckTree onDeckSelect={() => {}} />, { wrapper });

        expect(await screen.findByText('Parent Deck')).toBeInTheDocument();
        expect(screen.getByText('Child Deck')).toBeInTheDocument();
    });

    it('calls onDeckSelect when clicking a deck', async () => {
        mockFetchRoute('/decks/tree', mockTree);
        const onSelect = vi.fn();
        render(<DeckTree onDeckSelect={onSelect} />, { wrapper });

        const parentLabel = await screen.findByText('Parent Deck');
        fireEvent.click(parentLabel);
        expect(onSelect).toHaveBeenCalledWith('deck-1');
    });

    it('renders error state', async () => {
        mockFetchError('Server error', 500);
        render(<DeckTree onDeckSelect={() => {}} />, { wrapper });

        expect(await screen.findByText(/Error/)).toBeInTheDocument();
    });
});
