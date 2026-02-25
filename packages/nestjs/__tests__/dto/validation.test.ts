import { describe, it, expect } from 'vitest';
import { validateDeckConfig, validateNote, validateGrade } from '../../src/dto/validation';
import { DEFAULT_DECK_CONFIG } from '../../src/types/config';
import { ValidationError, InvalidGradeError } from '../../src/errors/errors';
import type { NoteType } from '../../src/types/entities';

const basicNoteType: NoteType = {
    id: 'nt-1',
    name: 'Basic',
    fields: [
        { name: 'Front', ordinal: 0, type: 'text', required: true },
        { name: 'Back', ordinal: 1, type: 'text', required: true },
        { name: 'Extra', ordinal: 2, type: 'text', required: false },
    ],
    templates: [{ id: 'tpl-1', name: 'Card 1', front: '{{Front}}', back: '{{Back}}' }],
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('validateDeckConfig', () => {
    it('returns defaults when given empty object', () => {
        const config = validateDeckConfig({});
        expect(config.newCardsPerDay).toBe(DEFAULT_DECK_CONFIG.newCardsPerDay);
        expect(config.maxReviewsPerDay).toBe(DEFAULT_DECK_CONFIG.maxReviewsPerDay);
    });

    it('clamps negative newCardsPerDay to 0', () => {
        const config = validateDeckConfig({ newCardsPerDay: -5 });
        expect(config.newCardsPerDay).toBe(0);
    });

    it('floors fractional newCardsPerDay', () => {
        const config = validateDeckConfig({ newCardsPerDay: 15.7 });
        expect(config.newCardsPerDay).toBe(15);
    });

    it('clamps graduatingInterval to minimum 1', () => {
        const config = validateDeckConfig({ graduatingInterval: 0 });
        expect(config.graduatingInterval).toBe(1);
    });

    it('clamps startingEaseFactor to minimum 1.3', () => {
        const config = validateDeckConfig({ startingEaseFactor: 1.0 });
        expect(config.startingEaseFactor).toBe(1.3);
    });

    it('clamps lapseNewInterval between 0 and 1', () => {
        expect(validateDeckConfig({ lapseNewInterval: -1 }).lapseNewInterval).toBe(0);
        expect(validateDeckConfig({ lapseNewInterval: 2 }).lapseNewInterval).toBe(1);
    });

    it('clamps nextDayStartsAt between 0 and 23', () => {
        expect(validateDeckConfig({ nextDayStartsAt: -1 }).nextDayStartsAt).toBe(0);
        expect(validateDeckConfig({ nextDayStartsAt: 25 }).nextDayStartsAt).toBe(23);
    });

    it('resets empty learningSteps to defaults', () => {
        const config = validateDeckConfig({ learningSteps: [] });
        expect(config.learningSteps).toEqual([1, 10]);
    });

    it('resets empty relearningSteps to defaults', () => {
        const config = validateDeckConfig({ relearningSteps: [] });
        expect(config.relearningSteps).toEqual([10]);
    });

    it('preserves valid overrides', () => {
        const config = validateDeckConfig({ newCardsPerDay: 50, maxReviewsPerDay: 500 });
        expect(config.newCardsPerDay).toBe(50);
        expect(config.maxReviewsPerDay).toBe(500);
    });
});

describe('validateNote', () => {
    it('accepts valid input with all required fields', () => {
        expect(() =>
            validateNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [
                        { name: 'Front', value: 'Hello', ordinal: 0 },
                        { name: 'Back', value: 'World', ordinal: 1 },
                    ],
                },
                basicNoteType,
            ),
        ).not.toThrow();
    });

    it('rejects unknown fields', () => {
        expect(() =>
            validateNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [
                        { name: 'Front', value: 'Hello', ordinal: 0 },
                        { name: 'Back', value: 'World', ordinal: 1 },
                        { name: 'Unknown', value: 'data', ordinal: 2 },
                    ],
                },
                basicNoteType,
            ),
        ).toThrow(ValidationError);
    });

    it('rejects missing required fields', () => {
        expect(() =>
            validateNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [{ name: 'Front', value: 'Hello', ordinal: 0 }],
                },
                basicNoteType,
            ),
        ).toThrow(ValidationError);
    });

    it('rejects empty required fields', () => {
        expect(() =>
            validateNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [
                        { name: 'Front', value: 'Hello', ordinal: 0 },
                        { name: 'Back', value: '   ', ordinal: 1 },
                    ],
                },
                basicNoteType,
            ),
        ).toThrow(ValidationError);
    });

    it('allows missing optional fields', () => {
        expect(() =>
            validateNote(
                {
                    noteTypeId: 'nt-1',
                    fields: [
                        { name: 'Front', value: 'Hello', ordinal: 0 },
                        { name: 'Back', value: 'World', ordinal: 1 },
                    ],
                },
                basicNoteType,
            ),
        ).not.toThrow();
    });
});

describe('validateGrade', () => {
    it('accepts all four valid grades', () => {
        expect(validateGrade('again')).toBe('again');
        expect(validateGrade('hard')).toBe('hard');
        expect(validateGrade('good')).toBe('good');
        expect(validateGrade('easy')).toBe('easy');
    });

    it('rejects invalid grade strings', () => {
        expect(() => validateGrade('excellent')).toThrow(InvalidGradeError);
        expect(() => validateGrade('')).toThrow(InvalidGradeError);
    });
});
