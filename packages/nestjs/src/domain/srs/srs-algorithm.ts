import type { DeckConfig } from '../../types/config';
import type { Grade } from '../../types/grade';

export interface SRSState {
    state: 'new' | 'learning' | 'review' | 'relearning';
    easeFactor: number;
    interval: number;
    dueDate: Date;
    currentStep: number;
    lapseCount: number;
    reviewCount: number;
}

export interface SRSAlgorithm {
    calculateNextState(card: SRSState, grade: Grade, config: DeckConfig, now?: Date): SRSState;
    getInitialState(config: DeckConfig, now?: Date): SRSState;
}
