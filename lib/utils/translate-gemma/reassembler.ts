import * as entities from 'entities';

import type { Chunk } from './ast-chunker';

export function reassembleHtml(chunks: Chunk[], translations: string[]): string {
    const parts: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let translated = translations[i];

        for (const [key, html] of chunk.placeholders) {
            translated = translated.replaceAll(key, html);
        }

        const attrEntries = Object.entries(chunk.attrs);
        const attrStr = attrEntries.length > 0 ? ' ' + attrEntries.map(([k, v]) => `${k}="${entities.encodeXML(v)}"`).join(' ') : '';

        parts.push(`<${chunk.tagName}${attrStr}>${entities.encodeXML(translated)}</${chunk.tagName}>`);
    }

    return parts.join('\n');
}
