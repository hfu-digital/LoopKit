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

export type FieldType = 'text' | 'richtext' | 'media';

export interface FieldDef {
    name: string;
    ordinal: number;
    type: FieldType;
    required: boolean;
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
