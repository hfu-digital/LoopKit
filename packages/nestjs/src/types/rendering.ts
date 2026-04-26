import type { CardState } from './entities';

export interface RenderedCard {
    front: string;
    back: string;
}

export type CardSide = 'front' | 'back';

export interface RenderContext {
    fields: Record<string, string>;
    cardState: CardState;
    /**
     * Ordinal of the card being rendered relative to its note's templates,
     * or for cloze/occlusion notes, the cN/maskN being targeted (1-indexed).
     * Used by cloze-transform and occlusion-transform to decide which marker
     * to hide vs reveal.
     */
    cardOrdinal?: number;
    /**
     * Which side of the card the current pass is rendering. Used by
     * type-answer-transform to know whether to render the input or the diff.
     */
    side?: CardSide;
    /**
     * Pre-resolved signed URLs for media references found in field values.
     * Populated by the API caller before invoking the pipeline so the
     * transform stays synchronous. Keyed by media id.
     */
    mediaUrls?: Record<string, string>;
}

export type ContentTransform = (html: string, context: RenderContext) => string;
