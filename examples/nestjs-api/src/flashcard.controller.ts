import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import {
    ReviewSessionService,
    DeckService,
    NoteService,
    NoteTypeService,
    ImportExportService,
    LoopKitStorage,
    type Grade,
} from '@loopkit/nestjs';

@Controller()
export class FlashcardController {
    constructor(
        private readonly session: ReviewSessionService,
        private readonly deckService: DeckService,
        private readonly noteService: NoteService,
        private readonly noteTypeService: NoteTypeService,
        private readonly importExport: ImportExportService,
        private readonly storage: LoopKitStorage,
    ) {}

    // ─── Decks ───────────────────────────────────────────────────────

    @Get('decks')
    async getDecks() {
        return this.storage.findDecks();
    }

    @Get('decks/tree')
    async getDeckTree() {
        return this.deckService.getDeckTree();
    }

    @Get('decks/:id')
    async getDeck(@Param('id') id: string) {
        return this.deckService.getDeck(id);
    }

    @Get('decks/:id/counts')
    async getDeckCounts(@Param('id') id: string) {
        const descendantIds = await this.storage.getDescendantDeckIds(id);
        return this.storage.countByState([id, ...descendantIds]);
    }

    @Post('decks')
    async createDeck(@Body() body: { name: string; description?: string; parentDeckId?: string }) {
        return this.deckService.createDeck(body);
    }

    @Put('decks/:id')
    async updateDeck(@Param('id') id: string, @Body() body: any) {
        return this.deckService.updateDeck(id, body);
    }

    @Delete('decks/:id')
    async deleteDeck(@Param('id') id: string) {
        return this.deckService.deleteDeck(id, true);
    }

    // ─── Study Session ───────────────────────────────────────────────

    @Post('decks/:id/study')
    async startStudySession(@Param('id') deckId: string) {
        return this.session.buildQueue(deckId);
    }

    @Get('cards/:id/render')
    async renderCard(@Param('id') id: string) {
        const card = await this.storage.getCard(id);
        const note = await this.storage.getNote(card.noteId);
        const noteType = await this.storage.getNoteType(note.noteTypeId);
        const template = noteType.templates.find((t) => t.id === card.templateId);

        if (!template) {
            return { renderedContent: { front: '', back: '' }, nextIntervals: {} };
        }

        // Simple rendering without pipeline for the example
        const fields: Record<string, string> = {};
        for (const f of note.fields) {
            fields[f.name] = f.value;
        }

        let front = template.front;
        let back = template.back;
        for (const [name, value] of Object.entries(fields)) {
            front = front.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
            back = back.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
        }
        back = back.replace(/\{\{FrontSide\}\}/g, front);

        return {
            renderedContent: { front, back },
            nextIntervals: { again: '1m', hard: '6m', good: '10m', easy: '4d' },
        };
    }

    @Post('cards/:id/grade')
    async gradeCard(
        @Param('id') id: string,
        @Body() body: { grade: Grade; timeTakenMs: number },
    ) {
        return this.session.gradeCard(id, body.grade, body.timeTakenMs);
    }

    @Post('reviews/:id/undo')
    async undoReview(@Param('id') id: string) {
        await this.session.undoLastReview(id);
        return { success: true };
    }

    // ─── Notes ───────────────────────────────────────────────────────

    @Post('notes')
    async createNote(@Body() body: { noteTypeId: string; fields: any[]; deckId: string; tags?: string[] }) {
        return this.noteService.createNote(
            { noteTypeId: body.noteTypeId, fields: body.fields, tags: body.tags },
            body.deckId,
        );
    }

    @Put('notes/:id')
    async updateNote(@Param('id') id: string, @Body() body: any) {
        return this.noteService.updateNote(id, body);
    }

    @Delete('notes/:id')
    async deleteNote(@Param('id') id: string) {
        await this.noteService.deleteNote(id);
        return { success: true };
    }

    // ─── Note Types ──────────────────────────────────────────────────

    @Get('note-types')
    async getNoteTypes() {
        return this.storage.findNoteTypes();
    }

    @Post('note-types/seed')
    async seedNoteTypes() {
        await this.noteTypeService.seedDefaults();
        return { success: true };
    }

    // ─── Import/Export ───────────────────────────────────────────────

    @Post('import/csv')
    async importCSV(@Body() body: { csv: string; mapping: any; deckId: string; noteTypeId: string; tags?: string[] }) {
        return this.importExport.importCSV(body.csv, body.mapping, body.deckId, body.noteTypeId, body.tags);
    }

    @Post('import/json')
    async importJSON(@Body() body: any) {
        return this.importExport.importJSON(body);
    }

    @Get('decks/:id/export/json')
    async exportJSON(
        @Param('id') id: string,
        @Query('includeReviewLogs') includeReviewLogs?: string,
    ) {
        return this.importExport.exportJSON(id, includeReviewLogs === 'true');
    }

    @Get('decks/:id/export/csv')
    async exportCSV(@Param('id') id: string) {
        return this.importExport.exportCSV(id);
    }

    // ─── Tags ────────────────────────────────────────────────────────

    @Get('tags')
    async getTags() {
        const notes = await this.storage.findNotes();
        const tagSet = new Set<string>();
        for (const note of notes) {
            for (const tag of note.tags) {
                tagSet.add(tag);
            }
        }
        return [...tagSet].sort();
    }
}
