# @loopkit/nestjs

Production-ready flashcard engine for NestJS applications. Implements the SM-2 spaced repetition algorithm with a pluggable storage layer.

## Installation

```bash
bun add @loopkit/nestjs
```

## Prisma Schema

Copy these models into your `schema.prisma`:

```prisma
model LoopKitCard {
    id          String   @id @default(uuid())
    noteId      String
    templateId  String
    deckId      String
    state       String   @default("new")
    easeFactor  Float    @default(2.5)
    interval    Float    @default(0)
    dueDate     DateTime @default(now())
    currentStep Int      @default(0)
    lapseCount  Int      @default(0)
    reviewCount Int      @default(0)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    note LoopKitNote @relation(fields: [noteId], references: [id], onDelete: Cascade)
    deck LoopKitDeck @relation(fields: [deckId], references: [id])

    @@unique([noteId, templateId])
    @@index([deckId, state])
    @@index([deckId, dueDate])
}

model LoopKitNote {
    id         String   @id @default(uuid())
    noteTypeId String
    fields     Json
    tags       Json     @default("[]")
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt

    noteType LoopKitNoteType @relation(fields: [noteTypeId], references: [id])
    cards    LoopKitCard[]
}

model LoopKitNoteType {
    id        String   @id @default(uuid())
    name      String   @unique
    fields    Json
    templates Json
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    notes LoopKitNote[]
}

model LoopKitDeck {
    id              String   @id @default(uuid())
    name            String
    description     String?
    parentDeckId    String?
    presetId        String?
    configOverrides Json?
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt

    parent   LoopKitDeck?      @relation("DeckHierarchy", fields: [parentDeckId], references: [id])
    children LoopKitDeck[]     @relation("DeckHierarchy")
    preset   LoopKitDeckPreset? @relation(fields: [presetId], references: [id])
    cards    LoopKitCard[]
    logs     LoopKitReviewLog[]
}

model LoopKitDeckPreset {
    id        String   @id @default(uuid())
    name      String
    config    Json
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    decks LoopKitDeck[]
}

model LoopKitReviewLog {
    id          String   @id @default(uuid())
    cardId      String
    deckId      String
    grade       String
    prevState   Json
    newState    Json
    reviewedAt  DateTime @default(now())
    timeTakenMs Int

    deck LoopKitDeck @relation(fields: [deckId], references: [id])

    @@index([cardId])
    @@index([deckId, reviewedAt])
}
```

Then run `prisma migrate dev`.

## Backend Integration

```typescript
import { Module } from '@nestjs/common';
import { LoopKitModule, PrismaLoopKitAdapter } from '@loopkit/nestjs';
import { PrismaService } from './prisma.service';

@Module({
    imports: [
        LoopKitModule.register({
            storage: new PrismaLoopKitAdapter(prismaClient),
        }),
    ],
})
export class AppModule {}
```

Then inject services in your controllers:

```typescript
import { ReviewSessionService, DeckService } from '@loopkit/nestjs';

@Controller('loopkit')
export class FlashcardController {
    constructor(
        private readonly session: ReviewSessionService,
        private readonly decks: DeckService,
    ) {}
}
```

## Custom Storage Adapter

Implement `LoopKitStorage` for any database:

```typescript
import { LoopKitStorage } from '@loopkit/nestjs';

export class MyCustomAdapter extends LoopKitStorage {
    // Implement all abstract methods
}
```

## Custom SRS Algorithm

Replace SM-2 with your own algorithm:

```typescript
import { LoopKitModule, type SRSAlgorithm } from '@loopkit/nestjs';

class FSRSAlgorithm implements SRSAlgorithm {
    calculateNextState(card, grade, config, now) { /* ... */ }
    getInitialState(config, now) { /* ... */ }
}

LoopKitModule.register({
    storage: adapter,
    algorithm: new FSRSAlgorithm(),
});
```

## Content Pipeline

Add custom transforms or use the built-in ones (requires peer dependencies):

```typescript
import {
    createContentPipeline,
    createMarkdownTransform,
    createKatexTransform,
} from '@loopkit/nestjs';
import { marked } from 'marked';
import katex from 'katex';

const pipeline = createContentPipeline([
    createMarkdownTransform(marked),
    createKatexTransform(katex),
]);

LoopKitModule.register({ storage: adapter, contentPipeline: pipeline });
```

## License

MIT
