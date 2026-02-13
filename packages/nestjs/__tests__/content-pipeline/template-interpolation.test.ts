import { describe, it, expect } from 'vitest';
import { interpolateTemplate } from '../../src/domain/content-pipeline/template-interpolation';

describe('interpolateTemplate', () => {
    const fields = {
        Front: 'What is 2+2?',
        Back: '4',
        Hint: 'Think about math',
        Empty: '',
    };

    it('replaces simple field references', () => {
        expect(interpolateTemplate('{{Front}}', fields)).toBe('What is 2+2?');
        expect(interpolateTemplate('{{Back}}', fields)).toBe('4');
    });

    it('replaces multiple fields', () => {
        expect(interpolateTemplate('Q: {{Front}} A: {{Back}}', fields)).toBe(
            'Q: What is 2+2? A: 4',
        );
    });

    it('handles unknown fields as empty string', () => {
        expect(interpolateTemplate('{{Unknown}}', fields)).toBe('');
    });

    it('handles positive conditionals (non-empty)', () => {
        expect(interpolateTemplate('{{#Hint}}Hint: {{Hint}}{{/Hint}}', fields)).toBe(
            'Hint: Think about math',
        );
    });

    it('handles positive conditionals (empty)', () => {
        expect(interpolateTemplate('{{#Empty}}Has content{{/Empty}}', fields)).toBe('');
    });

    it('handles negative conditionals (empty field)', () => {
        expect(interpolateTemplate('{{^Empty}}No content{{/Empty}}', fields)).toBe('No content');
    });

    it('handles negative conditionals (non-empty field)', () => {
        expect(interpolateTemplate('{{^Front}}Fallback{{/Front}}', fields)).toBe('');
    });

    it('handles nested conditionals', () => {
        const template = '{{#Front}}{{#Hint}}Both: {{Hint}}{{/Hint}}{{/Front}}';
        expect(interpolateTemplate(template, fields)).toBe('Both: Think about math');
    });

    it('handles FrontSide replacement on back', () => {
        const template = '{{FrontSide}}<hr>{{Back}}';
        expect(interpolateTemplate(template, fields, '<b>Front</b>')).toBe(
            '<b>Front</b><hr>4',
        );
    });

    it('handles FrontSide without rendered front', () => {
        expect(interpolateTemplate('{{FrontSide}}', fields)).toBe('');
    });

    it('handles missing conditionals field as empty', () => {
        expect(interpolateTemplate('{{#Missing}}X{{/Missing}}', fields)).toBe('');
        expect(interpolateTemplate('{{^Missing}}Y{{/Missing}}', fields)).toBe('Y');
    });
});
