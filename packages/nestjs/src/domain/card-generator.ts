import type { NoteBase, NoteType } from '../types/entities';
import type { DeckConfig } from '../types/config';
import type { CreateCardInput } from '../types/inputs';
import type { SRSAlgorithm } from './srs/srs-algorithm';

export class CardGenerator {
    constructor(private readonly algorithm: SRSAlgorithm) {}

    generateCardsForNote(
        note: NoteBase,
        noteType: NoteType,
        deckId: string,
        config: DeckConfig,
    ): CreateCardInput[] {
        const initialState = this.algorithm.getInitialState(config);

        return noteType.templates.map((template) => ({
            noteId: note.id,
            templateId: template.id,
            deckId,
            state: initialState.state,
            easeFactor: initialState.easeFactor,
            interval: initialState.interval,
            dueDate: initialState.dueDate,
            currentStep: initialState.currentStep,
            lapseCount: initialState.lapseCount,
            reviewCount: initialState.reviewCount,
        }));
    }

    generateCardsForNewTemplate(
        template: { id: string },
        notes: NoteBase[],
        deckId: string,
        config: DeckConfig,
    ): CreateCardInput[] {
        const initialState = this.algorithm.getInitialState(config);

        return notes.map((note) => ({
            noteId: note.id,
            templateId: template.id,
            deckId,
            state: initialState.state,
            easeFactor: initialState.easeFactor,
            interval: initialState.interval,
            dueDate: initialState.dueDate,
            currentStep: initialState.currentStep,
            lapseCount: initialState.lapseCount,
            reviewCount: initialState.reviewCount,
        }));
    }

    getTemplateIdForDeletion(templateId: string): string {
        return templateId;
    }
}
