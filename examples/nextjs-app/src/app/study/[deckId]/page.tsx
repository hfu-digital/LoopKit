'use client';

import { useParams, useRouter } from 'next/navigation';
import { ReviewSession } from '@hfu.digital/loopkit-react';

export default function StudyPage() {
    const params = useParams();
    const router = useRouter();
    const deckId = params.deckId as string;

    return (
        <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
            <button
                onClick={() => router.push('/')}
                style={{ marginBottom: 16, cursor: 'pointer' }}
            >
                &larr; Back to decks
            </button>

            <ReviewSession
                deckId={deckId}
                onComplete={(summary) => {
                    console.log('Session complete:', summary);
                }}
            />
        </main>
    );
}
