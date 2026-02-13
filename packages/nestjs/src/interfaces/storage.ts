import type {
    CardBase,
    NoteBase,
    NoteType,
    DeckBase,
    DeckPreset,
    ReviewLog,
    DeckCounts,
} from '../types/entities';
import type {
    CreateCardInput,
    UpdateCardInput,
    CreateNoteInput,
    UpdateNoteInput,
    NoteFilters,
    CreateDeckInput,
    UpdateDeckInput,
    DeckFilters,
    CreatePresetInput,
    UpdatePresetInput,
    CreateNoteTypeInput,
    UpdateNoteTypeInput,
    CreateReviewLogInput,
    ReviewLogFilters,
} from '../types/inputs';

/**
 * Abstract storage class that all adapters must implement.
 * Uses structural typing — no imports from specific ORMs.
 */
export abstract class LoopKitStorage<TCard extends CardBase = CardBase> {
    // ─── Card Operations ─────────────────────────────────────────────

    abstract createCard(input: CreateCardInput): Promise<TCard>;
    abstract createManyCards(inputs: CreateCardInput[]): Promise<number>;
    abstract getCard(id: string): Promise<TCard>;
    abstract findCards(deckId: string, filters?: { state?: string }): Promise<TCard[]>;
    abstract updateCard(id: string, input: UpdateCardInput): Promise<TCard>;
    abstract updateManyCards(ids: string[], input: UpdateCardInput): Promise<number>;
    abstract deleteCard(id: string): Promise<void>;
    abstract deleteCardsByNote(noteId: string): Promise<number>;
    abstract deleteCardsByTemplate(templateId: string): Promise<number>;

    /** Find cards due for review (dueDate <= now, state = 'review') */
    abstract findDueCards(deckIds: string[], now: Date, limit?: number): Promise<TCard[]>;

    /** Find new cards (state = 'new') */
    abstract findNewCards(deckIds: string[], limit?: number): Promise<TCard[]>;

    /** Find cards in learning/relearning state */
    abstract findLearningCards(deckIds: string[], now: Date): Promise<TCard[]>;

    /** Count cards by state for a deck */
    abstract countByState(deckIds: string[]): Promise<DeckCounts>;

    // ─── Note Operations ─────────────────────────────────────────────

    abstract createNote(input: CreateNoteInput & { id?: string }): Promise<NoteBase>;
    abstract getNote(id: string): Promise<NoteBase>;
    abstract findNotes(filters?: NoteFilters): Promise<NoteBase[]>;
    abstract updateNote(id: string, input: UpdateNoteInput): Promise<NoteBase>;
    abstract deleteNote(id: string): Promise<void>;

    // ─── Deck Operations ─────────────────────────────────────────────

    abstract createDeck(input: CreateDeckInput & { id?: string }): Promise<DeckBase>;
    abstract getDeck(id: string): Promise<DeckBase>;
    abstract findDecks(filters?: DeckFilters): Promise<DeckBase[]>;
    abstract updateDeck(id: string, input: UpdateDeckInput): Promise<DeckBase>;
    abstract deleteDeck(id: string): Promise<void>;

    /** Get all descendant deck IDs (for parent deck review) */
    abstract getDescendantDeckIds(deckId: string): Promise<string[]>;

    // ─── Deck Preset Operations ──────────────────────────────────────

    abstract createPreset(input: CreatePresetInput & { id?: string }): Promise<DeckPreset>;
    abstract getPreset(id: string): Promise<DeckPreset>;
    abstract findPresets(): Promise<DeckPreset[]>;
    abstract updatePreset(id: string, input: UpdatePresetInput): Promise<DeckPreset>;
    abstract deletePreset(id: string): Promise<void>;

    // ─── NoteType Operations ─────────────────────────────────────────

    abstract createNoteType(input: CreateNoteTypeInput & { id?: string }): Promise<NoteType>;
    abstract getNoteType(id: string): Promise<NoteType>;
    abstract findNoteTypes(): Promise<NoteType[]>;
    abstract updateNoteType(id: string, input: UpdateNoteTypeInput): Promise<NoteType>;
    abstract deleteNoteType(id: string): Promise<void>;

    // ─── ReviewLog Operations ────────────────────────────────────────

    abstract createReviewLog(input: CreateReviewLogInput & { id?: string }): Promise<ReviewLog>;
    abstract getReviewLog(id: string): Promise<ReviewLog>;
    abstract findReviewLogs(filters?: ReviewLogFilters): Promise<ReviewLog[]>;
    abstract deleteReviewLog(id: string): Promise<void>;

    /** Count reviews done today for daily limit tracking */
    abstract countReviewsToday(deckIds: string[], dayStart: Date): Promise<number>;

    /** Count new→learning transitions today for daily limit tracking */
    abstract countNewCardsToday(deckIds: string[], dayStart: Date): Promise<number>;

    // ─── Sync Helpers ────────────────────────────────────────────────

    abstract findModifiedSince(since: Date): Promise<TCard[]>;
    abstract findReviewLogsSince(since: Date): Promise<ReviewLog[]>;

    // ─── Bulk/Transaction ────────────────────────────────────────────

    abstract transaction<T>(fn: (storage: LoopKitStorage<TCard>) => Promise<T>): Promise<T>;
}
