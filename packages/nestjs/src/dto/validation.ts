import { DEFAULT_DECK_CONFIG, type DeckConfig } from '../types/config';
import type { Grade } from '../types/grade';
import { GRADES } from '../types/grade';
import type { NoteType } from '../types/entities';
import type { CreateNoteInput } from '../types/inputs';
import { InvalidGradeError, ValidationError } from '../errors/errors';

export function validateDeckConfig(partial: Partial<DeckConfig>): DeckConfig {
    const config: DeckConfig = { ...DEFAULT_DECK_CONFIG, ...partial };

    config.newCardsPerDay = Math.max(0, Math.floor(config.newCardsPerDay));
    config.maxReviewsPerDay = Math.max(0, Math.floor(config.maxReviewsPerDay));
    config.graduatingInterval = Math.max(1, config.graduatingInterval);
    config.easyInterval = Math.max(1, config.easyInterval);
    config.maxInterval = Math.max(1, config.maxInterval);
    config.startingEaseFactor = Math.max(1.3, config.startingEaseFactor);
    config.hardIntervalMultiplier = Math.max(0.5, config.hardIntervalMultiplier);
    config.easyBonus = Math.max(1.0, config.easyBonus);
    config.lapseNewInterval = Math.max(0, Math.min(1, config.lapseNewInterval));
    config.lapseMinInterval = Math.max(1, config.lapseMinInterval);
    config.nextDayStartsAt = Math.max(0, Math.min(23, Math.floor(config.nextDayStartsAt)));

    if (!config.learningSteps.length) {
        config.learningSteps = [1, 10];
    }
    if (!config.relearningSteps.length) {
        config.relearningSteps = [10];
    }

    return config;
}

export function validateNote(input: CreateNoteInput, noteType: NoteType): void {
    const fieldNames = new Set(noteType.fields.map((f) => f.name));
    const requiredFields = noteType.fields.filter((f) => f.required).map((f) => f.name);

    for (const field of input.fields) {
        if (!fieldNames.has(field.name)) {
            throw new ValidationError(
                `Field '${field.name}' does not exist on note type '${noteType.name}'`,
            );
        }
    }

    const providedFields = new Set(input.fields.map((f) => f.name));
    for (const required of requiredFields) {
        if (!providedFields.has(required)) {
            throw new ValidationError(
                `Required field '${required}' is missing for note type '${noteType.name}'`,
            );
        }
        const field = input.fields.find((f) => f.name === required);
        if (field && !field.value.trim()) {
            throw new ValidationError(
                `Required field '${required}' cannot be empty for note type '${noteType.name}'`,
            );
        }
    }
}

export function validateGrade(grade: string): Grade {
    if (!GRADES.includes(grade as Grade)) {
        throw new InvalidGradeError(grade);
    }
    return grade as Grade;
}
