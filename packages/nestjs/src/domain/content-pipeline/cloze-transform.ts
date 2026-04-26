import type { ContentTransform, RenderContext } from '../../types/rendering';

const CLOZE_FILTER_RE = /\{\{cloze:([^}]+)\}\}/g;
const CLOZE_MARKER_RE = /\{\{c(\d+)::([^}]+?)(?:::([^}]+?))?\}\}/g;

/**
 * Anki-compatible cloze deletion transform.
 *
 * Template syntax:  `{{cloze:FieldName}}` — pulls the named cloze field's value
 * Field marker:     `{{c1::answer}}` or `{{c1::answer::hint}}`
 *
 * Behavior depends on `context.cardOrdinal` (the active cN being asked about)
 * and `context.side` ('front' hides the active marker; 'back' reveals it):
 *   - active + front → hidden box `[hint]`
 *   - active + back  → revealed answer (highlighted)
 *   - inactive       → revealed answer (plain)
 */
export function createClozeTransform(): ContentTransform {
    return (html: string, context: RenderContext) => {
        return html.replace(CLOZE_FILTER_RE, (_match, fieldName: string) => {
            const value = context.fields[fieldName.trim()] ?? '';
            return renderClozeContent(value, context.cardOrdinal, context.side ?? 'front');
        });
    };
}

function renderClozeContent(
    text: string,
    activeOrdinal: number | undefined,
    side: 'front' | 'back',
): string {
    return text.replace(CLOZE_MARKER_RE, (_match, num: string, answer: string, hint?: string) => {
        const n = parseInt(num, 10);
        const isActive = activeOrdinal === n;
        const safeHint = hint ? escapeHtml(hint) : '...';
        const safeAnswer = escapeHtml(answer);

        if (isActive && side === 'front') {
            return `<span class="cloze cloze-hidden" data-cloze="${n}">[${safeHint}]</span>`;
        }
        if (isActive && side === 'back') {
            return `<span class="cloze cloze-active" data-cloze="${n}">${safeAnswer}</span>`;
        }
        return `<span class="cloze cloze-inactive" data-cloze="${n}">${safeAnswer}</span>`;
    });
}

/**
 * Counts the distinct cN ordinals present in a cloze field value.
 * Used by the card generator to decide how many cards to create.
 */
export function countClozeOrdinals(fieldValue: string): number[] {
    const ordinals = new Set<number>();
    const re = new RegExp(CLOZE_MARKER_RE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(fieldValue)) !== null) {
        ordinals.add(parseInt(match[1], 10));
    }
    return Array.from(ordinals).sort((a, b) => a - b);
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
