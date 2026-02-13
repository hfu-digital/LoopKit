import { useDecks } from '../hooks/useDeck';

export interface DeckListProps {
    onDeckSelect: (id: string) => void;
    className?: string;
}

export function DeckList({ onDeckSelect, className = '' }: DeckListProps) {
    const { decks, loading, error } = useDecks();

    if (loading) return <div className={`loopkit-deck-list ${className}`}>Loading decks...</div>;
    if (error) return <div className={`loopkit-deck-list ${className}`}>Error: {error}</div>;

    return (
        <div className={`loopkit-deck-list ${className}`}>
            {decks.map((deck) => (
                <button
                    key={deck.id}
                    className="loopkit-deck-item"
                    onClick={() => onDeckSelect(deck.id)}
                    type="button"
                >
                    <span className="loopkit-deck-name">{deck.name}</span>
                    {deck.description && (
                        <span className="loopkit-deck-desc">{deck.description}</span>
                    )}
                </button>
            ))}
            {decks.length === 0 && (
                <div className="loopkit-deck-empty">No decks yet. Create one to get started.</div>
            )}
        </div>
    );
}
