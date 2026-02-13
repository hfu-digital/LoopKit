import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api-client';

export interface UseTagsReturn {
    tags: string[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useTags(): UseTagsReturn {
    const api = useApiClient();
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<string[]>('/tags');
            setTags(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    return { tags, loading, error, refetch: fetchTags };
}
