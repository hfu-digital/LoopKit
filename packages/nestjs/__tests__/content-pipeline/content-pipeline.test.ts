import { describe, it, expect } from 'vitest';
import { createContentPipeline } from '../../src/domain/content-pipeline/content-pipeline';
import type { NoteBase, TemplateDef } from '../../src/types/entities';
import type { ContentTransform } from '../../src/types/rendering';

function makeNote(fields: Record<string, string>): NoteBase {
    return {
        id: 'note-1',
        noteTypeId: 'type-1',
        fields: Object.entries(fields).map(([name, value], i) => ({
            name,
            value,
            ordinal: i,
        })),
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

const basicTemplate: TemplateDef = {
    id: 'tpl-1',
    name: 'Basic',
    front: '{{Front}}',
    back: '{{FrontSide}}<hr>{{Back}}',
};

describe('ContentPipeline', () => {
    it('renders a basic card', () => {
        const pipeline = createContentPipeline();
        const note = makeNote({ Front: 'Question?', Back: 'Answer!' });
        const rendered = pipeline.render(note, basicTemplate);

        expect(rendered.front).toBe('Question?');
        expect(rendered.back).toBe('Question?<hr>Answer!');
    });

    it('applies custom transforms', () => {
        const uppercase: ContentTransform = (html) => html.toUpperCase();
        const pipeline = createContentPipeline([uppercase]);
        const note = makeNote({ Front: 'hello', Back: 'world' });
        const rendered = pipeline.render(note, basicTemplate);

        expect(rendered.front).toBe('HELLO');
        expect(rendered.back).toBe('HELLO<HR>WORLD');
    });

    it('applies transforms in order', () => {
        const addPrefix: ContentTransform = (html) => `[prefix]${html}`;
        const addSuffix: ContentTransform = (html) => `${html}[suffix]`;
        const pipeline = createContentPipeline([addPrefix, addSuffix]);
        const note = makeNote({ Front: 'test', Back: 'ok' });
        const rendered = pipeline.render(note, {
            id: 'tpl',
            name: 'Simple',
            front: '{{Front}}',
            back: '{{Back}}',
        });

        expect(rendered.front).toBe('[prefix]test[suffix]');
    });

    it('handles template with conditionals', () => {
        const pipeline = createContentPipeline();
        const template: TemplateDef = {
            id: 'tpl',
            name: 'Cond',
            front: '{{Front}}{{#Hint}}<br>Hint: {{Hint}}{{/Hint}}',
            back: '{{Back}}',
        };

        const withHint = makeNote({ Front: 'Q', Back: 'A', Hint: 'H' });
        const withoutHint = makeNote({ Front: 'Q', Back: 'A' });

        expect(pipeline.render(withHint, template).front).toBe('Q<br>Hint: H');
        expect(pipeline.render(withoutHint, template).front).toBe('Q');
    });

    it('handles empty fields gracefully', () => {
        const pipeline = createContentPipeline();
        const note = makeNote({ Front: '', Back: '' });
        const rendered = pipeline.render(note, basicTemplate);
        expect(rendered.front).toBe('');
    });
});
