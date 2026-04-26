import { describe, it, expect } from 'vitest';
import { createAnkiSoundTransform } from '../../src/domain/content-pipeline/anki-sound-transform';
import type { RenderContext } from '../../src/types/rendering';

const transform = createAnkiSoundTransform();
const context: RenderContext = { fields: {}, cardState: 'new' };

describe('createAnkiSoundTransform', () => {
    it('replaces [sound:filename] with audio element', () => {
        const result = transform('Listen: [sound:hello.mp3]', context);
        expect(result).toContain('<audio');
        expect(result).toContain('data-media-name="hello.mp3"');
        expect(result).toContain('controls');
    });

    it('handles multiple sound markers', () => {
        const result = transform('[sound:a.mp3] and [sound:b.wav]', context);
        expect(result.match(/<audio/g)).toHaveLength(2);
    });

    it('escapes quotes in filenames', () => {
        const result = transform('[sound:weird"name.mp3]', context);
        expect(result).toContain('data-media-name="weird&quot;name.mp3"');
    });

    it('leaves text without markers untouched', () => {
        expect(transform('plain text', context)).toBe('plain text');
    });
});
