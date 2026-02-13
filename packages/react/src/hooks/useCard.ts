import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api-client';
import type { CardBase, RenderedCard, NoteBase, NoteType, Field } from '../types';

export interface UseCardReturn {
    card: CardBase | null;
    renderedContent: RenderedCard | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useCard(id: string): UseCardReturn {
    const api = useApiClient();
    const [card, setCard] = useState<CardBase | null>(null);
    const [renderedContent, setRenderedContent] = useState<RenderedCard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [cardData, renderData] = await Promise.all([
                api.get<CardBase>(`/cards/${id}`),
                api.get<{ renderedContent: RenderedCard }>(`/cards/${id}/render`),
            ]);
            setCard(cardData);
            setRenderedContent(renderData.renderedContent);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api, id]);

    useEffect(() => {
        fetchCard();
    }, [fetchCard]);

    return { card, renderedContent, loading, error, refetch: fetchCard };
}

export interface UseCardEditorReturn {
    loading: boolean;
    error: string | null;
    create: (noteTypeId: string, fields: Field[], deckId: string, tags?: string[]) => Promise<NoteBase>;
    update: (noteId: string, fields: Field[], tags?: string[]) => Promise<NoteBase>;
}

export function useCardEditor(): UseCardEditorReturn {
    const api = useApiClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = useCallback(
        async (noteTypeId: string, fields: Field[], deckId: string, tags?: string[]) => {
            setLoading(true);
            setError(null);
            try {
                return await api.post<NoteBase>('/notes', {
                    noteTypeId,
                    fields,
                    deckId,
                    tags,
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [api],
    );

    const update = useCallback(
        async (noteId: string, fields: Field[], tags?: string[]) => {
            setLoading(true);
            setError(null);
            try {
                return await api.put<NoteBase>(`/notes/${noteId}`, { fields, tags });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [api],
    );

    return { loading, error, create, update };
}

export interface UseNoteTypesReturn {
    noteTypes: NoteType[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useNoteTypes(): UseNoteTypesReturn {
    const api = useApiClient();
    const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNoteTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<NoteType[]>('/note-types');
            setNoteTypes(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchNoteTypes();
    }, [fetchNoteTypes]);

    return { noteTypes, loading, error, refetch: fetchNoteTypes };
}
