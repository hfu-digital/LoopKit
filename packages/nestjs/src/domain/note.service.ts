import type { LoopKitStorage } from '../interfaces/storage';
import type { NoteBase } from '../types/entities';
import type { CreateNoteInput, UpdateNoteInput } from '../types/inputs';
import { CardGenerator } from './card-generator';
import { DeckService } from './deck.service';
import { validateNote } from '../dto/validation';

export class NoteService {
    constructor(
        private readonly storage: LoopKitStorage,
        private readonly cardGenerator: CardGenerator,
        private readonly deckService: DeckService,
    ) {}

    async createNote(input: CreateNoteInput, deckId: string): Promise<NoteBase> {
        const noteType = await this.storage.getNoteType(input.noteTypeId);
        validateNote(input, noteType);

        const note = await this.storage.createNote(input);
        const config = await this.deckService.getEffectiveConfig(deckId);
        const cardInputs = this.cardGenerator.generateCardsForNote(note, noteType, deckId, config);

        if (cardInputs.length > 0) {
            await this.storage.createManyCards(cardInputs);
        }

        return note;
    }

    async updateNote(id: string, input: UpdateNoteInput): Promise<NoteBase> {
        const updated = await this.storage.updateNote(id, input);

        // For Cloze and Image-Occlusion notes, the set of cards depends on
        // field content. After a field update, reconcile: add cards for new
        // ordinals; remove cards for ordinals no longer present.
        if (input.fields !== undefined) {
            await this.reconcileGeneratedCards(updated);
        }

        return updated;
    }

    private async reconcileGeneratedCards(note: NoteBase): Promise<void> {
        const noteType = await this.storage.getNoteType(note.noteTypeId);
        const hasGenerated = noteType.fields.some(
            (f) => f.type === 'cloze' || f.type === 'occlusion',
        );
        if (!hasGenerated) return;

        // Find every deck that currently holds cards for this note
        const allDecks = await this.storage.findDecks();
        const deckCardMap = new Map<string, { id: string; templateId: string; cardOrdinal: number }[]>();
        for (const deck of allDecks) {
            const deckCards = await this.storage.findCards(deck.id);
            const noteCards = deckCards.filter((c) => c.noteId === note.id);
            if (noteCards.length > 0) {
                deckCardMap.set(deck.id, noteCards.map((c) => ({
                    id: c.id,
                    templateId: c.templateId,
                    cardOrdinal: c.cardOrdinal,
                })));
            }
        }

        for (const [deckId, existing] of deckCardMap.entries()) {
            const config = await this.deckService.getEffectiveConfig(deckId);
            const desired = this.cardGenerator.generateCardsForNote(
                note,
                noteType,
                deckId,
                config,
            );

            const desiredKey = (t: string, o: number) => `${t}::${o}`;
            const desiredKeys = new Set(desired.map((d) => desiredKey(d.templateId, d.cardOrdinal ?? 1)));
            const existingKeys = new Set(existing.map((e) => desiredKey(e.templateId, e.cardOrdinal)));

            // Add missing
            const toAdd = desired.filter(
                (d) => !existingKeys.has(desiredKey(d.templateId, d.cardOrdinal ?? 1)),
            );
            if (toAdd.length > 0) {
                await this.storage.createManyCards(toAdd);
            }

            // Remove orphans
            const toRemove = existing.filter(
                (e) => !desiredKeys.has(desiredKey(e.templateId, e.cardOrdinal)),
            );
            for (const card of toRemove) {
                await this.storage.deleteCard(card.id);
            }
        }
    }

    async deleteNote(id: string): Promise<void> {
        await this.storage.deleteCardsByNote(id);
        await this.storage.deleteNote(id);
    }

    async moveNoteToDeck(noteId: string, newDeckId: string): Promise<void> {
        const cards = await this.storage.findCards(newDeckId);
        const noteCards = cards.filter((c) => c.noteId === noteId);

        // Update all cards for this note to the new deck
        if (noteCards.length > 0) {
            await this.storage.updateManyCards(
                noteCards.map((c) => c.id),
                { deckId: newDeckId },
            );
        }
    }
}
