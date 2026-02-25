# Changelog

## 1.0.0 (2026-02-25)

### @hfu.digital/loopkit-nestjs

**Features**
- SM-2 spaced repetition algorithm with pluggable `SRSAlgorithm` interface
- `LoopKitModule.register()` NestJS DynamicModule with Prisma storage adapter
- Complete CRUD for decks, notes, cards, note types, and presets
- Deck hierarchy with config inheritance (default → preset → overrides)
- Review session service with queue building, grading, and undo support
- Content pipeline with optional Markdown, KaTeX, syntax highlighting, and HTML sanitization
- CSV and JSON import/export via papaparse
- Statistics: retention rate, study streak, review forecast, grade distribution
- Input validation for deck config, notes, and grades

**Bug Fixes**
- Guarded `JSON.parse` in import to provide user-friendly errors for invalid files

### @hfu.digital/loopkit-react

**Features**
- `LoopKitProvider` context with configurable API URL and custom fetcher
- Hooks: `useReviewSession`, `useDeck`, `useDecks`, `useDeckTree`, `useStats`, `useImportExport`, `useCard`, `useCardEditor`, `useNoteTypes`, `useTags`
- Components: `ReviewSession`, `CardViewer`, `GradeButtons`, `DeckTree`, `DeckList`, `DeckOverview`, `CardEditor`, `SessionComplete`, `StudyStats`
- CSS custom properties theming (`--loopkit-*`) with pre-styled defaults
- Headless-first design: hooks provide all logic, components are optional UI wrappers

**Bug Fixes**
- Fixed `exports` field ordering in package.json (`types` now correctly comes first)

**Accessibility**
- Added `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` to progress bar
- Added `role="status"` to loading states and `role="alert"` to error states across all components
- Added `aria-expanded` and `aria-label` to DeckTree toggle buttons
- Added descriptive `aria-label` to grade buttons with interval information
- Connected all form labels to inputs via `htmlFor`/`id` in CardEditor
- Added `aria-label` to grade distribution and forecast chart visualizations
- Added `prefers-reduced-motion: reduce` media query to disable transitions
