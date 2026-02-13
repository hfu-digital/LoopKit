import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LoopKitStorage } from './interfaces/storage';
import type { SRSAlgorithm } from './domain/srs/srs-algorithm';
import { SM2Algorithm } from './domain/srs/sm2';
import type { ContentPipeline } from './domain/content-pipeline/content-pipeline';
import { createContentPipeline } from './domain/content-pipeline/content-pipeline';
import { ReviewSessionService } from './domain/session';
import { DeckService } from './domain/deck.service';
import { NoteService } from './domain/note.service';
import { NoteTypeService } from './domain/note-type.service';
import { ImportExportService } from './domain/import-export';
import { CardGenerator } from './domain/card-generator';

export const SRS_ALGORITHM = 'SRS_ALGORITHM';
export const CONTENT_PIPELINE = 'CONTENT_PIPELINE';

export interface LoopKitModuleOptions {
    storage: LoopKitStorage;
    algorithm?: SRSAlgorithm;
    contentPipeline?: ContentPipeline;
}

@Module({})
export class LoopKitModule {
    static register(options: LoopKitModuleOptions): DynamicModule {
        const algorithm = options.algorithm ?? new SM2Algorithm();
        const pipeline = options.contentPipeline ?? createContentPipeline();

        return {
            module: LoopKitModule,
            providers: [
                { provide: LoopKitStorage, useValue: options.storage },
                { provide: SRS_ALGORITHM, useValue: algorithm },
                { provide: CONTENT_PIPELINE, useValue: pipeline },
                {
                    provide: CardGenerator,
                    useFactory: () => new CardGenerator(algorithm),
                },
                {
                    provide: DeckService,
                    useFactory: (storage: LoopKitStorage) => new DeckService(storage),
                    inject: [LoopKitStorage],
                },
                {
                    provide: NoteService,
                    useFactory: (storage: LoopKitStorage, cardGen: CardGenerator, deckSvc: DeckService) =>
                        new NoteService(storage, cardGen, deckSvc),
                    inject: [LoopKitStorage, CardGenerator, DeckService],
                },
                {
                    provide: NoteTypeService,
                    useFactory: (storage: LoopKitStorage, cardGen: CardGenerator, deckSvc: DeckService) =>
                        new NoteTypeService(storage, cardGen, deckSvc),
                    inject: [LoopKitStorage, CardGenerator, DeckService],
                },
                {
                    provide: ReviewSessionService,
                    useFactory: (storage: LoopKitStorage, deckSvc: DeckService) =>
                        new ReviewSessionService(
                            storage,
                            algorithm,
                            (deckId: string) => deckSvc.getEffectiveConfig(deckId),
                        ),
                    inject: [LoopKitStorage, DeckService],
                },
                {
                    provide: ImportExportService,
                    useFactory: (storage: LoopKitStorage) => new ImportExportService(storage),
                    inject: [LoopKitStorage],
                },
            ],
            exports: [
                LoopKitStorage,
                ReviewSessionService,
                DeckService,
                NoteService,
                NoteTypeService,
                ImportExportService,
                CardGenerator,
                SRS_ALGORITHM,
                CONTENT_PIPELINE,
            ],
        };
    }
}
