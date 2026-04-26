import type { NoteBase, NoteType, Field, FieldDef } from '../types/entities';
import type { DeckConfig } from '../types/config';
import type { CreateCardInput } from '../types/inputs';
import type { SRSAlgorithm } from './srs/srs-algorithm';
import { countClozeOrdinals } from './content-pipeline/cloze-transform';
import { countOcclusionMasks } from './content-pipeline/occlusion-transform';

export class CardGenerator {
    constructor(private readonly algorithm: SRSAlgorithm) {}

    generateCardsForNote(
        note: NoteBase,
        noteType: NoteType,
        deckId: string,
        config: DeckConfig,
    ): CreateCardInput[] {
        const initialState = this.algorithm.getInitialState(config);
        const ordinals = this.deriveOrdinals(note, noteType);

        const inputs: CreateCardInput[] = [];
        for (const template of noteType.templates) {
            for (const ordinal of ordinals) {
                inputs.push({
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
                    cardOrdinal: ordinal,
                });
            }
        }
        return inputs;
    }

    generateCardsForNewTemplate(
        template: { id: string },
        notes: NoteBase[],
        noteType: NoteType,
        deckId: string,
        config: DeckConfig,
    ): CreateCardInput[] {
        const initialState = this.algorithm.getInitialState(config);

        const inputs: CreateCardInput[] = [];
        for (const note of notes) {
            const ordinals = this.deriveOrdinals(note, noteType);
            for (const ordinal of ordinals) {
                inputs.push({
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
                    cardOrdinal: ordinal,
                });
            }
        }
        return inputs;
    }

    getTemplateIdForDeletion(templateId: string): string {
        return templateId;
    }

    /**
     * Determines how many cards a single (note, template) pair should produce
     * and which ordinals to assign.
     *
     * - Plain notes:               [1]
     * - Cloze notes:               one entry per distinct cN in the cloze field
     * - Image-occlusion notes:     one entry per mask in the occlusion field
     */
    private deriveOrdinals(note: NoteBase, noteType: NoteType): number[] {
        const clozeField = pickFieldByType(noteType.fields, note.fields, 'cloze');
        if (clozeField) {
            const ords = countClozeOrdinals(clozeField.value);
            return ords.length > 0 ? ords : [1];
        }

        const occlusionField = pickFieldByType(noteType.fields, note.fields, 'occlusion');
        if (occlusionField) {
            const count = countOcclusionMasks(occlusionField.value);
            if (count > 0) return Array.from({ length: count }, (_, i) => i + 1);
            return [1];
        }

        return [1];
    }
}

function pickFieldByType(
    fieldDefs: FieldDef[],
    fields: Field[],
    type: 'cloze' | 'occlusion',
): Field | undefined {
    const def = fieldDefs.find((d) => d.type === type);
    if (!def) return undefined;
    return fields.find((f) => f.name === def.name);
}
