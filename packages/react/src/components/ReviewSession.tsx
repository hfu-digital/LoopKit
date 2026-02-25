import { useEffect } from 'react';
import { useReviewSession } from '../hooks/useReviewSession';
import { CardViewer } from './CardViewer';
import { GradeButtons } from './GradeButtons';
import { SessionComplete } from './SessionComplete';
import type { SessionSummary } from '../types';

export interface ReviewSessionProps {
    deckId: string;
    className?: string;
    onComplete?: (summary: SessionSummary) => void;
}

export function ReviewSession({ deckId, className = '', onComplete }: ReviewSessionProps) {
    const session = useReviewSession();

    useEffect(() => {
        if (session.sessionState === 'idle') {
            session.startSession(deckId);
        }
    }, [deckId]);

    useEffect(() => {
        if (session.sessionState === 'complete' && session.summary && onComplete) {
            onComplete(session.summary);
        }
    }, [session.sessionState, session.summary, onComplete]);

    if (session.sessionState === 'loading') {
        return (
            <div className={`loopkit-session ${className}`}>
                <div className="loopkit-session-loading" role="status">Loading study session...</div>
            </div>
        );
    }

    if (session.error) {
        return (
            <div className={`loopkit-session ${className}`}>
                <div className="loopkit-session-error" role="alert">{session.error}</div>
            </div>
        );
    }

    if (session.sessionState === 'complete') {
        return (
            <div className={`loopkit-session ${className}`}>
                <SessionComplete
                    summary={session.summary}
                    onClose={session.endSession}
                />
            </div>
        );
    }

    if (!session.currentCard || !session.renderedContent) return null;

    const showBack = session.sessionState === 'answered';

    return (
        <div className={`loopkit-session ${className}`}>
            <div className="loopkit-session-progress">
                <div
                    className="loopkit-progress-bar"
                    role="progressbar"
                    aria-valuenow={session.progress.reviewed}
                    aria-valuemin={0}
                    aria-valuemax={session.progress.total}
                >
                    <div
                        className="loopkit-progress-fill"
                        style={{
                            width: `${
                                session.progress.total > 0
                                    ? (session.progress.reviewed / session.progress.total) * 100
                                    : 0
                            }%`,
                        }}
                    />
                </div>
                <span className="loopkit-progress-text">
                    {session.progress.reviewed} / {session.progress.total}
                </span>
            </div>

            <CardViewer renderedContent={session.renderedContent} showBack={showBack} />

            {!showBack ? (
                <button
                    className="loopkit-show-answer-btn"
                    onClick={session.showAnswer}
                    type="button"
                >
                    Show Answer
                </button>
            ) : (
                session.nextIntervals && (
                    <GradeButtons
                        onGrade={session.grade}
                        nextIntervals={session.nextIntervals}
                    />
                )
            )}

            {session.canUndo && (
                <button
                    className="loopkit-undo-btn"
                    onClick={session.undo}
                    type="button"
                >
                    Undo
                </button>
            )}
        </div>
    );
}
