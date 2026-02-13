import type { LoopKitStorage } from '../interfaces/storage';
import type { DeckBase, DeckTreeNode } from '../types/entities';
import type { DeckConfig } from '../types/config';
import { DEFAULT_DECK_CONFIG } from '../types/config';
import type { CreateDeckInput, UpdateDeckInput } from '../types/inputs';
import { validateDeckConfig } from '../dto/validation';

export class DeckService {
    constructor(private readonly storage: LoopKitStorage) {}

    async createDeck(input: CreateDeckInput): Promise<DeckBase> {
        return this.storage.createDeck(input);
    }

    async getDeck(id: string): Promise<DeckBase> {
        return this.storage.getDeck(id);
    }

    async updateDeck(id: string, input: UpdateDeckInput): Promise<DeckBase> {
        return this.storage.updateDeck(id, input);
    }

    async deleteDeck(deckId: string, deleteCards: boolean): Promise<void> {
        if (deleteCards) {
            const descendantIds = await this.storage.getDescendantDeckIds(deckId);
            const allDeckIds = [deckId, ...descendantIds];

            for (const id of allDeckIds) {
                const cards = await this.storage.findCards(id);
                for (const card of cards) {
                    await this.storage.deleteCard(card.id);
                }
            }

            // Delete descendant decks bottom-up
            for (const id of descendantIds.reverse()) {
                await this.storage.deleteDeck(id);
            }
        }
        await this.storage.deleteDeck(deckId);
    }

    async moveDeck(deckId: string, newParentId: string | null): Promise<void> {
        await this.storage.updateDeck(deckId, { parentDeckId: newParentId });
    }

    async getDeckTree(): Promise<DeckTreeNode[]> {
        const allDecks = await this.storage.findDecks();
        const deckMap = new Map<string, DeckTreeNode>();

        // Initialize all nodes
        for (const deck of allDecks) {
            deckMap.set(deck.id, { ...deck, children: [] });
        }

        const roots: DeckTreeNode[] = [];

        // Build tree
        for (const deck of allDecks) {
            const node = deckMap.get(deck.id)!;
            if (deck.parentDeckId && deckMap.has(deck.parentDeckId)) {
                deckMap.get(deck.parentDeckId)!.children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Attach counts
        for (const [deckId, node] of deckMap) {
            const descendantIds = await this.storage.getDescendantDeckIds(deckId);
            node.counts = await this.storage.countByState([deckId, ...descendantIds]);
        }

        return roots;
    }

    async getEffectiveConfig(deckId: string): Promise<DeckConfig> {
        const deck = await this.storage.getDeck(deckId);
        let baseConfig = { ...DEFAULT_DECK_CONFIG };

        if (deck.presetId) {
            try {
                const preset = await this.storage.getPreset(deck.presetId);
                baseConfig = { ...preset.config };
            } catch {
                // Preset not found — use defaults
            }
        }

        if (deck.configOverrides) {
            Object.assign(baseConfig, deck.configOverrides);
        }

        return validateDeckConfig(baseConfig);
    }
}
