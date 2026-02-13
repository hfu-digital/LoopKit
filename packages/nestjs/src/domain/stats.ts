import type { CardBase, ReviewLog } from '../types/entities';
import { getDayStart } from './srs/day-boundary';

function dateKey(date: Date): string {
    return date.toISOString().split('T')[0]!;
}

export function reviewsPerDay(logs: ReviewLog[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const log of logs) {
        const key = dateKey(log.reviewedAt);
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
}

export function retentionRate(logs: ReviewLog[]): number {
    if (logs.length === 0) return 0;
    const reviewLogs = logs.filter((l) => l.prevState.state === 'review');
    if (reviewLogs.length === 0) return 0;
    const correct = reviewLogs.filter((l) => l.grade !== 'again').length;
    return correct / reviewLogs.length;
}

export function reviewForecast(cards: CardBase[], days = 30): Map<string, number> {
    const map = new Map<string, number>();
    const now = new Date();

    for (let d = 0; d < days; d++) {
        const day = new Date(now.getTime() + d * 86400000);
        map.set(dateKey(day), 0);
    }

    for (const card of cards) {
        if (card.state === 'review' || card.state === 'relearning') {
            const key = dateKey(card.dueDate);
            if (map.has(key)) {
                map.set(key, map.get(key)! + 1);
            }
        }
    }

    return map;
}

export function deckBreakdown(cards: CardBase[]): {
    new: number;
    learning: number;
    review: number;
    relearning: number;
} {
    const result = { new: 0, learning: 0, review: 0, relearning: 0 };
    for (const card of cards) {
        result[card.state]++;
    }
    return result;
}

export function studyStreak(logs: ReviewLog[], nextDayStartsAt = 4): number {
    if (logs.length === 0) return 0;

    const sortedLogs = [...logs].sort(
        (a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime(),
    );

    const daysStudied = new Set<string>();
    for (const log of sortedLogs) {
        const dayStart = getDayStart(log.reviewedAt, nextDayStartsAt);
        daysStudied.add(dateKey(dayStart));
    }

    const sortedDays = [...daysStudied].sort().reverse();
    if (sortedDays.length === 0) return 0;

    // Check if today or yesterday is included
    const today = dateKey(getDayStart(new Date(), nextDayStartsAt));
    const yesterday = dateKey(
        getDayStart(new Date(Date.now() - 86400000), nextDayStartsAt),
    );

    if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
        return 0;
    }

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]!);
        const curr = new Date(sortedDays[i]!);
        const diffDays = Math.round(
            (prev.getTime() - curr.getTime()) / 86400000,
        );

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

export function averageEase(cards: CardBase[]): number {
    if (cards.length === 0) return 0;
    const sum = cards.reduce((acc, c) => acc + c.easeFactor, 0);
    return sum / cards.length;
}

export function lapseRate(logs: ReviewLog[]): number {
    const reviewLogs = logs.filter((l) => l.prevState.state === 'review');
    if (reviewLogs.length === 0) return 0;
    const lapses = reviewLogs.filter((l) => l.grade === 'again').length;
    return lapses / reviewLogs.length;
}

export function sessionSummary(logs: ReviewLog[]): {
    totalReviewed: number;
    averageTimeMs: number;
    retention: number;
} {
    const totalReviewed = logs.length;
    const totalTime = logs.reduce((sum, l) => sum + l.timeTakenMs, 0);
    const averageTimeMs = totalReviewed > 0 ? totalTime / totalReviewed : 0;
    const retention = retentionRate(logs);
    return { totalReviewed, averageTimeMs, retention };
}
