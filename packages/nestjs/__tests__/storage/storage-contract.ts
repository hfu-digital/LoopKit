import { describe, it, expect, beforeEach } from 'vitest';
import type { LoopKitStorage } from '../../src/interfaces/storage';
import type { DeckBase, NoteBase, NoteType, DeckPreset } from '../../src/types/entities';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';

/**
 * Storage contract test suite — any adapter must pass these tests.
 * Call `runStorageContractTests(factory)` with a function that creates a fresh storage instance.
 */
export function runStorageContractTests(factory: () => LoopKitStorage | Promise<LoopKitStorage>) {
    let storage: LoopKitStorage;
    let noteType: NoteType;
    let deck: DeckBase;
    let preset: DeckPreset;

    beforeEach(async () => {
        storage = await factory();

        // Seed shared fixtures
        preset = await storage.createPreset({
            name: 'Test Preset',
            config: { ...DEFAULT_DECK_CONFIG },
        });

        noteType = await storage.createNoteType({
            name: 'Basic',
            fields: [
                { name: 'Front', ordinal: 0, type: 'text', required: true },
                { name: 'Back', ordinal: 1, type: 'text', required: true },
            ],
            templates: [
                { id: 'tpl-1', name: 'Card 1', front: '{{Front}}', back: '{{Back}}' },
            ],
        });

        deck = await storage.createDeck({ name: 'Test Deck', presetId: preset.id });
    });

    describe('NoteType CRUD', () => {
        it('creates and retrieves a note type', async () => {
            const found = await storage.getNoteType(noteType.id);
            expect(found.name).toBe('Basic');
            expect(found.fields).toHaveLength(2);
            expect(found.templates).toHaveLength(1);
        });

        it('lists note types', async () => {
            const types = await storage.findNoteTypes();
            expect(types.length).toBeGreaterThanOrEqual(1);
        });

        it('updates a note type', async () => {
            const updated = await storage.updateNoteType(noteType.id, { name: 'Renamed' });
            expect(updated.name).toBe('Renamed');
        });
    });

    describe('Deck CRUD', () => {
        it('creates and retrieves a deck', async () => {
            const found = await storage.getDeck(deck.id);
            expect(found.name).toBe('Test Deck');
        });

        it('lists decks', async () => {
            const decks = await storage.findDecks();
            expect(decks.length).toBeGreaterThanOrEqual(1);
        });

        it('updates a deck', async () => {
            const updated = await storage.updateDeck(deck.id, { name: 'Renamed Deck' });
            expect(updated.name).toBe('Renamed Deck');
        });

        it('handles deck hierarchy', async () => {
            const child = await storage.createDeck({
                name: 'Child',
                parentDeckId: deck.id,
            });
            const grandchild = await storage.createDeck({
                name: 'Grandchild',
                parentDeckId: child.id,
            });

            const descendants = await storage.getDescendantDeckIds(deck.id);
            expect(descendants).toContain(child.id);
            expect(descendants).toContain(grandchild.id);
            expect(descendants).not.toContain(deck.id);
        });
    });

    describe('Preset CRUD', () => {
        it('creates and retrieves a preset', async () => {
            const found = await storage.getPreset(preset.id);
            expect(found.name).toBe('Test Preset');
            expect(found.config.newCardsPerDay).toBe(DEFAULT_DECK_CONFIG.newCardsPerDay);
        });

        it('updates a preset', async () => {
            const updated = await storage.updatePreset(preset.id, { name: 'Updated' });
            expect(updated.name).toBe('Updated');
        });
    });

    describe('Note CRUD', () => {
        it('creates and retrieves a note', async () => {
            const note = await storage.createNote({
                noteTypeId: noteType.id,
                fields: [
                    { name: 'Front', value: 'Q1', ordinal: 0 },
                    { name: 'Back', value: 'A1', ordinal: 1 },
                ],
                tags: ['test'],
            });

            const found = await storage.getNote(note.id);
            expect(found.fields).toHaveLength(2);
            expect(found.tags).toContain('test');
        });

        it('finds notes by filter', async () => {
            await storage.createNote({
                noteTypeId: noteType.id,
                fields: [
                    { name: 'Front', value: 'Q2', ordinal: 0 },
                    { name: 'Back', value: 'A2', ordinal: 1 },
                ],
                tags: ['tagged'],
            });

            const notes = await storage.findNotes({ tags: ['tagged'] });
            expect(notes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Card CRUD', () => {
        let note: NoteBase;

        beforeEach(async () => {
            note = await storage.createNote({
                noteTypeId: noteType.id,
                fields: [
                    { name: 'Front', value: 'Q', ordinal: 0 },
                    { name: 'Back', value: 'A', ordinal: 1 },
                ],
            });
        });

        it('creates and retrieves a card', async () => {
            const card = await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const found = await storage.getCard(card.id);
            expect(found.state).toBe('new');
            expect(found.noteId).toBe(note.id);
        });

        it('creates many cards', async () => {
            const count = await storage.createManyCards([
                { noteId: note.id, templateId: 'tpl-a', deckId: deck.id },
                { noteId: note.id, templateId: 'tpl-b', deckId: deck.id },
            ]);
            expect(count).toBe(2);
        });

        it('updates a card', async () => {
            const card = await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const updated = await storage.updateCard(card.id, { state: 'learning' });
            expect(updated.state).toBe('learning');
        });

        it('finds new cards', async () => {
            await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const newCards = await storage.findNewCards([deck.id]);
            expect(newCards.length).toBeGreaterThanOrEqual(1);
            expect(newCards.every((c) => c.state === 'new')).toBe(true);
        });

        it('finds due cards', async () => {
            const past = new Date(Date.now() - 86400000);
            const card = await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
                state: 'review',
                dueDate: past,
                easeFactor: 2.5,
                interval: 1,
            });

            const dueCards = await storage.findDueCards([deck.id], new Date());
            expect(dueCards.length).toBeGreaterThanOrEqual(1);
        });

        it('finds learning cards', async () => {
            const future = new Date(Date.now() + 600000); // 10 min from now
            await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
                state: 'learning',
                dueDate: future,
                easeFactor: 2.5,
                interval: 0,
                currentStep: 0,
            });

            const learning = await storage.findLearningCards([deck.id], new Date());
            expect(learning.length).toBeGreaterThanOrEqual(1);
        });

        it('counts by state', async () => {
            await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const counts = await storage.countByState([deck.id]);
            expect(counts.new).toBeGreaterThanOrEqual(1);
            expect(counts.total).toBeGreaterThanOrEqual(1);
        });

        it('deletes cards by note', async () => {
            await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const deleted = await storage.deleteCardsByNote(note.id);
            expect(deleted).toBeGreaterThanOrEqual(1);
        });
    });

    describe('ReviewLog', () => {
        it('creates and retrieves a review log', async () => {
            const note = await storage.createNote({
                noteTypeId: noteType.id,
                fields: [
                    { name: 'Front', value: 'Q', ordinal: 0 },
                    { name: 'Back', value: 'A', ordinal: 1 },
                ],
            });
            const card = await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });

            const now = new Date();
            const log = await storage.createReviewLog({
                cardId: card.id,
                deckId: deck.id,
                grade: 'good',
                prevState: {
                    state: 'new',
                    easeFactor: 2.5,
                    interval: 0,
                    dueDate: now,
                    currentStep: 0,
                    lapseCount: 0,
                    reviewCount: 0,
                },
                newState: {
                    state: 'learning',
                    easeFactor: 2.5,
                    interval: 0,
                    dueDate: new Date(now.getTime() + 600000),
                    currentStep: 1,
                    lapseCount: 0,
                    reviewCount: 1,
                },
                timeTakenMs: 5000,
            });

            const found = await storage.getReviewLog(log.id);
            expect(found.grade).toBe('good');
            expect(found.timeTakenMs).toBe(5000);
        });

        it('is append-only (delete supported for undo)', async () => {
            const note = await storage.createNote({
                noteTypeId: noteType.id,
                fields: [
                    { name: 'Front', value: 'Q', ordinal: 0 },
                    { name: 'Back', value: 'A', ordinal: 1 },
                ],
            });
            const card = await storage.createCard({
                noteId: note.id,
                templateId: 'tpl-1',
                deckId: deck.id,
            });
            const now = new Date();

            const log = await storage.createReviewLog({
                cardId: card.id,
                deckId: deck.id,
                grade: 'good',
                prevState: {
                    state: 'new', easeFactor: 2.5, interval: 0,
                    dueDate: now, currentStep: 0, lapseCount: 0, reviewCount: 0,
                },
                newState: {
                    state: 'learning', easeFactor: 2.5, interval: 0,
                    dueDate: now, currentStep: 1, lapseCount: 0, reviewCount: 1,
                },
                timeTakenMs: 3000,
            });

            await storage.deleteReviewLog(log.id);
            await expect(storage.getReviewLog(log.id)).rejects.toThrow();
        });
    });
}
