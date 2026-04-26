export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface CardBase {
    id: string;
    noteId: string;
    templateId: string;
    deckId: string;
    state: CardState;
    easeFactor: number;
    interval: number;
    dueDate: Date;
    currentStep: number;
    lapseCount: number;
    reviewCount: number;
    /**
     * 1-indexed ordinal that distinguishes multiple cards generated from the
     * same template + note pair. Used by Cloze and Image-Occlusion notes
     * (one card per cN / per mask). Defaults to 1 for plain templates.
     */
    cardOrdinal: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Field {
    name: string;
    value: string;
    ordinal: number;
}

export interface NoteBase {
    id: string;
    noteTypeId: string;
    fields: Field[];
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export type FieldType = 'text' | 'richtext' | 'media' | 'cloze' | 'typed' | 'occlusion';

export interface FieldDef {
    name: string;
    ordinal: number;
    type: FieldType;
    required: boolean;
}

export type MediaKind = 'image' | 'audio' | 'video' | 'svg';

export interface MediaReference {
    id: string;
    kind: MediaKind;
    /** Resolved signed URL, populated by media-resolver transform at render time. */
    url?: string;
}

export type OcclusionShape = 'rect' | 'ellipse' | 'polygon';

export interface OcclusionMaskRect {
    id: string;
    shape: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    hint?: string;
}

export interface OcclusionMaskEllipse {
    id: string;
    shape: 'ellipse';
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    label?: string;
    hint?: string;
}

export interface OcclusionMaskPolygon {
    id: string;
    shape: 'polygon';
    points: { x: number; y: number }[];
    label?: string;
    hint?: string;
}

export type OcclusionMask = OcclusionMaskRect | OcclusionMaskEllipse | OcclusionMaskPolygon;

export interface OcclusionData {
    /** Reference to the underlying image media. */
    mediaId: string;
    /** Intrinsic dimensions of the source image (used for SVG viewBox). */
    width: number;
    height: number;
    masks: OcclusionMask[];
}

export interface TemplateDef {
    id: string;
    name: string;
    front: string;
    back: string;
    css?: string;
}

export interface NoteType {
    id: string;
    name: string;
    fields: FieldDef[];
    templates: TemplateDef[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DeckBase {
    id: string;
    name: string;
    description?: string;
    parentDeckId?: string | null;
    presetId?: string | null;
    configOverrides?: Partial<import('./config').DeckConfig>;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeckPreset {
    id: string;
    name: string;
    config: import('./config').DeckConfig;
    createdAt: Date;
    updatedAt: Date;
}

export interface CardStateSnapshot {
    state: CardState;
    easeFactor: number;
    interval: number;
    dueDate: Date;
    currentStep: number;
    lapseCount: number;
    reviewCount: number;
    cardOrdinal?: number;
}

export interface ReviewLog {
    id: string;
    cardId: string;
    deckId: string;
    grade: import('./grade').Grade;
    prevState: CardStateSnapshot;
    newState: CardStateSnapshot;
    reviewedAt: Date;
    timeTakenMs: number;
}

export interface DeckTreeNode extends DeckBase {
    children: DeckTreeNode[];
    counts?: DeckCounts;
}

export interface DeckCounts {
    new: number;
    learning: number;
    review: number;
    relearning: number;
    total: number;
}
