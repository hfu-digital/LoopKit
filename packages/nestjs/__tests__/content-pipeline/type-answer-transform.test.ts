import { describe, it, expect } from 'vitest';
import { createTypeAnswerTransform } from '../../src/domain/content-pipeline/type-answer-transform';
import type { RenderContext } from '../../src/types/rendering';

const transform = createTypeAnswerTransform();

function ctx(side: 'front' | 'back', fields: Record<string, string> = {}): RenderContext {
    return { fields, cardState: 'new', side };
}

describe('createTypeAnswerTransform', () => {
    it('renders an input on the front side', () => {
        const result = transform('{{type:Answer}}', ctx('front', { Answer: 'Paris' }));
        expect(result).toContain('<input');
        expect(result).toContain('data-type-answer="Answer"');
        expect(result).toContain('data-expected="Paris"');
    });

    it('renders a diff placeholder on the back side', () => {
        const result = transform('{{type:Answer}}', ctx('back', { Answer: 'Paris' }));
        expect(result).toContain('loopkit-type-answer-diff');
        expect(result).toContain('data-expected="Paris"');
    });

    it('escapes the expected value attribute', () => {
        const result = transform('{{type:A}}', ctx('front', { A: '"<script>"' }));
        expect(result).toContain('data-expected="&quot;&lt;script&gt;&quot;"');
        expect(result).not.toContain('<script>');
    });

    it('handles missing fields gracefully', () => {
        const result = transform('{{type:Missing}}', ctx('front'));
        expect(result).toContain('data-expected=""');
    });

    it('defaults to front side when side is unset', () => {
        const result = transform('{{type:A}}', { fields: { A: 'x' }, cardState: 'new' });
        expect(result).toContain('<input');
    });
});
