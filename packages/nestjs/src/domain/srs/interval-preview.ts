import type { DeckConfig } from '../../types/config';
import type { Grade } from '../../types/grade';
import { GRADES } from '../../types/grade';
import type { SRSAlgorithm, SRSState } from './srs-algorithm';

export function formatInterval(intervalDays: number): string {
    if (intervalDays < 1 / 24) {
        const minutes = Math.max(1, Math.round(intervalDays * 24 * 60));
        return `${minutes}m`;
    }
    if (intervalDays < 1) {
        const hours = Math.round(intervalDays * 24);
        return `${hours}h`;
    }
    if (intervalDays < 31) {
        return `${Math.round(intervalDays)}d`;
    }
    if (intervalDays < 365) {
        const months = Math.round(intervalDays / 30.44);
        return `${months}mo`;
    }
    const years = Math.round((intervalDays / 365) * 10) / 10;
    return `${years}y`;
}

function stateToIntervalDays(state: SRSState, now: Date): number {
    const diffMs = state.dueDate.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
}

export function previewNextIntervals(
    card: SRSState,
    config: DeckConfig,
    algorithm: SRSAlgorithm,
    now: Date = new Date(),
): Record<Grade, string> {
    const result = {} as Record<Grade, string>;

    for (const grade of GRADES) {
        const nextState = algorithm.calculateNextState(card, grade, config, now);
        const intervalDays = stateToIntervalDays(nextState, now);
        result[grade] = formatInterval(intervalDays);
    }

    return result;
}
