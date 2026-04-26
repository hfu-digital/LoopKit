import type { ContentTransform, RenderContext } from '../../types/rendering';

const TYPE_RE = /\{\{type:([^}]+)\}\}/g;

/**
 * Anki-compatible type-the-answer transform.
 *
 * Template syntax: `{{type:FieldName}}`
 *
 * Front side renders an `<input>` for the user to type into. Back side
 * renders a `<div>` placeholder that the client populates with a diff of
 * user input vs. the expected value (the field value).
 *
 * The expected answer is embedded as a `data-expected` attribute so the
 * client component can score offline. Back-side reveal also retains the
 * data so the diff persists across re-renders.
 */
export function createTypeAnswerTransform(): ContentTransform {
    return (html: string, context: RenderContext) => {
        return html.replace(TYPE_RE, (_match, fieldName: string) => {
            const name = fieldName.trim();
            const expected = context.fields[name] ?? '';
            const safeExpected = escapeAttr(expected);
            const safeName = escapeAttr(name);

            if ((context.side ?? 'front') === 'front') {
                return (
                    `<input type="text" class="loopkit-type-answer" ` +
                    `data-type-answer="${safeName}" ` +
                    `data-expected="${safeExpected}" ` +
                    `autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />`
                );
            }

            return (
                `<div class="loopkit-type-answer-diff" ` +
                `data-type-answer="${safeName}" ` +
                `data-expected="${safeExpected}"></div>`
            );
        });
    };
}

function escapeAttr(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
