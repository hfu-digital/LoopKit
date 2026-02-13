'use client';

import { useState } from 'react';
import { DeckList, DeckOverview } from '@loopkit/react';

export default function Home() {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

    return (
        <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
            <h1>LoopKit Example</h1>

            {!selectedDeckId ? (
                <>
                    <h2>Your Decks</h2>
                    <DeckList onDeckSelect={setSelectedDeckId} />
                </>
            ) : (
                <>
                    <button
                        onClick={() => setSelectedDeckId(null)}
                        style={{ marginBottom: 16, cursor: 'pointer' }}
                    >
                        &larr; Back to decks
                    </button>
                    <DeckOverview
                        deckId={selectedDeckId}
                        onStudy={() => window.location.href = `/study/${selectedDeckId}`}
                    />
                </>
            )}
        </main>
    );
}
