export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'] as const;

export interface Field {
    name: string;
    value: string;
    ordinal: number;
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
    mediaId: string;
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

export interface CardBase {
    id: string;
    noteId: string;
    templateId: string;
    deckId: string;
    state: CardState;
    easeFactor: number;
    interval: number;
    dueDate: string;
    currentStep: number;
    lapseCount: number;
    reviewCount: number;
    cardOrdinal: number;
    createdAt: string;
    updatedAt: string;
}

export interface NoteBase {
    id: string;
    noteTypeId: string;
    fields: Field[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface NoteType {
    id: string;
    name: string;
    fields: FieldDef[];
    templates: TemplateDef[];
    createdAt: string;
    updatedAt: string;
}

export interface DeckBase {
    id: string;
    name: string;
    description?: string;
    parentDeckId?: string | null;
    presetId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DeckCounts {
    new: number;
    learning: number;
    review: number;
    relearning: number;
    total: number;
}

export interface DeckTreeNode extends DeckBase {
    children: DeckTreeNode[];
    counts?: DeckCounts;
}

export interface RenderedCard {
    front: string;
    back: string;
}

export interface ReviewLog {
    id: string;
    cardId: string;
    deckId: string;
    grade: Grade;
    reviewedAt: string;
    timeTakenMs: number;
}

export interface SessionQueue {
    cards: CardBase[];
    counts: {
        new: number;
        learning: number;
        review: number;
    };
}

export interface GradeResult {
    card: CardBase;
    reviewLog: ReviewLog;
    nextIntervals: Record<Grade, string>;
}

export interface SessionSummary {
    totalReviewed: number;
    correctCount: number;
    incorrectCount: number;
    averageTimeMsPerCard: number;
    gradeDistribution: Record<Grade, number>;
    newCardsStudied: number;
    reviewsCompleted: number;
}

export interface DeckStats {
    breakdown: { new: number; learning: number; review: number; relearning: number };
    retention: number;
    streak: number;
    averageEase: number;
    reviewsPerDay: Record<string, number>;
    forecast: Record<string, number>;
}

export interface ImportResult {
    notesCreated: number;
    cardsCreated: number;
    errors: string[];
}
