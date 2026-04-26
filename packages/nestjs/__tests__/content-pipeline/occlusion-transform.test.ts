import { describe, it, expect } from 'vitest';
import {
    createOcclusionTransform,
    countOcclusionMasks,
} from '../../src/domain/content-pipeline/occlusion-transform';
import type { RenderContext } from '../../src/types/rendering';

const transform = createOcclusionTransform();

const sampleData = {
    mediaId: 'media-1',
    width: 800,
    height: 600,
    masks: [
        { id: 'm1', shape: 'rect', x: 10, y: 20, width: 100, height: 50 },
        { id: 'm2', shape: 'ellipse', cx: 200, cy: 300, rx: 30, ry: 20 },
        { id: 'm3', shape: 'polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }] },
    ],
};

function ctx(ordinal: number, side: 'front' | 'back', fieldValue: string): RenderContext {
    return {
        fields: { Img: fieldValue },
        cardState: 'new',
        cardOrdinal: ordinal,
        side,
    };
}

describe('createOcclusionTransform', () => {
    const fieldValue = JSON.stringify(sampleData);

    it('renders image with svg overlay', () => {
        const result = transform('{{occlusion:Img}}', ctx(1, 'front', fieldValue));
        expect(result).toContain('<img');
        expect(result).toContain('data-media-id="media-1"');
        expect(result).toContain('<svg');
        expect(result).toContain('viewBox="0 0 800 600"');
    });

    it('hides active mask on back side', () => {
        const back = transform('{{occlusion:Img}}', ctx(1, 'back', fieldValue));
        // The active mask (#1) should NOT be in output on back side
        expect(back).not.toContain('data-mask-ordinal="1"');
        expect(back).toContain('data-mask-ordinal="2"');
        expect(back).toContain('data-mask-ordinal="3"');
    });

    it('shows all masks on front side, with active highlighted', () => {
        const front = transform('{{occlusion:Img}}', ctx(2, 'front', fieldValue));
        expect(front).toContain('data-mask-ordinal="1"');
        expect(front).toContain('data-mask-ordinal="2"');
        expect(front).toContain('data-mask-ordinal="3"');
        expect(front).toContain('loopkit-mask-active');
    });

    it('renders rect, ellipse, and polygon shapes', () => {
        const result = transform('{{occlusion:Img}}', ctx(1, 'front', fieldValue));
        expect(result).toContain('<rect');
        expect(result).toContain('<ellipse');
        expect(result).toContain('<polygon');
    });

    it('returns empty string for invalid JSON', () => {
        const result = transform('{{occlusion:Img}}', ctx(1, 'front', 'not json'));
        expect(result).toBe('');
    });

    it('returns empty string when field is missing', () => {
        const result = transform('{{occlusion:Missing}}', { fields: {}, cardState: 'new' });
        expect(result).toBe('');
    });
});

describe('countOcclusionMasks', () => {
    it('counts masks in the field value', () => {
        expect(countOcclusionMasks(JSON.stringify(sampleData))).toBe(3);
    });

    it('returns 0 for invalid JSON', () => {
        expect(countOcclusionMasks('not json')).toBe(0);
    });

    it('returns 0 when no masks array', () => {
        expect(countOcclusionMasks(JSON.stringify({ mediaId: 'x' }))).toBe(0);
    });
});
