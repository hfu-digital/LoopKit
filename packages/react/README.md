# @loopkit/react

React hooks and pre-styled components for LoopKit flashcard engine. Headless-first design — use the hooks directly or the included components.

## Installation

```bash
bun add @loopkit/react
```

## Setup

Wrap your app with `LoopKitProvider`:

```tsx
import { LoopKitProvider } from '@loopkit/react';
import '@loopkit/react/styles.css';

function App() {
    return (
        <LoopKitProvider apiUrl="/api/loopkit">
            {/* Your app */}
        </LoopKitProvider>
    );
}
```

Pass a custom `fetcher` for authentication:

```tsx
<LoopKitProvider
    apiUrl="/api/loopkit"
    fetcher={(url, init) =>
        fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } })
    }
>
```

## Review Session

### Pre-styled component

```tsx
import { ReviewSession } from '@loopkit/react';

<ReviewSession
    deckId="deck-123"
    onComplete={(summary) => console.log('Done!', summary)}
/>
```

### Headless hook

```tsx
import { useReviewSession } from '@loopkit/react';

function MyReviewUI() {
    const session = useReviewSession();

    return (
        <div>
            <button onClick={() => session.startSession('deck-123')}>Start</button>
            {session.renderedContent && (
                <div dangerouslySetInnerHTML={{ __html: session.renderedContent.front }} />
            )}
            <button onClick={session.showAnswer}>Show Answer</button>
            <button onClick={() => session.grade('good')}>Good</button>
        </div>
    );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `<ReviewSession>` | Full study session with progress bar, card viewer, grade buttons |
| `<CardViewer>` | Renders front/back of a card |
| `<GradeButtons>` | Again/Hard/Good/Easy buttons with interval previews |
| `<SessionComplete>` | End-of-session summary |
| `<DeckList>` | List of decks |
| `<DeckOverview>` | Single deck with counts and "Study Now" button |
| `<DeckTree>` | Hierarchical deck browser |
| `<CardEditor>` | Create/edit notes with dynamic field inputs |
| `<StudyStats>` | Retention, streak, forecast charts |

## Hooks

| Hook | Description |
|------|-------------|
| `useReviewSession()` | Full session state machine |
| `useDeck(id)` | Deck + counts |
| `useDecks()` | All decks |
| `useDeckTree()` | Hierarchical deck tree |
| `useCard(id)` | Card + rendered content |
| `useCardEditor()` | Create/update notes |
| `useNoteTypes()` | Available note types |
| `useStats(deckId)` | Deck statistics |
| `useImport()` | CSV/JSON import |
| `useExport()` | CSV/JSON export |
| `useTags()` | All tags |

## Theming

Override CSS custom properties:

```css
:root {
    --loopkit-primary: #8b5cf6;
    --loopkit-grade-again: #dc2626;
    --loopkit-grade-hard: #ea580c;
    --loopkit-grade-good: #16a34a;
    --loopkit-grade-easy: #2563eb;
    --loopkit-bg: #ffffff;
    --loopkit-text: #111827;
    --loopkit-border: #d1d5db;
    --loopkit-radius: 12px;
    --loopkit-font: 'Inter', sans-serif;
}
```

## License

MIT
