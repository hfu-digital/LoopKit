import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { useImport, useExport } from '../../src/hooks/useImportExport';
import { mockFetch, mockFetchResponse, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

function createFile(content: string, name: string, type: string): File {
    const blob = new Blob([content], { type });
    return Object.assign(blob, { name, lastModified: Date.now() }) as unknown as File;
}

describe('useImport', () => {
    beforeEach(() => clearFetchMocks());

    it('imports CSV successfully', async () => {
        const importResult = { notesCreated: 5, cardsCreated: 5, errors: [] };
        mockFetchResponse(importResult);

        const { result } = renderHook(() => useImport(), { wrapper });
        const file = createFile('Q,A\nHello,World', 'test.csv', 'text/csv');

        await act(async () => {
            const res = await result.current.importCSV(file, { Q: 'Front', A: 'Back' }, 'deck-1', 'nt-1');
            expect(res.notesCreated).toBe(5);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.result?.notesCreated).toBe(5);
    });

    it('imports JSON successfully', async () => {
        const importResult = { notesCreated: 3, cardsCreated: 6, errors: [] };
        mockFetchResponse(importResult);

        const { result } = renderHook(() => useImport(), { wrapper });
        const jsonData = JSON.stringify({
            version: '1.0.0',
            exportedAt: '2026-01-15',
            decks: [],
            noteTypes: [],
            notes: [],
            cards: [],
            presets: [],
        });
        const file = createFile(jsonData, 'test.json', 'application/json');

        await act(async () => {
            await result.current.importJSON(file);
        });

        expect(result.current.result?.notesCreated).toBe(3);
    });

    it('provides user-friendly error for invalid JSON', async () => {
        const { result } = renderHook(() => useImport(), { wrapper });
        const file = createFile('not valid json {{{', 'bad.json', 'application/json');

        let thrownError: Error | undefined;
        await act(async () => {
            try {
                await result.current.importJSON(file);
            } catch (e) {
                thrownError = e as Error;
            }
        });

        expect(thrownError?.message).toContain('Invalid JSON file');
        expect(result.current.error).toContain('Invalid JSON file');
    });
});

describe('useExport', () => {
    beforeEach(() => {
        clearFetchMocks();
        global.URL.createObjectURL = () => 'blob:test';
        global.URL.revokeObjectURL = () => {};
    });

    it('exports CSV', async () => {
        mockFetchResponse('Front,Back\nQ,A');

        const { result } = renderHook(() => useExport(), { wrapper });

        await act(async () => {
            await result.current.exportCSV('deck-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('exports JSON', async () => {
        mockFetchResponse({ version: '1.0.0', decks: [], notes: [], cards: [], noteTypes: [], presets: [] });

        const { result } = renderHook(() => useExport(), { wrapper });

        await act(async () => {
            await result.current.exportJSON('deck-1', false);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });
});
