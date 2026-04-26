import type { OcclusionData, OcclusionMask } from '../../types/entities';
import type { ContentTransform, RenderContext } from '../../types/rendering';

const OCCLUSION_RE = /\{\{occlusion:([^}]+)\}\}/g;

/**
 * Image occlusion transform.
 *
 * Template syntax: `{{occlusion:FieldName}}`
 *
 * The named field stores an `OcclusionData` JSON blob (image media id +
 * mask geometry). This transform renders an `<svg>` overlay positioned on
 * top of the image. The mask whose ordinal matches `context.cardOrdinal`
 * is hidden on the front and revealed on the back; other masks stay
 * visible throughout (Anki "hide one, show others" mode).
 *
 * Image src is left as `data-media-id="<imageMediaId>"` so the
 * media-resolver transform can fill it in downstream.
 */
export function createOcclusionTransform(): ContentTransform {
    return (html: string, context: RenderContext) => {
        return html.replace(OCCLUSION_RE, (_match, fieldName: string) => {
            const value = context.fields[fieldName.trim()];
            if (!value) return '';

            let data: OcclusionData;
            try {
                data = JSON.parse(value);
            } catch {
                return '';
            }
            if (!data || !data.mediaId || !Array.isArray(data.masks)) return '';

            const ordinal = context.cardOrdinal ?? 1;
            const side = context.side ?? 'front';
            return renderOcclusionFigure(data, ordinal, side);
        });
    };
}

function renderOcclusionFigure(
    data: OcclusionData,
    activeOrdinal: number,
    side: 'front' | 'back',
): string {
    const width = data.width || 800;
    const height = data.height || 600;

    const svgMasks = data.masks
        .map((mask, idx) => renderMask(mask, idx + 1, activeOrdinal, side))
        .filter((m) => m !== '')
        .join('');

    return [
        `<figure class="loopkit-occlusion" style="position:relative;display:inline-block;max-width:100%;">`,
        `<img data-media-id="${escapeAttr(data.mediaId)}" alt="" style="display:block;max-width:100%;height:auto;" />`,
        `<svg class="loopkit-occlusion-overlay" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" `,
        `style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">`,
        svgMasks,
        `</svg>`,
        `</figure>`,
    ].join('');
}

function renderMask(
    mask: OcclusionMask,
    ordinal: number,
    activeOrdinal: number,
    side: 'front' | 'back',
): string {
    const isActive = ordinal === activeOrdinal;
    // On the front, the active mask is shown opaque (covering the answer).
    // On the back, the active mask is hidden so the answer is revealed.
    if (isActive && side === 'back') return '';

    const fill = isActive ? 'rgba(255,193,7,0.92)' : 'rgba(40,40,40,0.55)';
    const stroke = isActive ? '#ff9800' : '#1a1a1a';
    const cls = isActive ? 'loopkit-mask loopkit-mask-active' : 'loopkit-mask';
    const dataAttrs = `data-mask-ordinal="${ordinal}"`;

    if (mask.shape === 'rect') {
        return (
            `<rect class="${cls}" ${dataAttrs} ` +
            `x="${mask.x}" y="${mask.y}" width="${mask.width}" height="${mask.height}" ` +
            `fill="${fill}" stroke="${stroke}" stroke-width="1" />`
        );
    }
    if (mask.shape === 'ellipse') {
        return (
            `<ellipse class="${cls}" ${dataAttrs} ` +
            `cx="${mask.cx}" cy="${mask.cy}" rx="${mask.rx}" ry="${mask.ry}" ` +
            `fill="${fill}" stroke="${stroke}" stroke-width="1" />`
        );
    }
    // polygon
    const points = mask.points.map((p) => `${p.x},${p.y}`).join(' ');
    return (
        `<polygon class="${cls}" ${dataAttrs} ` +
        `points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`
    );
}

/**
 * Counts how many masks are present in an occlusion field. Used by the
 * card generator: each mask becomes its own card.
 */
export function countOcclusionMasks(fieldValue: string): number {
    try {
        const data = JSON.parse(fieldValue) as OcclusionData;
        return Array.isArray(data?.masks) ? data.masks.length : 0;
    } catch {
        return 0;
    }
}

function escapeAttr(input: string): string {
    return input.replace(/"/g, '&quot;');
}
