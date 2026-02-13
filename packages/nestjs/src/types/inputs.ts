import type { CardState, Field, FieldDef, TemplateDef } from './entities';
import type { DeckConfig } from './config';
import type { Grade } from './grade';

// Note inputs
export interface CreateNoteInput {
    noteTypeId: string;
    fields: Field[];
    tags?: string[];
}

export interface UpdateNoteInput {
    fields?: Field[];
    tags?: string[];
}

export interface NoteFilters {
    noteTypeId?: string;
    tags?: string[];
    search?: string;
    deckId?: string;
}

// Card inputs
export interface CreateCardInput {
    noteId: string;
    templateId: string;
    deckId: string;
    state?: CardState;
    easeFactor?: number;
    interval?: number;
    dueDate?: Date;
    currentStep?: number;
    lapseCount?: number;
    reviewCount?: number;
}

export interface UpdateCardInput {
    state?: CardState;
    easeFactor?: number;
    interval?: number;
    dueDate?: Date;
    currentStep?: number;
    lapseCount?: number;
    reviewCount?: number;
    deckId?: string;
}

// Deck inputs
export interface CreateDeckInput {
    name: string;
    description?: string;
    parentDeckId?: string | null;
    presetId?: string | null;
    configOverrides?: Partial<DeckConfig>;
}

export interface UpdateDeckInput {
    name?: string;
    description?: string;
    parentDeckId?: string | null;
    presetId?: string | null;
    configOverrides?: Partial<DeckConfig>;
}

export interface DeckFilters {
    parentDeckId?: string | null;
    search?: string;
}

// Preset inputs
export interface CreatePresetInput {
    name: string;
    config: DeckConfig;
}

export interface UpdatePresetInput {
    name?: string;
    config?: Partial<DeckConfig>;
}

// NoteType inputs
export interface CreateNoteTypeInput {
    name: string;
    fields: FieldDef[];
    templates: TemplateDef[];
}

export interface UpdateNoteTypeInput {
    name?: string;
    fields?: FieldDef[];
}

// ReviewLog inputs
export interface CreateReviewLogInput {
    cardId: string;
    deckId: string;
    grade: Grade;
    prevState: import('./entities').CardStateSnapshot;
    newState: import('./entities').CardStateSnapshot;
    timeTakenMs: number;
}

export interface ReviewLogFilters {
    cardId?: string;
    deckId?: string;
    dateStart?: Date;
    dateEnd?: Date;
    grade?: Grade;
}

// Session types
export interface SessionOptions {
    tags?: string[];
    newCardsLimit?: number;
    reviewCardsLimit?: number;
}

export interface SessionQueue {
    cards: import('./entities').CardBase[];
    counts: {
        new: number;
        learning: number;
        review: number;
    };
}

export interface GradeResult {
    card: import('./entities').CardBase;
    reviewLog: import('./entities').ReviewLog;
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

// Import/Export types
export interface FieldMapping {
    [csvColumn: string]: string;
}

export interface ImportResult {
    notesCreated: number;
    cardsCreated: number;
    errors: string[];
}

export interface LoopKitExportData {
    version: string;
    exportedAt: string;
    decks: import('./entities').DeckBase[];
    noteTypes: import('./entities').NoteType[];
    notes: import('./entities').NoteBase[];
    cards: import('./entities').CardBase[];
    presets: import('./entities').DeckPreset[];
    reviewLogs?: import('./entities').ReviewLog[];
}
