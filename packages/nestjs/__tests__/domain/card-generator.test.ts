import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardGenerator } from '../../src/domain/card-generator';
import type { SRSAlgorithm, SRSState } from '../../src/domain/srs/srs-algorithm';
import type { NoteBase, NoteType } from '../../src/types/entities';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';

const now = new Date('2026-01-15T12:00:00Z');

const initialState: SRSState = {
    state: 'new',
    easeFactor: 2.5,
    interval: 0,
    dueDate: now,
    currentStep: 0,
    lapseCount: 0,
    reviewCount: 0,
};

const basicNoteType: NoteType = {
    id: 'nt-1',
    name: 'Basic + Reverse',
    fields: [
        { name: 'Front', ordinal: 0, type: 'text', required: true },
        { name: 'Back', ordinal: 1, type: 'text', required: true },
    ],
    templates: [
        { id: 'tpl-1', name: 'Forward', front: '{{Front}}', back: '{{Back}}' },
        { id: 'tpl-2', name: 'Reverse', front: '{{Back}}', back: '{{Front}}' },
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
        tags: [],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('CardGenerator', () => {
    let algorithm: SRSAlgorithm;
    let generator: CardGenerator;

    beforeEach(() => {
        algorithm = {
            calculateNextState: vi.fn(),
            getInitialState: vi.fn().mockReturnValue(initialState),
        };
        generator = new CardGenerator(algorithm);
    });

    describe('generateCardsForNote', () => {
        it('creates one card per template', () => {
            const note = makeNote();
            const cards = generator.generateCardsForNote(note, basicNoteType, 'deck-1', DEFAULT_DECK_CONFIG);

            expect(cards).toHaveLength(2);
            expect(cards[0]!.templateId).toBe('tpl-1');
            expect(cards[1]!.templateId).toBe('tpl-2');
        });

        it('uses initial state from algorithm', () => {
            const note = makeNote();
            const cards = generator.generateCardsForNote(note, basicNoteType, 'deck-1', DEFAULT_DECK_CONFIG);

            for (const card of cards) {
                expect(card.state).toBe('new');
                expect(card.easeFactor).toBe(2.5);
                expect(card.interval).toBe(0);
                expect(card.currentStep).toBe(0);
            }
            expect(algorithm.getInitialState).toHaveBeenCalledWith(DEFAULT_DECK_CONFIG);
        });

        it('sets correct noteId and deckId', () => {
            const note = makeNote({ id: 'my-note' });
            const cards = generator.generateCardsForNote(note, basicNoteType, 'my-deck', DEFAULT_DECK_CONFIG);

            for (const card of cards) {
                expect(card.noteId).toBe('my-note');
                expect(card.deckId).toBe('my-deck');
            }
        });

        it('returns empty array for note type with no templates', () => {
            const emptyType: NoteType = { ...basicNoteType, templates: [] };
            const cards = generator.generateCardsForNote(makeNote(), emptyType, 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards).toHaveLength(0);
        });
    });

    describe('generateCardsForNewTemplate', () => {
        it('creates one card per note', () => {
            const notes = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' }), makeNote({ id: 'n3' })];
            const template = { id: 'tpl-new' };

            const cards = generator.generateCardsForNewTemplate(template, notes, 'deck-1', DEFAULT_DECK_CONFIG);

            expect(cards).toHaveLength(3);
            expect(cards[0]!.noteId).toBe('n1');
            expect(cards[1]!.noteId).toBe('n2');
            expect(cards[2]!.noteId).toBe('n3');
            expect(cards.every((c) => c.templateId === 'tpl-new')).toBe(true);
        });

        it('returns empty array for no notes', () => {
            const cards = generator.generateCardsForNewTemplate({ id: 'tpl-new' }, [], 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards).toHaveLength(0);
        });
    });
});
