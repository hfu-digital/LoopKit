import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportExportService } from '../../src/domain/import-export';
import { createMockStorage } from '../helpers/mock-storage';
import type { LoopKitStorage } from '../../src/interfaces/storage';
import type { NoteType, NoteBase, DeckBase, DeckPreset, CardBase } from '../../src/types/entities';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';

const now = new Date('2026-01-15T12:00:00Z');

const basicNoteType: NoteType = {
    id: 'nt-1',
    name: 'Basic',
    fields: [
        { name: 'Front', ordinal: 0, type: 'text', required: true },
        { name: 'Back', ordinal: 1, type: 'text', required: true },
    ],
    templates: [{ id: 'tpl-1', name: 'Card 1', front: '{{Front}}', back: '{{Back}}' }],
    createdAt: now,
    updatedAt: now,
};

function makeNote(overrides: Partial<NoteBase> = {}): NoteBase {
    return {
        id: 'note-1',
        noteTypeId: 'nt-1',
        fields: [
            { name: 'Front', value: 'Hello', ordinal: 0 },
            { name: 'Back', value: 'World', ordinal: 1 },
        ],
        tags: ['test'],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeCard(overrides: Partial<CardBase> = {}): CardBase {
    return {
        id: 'card-1',
        noteId: 'note-1',
        templateId: 'tpl-1',
        deckId: 'deck-1',
        state: 'new',
        easeFactor: 2.5,
        interval: 0,
        dueDate: now,
        currentStep: 0,
        lapseCount: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeDeck(overrides: Partial<DeckBase> = {}): DeckBase {
    return {
        id: 'deck-1',
        name: 'Test Deck',
        parentDeckId: null,
        presetId: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('ImportExportService', () => {
    let storage: ReturnType<typeof createMockStorage>;
    let service: ImportExportService;

    beforeEach(() => {
        storage = createMockStorage();
        service = new ImportExportService(storage as unknown as LoopKitStorage);
    });

    describe('importCSV', () => {
        it('imports rows and creates notes with cards', async () => {
            storage.getNoteType.mockResolvedValue(basicNoteType);
            storage.createNote.mockResolvedValue(makeNote());
            storage.createCard.mockResolvedValue(makeCard());

            const csv = 'Question,Answer\nHello,World\nFoo,Bar';
            const mapping = { Question: 'Front', Answer: 'Back' };
            const result = await service.importCSV(csv, mapping, 'deck-1', 'nt-1', ['imported']);

            expect(result.notesCreated).toBe(2);
            expect(result.cardsCreated).toBe(2); // 1 template × 2 rows
            expect(result.errors).toHaveLength(0);
        });

        it('accumulates errors on failed rows', async () => {
            storage.getNoteType.mockResolvedValue(basicNoteType);
            storage.createNote
                .mockResolvedValueOnce(makeNote())
                .mockRejectedValueOnce(new Error('DB error'));
            storage.createCard.mockResolvedValue(makeCard());

            const csv = 'Q,A\nHello,World\nFoo,Bar';
            const mapping = { Q: 'Front', A: 'Back' };
            const result = await service.importCSV(csv, mapping, 'deck-1', 'nt-1');

            expect(result.notesCreated).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Row 2');
        });
    });

    describe('exportCSV', () => {
        it('exports unique notes as CSV rows', async () => {
            const card1 = makeCard({ id: 'c1', noteId: 'n1' });
            const card2 = makeCard({ id: 'c2', noteId: 'n2' });
            const note1 = makeNote({ id: 'n1', fields: [{ name: 'Front', value: 'Q1', ordinal: 0 }, { name: 'Back', value: 'A1', ordinal: 1 }] });
            const note2 = makeNote({ id: 'n2', fields: [{ name: 'Front', value: 'Q2', ordinal: 0 }, { name: 'Back', value: 'A2', ordinal: 1 }] });

            storage.findCards.mockResolvedValue([card1, card2]);
            storage.getNote
                .mockResolvedValueOnce(note1)
                .mockResolvedValueOnce(note2);

            const csv = await service.exportCSV('deck-1');

            expect(csv).toContain('Front');
            expect(csv).toContain('Back');
            expect(csv).toContain('Q1');
            expect(csv).toContain('Q2');
        });

        it('deduplicates notes with multiple cards', async () => {
            const card1 = makeCard({ id: 'c1', noteId: 'n1', templateId: 'tpl-1' });
            const card2 = makeCard({ id: 'c2', noteId: 'n1', templateId: 'tpl-2' });

            storage.findCards.mockResolvedValue([card1, card2]);
            storage.getNote.mockResolvedValue(makeNote({ id: 'n1' }));

            const csv = await service.exportCSV('deck-1');

            // Should only have one data row (+ header)
            const lines = csv.trim().split('\n');
            expect(lines).toHaveLength(2); // header + 1 row
        });
    });

    describe('importJSON', () => {
        it('imports full hierarchy', async () => {
            const preset: DeckPreset = {
                id: 'p1', name: 'Default', config: DEFAULT_DECK_CONFIG, createdAt: now, updatedAt: now,
            };
            storage.createPreset.mockResolvedValue(preset);
            storage.createNoteType.mockResolvedValue(basicNoteType);
            storage.createDeck.mockResolvedValue(makeDeck());
            storage.createNote.mockResolvedValue(makeNote());
            storage.createCard.mockResolvedValue(makeCard());

            const result = await service.importJSON({
                version: '1.0.0',
                exportedAt: now.toISOString(),
                presets: [preset],
                noteTypes: [basicNoteType],
                decks: [makeDeck()],
                notes: [makeNote()],
                cards: [makeCard()],
            });

            expect(result.notesCreated).toBe(1);
            expect(result.cardsCreated).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(storage.createPreset).toHaveBeenCalled();
            expect(storage.createNoteType).toHaveBeenCalled();
            expect(storage.createDeck).toHaveBeenCalled();
        });

        it('accumulates import errors', async () => {
            storage.createPreset.mockRejectedValue(new Error('duplicate'));
            storage.createNoteType.mockResolvedValue(basicNoteType);
            storage.createDeck.mockResolvedValue(makeDeck());
            storage.createNote.mockResolvedValue(makeNote());
            storage.createCard.mockResolvedValue(makeCard());

            const preset: DeckPreset = {
                id: 'p1', name: 'Default', config: DEFAULT_DECK_CONFIG, createdAt: now, updatedAt: now,
            };
            const result = await service.importJSON({
                version: '1.0.0',
                exportedAt: now.toISOString(),
                presets: [preset],
                noteTypes: [],
                decks: [],
                notes: [],
                cards: [],
            });

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Default');
        });
    });

    describe('exportJSON', () => {
        it('exports deck with all related entities', async () => {
            const deck = makeDeck({ id: 'deck-1' });
            const card = makeCard({ id: 'c1', noteId: 'n1' });
            const note = makeNote({ id: 'n1', noteTypeId: 'nt-1' });
            const preset: DeckPreset = {
                id: 'p1', name: 'Default', config: DEFAULT_DECK_CONFIG, createdAt: now, updatedAt: now,
            };

            storage.getDeck.mockResolvedValue(deck);
            storage.getDescendantDeckIds.mockResolvedValue([]);
            storage.findCards.mockResolvedValue([card]);
            storage.getNote.mockResolvedValue(note);
            storage.getNoteType.mockResolvedValue(basicNoteType);
            storage.findPresets.mockResolvedValue([preset]);

            const data = await service.exportJSON('deck-1');

            expect(data.version).toBe('1.0.0');
            expect(data.decks).toHaveLength(1);
            expect(data.notes).toHaveLength(1);
            expect(data.cards).toHaveLength(1);
            expect(data.noteTypes).toHaveLength(1);
            expect(data.presets).toHaveLength(1);
            expect(data.reviewLogs).toBeUndefined();
        });

        it('includes review logs when requested', async () => {
            storage.getDeck.mockResolvedValue(makeDeck());
            storage.getDescendantDeckIds.mockResolvedValue([]);
            storage.findCards.mockResolvedValue([]);
            storage.findPresets.mockResolvedValue([]);
            storage.findReviewLogs.mockResolvedValue([{
                id: 'rl-1', cardId: 'c1', deckId: 'deck-1', grade: 'good',
                prevState: {} as any, newState: {} as any, reviewedAt: now, timeTakenMs: 5000,
            }]);

            const data = await service.exportJSON('deck-1', true);

            expect(data.reviewLogs).toHaveLength(1);
        });
    });
});
