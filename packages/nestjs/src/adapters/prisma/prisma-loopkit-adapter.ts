import { LoopKitStorage } from '../../interfaces/storage';
import type { LoopKitPrismaClient } from './prisma-types';
import type {
    CardBase,
    NoteBase,
    NoteType,
    DeckBase,
    DeckPreset,
    ReviewLog,
    DeckCounts,
    Field,
    FieldDef,
    TemplateDef,
    CardStateSnapshot,
} from '../../types/entities';
import type {
    CreateCardInput,
    UpdateCardInput,
    CreateNoteInput,
    UpdateNoteInput,
    NoteFilters,
    CreateDeckInput,
    UpdateDeckInput,
    DeckFilters,
    CreatePresetInput,
    UpdatePresetInput,
    CreateNoteTypeInput,
    UpdateNoteTypeInput,
    CreateReviewLogInput,
    ReviewLogFilters,
} from '../../types/inputs';
import {
    EntityNotFoundError,
    DuplicateEntityError,
    ConcurrencyConflictError,
    StorageConnectionError,
} from '../../errors/errors';

function mapPrismaError(error: unknown, entity: string, id?: string): never {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;
        const cause = error instanceof Error ? error : undefined;
        if (code === 'P2002') {
            throw new DuplicateEntityError(entity, id ?? 'unknown', cause);
        }
        if (code === 'P2025') {
            throw new EntityNotFoundError(entity, id ?? 'unknown', cause);
        }
        if (code === 'P2034') {
            throw new ConcurrencyConflictError('Transaction conflict', cause);
        }
    }
    if (error instanceof Error && error.message.includes('connect')) {
        throw new StorageConnectionError(error.message, error);
    }
    throw error;
}

function generateId(): string {
    return crypto.randomUUID();
}

function parseJsonField<T>(value: unknown): T {
    if (typeof value === 'string') return JSON.parse(value) as T;
    return value as T;
}

function mapCard(raw: any): CardBase {
    return {
        id: raw.id,
        noteId: raw.noteId,
        templateId: raw.templateId,
        deckId: raw.deckId,
        state: raw.state,
        easeFactor: raw.easeFactor,
        interval: raw.interval,
        dueDate: new Date(raw.dueDate),
        currentStep: raw.currentStep,
        lapseCount: raw.lapseCount,
        reviewCount: raw.reviewCount,
        cardOrdinal: raw.cardOrdinal ?? 1,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function mapNote(raw: any): NoteBase {
    return {
        id: raw.id,
        noteTypeId: raw.noteTypeId,
        fields: parseJsonField<Field[]>(raw.fields),
        tags: parseJsonField<string[]>(raw.tags),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function mapNoteType(raw: any): NoteType {
    return {
        id: raw.id,
        name: raw.name,
        fields: parseJsonField<FieldDef[]>(raw.fields),
        templates: parseJsonField<TemplateDef[]>(raw.templates),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function mapDeck(raw: any): DeckBase {
    return {
        id: raw.id,
        name: raw.name,
        description: raw.description ?? undefined,
        parentDeckId: raw.parentDeckId ?? null,
        presetId: raw.presetId ?? null,
        configOverrides: raw.configOverrides
            ? parseJsonField(raw.configOverrides)
            : undefined,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function mapPreset(raw: any): DeckPreset {
    return {
        id: raw.id,
        name: raw.name,
        config: parseJsonField(raw.config),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function mapReviewLog(raw: any): ReviewLog {
    return {
        id: raw.id,
        cardId: raw.cardId,
        deckId: raw.deckId,
        grade: raw.grade,
        prevState: parseJsonField<CardStateSnapshot>(raw.prevState),
        newState: parseJsonField<CardStateSnapshot>(raw.newState),
        reviewedAt: new Date(raw.reviewedAt),
        timeTakenMs: raw.timeTakenMs,
    };
}

export class PrismaLoopKitAdapter extends LoopKitStorage {
    constructor(private readonly prisma: LoopKitPrismaClient) {
        super();
    }

    // ─── Card Operations ─────────────────────────────────────────────

    async createCard(input: CreateCardInput): Promise<CardBase> {
        try {
            const raw = await this.prisma.loopKitCard.create({
                data: {
                    id: generateId(),
                    noteId: input.noteId,
                    templateId: input.templateId,
                    deckId: input.deckId,
                    state: input.state ?? 'new',
                    easeFactor: input.easeFactor ?? 2.5,
                    interval: input.interval ?? 0,
                    dueDate: input.dueDate ?? new Date(),
                    currentStep: input.currentStep ?? 0,
                    lapseCount: input.lapseCount ?? 0,
                    reviewCount: input.reviewCount ?? 0,
                    cardOrdinal: input.cardOrdinal ?? 1,
                },
            });
            return mapCard(raw);
        } catch (e) {
            mapPrismaError(e, 'Card');
        }
    }

    async createManyCards(inputs: CreateCardInput[]): Promise<number> {
        try {
            const result = await this.prisma.loopKitCard.createMany({
                data: inputs.map((input) => ({
                    id: generateId(),
                    noteId: input.noteId,
                    templateId: input.templateId,
                    deckId: input.deckId,
                    state: input.state ?? 'new',
                    easeFactor: input.easeFactor ?? 2.5,
                    interval: input.interval ?? 0,
                    dueDate: input.dueDate ?? new Date(),
                    currentStep: input.currentStep ?? 0,
                    lapseCount: input.lapseCount ?? 0,
                    reviewCount: input.reviewCount ?? 0,
                    cardOrdinal: input.cardOrdinal ?? 1,
                })),
            });
            return result.count;
        } catch (e) {
            mapPrismaError(e, 'Card');
        }
    }

    async getCard(id: string): Promise<CardBase> {
        try {
            const raw = await this.prisma.loopKitCard.findUnique({ where: { id } });
            if (!raw) throw new EntityNotFoundError('Card', id);
            return mapCard(raw);
        } catch (e) {
            if (e instanceof EntityNotFoundError) throw e;
            mapPrismaError(e, 'Card', id);
        }
    }

    async findCards(deckId: string, filters?: { state?: string }): Promise<CardBase[]> {
        const where: any = { deckId };
        if (filters?.state) where.state = filters.state;
        const raw = await this.prisma.loopKitCard.findMany({ where });
        return raw.map(mapCard);
    }

    async updateCard(id: string, input: UpdateCardInput): Promise<CardBase> {
        try {
            const raw = await this.prisma.loopKitCard.update({
                where: { id },
                data: input,
            });
            return mapCard(raw);
        } catch (e) {
            mapPrismaError(e, 'Card', id);
        }
    }

    async updateManyCards(ids: string[], input: UpdateCardInput): Promise<number> {
        const result = await this.prisma.loopKitCard.updateMany({
            where: { id: { in: ids } },
            data: input,
        });
        return result.count;
    }

    async deleteCard(id: string): Promise<void> {
        try {
            await this.prisma.loopKitCard.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'Card', id);
        }
    }

    async deleteCardsByNote(noteId: string): Promise<number> {
        const result = await this.prisma.loopKitCard.deleteMany({
            where: { noteId },
        });
        return result.count;
    }

    async deleteCardsByTemplate(templateId: string): Promise<number> {
        const result = await this.prisma.loopKitCard.deleteMany({
            where: { templateId },
        });
        return result.count;
    }

    async findDueCards(deckIds: string[], now: Date, limit?: number): Promise<CardBase[]> {
        const raw = await this.prisma.loopKitCard.findMany({
            where: {
                deckId: { in: deckIds },
                state: 'review',
                dueDate: { lte: now },
            },
            orderBy: { dueDate: 'asc' },
            take: limit,
        });
        return raw.map(mapCard);
    }

    async findNewCards(deckIds: string[], limit?: number): Promise<CardBase[]> {
        const raw = await this.prisma.loopKitCard.findMany({
            where: {
                deckId: { in: deckIds },
                state: 'new',
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
        return raw.map(mapCard);
    }

    async findLearningCards(deckIds: string[], _now: Date): Promise<CardBase[]> {
        const raw = await this.prisma.loopKitCard.findMany({
            where: {
                deckId: { in: deckIds },
                state: { in: ['learning', 'relearning'] },
            },
            orderBy: { dueDate: 'asc' },
        });
        return raw.map(mapCard);
    }

    async countByState(deckIds: string[]): Promise<DeckCounts> {
        const [newCount, learningCount, reviewCount, relearningCount] = await Promise.all([
            this.prisma.loopKitCard.count({ where: { deckId: { in: deckIds }, state: 'new' } }),
            this.prisma.loopKitCard.count({ where: { deckId: { in: deckIds }, state: 'learning' } }),
            this.prisma.loopKitCard.count({ where: { deckId: { in: deckIds }, state: 'review' } }),
            this.prisma.loopKitCard.count({ where: { deckId: { in: deckIds }, state: 'relearning' } }),
        ]);

        return {
            new: newCount,
            learning: learningCount,
            review: reviewCount,
            relearning: relearningCount,
            total: newCount + learningCount + reviewCount + relearningCount,
        };
    }

    // ─── Note Operations ─────────────────────────────────────────────

    async createNote(input: CreateNoteInput & { id?: string }): Promise<NoteBase> {
        try {
            const raw = await this.prisma.loopKitNote.create({
                data: {
                    id: input.id ?? generateId(),
                    noteTypeId: input.noteTypeId,
                    fields: JSON.stringify(input.fields),
                    tags: JSON.stringify(input.tags ?? []),
                },
            });
            return mapNote(raw);
        } catch (e) {
            mapPrismaError(e, 'Note');
        }
    }

    async getNote(id: string): Promise<NoteBase> {
        const raw = await this.prisma.loopKitNote.findUnique({ where: { id } });
        if (!raw) throw new EntityNotFoundError('Note', id);
        return mapNote(raw);
    }

    async findNotes(filters?: NoteFilters): Promise<NoteBase[]> {
        const where: any = {};
        if (filters?.noteTypeId) where.noteTypeId = filters.noteTypeId;
        const raw = await this.prisma.loopKitNote.findMany({ where });
        let notes = raw.map(mapNote);

        if (filters?.tags?.length) {
            notes = notes.filter((n) =>
                filters.tags!.some((t) => n.tags.includes(t)),
            );
        }

        return notes;
    }

    async updateNote(id: string, input: UpdateNoteInput): Promise<NoteBase> {
        try {
            const data: any = {};
            if (input.fields) data.fields = JSON.stringify(input.fields);
            if (input.tags) data.tags = JSON.stringify(input.tags);
            const raw = await this.prisma.loopKitNote.update({ where: { id }, data });
            return mapNote(raw);
        } catch (e) {
            mapPrismaError(e, 'Note', id);
        }
    }

    async deleteNote(id: string): Promise<void> {
        try {
            await this.prisma.loopKitNote.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'Note', id);
        }
    }

    // ─── Deck Operations ─────────────────────────────────────────────

    async createDeck(input: CreateDeckInput & { id?: string }): Promise<DeckBase> {
        try {
            const raw = await this.prisma.loopKitDeck.create({
                data: {
                    id: input.id ?? generateId(),
                    name: input.name,
                    description: input.description ?? null,
                    parentDeckId: input.parentDeckId ?? null,
                    presetId: input.presetId ?? null,
                    configOverrides: input.configOverrides
                        ? JSON.stringify(input.configOverrides)
                        : null,
                },
            });
            return mapDeck(raw);
        } catch (e) {
            mapPrismaError(e, 'Deck');
        }
    }

    async getDeck(id: string): Promise<DeckBase> {
        const raw = await this.prisma.loopKitDeck.findUnique({ where: { id } });
        if (!raw) throw new EntityNotFoundError('Deck', id);
        return mapDeck(raw);
    }

    async findDecks(filters?: DeckFilters): Promise<DeckBase[]> {
        const where: any = {};
        if (filters?.parentDeckId !== undefined) where.parentDeckId = filters.parentDeckId;
        if (filters?.search) where.name = { contains: filters.search };
        const raw = await this.prisma.loopKitDeck.findMany({ where });
        return raw.map(mapDeck);
    }

    async updateDeck(id: string, input: UpdateDeckInput): Promise<DeckBase> {
        try {
            const data: any = {};
            if (input.name !== undefined) data.name = input.name;
            if (input.description !== undefined) data.description = input.description;
            if (input.parentDeckId !== undefined) data.parentDeckId = input.parentDeckId;
            if (input.presetId !== undefined) data.presetId = input.presetId;
            if (input.configOverrides !== undefined) {
                data.configOverrides = input.configOverrides
                    ? JSON.stringify(input.configOverrides)
                    : null;
            }
            const raw = await this.prisma.loopKitDeck.update({ where: { id }, data });
            return mapDeck(raw);
        } catch (e) {
            mapPrismaError(e, 'Deck', id);
        }
    }

    async deleteDeck(id: string): Promise<void> {
        try {
            await this.prisma.loopKitDeck.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'Deck', id);
        }
    }

    async getDescendantDeckIds(deckId: string): Promise<string[]> {
        const result: string[] = [];
        const children = await this.prisma.loopKitDeck.findMany({
            where: { parentDeckId: deckId },
        });
        for (const child of children) {
            result.push(child.id);
            const grandchildren = await this.getDescendantDeckIds(child.id);
            result.push(...grandchildren);
        }
        return result;
    }

    // ─── Preset Operations ───────────────────────────────────────────

    async createPreset(input: CreatePresetInput & { id?: string }): Promise<DeckPreset> {
        try {
            const raw = await this.prisma.loopKitDeckPreset.create({
                data: {
                    id: input.id ?? generateId(),
                    name: input.name,
                    config: JSON.stringify(input.config),
                },
            });
            return mapPreset(raw);
        } catch (e) {
            mapPrismaError(e, 'DeckPreset');
        }
    }

    async getPreset(id: string): Promise<DeckPreset> {
        const raw = await this.prisma.loopKitDeckPreset.findUnique({ where: { id } });
        if (!raw) throw new EntityNotFoundError('DeckPreset', id);
        return mapPreset(raw);
    }

    async findPresets(): Promise<DeckPreset[]> {
        const raw = await this.prisma.loopKitDeckPreset.findMany({});
        return raw.map(mapPreset);
    }

    async updatePreset(id: string, input: UpdatePresetInput): Promise<DeckPreset> {
        try {
            const data: any = {};
            if (input.name !== undefined) data.name = input.name;
            if (input.config) data.config = JSON.stringify(input.config);
            const raw = await this.prisma.loopKitDeckPreset.update({ where: { id }, data });
            return mapPreset(raw);
        } catch (e) {
            mapPrismaError(e, 'DeckPreset', id);
        }
    }

    async deletePreset(id: string): Promise<void> {
        try {
            await this.prisma.loopKitDeckPreset.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'DeckPreset', id);
        }
    }

    // ─── NoteType Operations ─────────────────────────────────────────

    async createNoteType(input: CreateNoteTypeInput & { id?: string }): Promise<NoteType> {
        try {
            const raw = await this.prisma.loopKitNoteType.create({
                data: {
                    id: input.id ?? generateId(),
                    name: input.name,
                    fields: JSON.stringify(input.fields),
                    templates: JSON.stringify(input.templates),
                },
            });
            return mapNoteType(raw);
        } catch (e) {
            mapPrismaError(e, 'NoteType');
        }
    }

    async getNoteType(id: string): Promise<NoteType> {
        const raw = await this.prisma.loopKitNoteType.findUnique({ where: { id } });
        if (!raw) throw new EntityNotFoundError('NoteType', id);
        return mapNoteType(raw);
    }

    async findNoteTypes(): Promise<NoteType[]> {
        const raw = await this.prisma.loopKitNoteType.findMany({});
        return raw.map(mapNoteType);
    }

    async updateNoteType(id: string, input: UpdateNoteTypeInput): Promise<NoteType> {
        try {
            const data: any = {};
            if (input.name !== undefined) data.name = input.name;
            if (input.fields) data.fields = JSON.stringify(input.fields);
            const raw = await this.prisma.loopKitNoteType.update({ where: { id }, data });
            return mapNoteType(raw);
        } catch (e) {
            mapPrismaError(e, 'NoteType', id);
        }
    }

    async deleteNoteType(id: string): Promise<void> {
        try {
            await this.prisma.loopKitNoteType.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'NoteType', id);
        }
    }

    // ─── ReviewLog Operations ────────────────────────────────────────

    async createReviewLog(input: CreateReviewLogInput & { id?: string }): Promise<ReviewLog> {
        try {
            const raw = await this.prisma.loopKitReviewLog.create({
                data: {
                    id: input.id ?? generateId(),
                    cardId: input.cardId,
                    deckId: input.deckId,
                    grade: input.grade,
                    prevState: JSON.stringify(input.prevState),
                    newState: JSON.stringify(input.newState),
                    reviewedAt: new Date(),
                    timeTakenMs: input.timeTakenMs,
                },
            });
            return mapReviewLog(raw);
        } catch (e) {
            mapPrismaError(e, 'ReviewLog');
        }
    }

    async getReviewLog(id: string): Promise<ReviewLog> {
        const raw = await this.prisma.loopKitReviewLog.findUnique({ where: { id } });
        if (!raw) throw new EntityNotFoundError('ReviewLog', id);
        return mapReviewLog(raw);
    }

    async findReviewLogs(filters?: ReviewLogFilters): Promise<ReviewLog[]> {
        const where: any = {};
        if (filters?.cardId) where.cardId = filters.cardId;
        if (filters?.deckId) where.deckId = filters.deckId;
        if (filters?.grade) where.grade = filters.grade;
        if (filters?.dateStart || filters?.dateEnd) {
            where.reviewedAt = {};
            if (filters?.dateStart) where.reviewedAt.gte = filters.dateStart;
            if (filters?.dateEnd) where.reviewedAt.lte = filters.dateEnd;
        }
        const raw = await this.prisma.loopKitReviewLog.findMany({
            where,
            orderBy: { reviewedAt: 'desc' },
        });
        return raw.map(mapReviewLog);
    }

    async deleteReviewLog(id: string): Promise<void> {
        try {
            await this.prisma.loopKitReviewLog.delete({ where: { id } });
        } catch (e) {
            mapPrismaError(e, 'ReviewLog', id);
        }
    }

    async countReviewsToday(deckIds: string[], dayStart: Date): Promise<number> {
        return this.prisma.loopKitReviewLog.count({
            where: {
                deckId: { in: deckIds },
                reviewedAt: { gte: dayStart },
            },
        });
    }

    async countNewCardsToday(deckIds: string[], dayStart: Date): Promise<number> {
        // Count reviews where prevState was 'new'
        const logs = await this.prisma.loopKitReviewLog.findMany({
            where: {
                deckId: { in: deckIds },
                reviewedAt: { gte: dayStart },
            },
        });
        return logs.filter((l: any) => {
            const prevState = parseJsonField<CardStateSnapshot>(l.prevState);
            return prevState.state === 'new';
        }).length;
    }

    // ─── Sync Helpers ────────────────────────────────────────────────

    async findModifiedSince(since: Date): Promise<CardBase[]> {
        const raw = await this.prisma.loopKitCard.findMany({
            where: { updatedAt: { gte: since } },
        });
        return raw.map(mapCard);
    }

    async findReviewLogsSince(since: Date): Promise<ReviewLog[]> {
        const raw = await this.prisma.loopKitReviewLog.findMany({
            where: { reviewedAt: { gte: since } },
            orderBy: { reviewedAt: 'asc' },
        });
        return raw.map(mapReviewLog);
    }

    // ─── Transaction ─────────────────────────────────────────────────

    async transaction<T>(fn: (storage: LoopKitStorage) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx: any) => {
            const txAdapter = new PrismaLoopKitAdapter(tx);
            return fn(txAdapter);
        });
    }
}
