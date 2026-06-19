# CLAUDE.md

> For project vision, cross-project architecture, and global code style rules, see the root [CLAUDE.md](../CLAUDE.md).

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoopKit is a production-ready flashcard engine library implementing the SM-2 spaced repetition algorithm. It's a **Turborepo monorepo** producing two npm packages:

- **`@hfu.digital/loopkit-nestjs`** (`2026.04.2`) — NestJS DynamicModule with Prisma adapter, SRS engine, and content pipeline
- **`@hfu.digital/loopkit-react`** (`2026.04.2`) — React hooks and pre-styled components for flashcard UIs

Both packages are versioned in lockstep. Downstream consumers (e.g. the mobile app's flashcards feature) must **pin exact versions** — see Versioning below.

## Commands

All commands use **Bun** (`bun@1.2.0`, strict). Never use npm/yarn/pnpm.

```bash
bun install                  # Install dependencies
bun run build                # Build all packages (Turbo, dependency order)
bun run dev                  # Watch mode for all packages
bun run lint                 # Type-check via tsc --noEmit (this is the real check)
bun run test                 # Run all tests (Vitest)
bun run clean                # Remove dist/ and .turbo/
```

> Note: the root also defines a `check` turbo task, but **no package implements a `check` script**, so `bun run check` is effectively a no-op. Use `bun run lint` for type checking. There is no Biome/ESLint in this repo — formatting is Prettier only.

### Per-package commands (run from package directory)

```bash
cd packages/nestjs && bun run test           # NestJS tests only
cd packages/nestjs && bun run test:watch     # Watch mode
cd packages/nestjs && bun run test:coverage  # With v8 coverage (nestjs only)
cd packages/react && bun run test            # React tests only
```

> `test:coverage` exists only in `packages/nestjs`.

### Running a single test file

Tests live under each package's `__tests__/` directory (not `src/`):

```bash
cd packages/nestjs && bunx vitest run __tests__/srs/sm2.test.ts
cd packages/react && bunx vitest run __tests__/hooks/useReviewSession.test.tsx
```

## Architecture

### Turbo Pipeline

`build` has `dependsOn: ["^build"]` — packages build in dependency order, output to `dist/**`. `lint` and `test` also depend on `^build`. `dev` is persistent/uncached; `clean` is uncached.

### @hfu.digital/loopkit-nestjs (`packages/nestjs/`)

**Build**: `tsc` → `dist/` (CommonJS, `dist/index.js` + `dist/index.d.ts`)

Key layers (`src/`):
- **`domain/srs/`** — SM-2 algorithm (`sm2.ts`), `SRSAlgorithm` interface (`srs-algorithm.ts`), `interval-preview.ts`, `day-boundary.ts`
- **`domain/session.ts`** — `ReviewSessionService`: session state machine, queue building, grading, undo
- **`domain/deck.service.ts`** — Deck hierarchy and config inheritance
- **`domain/note.service.ts`** / **`domain/note-type.service.ts`** — Note CRUD and note-type definitions
- **`domain/card-generator.ts`** — Generates cards from notes + note types
- **`domain/content-pipeline/`** — Composable transforms: cloze, occlusion, type-answer, anki-sound, media-resolver, template-interpolation (`content-pipeline.ts` orchestrates; optional peer deps marked/katex/highlight.js/sanitize-html)
- **`domain/import-export.ts`** — CSV/JSON import-export via papaparse
- **`domain/stats.ts`** — Statistics (retention, streaks, forecasts)
- **`interfaces/storage.ts`** — Abstract generic `LoopKitStorage<TCard>` class (adapter contract)
- **`adapters/prisma/`** — `PrismaLoopKitAdapter` (in `prisma-loopkit-adapter.ts`), structural Prisma types in `prisma-types.ts`
- **`types/`** — `config.ts`, `entities.ts`, `grade.ts`, `inputs.ts`, `rendering.ts`
- **`module.ts`** — `LoopKitModule.register(options)` DynamicModule entry point
- **`dto/validation.ts`** — Input validation schemas
- **`errors/errors.ts`** — Custom error classes

Registration pattern:
```typescript
LoopKitModule.register({
    storage: new PrismaLoopKitAdapter(prismaClient),
    algorithm?: SRSAlgorithm,       // defaults to SM-2
    contentPipeline?: ContentPipeline,
})
```

### @hfu.digital/loopkit-react (`packages/react/`)

**Build**: Vite library mode → `dist/loopkit-react.js` (ESM) + `dist/loopkit-react.cjs` (CJS). Types via `tsc --emitDeclarationOnly`. CSS exported as `./styles.css` → `dist/styles.css`.

Key layers (`src/`):
- **`context/LoopKitProvider.tsx`** — Config context (apiUrl, auth headers)
- **`hooks/`** — `useReviewSession`, `useDeck`, `useCard`, `useStats`, `useImportExport`, `useTags`
- **`components/`** — `ReviewSession`, `CardViewer`, `GradeButtons`, `DeckTree`, `DeckList`, `DeckOverview`, `CardEditor`, `StudyStats`, `SessionComplete`
- **`utils/api-client.ts`** — Fetch wrapper using provider config
- **`styles/loopkit.css`** — CSS custom properties for theming (`--loopkit-*`)

### Core Design Patterns

- **Storage adapter pattern (hexagonal)**: All persistence goes through the abstract `LoopKitStorage<TCard>`; core never imports `@prisma/client`. The Prisma adapter uses structural typing (`prisma-types.ts`). Only the Prisma adapter ships today, but the interface is ORM-agnostic.
- **Algorithm pluggability**: The `SRSAlgorithm` interface allows swapping SM-2 for custom algorithms.
- **Headless-first React**: Hooks provide all functionality; components are optional pre-styled wrappers.
- **Content pipeline**: Composable transforms with optional peer dependencies (marked, katex, highlight.js, sanitize-html).

### Key Types

- **CardState**: `'new' | 'learning' | 'review' | 'relearning'`
- **Grade**: `'again' | 'hard' | 'good' | 'easy'`
- **DeckConfig**: SM-2 parameters (newCardsPerDay, maxReviewsPerDay, learningSteps, ease-factor ranges)

## Testing

- **Vitest** for both packages (`vitest run`).
- Tests live in `packages/<pkg>/__tests__/` (mirrors `src/` layout), not in `src/`.
- NestJS: Node environment. Test doubles in `__tests__/helpers/mock-storage.ts`; the shared adapter contract is `__tests__/storage/storage-contract.ts` (there is **no** `src/testing/` in-memory adapter).
- React: jsdom environment, setup file at `__tests__/setup.ts`.

## Code Style

- **4-space indentation** (`.prettierrc`: `tabWidth: 4`)
- **Single quotes**, trailing commas (`all`), semicolons required, **100-char** line width
- **Prettier** for formatting; **no ESLint/Biome** — the only "lint" step is `tsc --noEmit`
- **TypeScript strict mode**

## CI/CD

- **CI** (`.github/workflows/ci.yml`): `bun install --frozen-lockfile`, build, lint, test.
- **Publish** (`.github/workflows/publish.yml`): triggered by `v*` tags — validates the CalVer tag, builds, tests, then publishes both packages to npm with `--provenance`.

## Versioning

All `@hfu.digital` Kit packages (CourseKit, RoomKit, LoopKit, BoardKit) use **CalVer** in the form `yyyy.mm.version` with a **zero-padded** month — e.g., `2026.04.1`, `2026.04.2`, `2026.05.1`.

- The first release of each calendar month resets `version` to `1`, then increments `1, 2, 3, ...`.
- Versions are **not semver-comparable**. Downstream consumers must pin **exact** versions; range operators (`^`, `~`) do not carry their usual semantics.
- Git tags must match `^v[0-9]{4}\.(0[1-9]|1[0-2])\.[0-9]+$`. The publish workflow's `validate-tag` job rejects malformed tags before any build runs.
- Note: npm strips leading zeros, so `2026.04.2` appears on the registry as `2026.4.2`. Never reference a month that wasn't actually released.
