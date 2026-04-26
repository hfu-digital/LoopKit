import { describe, it, expect } from 'vitest';
import {
    createClozeTransform,
    countClozeOrdinals,
} from '../../src/domain/content-pipeline/cloze-transform';
import type { RenderContext } from '../../src/types/rendering';

const transform = createClozeTransform();

function ctx(overrides: Partial<RenderContext> = {}): RenderContext {
    return {
        fields: {},
        cardState: 'new',
        ...overrides,
    };
}

describe('createClozeTransform', () => {
    it('hides the active cloze on front side', () => {
        const html = '{{cloze:Text}}';
        const context = ctx({
            fields: { Text: 'The {{c1::mitochondria}} is the {{c2::powerhouse}}' },
            cardOrdinal: 1,
            side: 'front',
        });
        const result = transform(html, context);
        expect(result).toContain('cloze-hidden');
        expect(result).toContain('data-cloze="1"');
        expect(result).toContain('powerhouse');
        expect(result).not.toContain('mitochondria');
    });

    it('reveals the active cloze on back side', () => {
        const html = '{{cloze:Text}}';
        const context = ctx({
            fields: { Text: 'The {{c1::mitochondria}} is the {{c2::powerhouse}}' },
            cardOrdinal: 1,
            side: 'back',
        });
        const result = transform(html, context);
        expect(result).toContain('cloze-active');
        expect(result).toContain('mitochondria');
        expect(result).toContain('powerhouse');
    });

    it('uses hint when provided', () => {
        const html = '{{cloze:Text}}';
        const context = ctx({
            fields: { Text: 'The {{c1::mitochondria::organelle}} produces ATP' },
            cardOrdinal: 1,
            side: 'front',
        });
        const result = transform(html, context);
        expect(result).toContain('[organelle]');
    });

    it('inactive clozes show their answer regardless of side', () => {
        const html = '{{cloze:Text}}';
        const front = transform(html, ctx({
            fields: { Text: '{{c1::a}} {{c2::b}} {{c3::c}}' },
            cardOrdinal: 2,
            side: 'front',
        }));
        expect(front).toContain('cloze-hidden');
        expect(front).toContain('data-cloze="2"');
        expect(front).toContain('cloze-inactive');
        expect(front).toContain('>a<');
        expect(front).toContain('>c<');
    });

    it('escapes HTML inside answers and hints', () => {
        const html = '{{cloze:Text}}';
        const result = transform(html, ctx({
            fields: { Text: '{{c1::<script>alert(1)</script>::<b>oops</b>}}' },
            cardOrdinal: 1,
            side: 'front',
        }));
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;b&gt;');
    });

    it('returns empty string when field is missing', () => {
        expect(transform('{{cloze:Missing}}', ctx({ side: 'front' }))).toBe('');
    });
});

describe('countClozeOrdinals', () => {
    it('counts distinct cN ordinals', () => {
        expect(countClozeOrdinals('{{c1::a}} {{c2::b}} {{c3::c}}')).toEqual([1, 2, 3]);
    });

    it('deduplicates repeated ordinals', () => {
        expect(countClozeOrdinals('{{c1::a}} {{c1::b}} {{c2::c}}')).toEqual([1, 2]);
    });

    it('returns empty for no clozes', () => {
        expect(countClozeOrdinals('plain text')).toEqual([]);
    });

    it('sorts ordinals ascending', () => {
        expect(countClozeOrdinals('{{c3::a}} {{c1::b}} {{c2::c}}')).toEqual([1, 2, 3]);
    });
});
