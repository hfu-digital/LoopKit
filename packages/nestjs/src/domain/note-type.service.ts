import type { LoopKitStorage } from '../interfaces/storage';
import type { NoteType, TemplateDef } from '../types/entities';
import type { CreateNoteTypeInput, UpdateNoteTypeInput } from '../types/inputs';
import { CardGenerator } from './card-generator';
import { DeckService } from './deck.service';

export class NoteTypeService {
    constructor(
        private readonly storage: LoopKitStorage,
        private readonly cardGenerator: CardGenerator,
        private readonly deckService: DeckService,
    ) {}

    async createNoteType(input: CreateNoteTypeInput): Promise<NoteType> {
        return this.storage.createNoteType(input);
    }

    async updateNoteType(id: string, input: UpdateNoteTypeInput): Promise<NoteType> {
        return this.storage.updateNoteType(id, input);
    }

    async addTemplate(noteTypeId: string, template: TemplateDef): Promise<NoteType> {
        const noteType = await this.storage.getNoteType(noteTypeId);
        const updated = await this.storage.updateNoteType(noteTypeId, {
            ...noteType,
            fields: noteType.fields,
        });

        // Retroactively generate cards for all existing notes of this type
        const notes = await this.storage.findNotes({ noteTypeId });
        if (notes.length > 0) {
            // Get all decks to find where cards exist
            const decks = await this.storage.findDecks();
            for (const deck of decks) {
                const config = await this.deckService.getEffectiveConfig(deck.id);
                const cardInputs = this.cardGenerator.generateCardsForNewTemplate(
                    template,
                    notes,
                    deck.id,
                    config,
                );
                if (cardInputs.length > 0) {
                    await this.storage.createManyCards(cardInputs);
                }
            }
        }

        return updated;
    }

    async removeTemplate(noteTypeId: string, templateId: string): Promise<NoteType> {
        await this.storage.deleteCardsByTemplate(templateId);
        const noteType = await this.storage.getNoteType(noteTypeId);
        return noteType;
    }

    async seedDefaults(): Promise<void> {
        const existing = await this.storage.findNoteTypes();
        if (existing.some((t) => t.name === 'Basic')) return;

        await this.storage.createNoteType({
            name: 'Basic',
            fields: [
                { name: 'Front', ordinal: 0, type: 'text', required: true },
                { name: 'Back', ordinal: 1, type: 'text', required: true },
            ],
            templates: [
                {
                    id: 'basic-front-back',
                    name: 'Card 1',
                    front: '{{Front}}',
                    back: '{{FrontSide}}<hr id="answer">{{Back}}',
                },
            ],
        });

        await this.storage.createNoteType({
            name: 'Basic + Reverse',
            fields: [
                { name: 'Front', ordinal: 0, type: 'text', required: true },
                { name: 'Back', ordinal: 1, type: 'text', required: true },
            ],
            templates: [
                {
                    id: 'basic-reverse-1',
                    name: 'Card 1',
                    front: '{{Front}}',
                    back: '{{FrontSide}}<hr id="answer">{{Back}}',
                },
                {
                    id: 'basic-reverse-2',
                    name: 'Card 2',
                    front: '{{Back}}',
                    back: '{{FrontSide}}<hr id="answer">{{Front}}',
                },
            ],
        });
    }
}
