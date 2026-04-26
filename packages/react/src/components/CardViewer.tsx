import { useEffect, useMemo, useRef, useState } from 'react';
import type { RenderedCard } from '../types';

export type MediaUrlResolver = (mediaId: string) => Promise<string> | string;

export interface CardViewerProps {
    renderedContent: RenderedCard;
    showBack: boolean;
    className?: string;
    /**
     * Resolves `data-media-id` attributes to signed URLs after mount.
     * If omitted, media tags without a `src` attribute will not load.
     * In production the API typically pre-resolves URLs server-side, so the
     * resolver here is only needed for client-rendered previews and refresh
     * after a long study session.
     */
    mediaUrlResolver?: MediaUrlResolver;
    /**
     * Captured user input from a type-the-answer field on the front side,
     * surfaced via this callback so the consumer can persist it for the
     * back-side diff. The map is keyed by the field name.
     */
    onTypedAnswerChange?: (answers: Record<string, string>) => void;
    /**
     * Pre-supplied typed answers (e.g. restored from previous render).
     * Used to populate the diff on the back side.
     */
    typedAnswers?: Record<string, string>;
}

export function CardViewer({
    renderedContent,
    showBack,
    className = '',
    mediaUrlResolver,
    onTypedAnswerChange,
    typedAnswers,
}: CardViewerProps) {
    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);

    const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(typedAnswers ?? {});
    const sharedAnswers = useMemo(() => ({ ...typedAnswers, ...localAnswers }), [typedAnswers, localAnswers]);

    // Resolve media URLs after each render.
    useEffect(() => {
        if (!mediaUrlResolver) return;
        if (frontRef.current) void resolveMediaIn(frontRef.current, mediaUrlResolver);
        if (showBack && backRef.current) void resolveMediaIn(backRef.current, mediaUrlResolver);
    }, [renderedContent, showBack, mediaUrlResolver]);

    // Wire type-the-answer inputs on the front side.
    useEffect(() => {
        if (showBack || !frontRef.current) return;
        const root = frontRef.current;
        const inputs = Array.from(
            root.querySelectorAll<HTMLInputElement>('input.loopkit-type-answer'),
        );
        const cleanups: Array<() => void> = [];
        for (const input of inputs) {
            const name = input.dataset.typeAnswer ?? '';
            input.value = sharedAnswers[name] ?? '';
            const handler = () => {
                const next = { ...localAnswers, [name]: input.value };
                setLocalAnswers(next);
                onTypedAnswerChange?.(next);
            };
            input.addEventListener('input', handler);
            cleanups.push(() => input.removeEventListener('input', handler));
        }
        return () => cleanups.forEach((fn) => fn());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderedContent, showBack]);

    // Render diffs for type-the-answer placeholders on the back side.
    useEffect(() => {
        if (!showBack || !backRef.current) return;
        const root = backRef.current;
        const slots = Array.from(
            root.querySelectorAll<HTMLDivElement>('div.loopkit-type-answer-diff'),
        );
        for (const slot of slots) {
            const name = slot.dataset.typeAnswer ?? '';
            const expected = slot.dataset.expected ?? '';
            const userInput = sharedAnswers[name] ?? '';
            slot.innerHTML = renderDiff(userInput, expected);
        }
    }, [renderedContent, showBack, sharedAnswers]);

    return (
        <div className={`loopkit-card-viewer ${className}`}>
            <div className={`loopkit-card-inner ${showBack ? 'loopkit-card-flipped' : ''}`}>
                <div
                    ref={frontRef}
                    className="loopkit-card-front"
                    dangerouslySetInnerHTML={{ __html: renderedContent.front }}
                />
                {showBack && (
                    <div
                        ref={backRef}
                        className="loopkit-card-back"
                        dangerouslySetInnerHTML={{ __html: renderedContent.back }}
                    />
                )}
            </div>
        </div>
    );
}

async function resolveMediaIn(root: HTMLElement, resolver: MediaUrlResolver): Promise<void> {
    const elements = Array.from(
        root.querySelectorAll<HTMLImageElement | HTMLAudioElement | HTMLVideoElement>(
            '[data-media-id]',
        ),
    );
    await Promise.all(
        elements.map(async (el) => {
            const mediaId = el.dataset.mediaId;
            if (!mediaId) return;
            if (el.getAttribute('src')) return;
            try {
                const url = await Promise.resolve(resolver(mediaId));
                if (url) el.setAttribute('src', url);
            } catch {
                // leave src empty; consumer can show fallback
            }
        }),
    );
}

/**
 * Char-by-char diff between user input and expected. Renders matching
 * characters in green and divergences (mismatch + missing) in red.
 */
function renderDiff(input: string, expected: string): string {
    const parts: string[] = [];
    const max = Math.max(input.length, expected.length);
    for (let i = 0; i < max; i++) {
        const u = input[i];
        const e = expected[i];
        if (u === undefined) {
            parts.push(`<span class="loopkit-typed-missing">${escapeHtml(e!)}</span>`);
        } else if (e === undefined) {
            parts.push(`<span class="loopkit-typed-extra">${escapeHtml(u)}</span>`);
        } else if (u === e) {
            parts.push(`<span class="loopkit-typed-correct">${escapeHtml(e)}</span>`);
        } else {
            parts.push(
                `<span class="loopkit-typed-wrong" title="expected ${escapeHtml(e)}">${escapeHtml(u)}</span>`,
            );
        }
    }
    return `<span class="loopkit-typed-diff">${parts.join('')}</span>`;
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
