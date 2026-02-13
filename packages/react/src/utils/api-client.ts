import { useLoopKitConfig } from '../context/LoopKitProvider';

export interface ApiClient {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, body?: unknown) => Promise<T>;
    put: <T>(path: string, body?: unknown) => Promise<T>;
    del: (path: string) => Promise<void>;
}

export function useApiClient(): ApiClient {
    const { apiUrl, fetcher } = useLoopKitConfig();
    const fetchFn = fetcher ?? fetch;

    async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${apiUrl}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const res = await fetchFn(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
        }

        if (res.status === 204) return undefined as T;

        return res.json() as Promise<T>;
    }

    return {
        get: <T>(path: string) => request<T>('GET', path),
        post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
        put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
        del: (path: string) => request<void>('DELETE', path),
    };
}
