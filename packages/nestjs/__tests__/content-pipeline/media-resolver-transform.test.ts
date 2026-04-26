import { describe, it, expect } from 'vitest';
import {
    createMediaResolverTransform,
    extractMediaIds,
} from '../../src/domain/content-pipeline/media-resolver-transform';
import type { RenderContext } from '../../src/types/rendering';

const transform = createMediaResolverTransform();

function ctx(mediaUrls: Record<string, string>): RenderContext {
    return { fields: {}, cardState: 'new', mediaUrls };
}

describe('createMediaResolverTransform', () => {
    it('injects src on img tags by data-media-id', () => {
        const html = '<img data-media-id="abc" alt="x">';
        const result = transform(html, ctx({ abc: 'https://cdn.example.com/abc.png' }));
        expect(result).toContain('src="https://cdn.example.com/abc.png"');
        expect(result).toContain('data-media-id="abc"');
    });

    it('replaces existing src with resolved URL', () => {
        const html = '<img src="placeholder.png" data-media-id="xyz">';
        const result = transform(html, ctx({ xyz: 'https://signed.example/xyz' }));
        expect(result).toContain('src="https://signed.example/xyz"');
        expect(result).not.toContain('placeholder.png');
    });

    it('handles audio and video tags', () => {
        const html = '<audio data-media-id="aaa"></audio><video data-media-id="vvv"></video>';
        const result = transform(html, ctx({ aaa: 'audio.mp3', vvv: 'video.mp4' }));
        expect(result).toContain('src="audio.mp3"');
        expect(result).toContain('src="video.mp4"');
    });

    it('leaves tags untouched when URL is missing', () => {
        const html = '<img data-media-id="missing">';
        const result = transform(html, ctx({ other: 'x' }));
        expect(result).toBe(html);
    });

    it('escapes quotes in URLs', () => {
        const html = '<img data-media-id="x">';
        const result = transform(html, ctx({ x: 'foo"bar' }));
        expect(result).toContain('src="foo&quot;bar"');
    });
});

describe('extractMediaIds', () => {
    it('extracts unique ids from img/audio/video tags', () => {
        const html = '<img data-media-id="a"><audio data-media-id="b"></audio><img data-media-id="a">';
        expect(extractMediaIds(html).sort()).toEqual(['a', 'b']);
    });

    it('returns empty for no media', () => {
        expect(extractMediaIds('<p>plain</p>')).toEqual([]);
    });
});
