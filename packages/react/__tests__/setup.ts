import '@testing-library/jest-dom';

/**
 * Polyfill Blob.prototype.text for jsdom (not natively available).
 */
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
    Blob.prototype.text = function () {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(this);
        });
    };
}

/**
 * Mock fetch helper: routes responses by URL pattern.
 * URL-matched routes are persistent (survive multiple calls) — cleared via clearFetchMocks().
 * FIFO fallback responses are consumed once.
 */

interface MockRoute {
    pattern: string | RegExp;
    response: { ok: boolean; status: number; body: unknown };
}

let routes: MockRoute[] = [];
let fallbackResponses: Array<{ ok: boolean; status: number; body: unknown }> = [];

function buildResponse(res: { ok: boolean; status: number; body: unknown }): Response {
    if (!res.ok) {
        return new Response(typeof res.body === 'string' ? res.body : JSON.stringify(res.body), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    if (res.status === 204) {
        return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(res.body), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export const mockFetch: typeof fetch = async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Check URL-based routes (persistent — not consumed on match)
    for (const route of routes) {
        const matches = typeof route.pattern === 'string'
            ? url.endsWith(route.pattern)
            : route.pattern.test(url);
        if (matches) {
            return buildResponse(route.response);
        }
    }

    // Fall back to FIFO queue (consumed once)
    const res = fallbackResponses.shift();
    if (res) {
        return buildResponse(res);
    }

    return new Response(JSON.stringify({ error: 'No mock response configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
};

/** Register a persistent response for a URL pattern (cleared via clearFetchMocks) */
export function mockFetchRoute(pattern: string | RegExp, body: unknown, status = 200): void {
    routes.push({ pattern, response: { ok: status < 400, status, body } });
}

/** Queue an ordered response (FIFO, not URL-matched) */
export function mockFetchResponse(body: unknown, status = 200): void {
    fallbackResponses.push({ ok: true, status, body });
}

/** Queue an ordered error response (FIFO) */
export function mockFetchError(body: unknown = 'Internal Server Error', status = 500): void {
    fallbackResponses.push({ ok: false, status, body });
}

export function clearFetchMocks(): void {
    routes = [];
    fallbackResponses = [];
}
