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

            const cards = generator.generateCardsForNewTemplate(
                template,
                notes,
                basicNoteType,
                'deck-1',
                DEFAULT_DECK_CONFIG,
            );

            expect(cards).toHaveLength(3);
            expect(cards[0]!.noteId).toBe('n1');
            expect(cards[1]!.noteId).toBe('n2');
            expect(cards[2]!.noteId).toBe('n3');
            expect(cards.every((c) => c.templateId === 'tpl-new')).toBe(true);
        });

        it('returns empty array for no notes', () => {
            const cards = generator.generateCardsForNewTemplate(
                { id: 'tpl-new' },
                [],
                basicNoteType,
                'deck-1',
                DEFAULT_DECK_CONFIG,
            );
            expect(cards).toHaveLength(0);
        });
    });

    describe('cloze + occlusion ordinals', () => {
        const clozeNoteType: NoteType = {
            id: 'nt-cloze',
            name: 'Cloze',
            fields: [{ name: 'Text', ordinal: 0, type: 'cloze', required: true }],
            templates: [{ id: 'cloze-tpl', name: 'Cloze', front: '{{cloze:Text}}', back: '{{cloze:Text}}' }],
            createdAt: now,
            updatedAt: now,
        };

        const occlusionNoteType: NoteType = {
            id: 'nt-occ',
            name: 'Image Occlusion',
            fields: [{ name: 'Occlusion', ordinal: 0, type: 'occlusion', required: true }],
            templates: [{ id: 'occ-tpl', name: 'Occlusion', front: '{{occlusion:Occlusion}}', back: '{{occlusion:Occlusion}}' }],
            createdAt: now,
            updatedAt: now,
        };

        it('generates one card per cloze ordinal', () => {
            const note = makeNote({
                noteTypeId: 'nt-cloze',
                fields: [{ name: 'Text', value: 'The {{c1::mitochondria}} is the {{c2::powerhouse}} of {{c3::the cell}}', ordinal: 0 }],
            });
            const cards = generator.generateCardsForNote(note, clozeNoteType, 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards).toHaveLength(3);
            expect(cards.map((c) => c.cardOrdinal)).toEqual([1, 2, 3]);
            expect(cards.every((c) => c.templateId === 'cloze-tpl')).toBe(true);
        });

        it('generates one card per occlusion mask', () => {
            const occlusion = JSON.stringify({
                mediaId: 'media-1',
                width: 800,
                height: 600,
                masks: [
                    { id: 'm1', shape: 'rect', x: 0, y: 0, width: 100, height: 50 },
                    { id: 'm2', shape: 'rect', x: 200, y: 200, width: 50, height: 50 },
                    { id: 'm3', shape: 'ellipse', cx: 400, cy: 300, rx: 30, ry: 20 },
                    { id: 'm4', shape: 'polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
                ],
            });
            const note = makeNote({
                noteTypeId: 'nt-occ',
                fields: [{ name: 'Occlusion', value: occlusion, ordinal: 0 }],
            });
            const cards = generator.generateCardsForNote(note, occlusionNoteType, 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards).toHaveLength(4);
            expect(cards.map((c) => c.cardOrdinal)).toEqual([1, 2, 3, 4]);
        });

        it('falls back to ordinal=1 when cloze field is empty', () => {
            const note = makeNote({
                noteTypeId: 'nt-cloze',
                fields: [{ name: 'Text', value: 'No clozes here', ordinal: 0 }],
            });
            const cards = generator.generateCardsForNote(note, clozeNoteType, 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards).toHaveLength(1);
            expect(cards[0]!.cardOrdinal).toBe(1);
        });

        it('plain notes get ordinal=1', () => {
            const cards = generator.generateCardsForNote(makeNote(), basicNoteType, 'deck-1', DEFAULT_DECK_CONFIG);
            expect(cards.every((c) => c.cardOrdinal === 1)).toBe(true);
        });
    });
});
