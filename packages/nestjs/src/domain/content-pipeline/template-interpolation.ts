/**
 * Interpolates template strings with field values.
 *
 * Supported syntax:
 * - {{FieldName}} — replaced with field value
 * - {{#FieldName}}content{{/FieldName}} — content if field is non-empty
 * - {{^FieldName}}content{{/FieldName}} — content if field is empty
 * - {{FrontSide}} — insert the rendered front (back template only)
 *
 * Filter expressions (`{{filter:Field}}`, e.g. {{cloze:Text}}, {{type:Answer}},
 * {{hint:Field}}, {{occlusion:Image}}) are LEFT INTACT for downstream transforms
 * to handle.
 */
export function interpolateTemplate(
    template: string,
    fields: Record<string, string>,
    frontRendered?: string,
): string {
    let result = template;

    // Handle conditionals first (they may be nested)
    result = processConditionals(result, fields);

    // Replace {{FrontSide}} if provided
    if (frontRendered !== undefined) {
        result = result.replace(/\{\{FrontSide\}\}/g, frontRendered);
    }

    // Replace {{FieldName}} with field values.
    // Excludes patterns with `:` so filter expressions (e.g. {{cloze:Text}})
    // pass through to downstream transforms.
    result = result.replace(/\{\{([^#^/:}][^:}]*)\}\}/g, (_match, fieldName: string) => {
        const trimmed = fieldName.trim();
        if (trimmed === 'FrontSide') return frontRendered ?? '';
        return fields[trimmed] ?? '';
    });

    return result;
}

function processConditionals(template: string, fields: Record<string, string>): string {
    let result = template;
    let changed = true;
    let iterations = 0;
    const maxIterations = 50;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        // Positive conditionals: {{#Field}}...{{/Field}}
        result = result.replace(
            /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
            (_match, fieldName: string, content: string) => {
                changed = true;
                const value = fields[fieldName.trim()] ?? '';
                return value.trim() ? content : '';
            },
        );

        // Negative conditionals: {{^Field}}...{{/Field}}
        result = result.replace(
            /\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
            (_match, fieldName: string, content: string) => {
                changed = true;
                const value = fields[fieldName.trim()] ?? '';
                return value.trim() ? '' : content;
            },
        );
    }

    return result;
}
