import type { CardState } from './entities';

export interface RenderedCard {
    front: string;
    back: string;
}

export interface RenderContext {
    fields: Record<string, string>;
    cardState: CardState;
}

export type ContentTransform = (html: string, context: RenderContext) => string;
