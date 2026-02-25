import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { useStats } from '../../src/hooks/useStats';
import { mockFetch, mockFetchRoute, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

const mockStats = {
    breakdown: { new: 10, learning: 3, review: 50, relearning: 2 },
    retention: 0.85,
    streak: 7,
    averageEase: 2.4,
    reviewsPerDay: { '2026-01-14': 20, '2026-01-15': 15 },
    forecast: { '2026-01-16': 12, '2026-01-17': 8 },
};

describe('useStats', () => {
    beforeEach(() => clearFetchMocks());

    it('fetches stats for a deck', async () => {
        mockFetchRoute('/decks/deck-1/stats', mockStats);

        const { result } = renderHook(() => useStats('deck-1'), { wrapper });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.stats?.retention).toBe(0.85);
        expect(result.current.stats?.streak).toBe(7);
        expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
        mockFetchRoute('/decks/bad-id/stats', 'Deck not found', 404);

        const { result } = renderHook(() => useStats('bad-id'), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.stats).toBeNull();
    });
});
