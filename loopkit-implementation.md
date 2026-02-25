# LoopKit — Claude Code Implementation Plan

> **Goal:** Build LoopKit as a production-ready, open-source flashcard engine library following the Kit Architecture pattern. This plan is structured as sequential tasks for Claude Code to execute.

---

## Overview

LoopKit is a Turborepo monorepo producing two npm packages:

| Package | npm Name | Tech |
|---------|----------|------|
| Backend | `@hfu.digital/loopkit-nestjs` | NestJS DynamicModule, Prisma adapter, pure SRS engine |
| Frontend | `@hfu.digital/loopkit-react` | React 18/19, Vite library mode, headless hooks + pre-styled components |

---

## Phase 0 — Monorepo Scaffold

**Task 0.1 — Initialize Turborepo root**

Create the root monorepo structure:

```
/loopkit
├── package.json              # private, workspaces: ["packages/*", "examples/*"]
├── turbo.json                # pipeline: build, dev, lint, test
├── tsconfig.base.json        # shared strict TS config (target ES2022, moduleResolution bundler)
├── .gitignore
├── .npmrc                    # save-exact=true
├── .prettierrc
├── .eslintrc.js
├── LICENSE                   # MIT
└── README.md                 # project overview + links to package READMEs
```

Key decisions:
- Node 20+, npm workspaces (not yarn/pnpm — widest compat)
- `turbo.json` pipeline: `build` depends on `^build`, outputs `dist/**`
- `tsconfig.base.json`: strict mode, declaration emit, paths for workspace refs

**Task 0.2 — Create backend package skeleton**

```
packages/nestjs/
├── src/
│   ├── index.ts              # barrel export
│   ├── module.ts             # NestJS DynamicModule
│   ├── types/                # all shared types
│   ├── domain/               # pure business logic
│   ├── interfaces/           # abstract storage class
│   ├── adapters/             # Prisma adapter
│   ├── errors/               # LoopKitError hierarchy
│   └── dto/                  # validation DTOs
├── __tests__/                # vitest tests
├── package.json              # @hfu.digital/loopkit-nestjs
├── tsconfig.json             # extends base
└── vitest.config.ts
```

`package.json` rules:
- `peerDependencies`: `@nestjs/common ^10`, `@nestjs/core ^10`, `rxjs ^7`
- `devDependencies`: same + `typescript ^5`, `vitest`
- `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`, `"files": ["dist"]`
- `"prepublishOnly": "npm run build"`

**Task 0.3 — Create frontend package skeleton**

```
packages/react/
├── src/
│   ├── index.ts              # barrel export
│   ├── context/              # LoopKitProvider
│   ├── hooks/                # all headless hooks
│   ├── components/           # pre-styled components
│   ├── types/                # frontend-specific types
│   └── utils/                # shared utilities
├── package.json              # @hfu.digital/loopkit-react
├── tsconfig.json
└── vite.config.ts            # library mode
```

`package.json` rules:
- `peerDependencies`: `react ^18 || ^19`, `react-dom ^18 || ^19`
- Vite library mode: formats `['es', 'cjs']`, externalize react/react-dom/react-jsx-runtime
- `vite-plugin-dts` for declaration bundling

---

## Phase 1 — Types & Error Contract

> Everything depends on types. Build them first. Zero external dependencies.

**Task 1.1 — Core entity types** (`packages/nestjs/src/types/`)

Create the following type files:

`entities.ts` — All base entity types:
- `CardBase` — id, noteId, templateId, deckId, state (`'new' | 'learning' | 'review' | 'relearning'`), easeFactor, interval, dueDate, currentStep, lapseCount, reviewCount, createdAt, updatedAt
- `NoteBase` — id, noteTypeId, fields (Field[]), tags (string[]), createdAt, updatedAt
- `Field` — name, value, ordinal
- `NoteType` — id, name, fields (FieldDef[]), templates (TemplateDef[]), createdAt, updatedAt
- `FieldDef` — name, ordinal, type (`'text' | 'richtext' | 'media'`), required
- `TemplateDef` — id, name, front (template string), back (template string), css (optional)
- `DeckBase` — id, name, description, parentDeckId, presetId, configOverrides (Partial<DeckConfig>), createdAt, updatedAt
- `DeckPreset` — id, name, config (DeckConfig), createdAt, updatedAt
- `ReviewLog` — id, cardId, deckId, grade, prevState (CardState), newState (CardState), reviewedAt, timeTakenMs
- `CardState` — state, easeFactor, interval, dueDate, currentStep, lapseCount, reviewCount (snapshot type)

`config.ts` — DeckConfig with all settings:
- newCardsPerDay (20), maxReviewsPerDay (200), learningSteps ([1, 10]), graduatingInterval (1), easyInterval (4), relearningSteps ([10]), lapseNewInterval (0.7), lapseMinInterval (1), maxInterval (36500), startingEaseFactor (2.5), hardIntervalMultiplier (1.2), easyBonus (1.3), newCardOrder ('added'), reviewOrder ('due'), nextDayStartsAt (4), enableFuzz (true)
- Export `DEFAULT_DECK_CONFIG` frozen constant
- Export `DEFAULT_DECK_PRESET` with name "Default"

`grade.ts`:
- `Grade` = `'again' | 'hard' | 'good' | 'easy'`

`rendering.ts`:
- `RenderedCard` — { front: string, back: string }
- `RenderContext` — { fields: Record<string, string>, cardState: CardBase['state'] }
- `ContentTransform` — `(html: string, context: RenderContext) => string`

`inputs.ts` — All create/update input types:
- `CreateNoteInput`, `UpdateNoteInput`, `NoteFilters`
- `CreateCardInput`, `UpdateCardInput`
- `CreateDeckInput`, `UpdateDeckInput`, `DeckFilters`
- `CreatePresetInput`, `UpdatePresetInput`
- `CreateNoteTypeInput`, `UpdateNoteTypeInput`
- `CreateReviewLogInput`, `ReviewLogFilters`

Make ALL entity types generic where applicable:
```typescript
interface CardBase { ... }
// Host extends: type MyCard = CardBase & { examCount: number }
```

**Task 1.2 — Error contract** (`packages/nestjs/src/errors/`)

`errors.ts`:
```typescript
export abstract class LoopKitError extends Error {
  abstract readonly code: string;
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EntityNotFoundError extends LoopKitError { readonly code = 'ENTITY_NOT_FOUND'; }
export class DuplicateEntityError extends LoopKitError { readonly code = 'DUPLICATE_ENTITY'; }
export class ValidationError extends LoopKitError { readonly code = 'VALIDATION_ERROR'; }
export class StorageConnectionError extends LoopKitError { readonly code = 'STORAGE_CONNECTION_ERROR'; }
export class ConcurrencyConflictError extends LoopKitError { readonly code = 'CONCURRENCY_CONFLICT'; }
export class InvalidGradeError extends LoopKitError { readonly code = 'INVALID_GRADE'; }
export class SessionNotActiveError extends LoopKitError { readonly code = 'SESSION_NOT_ACTIVE'; }
export class UndoNotAvailableError extends LoopKitError { readonly code = 'UNDO_NOT_AVAILABLE'; }
```

**Task 1.3 — Validation helpers** (`packages/nestjs/src/dto/`)

Lightweight runtime validation (no class-validator dependency — keep it zero-dep for the core):
- `validateDeckConfig(partial: Partial<DeckConfig>): DeckConfig` — merge with defaults, clamp values
- `validateNote(input: CreateNoteInput, noteType: NoteType): void` — check required fields
- `validateGrade(grade: string): Grade` — throw InvalidGradeError if invalid

---

## Phase 2 — SRS Engine (Pure Functions)

> The heart of LoopKit. Zero dependencies, fully testable, no side effects.

**Task 2.1 — SRS algorithm interface** (`packages/nestjs/src/domain/srs/`)

`srs-algorithm.ts`:
```typescript
export interface SRSAlgorithm {
  calculateNextState(card: SRSState, grade: Grade, config: DeckConfig): SRSState;
  getInitialState(config: DeckConfig): SRSState;
}

export interface SRSState {
  state: 'new' | 'learning' | 'review' | 'relearning';
  easeFactor: number;
  interval: number;
  dueDate: Date;
  currentStep: number;
  lapseCount: number;
  reviewCount: number;
}
```

**Task 2.2 — SM-2 implementation** (`packages/nestjs/src/domain/srs/sm2.ts`)

Implement the full SM-2 (modified) algorithm per spec §1a–1c:

**Review card grading:**
| Grade | Interval Formula | Ease Adjustment |
|-------|-----------------|-----------------|
| Again | `interval × lapseNewInterval` (≥ lapseMinInterval) → enter relearning | -0.20 |
| Hard  | `interval × hardIntervalMultiplier` | -0.15 |
| Good  | `interval × easeFactor` | 0 |
| Easy  | `interval × easeFactor × easyBonus` | +0.15 |

Post-calculation: fuzz ±5% (if enabled), clamp to [1, maxInterval], ease ≥ 1.3.

**Learning/relearning step progression:**
| Grade | Behavior |
|-------|----------|
| Again | Reset to step 0 |
| Hard  | Repeat current step (or next with 1.5× duration) |
| Good  | Next step; if last → graduate |
| Easy  | Immediately graduate with easyInterval |

Graduation: learning → review with graduatingInterval. Relearning → review with lapse-adjusted interval.

Helper functions:
- `applyFuzz(interval: number, enabled: boolean): number`
- `clampEase(ease: number): number` — min 1.3
- `clampInterval(interval: number, max: number): number`
- `calculateDueDate(now: Date, intervalDays: number): Date`
- `calculateLearningDueDate(now: Date, stepMinutes: number): Date`

**Task 2.3 — Interval preview calculator**

`interval-preview.ts`:
```typescript
export function previewNextIntervals(
  card: SRSState,
  config: DeckConfig,
  algorithm: SRSAlgorithm
): Record<Grade, string>
```

Returns human-readable interval strings for each grade button: `{ again: '1m', hard: '6m', good: '10m', easy: '4d' }`.

Format rules: <1h → `Xm`, <1d → `Xh`, <31d → `Xd`, <365d → `Xmo`, else `Xy`.

**Task 2.4 — Day boundary utilities**

`day-boundary.ts`:
```typescript
export function getDayStart(now: Date, nextDayStartsAt: number): Date;
export function isDueToday(dueDate: Date, now: Date, nextDayStartsAt: number): boolean;
export function getDaysSince(date: Date, now: Date): number;
```

All SRS scheduling is UTC. Day boundary is applied only at the session/query layer.

**Task 2.5 — SRS unit tests** (`packages/nestjs/__tests__/srs/`)

Critical test cases (minimum):
- New card → learning step progression (Again resets, Good advances, Easy graduates)
- Learning card graduation → review state with correct interval
- Review card all four grades → correct intervals and ease adjustments
- Ease factor never drops below 1.3
- Fuzz factor applies ±5% variance
- Interval capped at maxInterval
- Lapse → relearning → back to review
- Day boundary edge cases (review at 3:59 AM vs 4:00 AM with nextDayStartsAt=4)
- Interval preview returns correct human-readable strings

Target: **100% branch coverage on SM-2 algorithm.**

---

## Phase 3 — Storage Interface

**Task 3.1 — Abstract storage class** (`packages/nestjs/src/interfaces/storage.ts`)

Implement the full `LoopKitStorage<TCard extends CardBase>` abstract class from spec §v1 Storage Interface. This is the single largest interface — all methods listed in the spec.

Key design decisions:
- Abstract class (NOT interface) — NestJS DI needs a class token
- Generic `<TCard extends CardBase = CardBase>` on the class
- All methods return Promises
- Queue query methods (`findDueCards`, `findNewCards`, `findLearningCards`) take `Date` for timezone-aware queries
- Bulk operations (`createManyCards`, `updateManyCards`) for import and batch grading
- Sync helpers (`findModifiedSince`, `findReviewLogsSince`)

Group methods logically with JSDoc comments for each section.

**Task 3.2 — Storage interface tests (contract tests)**

Create a **storage contract test suite** that any adapter must pass:

`packages/nestjs/__tests__/storage/storage-contract.ts`:

Export a function `runStorageContractTests(factory: () => LoopKitStorage)` that tests:
- CRUD for all entities (Note, Card, Deck, DeckPreset, NoteType, ReviewLog)
- Bulk operations (createManyCards, updateManyCards)
- Queue queries (findDueCards respects dueDate, findNewCards respects order, findLearningCards)
- countByState accuracy
- Deck hierarchy (getDescendantDeckIds)
- Error mapping (not found → EntityNotFoundError, duplicate → DuplicateEntityError)
- Review log immutability (append-only except undo delete)

This contract suite will be reused for the Prisma adapter and any future adapters.

---

## Phase 4 — Card Generation & Content Pipeline

**Task 4.1 — Card generator** (`packages/nestjs/src/domain/card-generator.ts`)

Implement the card generation lifecycle from spec §3:

```typescript
export class CardGenerator {
  generateCardsForNote(note: NoteBase, noteType: NoteType, deckId: string, config: DeckConfig): CreateCardInput[];
  generateCardsForNewTemplate(template: TemplateDef, notes: NoteBase[], deckId: string, config: DeckConfig): CreateCardInput[];
  getCardsToDeleteForRemovedTemplate(templateId: string): string; // returns templateId for deleteCardsByTemplate
}
```

Rules:
- One card per (noteId, templateId) pair
- New cards get initial SRS state from `algorithm.getInitialState(config)`
- Fields are NOT baked into cards — content is rendered on-the-fly

**Task 4.2 — Content rendering pipeline** (`packages/nestjs/src/domain/content-pipeline.ts`)

```typescript
export interface ContentPipeline {
  transforms: ContentTransform[];
  render(note: NoteBase, template: TemplateDef): RenderedCard;
}

export function createContentPipeline(transforms?: ContentTransform[]): ContentPipeline;
```

**Built-in transforms (in order):**

1. `templateInterpolation` — `{{FieldName}}` replacement, `{{#Field}}...{{/Field}}` conditionals, `{{^Field}}...{{/Field}}` negated, `{{FrontSide}}` on back
2. `markdownToHtml` — CommonMark rendering (use `marked` or `markdown-it` — add as dependency)
3. `katexTransform` — `$inline$` and `$$block$$` → KaTeX HTML (use `katex` — add as dependency)
4. `codeHighlight` — fenced code blocks (use `highlight.js` — add as dependency)
5. `sanitize` — XSS protection (use `DOMPurify` or `sanitize-html` — add as dependency)

Note: These rendering dependencies are added to the backend package. The frontend package will use the same pipeline via API responses or by importing directly.

**Decision point:** The markdown/katex/highlight dependencies make the backend heavier. Consider:
- Option A: Include them in `@hfu.digital/loopkit-nestjs` (simpler DX, larger bundle)
- Option B: Extract to `@hfu.digital/loopkit-content` package (lighter core, extra install)
- **Recommendation: Option A for v1** — keep it simple, extract later if needed.

**Task 4.3 — Template interpolation engine** (`packages/nestjs/src/domain/content-pipeline/template-interpolation.ts`)

This is custom logic, no library needed:

```typescript
export function interpolateTemplate(
  template: string,
  fields: Record<string, string>,
  frontRendered?: string // for {{FrontSide}} on back
): string;
```

Handle:
- `{{FieldName}}` → field value
- `{{#FieldName}}content{{/FieldName}}` → content if field non-empty
- `{{^FieldName}}content{{/FieldName}}` → content if field empty
- `{{FrontSide}}` → insert rendered front (back template only)
- Nested conditionals
- Unknown fields → empty string (don't crash)

**Task 4.4 — Content pipeline tests**

- Template interpolation: all syntax variants, edge cases, missing fields
- Full pipeline: markdown + katex + code → correct HTML output
- Sanitization: XSS vectors stripped
- Custom transform injection: prepend/append works correctly

---

## Phase 5 — Domain Services

**Task 5.1 — Review session orchestrator** (`packages/nestjs/src/domain/session.ts`)

The most complex domain service. Manages queue building, card serving, grading, and undo.

```typescript
@Injectable()
export class ReviewSessionService {
  constructor(
    private readonly storage: LoopKitStorage,
    private readonly algorithm: SRSAlgorithm,
    private readonly pipeline: ContentPipeline,
  ) {}

  async buildQueue(deckId: string, options?: SessionOptions): Promise<SessionQueue>;
  async gradeCard(cardId: string, grade: Grade, timeTakenMs: number): Promise<GradeResult>;
  async undoLastReview(reviewLogId: string): Promise<void>;
  getSessionSummary(logs: ReviewLog[]): SessionSummary;
}
```

**Queue building logic (spec §5a):**
1. Get all descendant deck IDs (for parent deck review)
2. Fetch overdue learning/relearning cards (always included, no limit)
3. Fetch due review cards (respect maxReviewsPerDay — count reviews today)
4. Fetch new cards (respect newCardsPerDay — count new→learning transitions today)
5. Sort by priority: overdue learning > due review (most overdue first) > new cards
6. Apply tag filters if provided

**Grading flow:**
1. Validate grade
2. Fetch card + deck + effective config (preset merged with overrides)
3. Run SRS algorithm: `calculateNextState(cardState, grade, config)`
4. Persist updated card state
5. Create ReviewLog entry with prevState + newState
6. If learning/relearning card: calculate next step due time for re-queue

**Undo flow:**
1. Fetch latest ReviewLog for the session
2. Restore card to `prevState`
3. Delete the ReviewLog entry
4. Re-insert card at front of queue

**Task 5.2 — Deck service** (`packages/nestjs/src/domain/deck.service.ts`)

```typescript
@Injectable()
export class DeckService {
  constructor(private readonly storage: LoopKitStorage) {}

  async createDeck(input: CreateDeckInput): Promise<DeckBase>;
  async getDeck(id: string): Promise<DeckBase>;
  async getDeckTree(): Promise<DeckTreeNode[]>;
  async getEffectiveConfig(deckId: string): Promise<DeckConfig>;
  async moveDeck(deckId: string, newParentId: string | null): Promise<void>;
  async deleteDeck(deckId: string, deleteCards: boolean): Promise<void>;
}
```

`getEffectiveConfig`: fetches deck + preset, merges `{ ...preset.config, ...deck.configOverrides }`.

**Task 5.3 — Note service** (`packages/nestjs/src/domain/note.service.ts`)

```typescript
@Injectable()
export class NoteService {
  constructor(
    private readonly storage: LoopKitStorage,
    private readonly cardGenerator: CardGenerator,
  ) {}

  async createNote(input: CreateNoteInput, deckId: string): Promise<NoteBase>;
  async updateNote(id: string, input: UpdateNoteInput): Promise<NoteBase>;
  async deleteNote(id: string): Promise<void>;
  async moveNoteToDeck(noteId: string, newDeckId: string): Promise<void>;
}
```

On create: validate fields against NoteType, then generate cards via CardGenerator.
On delete: cascade-delete cards (review logs preserved as orphaned).

**Task 5.4 — Note type service** (`packages/nestjs/src/domain/note-type.service.ts`)

```typescript
@Injectable()
export class NoteTypeService {
  constructor(private readonly storage: LoopKitStorage) {}

  async createNoteType(input: CreateNoteTypeInput): Promise<NoteType>;
  async addTemplate(noteTypeId: string, template: TemplateDef): Promise<NoteType>;
  async removeTemplate(noteTypeId: string, templateId: string): Promise<NoteType>;
  async seedDefaults(): Promise<void>; // creates "Basic" and "Basic + Reverse"
}
```

On addTemplate: retroactively generate cards for all existing notes of this type.
On removeTemplate: delete cards by template (review logs preserved).

**Task 5.5 — Statistics service** (`packages/nestjs/src/domain/stats.ts`)

Pure functions (no class needed, just exported functions):

```typescript
export function reviewsPerDay(logs: ReviewLog[]): Map<string, number>;
export function retentionRate(logs: ReviewLog[]): number;
export function reviewForecast(cards: CardBase[], days?: number): Map<string, number>;
export function deckBreakdown(cards: CardBase[]): { new: number; learning: number; review: number; relearning: number };
export function studyStreak(logs: ReviewLog[], nextDayStartsAt?: number): number;
export function averageEase(cards: CardBase[]): number;
export function lapseRate(logs: ReviewLog[]): number;
export function sessionSummary(logs: ReviewLog[]): SessionSummaryStats;
```

**Task 5.6 — Import/export service** (`packages/nestjs/src/domain/import-export.ts`)

```typescript
@Injectable()
export class ImportExportService {
  constructor(private readonly storage: LoopKitStorage) {}

  async importCSV(csv: string, mapping: FieldMapping, deckId: string, noteTypeId: string, tags?: string[]): Promise<ImportResult>;
  async exportCSV(deckId: string): Promise<string>;
  async importJSON(data: LoopKitExportData): Promise<ImportResult>;
  async exportJSON(deckId: string, includeReviewLogs?: boolean): Promise<LoopKitExportData>;
}
```

CSV parsing: use `papaparse` as dependency (lightweight, well-tested).

**Task 5.7 — Domain service tests**

- ReviewSessionService: queue building order, daily limits, grading flow, undo, session summary
- DeckService: effective config merging, deck tree, descendant IDs
- NoteService: card generation on create, cascade delete
- NoteTypeService: retroactive card generation on template add, card deletion on template remove
- Stats: all functions with known datasets
- Import/export: round-trip CSV and JSON

---

## Phase 6 — Prisma Adapter

**Task 6.1 — Prisma delegate types** (`packages/nestjs/src/adapters/prisma/prisma-types.ts`)

**CRITICAL: No `import` from `@prisma/client`. Structural typing only.**

Define the expected Prisma delegate shape:

```typescript
export type PrismaDelegate<T = any> = {
  create: (args: { data: any; include?: any }) => Promise<T>;
  createMany: (args: { data: any[] }) => Promise<{ count: number }>;
  findUnique: (args: { where: any; include?: any }) => Promise<T | null>;
  findFirst: (args: { where?: any; orderBy?: any; include?: any }) => Promise<T | null>;
  findMany: (args: { where?: any; orderBy?: any; take?: number; include?: any }) => Promise<T[]>;
  update: (args: { where: any; data: any; include?: any }) => Promise<T>;
  updateMany: (args: { where: any; data: any }) => Promise<{ count: number }>;
  delete: (args: { where: any }) => Promise<T>;
  deleteMany: (args: { where: any }) => Promise<{ count: number }>;
  count: (args?: { where?: any }) => Promise<number>;
};

export type PrismaTransactionClient = {
  $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
};

// The consumer passes their PrismaClient — we just need these delegates:
export type LoopKitPrismaClient = {
  card: PrismaDelegate;
  note: PrismaDelegate;
  deck: PrismaDelegate;
  deckPreset: PrismaDelegate;
  noteType: PrismaDelegate;
  reviewLog: PrismaDelegate;
  $transaction: PrismaTransactionClient['$transaction'];
};
```

**Task 6.2 — Prisma adapter implementation** (`packages/nestjs/src/adapters/prisma/prisma-loopkit-adapter.ts`)

```typescript
export class PrismaLoopKitAdapter<TCard extends CardBase = CardBase> extends LoopKitStorage<TCard> {
  constructor(private readonly prisma: LoopKitPrismaClient) { super(); }
  
  // Implement ALL abstract methods
  // Map Prisma errors to LoopKitError subclasses
}
```

Error mapping:
- `P2002` (unique constraint) → `DuplicateEntityError`
- `P2025` (record not found) → `EntityNotFoundError`
- `P2034` (transaction conflict) → `ConcurrencyConflictError`
- Connection errors → `StorageConnectionError`

Wrap every method in try/catch with error mapping.

**Task 6.3 — Prisma reference schema** (`packages/nestjs/prisma/reference-schema.prisma`)

NOT used by the library at build time — this is a **documentation artifact** included in the README and as a reference file:

```prisma
// Copy this into your host app's schema.prisma

model LoopKitCard {
  id          String   @id @default(uuid())
  noteId      String
  templateId  String
  deckId      String
  state       String   @default("new")
  easeFactor  Float    @default(2.5)
  interval    Float    @default(0)
  dueDate     DateTime
  currentStep Int      @default(0)
  lapseCount  Int      @default(0)
  reviewCount Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  note Note   @relation(fields: [noteId], references: [id], onDelete: Cascade)
  deck Deck   @relation(fields: [deckId], references: [id])

  @@unique([noteId, templateId])
  @@index([deckId, state])
  @@index([deckId, dueDate])
}

model LoopKitNote { ... }
model LoopKitNoteType { ... }
model LoopKitDeck { ... }
model LoopKitDeckPreset { ... }
model LoopKitReviewLog { ... }
```

Full schema with all fields, relations, and indexes optimized for queue queries.

**Task 6.4 — Run storage contract tests against Prisma adapter**

Use the contract test suite from Task 3.2 with an in-memory SQLite Prisma instance for testing.

---

## Phase 7 — NestJS Module

**Task 7.1 — DynamicModule** (`packages/nestjs/src/module.ts`)

```typescript
export interface LoopKitModuleOptions {
  storage: LoopKitStorage;
  algorithm?: SRSAlgorithm;        // defaults to SM2Algorithm
  contentPipeline?: ContentPipeline; // defaults to createContentPipeline()
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
        { provide: 'SRS_ALGORITHM', useValue: algorithm },
        { provide: 'CONTENT_PIPELINE', useValue: pipeline },
        ReviewSessionService,
        DeckService,
        NoteService,
        NoteTypeService,
        ImportExportService,
        CardGenerator,
      ],
      exports: [
        ReviewSessionService,
        DeckService,
        NoteService,
        NoteTypeService,
        ImportExportService,
        LoopKitStorage,
      ],
    };
  }
}
```

**Task 7.2 — Barrel export** (`packages/nestjs/src/index.ts`)

Export the full public API:

```typescript
// Module
export { LoopKitModule, LoopKitModuleOptions } from './module';

// Domain services
export { ReviewSessionService } from './domain/session';
export { DeckService } from './domain/deck.service';
export { NoteService } from './domain/note.service';
export { NoteTypeService } from './domain/note-type.service';
export { ImportExportService } from './domain/import-export';

// SRS
export { SRSAlgorithm, SRSState } from './domain/srs/srs-algorithm';
export { SM2Algorithm } from './domain/srs/sm2';
export { previewNextIntervals } from './domain/srs/interval-preview';

// Content
export { ContentPipeline, createContentPipeline } from './domain/content-pipeline';

// Statistics
export { reviewsPerDay, retentionRate, reviewForecast, ... } from './domain/stats';

// Storage interface
export { LoopKitStorage } from './interfaces/storage';

// Prisma adapter
export { PrismaLoopKitAdapter } from './adapters/prisma/prisma-loopkit-adapter';
export { LoopKitPrismaClient } from './adapters/prisma/prisma-types';

// Types (all of them)
export * from './types/entities';
export * from './types/config';
export * from './types/grade';
export * from './types/rendering';
export * from './types/inputs';

// Errors
export * from './errors/errors';

// Validation
export { validateDeckConfig, validateNote, validateGrade } from './dto/validation';
```

---

## Phase 8 — Frontend: Context & Hooks

**Task 8.1 — LoopKitProvider** (`packages/react/src/context/LoopKitProvider.tsx`)

```typescript
interface LoopKitConfig {
  apiUrl: string;
  fetcher?: typeof fetch; // allow custom fetch (e.g., with auth headers)
}

const LoopKitContext = createContext<LoopKitConfig | null>(null);

export const useLoopKitConfig = () => { ... };
export const LoopKitProvider = ({ apiUrl, fetcher, children }) => { ... };
```

**Task 8.2 — API client utility** (`packages/react/src/utils/api-client.ts`)

Internal utility (not exported) that all hooks use:

```typescript
export function useApiClient() {
  const { apiUrl, fetcher } = useLoopKitConfig();
  
  return {
    get: <T>(path: string) => ...,
    post: <T>(path: string, body: any) => ...,
    put: <T>(path: string, body: any) => ...,
    delete: (path: string) => ...,
  };
}
```

**Task 8.3 — `useReviewSession` hook** (most complex)

State machine: `idle → loading → reviewing → answered → complete`

```typescript
export function useReviewSession<TCard extends CardBase = CardBase>(): UseReviewSessionReturn<TCard> {
  // State: sessionState, currentCard, renderedContent, progress, canUndo, error
  // Actions: startSession, showAnswer, grade, undo, endSession
  // Derived: nextIntervals
}
```

Implementation notes:
- Use `useReducer` for the state machine (not useState — too many interdependent states)
- Queue is managed client-side after initial fetch
- Grading POSTs to backend, updates local queue
- Undo POSTs to backend, re-inserts card at front
- Learning cards re-queue locally based on next step time

**Task 8.4 — Data hooks**

| Hook | Endpoints | State |
|------|-----------|-------|
| `useDeck(id)` | GET /decks/:id, GET /decks/:id/counts | deck, counts, loading, error |
| `useDecks()` | GET /decks | decks[], loading, error |
| `useDeckTree()` | GET /decks/tree | tree nodes, loading, error |
| `useCard(id)` | GET /cards/:id | card, renderedContent, loading, error |
| `useCardEditor()` | POST/PUT /notes | create, update, validate, loading, error |
| `useNoteTypes()` | GET /note-types | noteTypes, loading, error |
| `useStats(deckId)` | GET /stats/:deckId | all stat values, loading, error |
| `useImport()` | POST /import | progress, error, fieldMapping state |
| `useExport()` | POST /export | progress, downloadUrl, error |
| `useTags()` | GET /tags | tags, filter, loading, error |

All hooks:
- Use `useLoopKitConfig()` for API base
- Return `{ data, loading, error, refetch }` pattern
- Support optimistic updates where applicable

**Task 8.5 — Frontend types** (`packages/react/src/types/`)

Re-export entity types from backend? **No** — frontend shouldn't depend on backend package. Instead, define a minimal `types.ts` with the same shapes. Or: extract shared types into a `@hfu.digital/loopkit-types` package.

**Recommendation for v1:** Duplicate the types in the frontend package. They're just interfaces — no runtime code. Extract to shared package in v2 if drift becomes an issue.

---

## Phase 9 — Frontend: Components

**Task 9.1 — Component architecture decisions**

- All components accept `className` prop
- Ship with CSS custom properties (variables) for theming
- Minimal default styles — functional, not beautiful
- No CSS framework dependency
- CSS shipped as a separate importable file: `import '@hfu.digital/loopkit-react/styles.css'`
- Every component has a corresponding headless hook

**Task 9.2 — Review components**

`<CardViewer>` — Renders front/back with flip animation
- Props: `renderedContent: RenderedCard`, `showBack: boolean`, `className?`
- Uses CSS transitions for flip
- Renders HTML safely (content already sanitized by pipeline)

`<GradeButtons>` — Again/Hard/Good/Easy with interval previews
- Props: `onGrade: (grade: Grade) => void`, `nextIntervals: Record<Grade, string>`, `disabled?: boolean`, `className?`
- Color coding: Again=red, Hard=orange, Good=green, Easy=blue

`<ReviewSession>` — Full session wrapper
- Props: `deckId: string`, `options?: SessionOptions`, `className?`, `onComplete?: (summary) => void`
- Composes: CardViewer + GradeButtons + progress bar + undo button
- Uses `useReviewSession` internally

`<SessionComplete>` — End-of-session summary
- Props: `summary: SessionSummary`, `className?`, `onClose?: () => void`

**Task 9.3 — Deck components**

`<DeckList>` — Grid/list of decks with counts
- Props: `onDeckSelect: (id: string) => void`, `className?`
- Shows new/review/learning counts per deck

`<DeckOverview>` — Single deck detail
- Props: `deckId: string`, `onStudy: () => void`, `className?`
- Shows breakdown, "Study Now" button, config summary

`<DeckTree>` — Hierarchical nested decks
- Props: `onDeckSelect: (id: string) => void`, `className?`
- Expand/collapse with indentation

**Task 9.4 — Editor components**

`<CardEditor>` — Create/edit notes
- Props: `noteTypeId?: string`, `initialNote?: NoteBase`, `onSave: (note) => void`, `className?`
- Dynamic field inputs based on note type
- Uses `useCardEditor` and `useNoteTypes`

`<NoteTypePicker>` — Dropdown selector
- Props: `value?: string`, `onChange: (noteTypeId: string) => void`, `className?`

**Task 9.5 — Utility components**

`<TagFilter>` — Tag selector for filtering
`<ImportDialog>` — CSV/JSON upload with field mapping UI
`<ExportDialog>` — Format and deck selection
`<StudyStats>` — Charts (retention, reviews/day, forecast, streak)

Note: `<StudyStats>` should use a lightweight charting approach. Options:
- SVG-based custom charts (zero deps, best for library)
- Optional `recharts` peer dependency
- **Recommendation: SVG custom charts for v1** — avoid forcing chart library on consumers.

**Task 9.6 — CSS custom properties theme** (`packages/react/src/styles/`)

```css
:root {
  --loopkit-primary: #6366f1;
  --loopkit-grade-again: #ef4444;
  --loopkit-grade-hard: #f97316;
  --loopkit-grade-good: #22c55e;
  --loopkit-grade-easy: #3b82f6;
  --loopkit-bg: #ffffff;
  --loopkit-text: #1f2937;
  --loopkit-border: #e5e7eb;
  --loopkit-radius: 8px;
  --loopkit-font: system-ui, sans-serif;
  /* ... */
}
```

**Task 9.7 — Frontend barrel export** (`packages/react/src/index.ts`)

```typescript
// Context
export { LoopKitProvider, useLoopKitConfig } from './context/LoopKitProvider';

// Hooks
export { useReviewSession } from './hooks/useReviewSession';
export { useDeck, useDecks, useDeckTree } from './hooks/useDeck';
// ... all hooks

// Components
export { CardViewer } from './components/CardViewer';
export { GradeButtons } from './components/GradeButtons';
export { ReviewSession } from './components/ReviewSession';
// ... all components

// Types
export * from './types';
```

---

## Phase 10 — Documentation & CI

**Task 10.1 — Root README.md**

Sections:
1. What is LoopKit? (one paragraph)
2. Packages table
3. Quick Start (backend + frontend, 20 lines)
4. Links to package READMEs

**Task 10.2 — Backend README** (`packages/nestjs/README.md`)

Sections per library-skill spec:
1. Overview
2. Installation
3. **Prisma Schema Reference** — full schema.prisma block to copy-paste
4. Backend Integration — register module with PrismaLoopKitAdapter
5. Custom Adapter Guide — implement LoopKitStorage for TypeORM/Drizzle
6. SRS Algorithm — how to swap SM-2 for FSRS
7. Content Pipeline — how to add custom transforms
8. API Reference — all exports with signatures

**Task 10.3 — Frontend README** (`packages/react/README.md`)

1. Installation
2. Setup LoopKitProvider
3. Review Session (useReviewSession + components)
4. Deck Management
5. Card Editor
6. Statistics
7. Theming (CSS variables reference)
8. API Reference

**Task 10.4 — GitHub Actions** (`.github/workflows/`)

`ci.yml`:
- Runs on PR and push to main
- Install → Build (turbo) → Lint → Test (vitest)
- Node 20

`publish.yml`:
- Triggered by tag `v*`
- Build → publish both packages to npm with `--access public`

**Task 10.5 — .gitignore, .npmrc, .prettierrc, .eslintrc**

Standard configs. ESLint with `@typescript-eslint`. Prettier with singleQuote, trailingComma all.

---

## Phase 11 — Examples (NOT published)

**Task 11.1 — NestJS example API** (`examples/nestjs-api/`)

Minimal NestJS app demonstrating:
- Prisma schema with LoopKit models + custom fields
- `LoopKitModule.register()` with `PrismaLoopKitAdapter`
- REST controllers for all endpoints the frontend hooks expect
- Seeded data (default note types, sample deck, sample cards)

**Task 11.2 — Next.js example app** (`examples/nextjs-app/`)

Minimal Next.js (App Router) app demonstrating:
- `<LoopKitProvider>` setup
- Review session page
- Deck list page
- Card editor page
- Stats dashboard
- Import/export

These examples serve as integration tests and developer documentation.

---

## Execution Order Summary

| Phase | Tasks | Dependencies | Estimated Complexity |
|-------|-------|-------------|---------------------|
| 0 | Monorepo scaffold | None | Low |
| 1 | Types + errors | Phase 0 | Medium |
| 2 | SRS engine | Phase 1 | **High** (correctness critical) |
| 3 | Storage interface | Phase 1 | Medium |
| 4 | Card gen + content pipeline | Phases 1, 2 | Medium-High |
| 5 | Domain services | Phases 2, 3, 4 | **High** (session orchestrator) |
| 6 | Prisma adapter | Phases 1, 3 | Medium |
| 7 | NestJS module | Phases 5, 6 | Low |
| 8 | Frontend hooks | Phase 1 (types) | **High** (useReviewSession) |
| 9 | Frontend components | Phase 8 | Medium |
| 10 | Docs + CI | All | Low |
| 11 | Examples | All | Medium |

**Critical path:** Phase 0 → 1 → 2 → 3 → 5 → 7 (backend shippable)
**Parallel track:** Phase 0 → 1 → 8 → 9 (frontend, once types stable)

---

## Notes for Claude Code Execution

1. **Always build from types outward** — run `npm run build` after each phase to catch type errors early
2. **Test the SRS engine exhaustively** — this is the correctness-critical core. Run tests after Phase 2 before proceeding.
3. **Use vitest** for all test suites — fast, ESM-native, good TS support
4. **Don't over-abstract early** — the spec is detailed enough. Implement directly, refactor only if pain emerges.
5. **Prisma adapter tests need a real SQLite instance** — use `prisma migrate dev` in the test setup with an in-memory or temp DB.
6. **Frontend hooks should be tested with `@testing-library/react-hooks`** (or React Testing Library's `renderHook`).
7. **Each phase should end with a working `npm run build`** — never leave the monorepo in a broken state.
