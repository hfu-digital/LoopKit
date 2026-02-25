import { useState } from 'react';
import { useDeckTree } from '../hooks/useDeck';
import type { DeckTreeNode } from '../types';

export interface DeckTreeProps {
    onDeckSelect: (id: string) => void;
    className?: string;
}

function TreeNode({
    node,
    onDeckSelect,
    depth = 0,
}: {
    node: DeckTreeNode;
    onDeckSelect: (id: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.length > 0;

    return (
        <div className="loopkit-tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
            <div className="loopkit-tree-item">
                {hasChildren && (
                    <button
                        className="loopkit-tree-toggle"
                        onClick={() => setExpanded(!expanded)}
                        type="button"
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Collapse deck' : 'Expand deck'}
                    >
                        {expanded ? '▼' : '▶'}
                    </button>
                )}
                <button
                    className="loopkit-tree-label"
                    onClick={() => onDeckSelect(node.id)}
                    type="button"
                >
                    {node.name}
                    {node.counts && (
                        <span className="loopkit-tree-counts">
                            <span className="loopkit-tree-new">{node.counts.new}</span>
                            <span className="loopkit-tree-learning">
                                {node.counts.learning}
                            </span>
                            <span className="loopkit-tree-review">{node.counts.review}</span>
                        </span>
                    )}
                </button>
            </div>
            {hasChildren && expanded && (
                <div className="loopkit-tree-children">
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            onDeckSelect={onDeckSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function DeckTree({ onDeckSelect, className = '' }: DeckTreeProps) {
    const { tree, loading, error } = useDeckTree();

    if (loading) return <div className={`loopkit-deck-tree ${className}`} role="status">Loading...</div>;
    if (error) return <div className={`loopkit-deck-tree ${className}`} role="alert">Error: {error}</div>;

    return (
        <div className={`loopkit-deck-tree ${className}`}>
            {tree.map((node) => (
                <TreeNode key={node.id} node={node} onDeckSelect={onDeckSelect} />
            ))}
        </div>
    );
}
