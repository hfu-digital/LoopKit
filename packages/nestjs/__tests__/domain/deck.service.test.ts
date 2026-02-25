import { describe, it, expect, beforeEach } from 'vitest';
import { DeckService } from '../../src/domain/deck.service';
import { createMockStorage } from '../helpers/mock-storage';
import type { LoopKitStorage } from '../../src/interfaces/storage';
import type { DeckBase, DeckPreset } from '../../src/types/entities';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';

const now = new Date('2026-01-15T12:00:00Z');

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

describe('DeckService', () => {
    let storage: ReturnType<typeof createMockStorage>;
    let service: DeckService;

    beforeEach(() => {
        storage = createMockStorage();
        service = new DeckService(storage as unknown as LoopKitStorage);
    });

    describe('createDeck', () => {
        it('delegates to storage', async () => {
            const deck = makeDeck();
            storage.createDeck.mockResolvedValue(deck);

            const result = await service.createDeck({ name: 'Test Deck' });

            expect(storage.createDeck).toHaveBeenCalledWith({ name: 'Test Deck' });
            expect(result).toEqual(deck);
        });
    });

    describe('getDeck', () => {
        it('retrieves a deck by id', async () => {
            const deck = makeDeck();
            storage.getDeck.mockResolvedValue(deck);

            const result = await service.getDeck('deck-1');
            expect(result).toEqual(deck);
        });
    });

    describe('updateDeck', () => {
        it('delegates update to storage', async () => {
            const updated = makeDeck({ name: 'Renamed' });
            storage.updateDeck.mockResolvedValue(updated);

            const result = await service.updateDeck('deck-1', { name: 'Renamed' });
            expect(result.name).toBe('Renamed');
        });
    });

    describe('deleteDeck', () => {
        it('deletes deck without deleting cards', async () => {
            await service.deleteDeck('deck-1', false);

            expect(storage.deleteDeck).toHaveBeenCalledWith('deck-1');
            expect(storage.findCards).not.toHaveBeenCalled();
        });

        it('cascades card and descendant deletion when deleteCards=true', async () => {
            storage.getDescendantDeckIds.mockResolvedValue(['child-1']);
            storage.findCards
                .mockResolvedValueOnce([{ id: 'card-a', noteId: 'n', templateId: 't', deckId: 'deck-1' }])
                .mockResolvedValueOnce([{ id: 'card-b', noteId: 'n', templateId: 't', deckId: 'child-1' }]);

            await service.deleteDeck('deck-1', true);

            // Deletes cards from both deck-1 and child-1
            expect(storage.deleteCard).toHaveBeenCalledWith('card-a');
            expect(storage.deleteCard).toHaveBeenCalledWith('card-b');
            // Deletes child deck, then parent
            expect(storage.deleteDeck).toHaveBeenCalledWith('child-1');
            expect(storage.deleteDeck).toHaveBeenCalledWith('deck-1');
        });
    });

    describe('moveDeck', () => {
        it('updates parentDeckId', async () => {
            await service.moveDeck('deck-1', 'new-parent');

            expect(storage.updateDeck).toHaveBeenCalledWith('deck-1', { parentDeckId: 'new-parent' });
        });

        it('moves to root when null', async () => {
            await service.moveDeck('deck-1', null);

            expect(storage.updateDeck).toHaveBeenCalledWith('deck-1', { parentDeckId: null });
        });
    });

    describe('getDeckTree', () => {
        it('builds a tree from flat decks', async () => {
            const parent = makeDeck({ id: 'parent', name: 'Parent', parentDeckId: null });
            const child = makeDeck({ id: 'child', name: 'Child', parentDeckId: 'parent' });

            storage.findDecks.mockResolvedValue([parent, child]);
            storage.getDescendantDeckIds
                .mockResolvedValueOnce(['child']) // for parent
                .mockResolvedValueOnce([]); // for child
            storage.countByState.mockResolvedValue({
                new: 5, learning: 2, review: 3, relearning: 0, total: 10,
            });

            const tree = await service.getDeckTree();

            expect(tree).toHaveLength(1);
            expect(tree[0]!.name).toBe('Parent');
            expect(tree[0]!.children).toHaveLength(1);
            expect(tree[0]!.children[0]!.name).toBe('Child');
        });
    });

    describe('getEffectiveConfig', () => {
        it('returns defaults when no preset or overrides', async () => {
            storage.getDeck.mockResolvedValue(makeDeck());

            const config = await service.getEffectiveConfig('deck-1');

            expect(config.newCardsPerDay).toBe(DEFAULT_DECK_CONFIG.newCardsPerDay);
        });

        it('merges preset config', async () => {
            const preset: DeckPreset = {
                id: 'preset-1',
                name: 'Custom',
                config: { ...DEFAULT_DECK_CONFIG, newCardsPerDay: 50 },
                createdAt: now,
                updatedAt: now,
            };
            storage.getDeck.mockResolvedValue(makeDeck({ presetId: 'preset-1' }));
            storage.getPreset.mockResolvedValue(preset);

            const config = await service.getEffectiveConfig('deck-1');

            expect(config.newCardsPerDay).toBe(50);
        });

        it('applies config overrides on top of preset', async () => {
            const preset: DeckPreset = {
                id: 'preset-1',
                name: 'Custom',
                config: { ...DEFAULT_DECK_CONFIG, newCardsPerDay: 50 },
                createdAt: now,
                updatedAt: now,
            };
            storage.getDeck.mockResolvedValue(
                makeDeck({ presetId: 'preset-1', configOverrides: { newCardsPerDay: 100 } }),
            );
            storage.getPreset.mockResolvedValue(preset);

            const config = await service.getEffectiveConfig('deck-1');

            expect(config.newCardsPerDay).toBe(100);
        });

        it('falls back to defaults if preset not found', async () => {
            storage.getDeck.mockResolvedValue(makeDeck({ presetId: 'missing' }));
            storage.getPreset.mockRejectedValue(new Error('not found'));

            const config = await service.getEffectiveConfig('deck-1');

            expect(config.newCardsPerDay).toBe(DEFAULT_DECK_CONFIG.newCardsPerDay);
        });

        it('validates the final config', async () => {
            storage.getDeck.mockResolvedValue(
                makeDeck({ configOverrides: { startingEaseFactor: 0.5 } }),
            );

            const config = await service.getEffectiveConfig('deck-1');

            expect(config.startingEaseFactor).toBe(1.3); // clamped
        });
    });
});
