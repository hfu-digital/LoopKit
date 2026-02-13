'use client';

import { useParams, useRouter } from 'next/navigation';
import { StudyStats } from '@loopkit/react';

export default function StatsPage() {
    const params = useParams();
    const router = useRouter();
    const deckId = params.deckId as string;

    return (
        <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
            <button
                onClick={() => router.push('/')}
                style={{ marginBottom: 16, cursor: 'pointer' }}
            >
                &larr; Back to decks
            </button>

            <h1>Statistics</h1>
            <StudyStats deckId={deckId} />
        </main>
    );
}
