import type { LoopKitStorage } from '../interfaces/storage';
import type { LoopKitExportData, FieldMapping, ImportResult } from '../types/inputs';
import type { NoteBase, CardBase, DeckBase, NoteType, DeckPreset } from '../types/entities';

export class ImportExportService {
    constructor(private readonly storage: LoopKitStorage) {}

    async importCSV(
        csv: string,
        mapping: FieldMapping,
        deckId: string,
        noteTypeId: string,
        tags?: string[],
    ): Promise<ImportResult> {
        // Dynamic import of papaparse
        const Papa = await import('papaparse');
        const parsed = Papa.parse<Record<string, string>>(csv, {
            header: true,
            skipEmptyLines: true,
        });

        const errors: string[] = [];
        let notesCreated = 0;
        let cardsCreated = 0;

        const noteType = await this.storage.getNoteType(noteTypeId);

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i]!;
            try {
                const fields = Object.entries(mapping).map(([csvCol, fieldName], ordinal) => ({
                    name: fieldName,
                    value: row[csvCol] ?? '',
                    ordinal,
                }));

                const note = await this.storage.createNote({
                    noteTypeId,
                    fields,
                    tags,
                });
                notesCreated++;

                // Generate cards for each template
                for (const template of noteType.templates) {
                    await this.storage.createCard({
                        noteId: note.id,
                        templateId: template.id,
                        deckId,
                    });
                    cardsCreated++;
                }
            } catch (e) {
                errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        return { notesCreated, cardsCreated, errors };
    }

    async exportCSV(deckId: string): Promise<string> {
        const Papa = await import('papaparse');
        const cards = await this.storage.findCards(deckId);
        const notes = new Map<string, NoteBase>();

        for (const card of cards) {
            if (!notes.has(card.noteId)) {
                const note = await this.storage.getNote(card.noteId);
                notes.set(card.noteId, note);
            }
        }

        const rows: Record<string, string>[] = [];
        for (const note of notes.values()) {
            const row: Record<string, string> = {};
            for (const field of note.fields) {
                row[field.name] = field.value;
            }
            row['tags'] = note.tags.join(', ');
            rows.push(row);
        }

        return Papa.unparse(rows);
    }

    async importJSON(data: LoopKitExportData): Promise<ImportResult> {
        const errors: string[] = [];
        let notesCreated = 0;
        let cardsCreated = 0;

        // Import presets
        for (const preset of data.presets) {
            try {
                await this.storage.createPreset({ id: preset.id, name: preset.name, config: preset.config });
            } catch (e) {
                errors.push(`Preset '${preset.name}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Import note types
        for (const nt of data.noteTypes) {
            try {
                await this.storage.createNoteType({
                    id: nt.id,
                    name: nt.name,
                    fields: nt.fields,
                    templates: nt.templates,
                });
            } catch (e) {
                errors.push(`NoteType '${nt.name}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Import decks
        for (const deck of data.decks) {
            try {
                await this.storage.createDeck({
                    id: deck.id,
                    name: deck.name,
                    description: deck.description,
                    parentDeckId: deck.parentDeckId,
                    presetId: deck.presetId,
                    configOverrides: deck.configOverrides,
                });
            } catch (e) {
                errors.push(`Deck '${deck.name}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Import notes
        for (const note of data.notes) {
            try {
                await this.storage.createNote({
                    id: note.id,
                    noteTypeId: note.noteTypeId,
                    fields: note.fields,
                    tags: note.tags,
                });
                notesCreated++;
            } catch (e) {
                errors.push(`Note '${note.id}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Import cards
        for (const card of data.cards) {
            try {
                await this.storage.createCard({
                    noteId: card.noteId,
                    templateId: card.templateId,
                    deckId: card.deckId,
                    state: card.state,
                    easeFactor: card.easeFactor,
                    interval: card.interval,
                    dueDate: card.dueDate,
                    currentStep: card.currentStep,
                    lapseCount: card.lapseCount,
                    reviewCount: card.reviewCount,
                });
                cardsCreated++;
            } catch (e) {
                errors.push(`Card '${card.id}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Import review logs
        if (data.reviewLogs) {
            for (const log of data.reviewLogs) {
                try {
                    await this.storage.createReviewLog({
                        id: log.id,
                        cardId: log.cardId,
                        deckId: log.deckId,
                        grade: log.grade,
                        prevState: log.prevState,
                        newState: log.newState,
                        timeTakenMs: log.timeTakenMs,
                    });
                } catch (e) {
                    errors.push(`ReviewLog '${log.id}': ${e instanceof Error ? e.message : String(e)}`);
                }
            }
        }

        return { notesCreated, cardsCreated, errors };
    }

    async exportJSON(deckId: string, includeReviewLogs = false): Promise<LoopKitExportData> {
        const deck = await this.storage.getDeck(deckId);
        const descendantIds = await this.storage.getDescendantDeckIds(deckId);
        const allDeckIds = [deckId, ...descendantIds];

        const decks: DeckBase[] = [deck];
        for (const id of descendantIds) {
            decks.push(await this.storage.getDeck(id));
        }

        const cards: CardBase[] = [];
        const noteIds = new Set<string>();
        const noteTypeIds = new Set<string>();

        for (const dId of allDeckIds) {
            const deckCards = await this.storage.findCards(dId);
            cards.push(...deckCards);
            for (const c of deckCards) {
                noteIds.add(c.noteId);
            }
        }

        const notes: NoteBase[] = [];
        for (const nId of noteIds) {
            const note = await this.storage.getNote(nId);
            notes.push(note);
            noteTypeIds.add(note.noteTypeId);
        }

        const noteTypes: NoteType[] = [];
        for (const ntId of noteTypeIds) {
            noteTypes.push(await this.storage.getNoteType(ntId));
        }

        const presets: DeckPreset[] = await this.storage.findPresets();

        const data: LoopKitExportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            decks,
            noteTypes,
            notes,
            cards,
            presets,
        };

        if (includeReviewLogs) {
            const allLogs: import('../types/entities').ReviewLog[] = [];
            for (const dId of allDeckIds) {
                const logs = await this.storage.findReviewLogs({ deckId: dId });
                allLogs.push(...logs);
            }
            data.reviewLogs = allLogs;
        }

        return data;
    }
}
