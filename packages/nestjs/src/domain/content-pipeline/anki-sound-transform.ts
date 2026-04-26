import type { ContentTransform } from '../../types/rendering';

const SOUND_RE = /\[sound:([^\]]+)\]/g;

/**
 * Anki-compatible `[sound:filename.mp3]` shortcut.
 *
 * Converts the legacy Anki sound marker to a standard `<audio>` element so
 * pasted/imported Anki content renders inline. The filename becomes a
 * `data-media-name` reference that the client can resolve against an
 * uploaded media catalogue (or fall back to displaying the name).
 */
export function createAnkiSoundTransform(): ContentTransform {
    return (html: string) => {
        return html.replace(SOUND_RE, (_match, filename: string) => {
            const safe = filename.replace(/"/g, '&quot;');
            return `<audio controls preload="none" data-media-name="${safe}"></audio>`;
        });
    };
}
