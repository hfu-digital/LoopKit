'use client';

import { useState } from 'react';
import { CardEditor, useDecks } from '@hfu.digital/loopkit-react';

export default function EditorPage() {
    const { decks } = useDecks();
    const [selectedDeckId, setSelectedDeckId] = useState('');
    const [saved, setSaved] = useState(false);

    return (
        <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
            <h1>Add Card</h1>

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                    Deck
                </label>
                <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px' }}
                >
                    <option value="">Select a deck...</option>
                    {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDeckId && (
                <CardEditor
                    deckId={selectedDeckId}
                    onSave={() => {
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                    }}
                />
            )}

            {saved && (
                <div style={{ color: 'green', marginTop: 12 }}>Card saved!</div>
            )}
        </main>
    );
}
