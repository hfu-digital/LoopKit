import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { ReviewSession } from '../../src/components/ReviewSession';
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

const mockRendered = {
    renderedContent: { front: '<p>What is 2+2?</p>', back: '<p>4</p>' },
    nextIntervals: { again: '1m', hard: '6m', good: '10m', easy: '4d' },
};

describe('ReviewSession', () => {
    beforeEach(() => clearFetchMocks());

    it('renders loading state initially', () => {
        // Queue fetch that will stay pending (we provide a response but it takes time)
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        render(<ReviewSession deckId="deck-1" />, { wrapper });

        expect(screen.getByText('Loading study session...')).toBeInTheDocument();
    });

    it('renders card and show answer button', async () => {
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        render(<ReviewSession deckId="deck-1" />, { wrapper });

        expect(await screen.findByText('Show Answer')).toBeInTheDocument();
        // Card front should be rendered
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    it('shows grade buttons after clicking Show Answer', async () => {
        mockFetchResponse({ cards: [mockCard], counts: { new: 1, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        render(<ReviewSession deckId="deck-1" />, { wrapper });

        const showAnswerBtn = await screen.findByText('Show Answer');
        fireEvent.click(showAnswerBtn);

        expect(screen.getByText('Again')).toBeInTheDocument();
        expect(screen.getByText('Good')).toBeInTheDocument();
        // Back content visible now
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('shows completion when queue is empty', async () => {
        mockFetchResponse({ cards: [], counts: { new: 0, learning: 0, review: 0 } });

        render(<ReviewSession deckId="deck-1" />, { wrapper });

        expect(await screen.findByText('Session Complete!')).toBeInTheDocument();
    });

    it('displays progress counter', async () => {
        mockFetchResponse({ cards: [mockCard, { ...mockCard, id: 'card-2' }], counts: { new: 2, learning: 0, review: 0 } });
        mockFetchResponse(mockRendered);

        render(<ReviewSession deckId="deck-1" />, { wrapper });

        expect(await screen.findByText('0 / 2')).toBeInTheDocument();
    });
});
