import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api-client';
import type { DeckBase, DeckCounts, DeckTreeNode } from '../types';

export interface UseDeckReturn {
    deck: DeckBase | null;
    counts: DeckCounts | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useDeck(id: string): UseDeckReturn {
    const api = useApiClient();
    const [deck, setDeck] = useState<DeckBase | null>(null);
    const [counts, setCounts] = useState<DeckCounts | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDeck = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [deckData, countsData] = await Promise.all([
                api.get<DeckBase>(`/decks/${id}`),
                api.get<DeckCounts>(`/decks/${id}/counts`),
            ]);
            setDeck(deckData);
            setCounts(countsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api, id]);

    useEffect(() => {
        fetchDeck();
    }, [fetchDeck]);

    return { deck, counts, loading, error, refetch: fetchDeck };
}

export interface UseDecksReturn {
    decks: DeckBase[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useDecks(): UseDecksReturn {
    const api = useApiClient();
    const [decks, setDecks] = useState<DeckBase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDecks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<DeckBase[]>('/decks');
            setDecks(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

    return { decks, loading, error, refetch: fetchDecks };
}

export interface UseDeckTreeReturn {
    tree: DeckTreeNode[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useDeckTree(): UseDeckTreeReturn {
    const api = useApiClient();
    const [tree, setTree] = useState<DeckTreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTree = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<DeckTreeNode[]>('/decks/tree');
            setTree(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    return { tree, loading, error, refetch: fetchTree };
}
