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
        return this.storage.updateNote(id, input);
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
