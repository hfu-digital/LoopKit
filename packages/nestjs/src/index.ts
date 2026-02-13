// Module
export { LoopKitModule, SRS_ALGORITHM, CONTENT_PIPELINE } from './module';
export type { LoopKitModuleOptions } from './module';

// Domain services
export { ReviewSessionService } from './domain/session';
export { DeckService } from './domain/deck.service';
export { NoteService } from './domain/note.service';
export { NoteTypeService } from './domain/note-type.service';
export { ImportExportService } from './domain/import-export';
export { CardGenerator } from './domain/card-generator';

// SRS
export type { SRSAlgorithm, SRSState } from './domain/srs/srs-algorithm';
export { SM2Algorithm, applyFuzz, clampEase, clampInterval, calculateDueDate, calculateLearningDueDate } from './domain/srs/sm2';
export { previewNextIntervals, formatInterval } from './domain/srs/interval-preview';
export { getDayStart, isDueToday, getDaysSince } from './domain/srs/day-boundary';

// Content pipeline
export type { ContentPipeline } from './domain/content-pipeline/content-pipeline';
export {
    createContentPipeline,
    createMarkdownTransform,
    createKatexTransform,
    createCodeHighlightTransform,
    createSanitizeTransform,
} from './domain/content-pipeline/content-pipeline';
export { interpolateTemplate } from './domain/content-pipeline/template-interpolation';

// Statistics
export {
    reviewsPerDay,
    retentionRate,
    reviewForecast,
    deckBreakdown,
    studyStreak,
    averageEase,
    lapseRate,
    sessionSummary,
} from './domain/stats';

// Storage interface
export { LoopKitStorage } from './interfaces/storage';

// Prisma adapter
export { PrismaLoopKitAdapter } from './adapters/prisma/prisma-loopkit-adapter';
export type { LoopKitPrismaClient, PrismaDelegate } from './adapters/prisma/prisma-types';

// Types
export * from './types/entities';
export * from './types/config';
export * from './types/grade';
export * from './types/rendering';
export * from './types/inputs';

// Errors
export * from './errors/errors';

// Validation
export { validateDeckConfig, validateNote, validateGrade } from './dto/validation';
