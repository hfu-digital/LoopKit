import { vi } from 'vitest';
import { LoopKitStorage } from '../../src/interfaces/storage';

/**
 * Creates a mock LoopKitStorage with vi.fn() for every method.
 * Tests can override specific methods with mockResolvedValue / mockImplementation.
 */
export function createMockStorage(): LoopKitStorage & { [K in keyof LoopKitStorage]: ReturnType<typeof vi.fn> } {
    return {
        // Card operations
        createCard: vi.fn(),
        createManyCards: vi.fn(),
        getCard: vi.fn(),
        findCards: vi.fn().mockResolvedValue([]),
        updateCard: vi.fn(),
        updateManyCards: vi.fn(),
        deleteCard: vi.fn(),
        deleteCardsByNote: vi.fn(),
        deleteCardsByTemplate: vi.fn(),
        findDueCards: vi.fn().mockResolvedValue([]),
        findNewCards: vi.fn().mockResolvedValue([]),
        findLearningCards: vi.fn().mockResolvedValue([]),
        countByState: vi.fn().mockResolvedValue({ new: 0, learning: 0, review: 0, relearning: 0, total: 0 }),

        // Note operations
        createNote: vi.fn(),
        getNote: vi.fn(),
        findNotes: vi.fn().mockResolvedValue([]),
        updateNote: vi.fn(),
        deleteNote: vi.fn(),

        // Deck operations
        createDeck: vi.fn(),
        getDeck: vi.fn(),
        findDecks: vi.fn().mockResolvedValue([]),
        updateDeck: vi.fn(),
        deleteDeck: vi.fn(),
        getDescendantDeckIds: vi.fn().mockResolvedValue([]),

        // Preset operations
        createPreset: vi.fn(),
        getPreset: vi.fn(),
        findPresets: vi.fn().mockResolvedValue([]),
        updatePreset: vi.fn(),
        deletePreset: vi.fn(),

        // NoteType operations
        createNoteType: vi.fn(),
        getNoteType: vi.fn(),
        findNoteTypes: vi.fn().mockResolvedValue([]),
        updateNoteType: vi.fn(),
        deleteNoteType: vi.fn(),

        // ReviewLog operations
        createReviewLog: vi.fn(),
        getReviewLog: vi.fn(),
        findReviewLogs: vi.fn().mockResolvedValue([]),
        deleteReviewLog: vi.fn(),
        countReviewsToday: vi.fn().mockResolvedValue(0),
        countNewCardsToday: vi.fn().mockResolvedValue(0),

        // Sync helpers
        findModifiedSince: vi.fn().mockResolvedValue([]),
        findReviewLogsSince: vi.fn().mockResolvedValue([]),

        // Transaction
        transaction: vi.fn().mockImplementation(async (fn: any) => fn({} as any)),
    } as any;
}
