import { useState, useCallback } from 'react';
import { useApiClient } from '../utils/api-client';
import type { ImportResult } from '../types';

export interface UseImportReturn {
    loading: boolean;
    error: string | null;
    result: ImportResult | null;
    importCSV: (file: File, mapping: Record<string, string>, deckId: string, noteTypeId: string, tags?: string[]) => Promise<ImportResult>;
    importJSON: (file: File) => Promise<ImportResult>;
}

export function useImport(): UseImportReturn {
    const api = useApiClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const importCSV = useCallback(
        async (file: File, mapping: Record<string, string>, deckId: string, noteTypeId: string, tags?: string[]) => {
            setLoading(true);
            setError(null);
            try {
                const csv = await file.text();
                const data = await api.post<ImportResult>('/import/csv', {
                    csv,
                    mapping,
                    deckId,
                    noteTypeId,
                    tags,
                });
                setResult(data);
                return data;
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

    const importJSON = useCallback(
        async (file: File) => {
            setLoading(true);
            setError(null);
            try {
                const json = await file.text();
                let parsed: unknown;
                try {
                    parsed = JSON.parse(json);
                } catch {
                    throw new Error('Invalid JSON file: the file does not contain valid JSON');
                }
                const data = await api.post<ImportResult>('/import/json', parsed);
                setResult(data);
                return data;
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

    return { loading, error, result, importCSV, importJSON };
}

export interface UseExportReturn {
    loading: boolean;
    error: string | null;
    exportCSV: (deckId: string) => Promise<void>;
    exportJSON: (deckId: string, includeReviewLogs?: boolean) => Promise<void>;
}

export function useExport(): UseExportReturn {
    const api = useApiClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportCSV = useCallback(
        async (deckId: string) => {
            setLoading(true);
            setError(null);
            try {
                const csv = await api.get<string>(`/decks/${deckId}/export/csv`);
                download(csv, `deck-${deckId}.csv`, 'text/csv');
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
            }
        },
        [api],
    );

    const exportJSON = useCallback(
        async (deckId: string, includeReviewLogs = false) => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.get<object>(
                    `/decks/${deckId}/export/json?includeReviewLogs=${includeReviewLogs}`,
                );
                download(JSON.stringify(data, null, 2), `deck-${deckId}.json`, 'application/json');
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
            }
        },
        [api],
    );

    return { loading, error, exportCSV, exportJSON };
}
