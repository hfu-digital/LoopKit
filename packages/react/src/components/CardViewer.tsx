import type { RenderedCard } from '../types';

export interface CardViewerProps {
    renderedContent: RenderedCard;
    showBack: boolean;
    className?: string;
}

export function CardViewer({ renderedContent, showBack, className = '' }: CardViewerProps) {
    return (
        <div className={`loopkit-card-viewer ${className}`}>
            <div className={`loopkit-card-inner ${showBack ? 'loopkit-card-flipped' : ''}`}>
                <div
                    className="loopkit-card-front"
                    dangerouslySetInnerHTML={{ __html: renderedContent.front }}
                />
                {showBack && (
                    <div
                        className="loopkit-card-back"
                        dangerouslySetInnerHTML={{ __html: renderedContent.back }}
                    />
                )}
            </div>
        </div>
    );
}
