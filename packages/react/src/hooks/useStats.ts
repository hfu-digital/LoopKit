import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api-client';
import type { DeckStats } from '../types';

export interface UseStatsReturn {
    stats: DeckStats | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useStats(deckId: string): UseStatsReturn {
    const api = useApiClient();
    const [stats, setStats] = useState<DeckStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<DeckStats>(`/decks/${deckId}/stats`);
            setStats(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api, deckId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
}
