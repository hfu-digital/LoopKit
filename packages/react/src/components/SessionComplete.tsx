import type { SessionSummary } from '../types';

export interface SessionCompleteProps {
    summary: SessionSummary | null;
    className?: string;
    onClose?: () => void;
}

export function SessionComplete({ summary, className = '', onClose }: SessionCompleteProps) {
    if (!summary) {
        return (
            <div className={`loopkit-session-complete ${className}`}>
                <h2>Session Complete</h2>
                <p>No cards to review. Come back later!</p>
                {onClose && (
                    <button className="loopkit-close-btn" onClick={onClose} type="button">
                        Close
                    </button>
                )}
            </div>
        );
    }

    const accuracy =
        summary.totalReviewed > 0
            ? Math.round((summary.correctCount / summary.totalReviewed) * 100)
            : 0;

    return (
        <div className={`loopkit-session-complete ${className}`}>
            <h2>Session Complete!</h2>

            <div className="loopkit-summary-grid">
                <div className="loopkit-summary-stat">
                    <span className="loopkit-summary-value">{summary.totalReviewed}</span>
                    <span className="loopkit-summary-label">Cards Reviewed</span>
                </div>
                <div className="loopkit-summary-stat">
                    <span className="loopkit-summary-value">{accuracy}%</span>
                    <span className="loopkit-summary-label">Accuracy</span>
                </div>
                <div className="loopkit-summary-stat">
                    <span className="loopkit-summary-value">
                        {Math.round(summary.averageTimeMsPerCard / 1000)}s
                    </span>
                    <span className="loopkit-summary-label">Avg per Card</span>
                </div>
            </div>

            <div className="loopkit-grade-distribution" aria-label="Grade distribution">
                <div className="loopkit-dist-bar loopkit-dist-again" style={{ flex: summary.gradeDistribution.again }}>
                    {summary.gradeDistribution.again > 0 && `Again: ${summary.gradeDistribution.again}`}
                </div>
                <div className="loopkit-dist-bar loopkit-dist-hard" style={{ flex: summary.gradeDistribution.hard }}>
                    {summary.gradeDistribution.hard > 0 && `Hard: ${summary.gradeDistribution.hard}`}
                </div>
                <div className="loopkit-dist-bar loopkit-dist-good" style={{ flex: summary.gradeDistribution.good }}>
                    {summary.gradeDistribution.good > 0 && `Good: ${summary.gradeDistribution.good}`}
                </div>
                <div className="loopkit-dist-bar loopkit-dist-easy" style={{ flex: summary.gradeDistribution.easy }}>
                    {summary.gradeDistribution.easy > 0 && `Easy: ${summary.gradeDistribution.easy}`}
                </div>
            </div>

            {onClose && (
                <button className="loopkit-close-btn" onClick={onClose} type="button">
                    Close
                </button>
            )}
        </div>
    );
}
