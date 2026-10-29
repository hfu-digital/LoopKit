import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { useApiClient } from '../../src/utils/api-client';
import { useDecks } from '../../src/hooks/useDeck';

describe('API client stability', () => {
    it('does not refetch after request state updates or unchanged rerenders', async () => {
        const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
        const wrapper = ({ children }: { children: ReactNode }) => <LoopKitProvider apiUrl="/api" fetcher={fetcher}>{children}</LoopKitProvider>;
        const { result, rerender } = renderHook(() => useDecks(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        rerender();
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('uses replacement fetcher and URL after configuration changes', async () => {
        const first = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
        const second = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
        let apiUrl = '/one', fetcher = first;
        const wrapper = ({ children }: { children: ReactNode }) => <LoopKitProvider apiUrl={apiUrl} fetcher={fetcher}>{children}</LoopKitProvider>;
        const { result, rerender } = renderHook(() => useApiClient(), { wrapper });
        const previous = result.current;
        rerender();
        expect(result.current).toBe(previous);
        apiUrl = '/two'; fetcher = second;
        rerender();
        await result.current.get('/decks');
        expect(second).toHaveBeenCalledWith('/two/decks', expect.any(Object));
        expect(first).not.toHaveBeenCalled();
    });
});
