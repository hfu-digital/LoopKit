# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoopKit is a production-ready flashcard engine library implementing the SM-2 spaced repetition algorithm. It's a **Turborepo monorepo** producing two npm packages:

- **`@loopkit/nestjs`** — NestJS DynamicModule with Prisma adapter, SRS engine, and content pipeline
- **`@loopkit/react`** — React hooks and pre-styled components for flashcard UIs

## Commands

All commands use **Bun** (v1.2.0, strict). Never use npm/yarn/pnpm.

```bash
bun install                  # Install dependencies
bun run build                # Build all packages (Turbo)
bun run dev                  # Watch mode for all packages
bun run lint                 # Type-check via tsc --noEmit
bun run test                 # Run all tests (Vitest)
bun run check                # Type checking
bun run clean                # Remove dist/ and .turbo/
```

### Per-package commands (run from package directory)

```bash
cd packages/nestjs && bun run test           # NestJS tests only
cd packages/nestjs && bun run test:watch     # Watch mode
cd packages/nestjs && bun run test:coverage  # With v8 coverage
cd packages/react && bun run test            # React tests only
```

### Running a single test file

```bash
cd packages/nestjs && bunx vitest run __tests__/sm2.test.ts
cd packages/react && bunx vitest run __tests__/hooks.test.tsx
```

## Architecture

### Turbo Pipeline

Build tasks have `dependsOn: ["^build"]` — packages build in dependency order. `dev` and `clean` are not cached. `lint` and `test` depend on `^build`.

### @loopkit/nestjs (`packages/nestjs/`)

**Build**: `tsc` → `dist/` (CommonJS)

Key layers:
- **`domain/srs/`** — SM-2 algorithm (`sm2.ts`), `SRSAlgorithm` interface, interval preview, day boundary utilities
- **`domain/session.ts`** — `ReviewSessionService`: session state machine, queue building, grading, undo
- **`domain/deck.service.ts`** — Deck hierarchy and config inheritance
- **`domain/note.service.ts`** — Note CRUD and card generation
- **`domain/content-pipeline/`** — Markdown/KaTeX/syntax highlighting transforms (optional peer deps)
- **`domain/import-export.ts`** — CSV/JSON import-export via papaparse
- **`domain/stats.ts`** — Statistics calculations (retention, streaks, forecasts)
- **`interfaces/storage.ts`** — Abstract `LoopKitStorage` class (adapter contract)
- **`adapters/prisma/`** — `PrismaLoopKitAdapter` implementing the storage interface
- **`module.ts`** — `LoopKitModule.register()` DynamicModule entry point
- **`dto/validation.ts`** — Input validation schemas
- **`errors/errors.ts`** — Custom error classes

Registration pattern:
```typescript
LoopKitModule.register({
    storage: new PrismaLoopKitAdapter(prismaClient),
    algorithm?: SRSAlgorithm,       // defaults to SM2Algorithm
    contentPipeline?: ContentPipeline,
})
```

### @loopkit/react (`packages/react/`)

**Build**: Vite library mode → `dist/loopkit-react.js` (ESM) + `dist/loopkit-react.cjs` (CJS). Types via `tsc --emitDeclarationOnly`. CSS copied to `dist/styles.css`.

Key layers:
- **`context/LoopKitProvider.tsx`** — Config context (apiUrl, auth headers)
- **`hooks/`** — `useReviewSession`, `useDeck`, `useCard`, `useStats`, `useImportExport`, `useTags`
- **`components/`** — `ReviewSession`, `CardViewer`, `GradeButtons`, `DeckTree`, `CardEditor`, `StudyStats`, etc.
- **`utils/api-client.ts`** — Fetch wrapper using provider config
- **`styles/loopkit.css`** — CSS custom properties for theming (`--loopkit-*`)

### Core Design Patterns

- **Storage adapter pattern**: All persistence goes through abstract `LoopKitStorage`. Only Prisma adapter exists currently, but the interface is ORM-agnostic.
- **Algorithm pluggability**: `SRSAlgorithm` interface allows swapping SM-2 for custom algorithms.
- **Headless-first React**: Hooks provide all functionality; components are optional pre-styled wrappers.
- **Content pipeline**: Composable transforms with optional peer dependencies (marked, katex, highlight.js, sanitize-html).

### Key Types

- **CardState**: `'new' | 'learning' | 'review' | 'relearning'`
- **Grade**: `'again' | 'hard' | 'good' | 'easy'`
- **DeckConfig**: SM-2 parameters (newCardsPerDay, maxReviewsPerDay, learningSteps, easeFactor ranges)

## Testing

- **Vitest** for both packages
- NestJS tests: Node environment, `__tests__/**/*.test.ts`, coverage excludes `src/index.ts`
- React tests: jsdom environment, `__tests__/**/*.test.{ts,tsx}`, setup file at `__tests__/setup.ts`

## Code Style

- **4-space indentation**
- **Single quotes**, trailing commas (`all`), semicolons required
- **100 character line width**
- **Prettier** for formatting (`.prettierrc` at root)
- **No ESLint/Biome** — linting is `tsc --noEmit` only
- **TypeScript strict mode** with `noUnusedLocals` and `noUnusedParameters`

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on push to main/dev and PRs — `bun install --frozen-lockfile`, build, lint, test
- **Publish** (`.github/workflows/publish.yml`): Triggered by `v*` tags — builds, tests, then publishes both packages to npm
