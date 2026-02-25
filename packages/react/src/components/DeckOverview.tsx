import { useDeck } from '../hooks/useDeck';

export interface DeckOverviewProps {
    deckId: string;
    onStudy: () => void;
    className?: string;
}

export function DeckOverview({ deckId, onStudy, className = '' }: DeckOverviewProps) {
    const { deck, counts, loading, error } = useDeck(deckId);

    if (loading) return <div className={`loopkit-deck-overview ${className}`} role="status">Loading...</div>;
    if (error) return <div className={`loopkit-deck-overview ${className}`} role="alert">Error: {error}</div>;
    if (!deck) return null;

    return (
        <div className={`loopkit-deck-overview ${className}`}>
            <h2 className="loopkit-deck-title">{deck.name}</h2>
            {deck.description && <p className="loopkit-deck-description">{deck.description}</p>}

            {counts && (
                <div className="loopkit-deck-counts">
                    <div className="loopkit-count loopkit-count-new">
                        <span className="loopkit-count-value">{counts.new}</span>
                        <span className="loopkit-count-label">New</span>
                    </div>
                    <div className="loopkit-count loopkit-count-learning">
                        <span className="loopkit-count-value">{counts.learning}</span>
                        <span className="loopkit-count-label">Learning</span>
                    </div>
                    <div className="loopkit-count loopkit-count-review">
                        <span className="loopkit-count-value">{counts.review}</span>
                        <span className="loopkit-count-label">Review</span>
                    </div>
                </div>
            )}

            <button className="loopkit-study-btn" onClick={onStudy} type="button">
                Study Now
            </button>
        </div>
    );
}
