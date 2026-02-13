import { useStats } from '../hooks/useStats';

export interface StudyStatsProps {
    deckId: string;
    className?: string;
}

export function StudyStats({ deckId, className = '' }: StudyStatsProps) {
    const { stats, loading, error } = useStats(deckId);

    if (loading) return <div className={`loopkit-stats ${className}`}>Loading stats...</div>;
    if (error) return <div className={`loopkit-stats ${className}`}>Error: {error}</div>;
    if (!stats) return null;

    const retentionPct = Math.round(stats.retention * 100);

    return (
        <div className={`loopkit-stats ${className}`}>
            <div className="loopkit-stats-grid">
                <div className="loopkit-stat-card">
                    <span className="loopkit-stat-value">{retentionPct}%</span>
                    <span className="loopkit-stat-label">Retention</span>
                </div>
                <div className="loopkit-stat-card">
                    <span className="loopkit-stat-value">{stats.streak}</span>
                    <span className="loopkit-stat-label">Day Streak</span>
                </div>
                <div className="loopkit-stat-card">
                    <span className="loopkit-stat-value">{stats.averageEase.toFixed(2)}</span>
                    <span className="loopkit-stat-label">Avg Ease</span>
                </div>
            </div>

            <div className="loopkit-stats-breakdown">
                <h3>Card States</h3>
                <div className="loopkit-breakdown-bars">
                    <div className="loopkit-bar loopkit-bar-new" style={{ flex: stats.breakdown.new }}>
                        New: {stats.breakdown.new}
                    </div>
                    <div className="loopkit-bar loopkit-bar-learning" style={{ flex: stats.breakdown.learning }}>
                        Learning: {stats.breakdown.learning}
                    </div>
                    <div className="loopkit-bar loopkit-bar-review" style={{ flex: stats.breakdown.review }}>
                        Review: {stats.breakdown.review}
                    </div>
                </div>
            </div>

            <div className="loopkit-stats-forecast">
                <h3>Review Forecast</h3>
                <div className="loopkit-forecast-chart">
                    {Object.entries(stats.forecast)
                        .slice(0, 14)
                        .map(([date, count]) => {
                            const maxCount = Math.max(
                                1,
                                ...Object.values(stats.forecast).slice(0, 14),
                            );
                            return (
                                <div key={date} className="loopkit-forecast-bar-wrapper">
                                    <div
                                        className="loopkit-forecast-bar"
                                        style={{ height: `${(count / maxCount) * 100}%` }}
                                    />
                                    <span className="loopkit-forecast-label">
                                        {new Date(date).getDate()}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
