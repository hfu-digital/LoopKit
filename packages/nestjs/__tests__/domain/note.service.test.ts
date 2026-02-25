import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoteService } from '../../src/domain/note.service';
import { CardGenerator } from '../../src/domain/card-generator';
import { DeckService } from '../../src/domain/deck.service';
import { createMockStorage } from '../helpers/mock-storage';
import type { LoopKitStorage } from '../../src/interfaces/storage';
import type { NoteBase, NoteType, CardBase } from '../../src/types/entities';
import type { SRSAlgorithm, SRSState } from '../../src/domain/srs/srs-algorithm';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';
import { ValidationError } from '../../src/errors/errors';

const now = new Date('2026-01-15T12:00:00Z');

const basicNoteType: NoteType = {
    id: 'nt-1',
    name: 'Basic',
    fields: [
        { name: 'Front', ordinal: 0, type: 'text', required: true },
        { name: 'Back', ordinal: 1, type: 'text', required: true },
    ],
    templates: [
        { id: 'tpl-1', name: 'Card 1', front: '{{Front}}', back: '{{Back}}' },
        { id: 'tpl-2', name: 'Card 2', front: '{{Back}}', back: '{{Front}}' },
    ],
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

describe('NoteService', () => {
    let storage: ReturnType<typeof createMockStorage>;
    let algorithm: SRSAlgorithm;
    let cardGenerator: CardGenerator;
    let deckService: DeckService;
    let service: NoteService;

    beforeEach(() => {
        storage = createMockStorage();

        algorithm = {
            calculateNextState: vi.fn(),
            getInitialState: vi.fn().mockReturnValue({
                state: 'new',
                easeFactor: 2.5,
                interval: 0,
                dueDate: now,
                currentStep: 0,
                lapseCount: 0,
                reviewCount: 0,
            } satisfies SRSState),
        };

        cardGenerator = new CardGenerator(algorithm);
        deckService = new DeckService(storage as unknown as LoopKitStorage);
        vi.spyOn(deckService, 'getEffectiveConfig').mockResolvedValue({ ...DEFAULT_DECK_CONFIG });

        service = new NoteService(
            storage as unknown as LoopKitStorage,
            cardGenerator,
            deckService,
        );
    });

    describe('createNote', () => {
        it('validates, creates note, and generates cards', async () => {
            const note = makeNote();
            storage.getNoteType.mockResolvedValue(basicNoteType);
            storage.createNote.mockResolvedValue(note);
            storage.createManyCards.mockResolvedValue(2);

            const result = await service.createNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [
                        { name: 'Front', value: 'Hello', ordinal: 0 },
                        { name: 'Back', value: 'World', ordinal: 1 },
                    ],
                    tags: ['test'],
                },
                'deck-1',
            );

            expect(storage.getNoteType).toHaveBeenCalledWith('nt-1');
            expect(storage.createNote).toHaveBeenCalled();
            expect(storage.createManyCards).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ templateId: 'tpl-1', deckId: 'deck-1' }),
                    expect.objectContaining({ templateId: 'tpl-2', deckId: 'deck-1' }),
                ]),
            );
            expect(result.id).toBe('note-1');
        });

        it('rejects invalid input before creating note', async () => {
            storage.getNoteType.mockResolvedValue(basicNoteType);

            await expect(
                service.createNote(
                    {
                        noteTypeId: 'nt-1',
                        fields: [{ name: 'Front', value: 'Hello', ordinal: 0 }],
                    },
                    'deck-1',
                ),
            ).rejects.toThrow(ValidationError);

            expect(storage.createNote).not.toHaveBeenCalled();
        });
    });

    describe('updateNote', () => {
        it('delegates to storage', async () => {
            const updated = makeNote({ tags: ['updated'] });
            storage.updateNote.mockResolvedValue(updated);

            const result = await service.updateNote('note-1', { tags: ['updated'] });

            expect(storage.updateNote).toHaveBeenCalledWith('note-1', { tags: ['updated'] });
            expect(result.tags).toContain('updated');
        });
    });

    describe('deleteNote', () => {
        it('deletes cards first, then note', async () => {
            storage.deleteCardsByNote.mockResolvedValue(2);

            await service.deleteNote('note-1');

            expect(storage.deleteCardsByNote).toHaveBeenCalledWith('note-1');
            expect(storage.deleteNote).toHaveBeenCalledWith('note-1');
        });
    });

    describe('moveNoteToDeck', () => {
        it('updates all note cards to new deck', async () => {
            const cards: Partial<CardBase>[] = [
                { id: 'c1', noteId: 'note-1', deckId: 'old-deck' },
                { id: 'c2', noteId: 'note-1', deckId: 'old-deck' },
                { id: 'c3', noteId: 'other-note', deckId: 'old-deck' },
            ];
            storage.findCards.mockResolvedValue(cards);

            await service.moveNoteToDeck('note-1', 'new-deck');

            expect(storage.updateManyCards).toHaveBeenCalledWith(
                ['c1', 'c2'],
                { deckId: 'new-deck' },
            );
        });
    });
});
