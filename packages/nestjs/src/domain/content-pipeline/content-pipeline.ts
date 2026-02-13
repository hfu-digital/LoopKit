import type { NoteBase, TemplateDef } from '../../types/entities';
import type { RenderedCard, ContentTransform, RenderContext } from '../../types/rendering';
import { interpolateTemplate } from './template-interpolation';

export interface ContentPipeline {
    transforms: ContentTransform[];
    render(note: NoteBase, template: TemplateDef): RenderedCard;
}

/**
 * Creates a content pipeline with optional transforms.
 *
 * Built-in transforms (marked, katex, highlight.js, sanitize-html) are
 * available as optional peer dependencies. Pass them in via the transforms array.
 *
 * The pipeline always includes template interpolation as the first step.
 */
export function createContentPipeline(transforms?: ContentTransform[]): ContentPipeline {
    const pipeline: ContentPipeline = {
        transforms: transforms ?? [],

        render(note: NoteBase, template: TemplateDef): RenderedCard {
            const fields: Record<string, string> = {};
            for (const field of note.fields) {
                fields[field.name] = field.value;
            }

            const context: RenderContext = {
                fields,
                cardState: 'new',
            };

            // Render front
            let front = interpolateTemplate(template.front, fields);
            for (const transform of pipeline.transforms) {
                front = transform(front, context);
            }

            // Render back (with FrontSide available)
            let back = interpolateTemplate(template.back, fields, front);
            for (const transform of pipeline.transforms) {
                back = transform(back, context);
            }

            return { front, back };
        },
    };

    return pipeline;
}

// ─── Optional built-in transforms ────────────────────────────────────

/**
 * Create a markdown transform using the `marked` library.
 * Requires `marked` as a peer dependency.
 */
export function createMarkdownTransform(marked: { parse: (src: string) => string }): ContentTransform {
    return (html: string) => {
        try {
            return marked.parse(html);
        } catch {
            return html;
        }
    };
}

/**
 * Create a KaTeX transform for math rendering.
 * Requires `katex` as a peer dependency.
 */
export function createKatexTransform(katex: {
    renderToString: (tex: string, options?: Record<string, unknown>) => string;
}): ContentTransform {
    return (html: string) => {
        // Block math: $$...$$
        let result = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) => {
            try {
                return katex.renderToString(tex.trim(), { displayMode: true });
            } catch {
                return _match;
            }
        });

        // Inline math: $...$  (not preceded/followed by $)
        result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, tex: string) => {
            try {
                return katex.renderToString(tex.trim(), { displayMode: false });
            } catch {
                return _match;
            }
        });

        return result;
    };
}

/**
 * Create a code highlight transform.
 * Requires `highlight.js` as a peer dependency.
 */
export function createCodeHighlightTransform(hljs: {
    highlightAuto: (code: string) => { value: string };
}): ContentTransform {
    return (html: string) => {
        return html.replace(
            /<code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code>/g,
            (_match, _lang: string | undefined, code: string) => {
                try {
                    const result = hljs.highlightAuto(code);
                    return `<code>${result.value}</code>`;
                } catch {
                    return _match;
                }
            },
        );
    };
}

/**
 * Create a sanitize transform.
 * Requires `sanitize-html` as a peer dependency.
 */
export function createSanitizeTransform(sanitize: (dirty: string) => string): ContentTransform {
    return (html: string) => sanitize(html);
}
