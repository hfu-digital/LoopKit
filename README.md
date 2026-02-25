# LoopKit

Production-ready, open-source flashcard engine library. Implements the SM-2 spaced repetition algorithm with a NestJS backend module and headless React components.

## Key Features

- **SM-2 Spaced Repetition** — Battle-tested algorithm with configurable parameters
- **Pluggable Storage** — Bring your own database via the storage adapter pattern (Prisma adapter included)
- **Headless-First Frontend** — Use hooks for full control, or drop in pre-styled components
- **Content Pipeline** — Template interpolation with optional Markdown, KaTeX, and code highlighting transforms
- **Import/Export** — CSV and JSON import/export for deck portability
- **Statistics** — Pure functions for retention rate, study streak, review forecast, and more
- **Undo Support** — Undo the last review during a study session
- **Deck Hierarchy** — Nested decks with inherited configuration

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`@hfu.digital/loopkit-nestjs`](packages/nestjs/) | NestJS | NestJS DynamicModule, Prisma adapter, SRS engine, content pipeline |
| [`@hfu.digital/loopkit-react`](packages/react/) | React | React hooks + pre-styled components for flashcard UIs |

## Quick Start

### Backend (NestJS)

```typescript
import { LoopKitModule, PrismaLoopKitAdapter } from '@hfu.digital/loopkit-nestjs';

@Module({
    imports: [
        LoopKitModule.register({
            storage: new PrismaLoopKitAdapter(prismaClient),
        }),
    ],
})
export class AppModule {}
```

### Frontend (React)

```tsx
import { LoopKitProvider, ReviewSession } from '@hfu.digital/loopkit-react';
import '@hfu.digital/loopkit-react/styles.css';

function App() {
    return (
        <LoopKitProvider apiUrl="/api/loopkit">
            <ReviewSession deckId="deck-123" />
        </LoopKitProvider>
    );
}
```

## Development

```bash
bun install
bun run build
bun run test
```

## License

MIT
