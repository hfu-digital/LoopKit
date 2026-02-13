# LoopKit

Production-ready, open-source flashcard engine library. Implements the SM-2 spaced repetition algorithm with a NestJS backend module and headless React components.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`@loopkit/nestjs`](packages/nestjs/) | NestJS | NestJS DynamicModule, Prisma adapter, SRS engine, content pipeline |
| [`@loopkit/react`](packages/react/) | React | React hooks + pre-styled components for flashcard UIs |

## Quick Start

### Backend (NestJS)

```typescript
import { LoopKitModule, PrismaLoopKitAdapter } from '@loopkit/nestjs';

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
import { LoopKitProvider, ReviewSession } from '@loopkit/react';
import '@loopkit/react/styles.css';

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
