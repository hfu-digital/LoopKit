import type { ContentTransform, RenderContext } from '../../types/rendering';

const MEDIA_TAG_RE = /<(img|audio|video|source)\b([^>]*)\bdata-media-id="([^"]+)"([^>]*)>/g;

/**
 * Resolves embedded media references to signed URLs.
 *
 * Looks for elements with a `data-media-id` attribute and injects (or
 * replaces) the `src` attribute with the URL from
 * `context.mediaUrls[mediaId]`. The API caller is expected to pre-fetch
 * signed URLs and pass them via the render options so the pipeline stays
 * synchronous.
 *
 * If a media id has no resolved URL, the tag is left untouched (the client
 * may render a fallback or trigger a deferred fetch).
 */
export function createMediaResolverTransform(): ContentTransform {
    return (html: string, context: RenderContext) => {
        const urls = context.mediaUrls ?? {};

        return html.replace(MEDIA_TAG_RE, (match, tag: string, before: string, mediaId: string, after: string) => {
            const url = urls[mediaId];
            if (!url) return match;

            const safeUrl = escapeAttribute(url);
            const combined = `${before}${after}`;

            if (/\bsrc=/.test(combined)) {
                const replaced = combined.replace(/\bsrc="[^"]*"/, `src="${safeUrl}"`);
                return `<${tag}${replaced} data-media-id="${mediaId}">`;
            }

            return `<${tag}${before} src="${safeUrl}" data-media-id="${mediaId}"${after}>`;
        });
    };
}

/**
 * Walks an HTML string and returns the set of media ids referenced via
 * `data-media-id` attributes. Used by the API layer to batch-fetch signed
 * URLs before invoking the pipeline.
 */
export function extractMediaIds(html: string): string[] {
    const ids = new Set<string>();
    const re = new RegExp(MEDIA_TAG_RE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
        ids.add(match[3]);
    }
    return Array.from(ids);
}

function escapeAttribute(input: string): string {
    return input.replace(/"/g, '&quot;');
}
