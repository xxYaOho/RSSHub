import * as entities from 'entities';

import type { Chunk, ListParent } from './ast-chunker';

function buildAttrsStr(attrs: Record<string, string>): string {
    const attrEntries = Object.entries(attrs);
    return attrEntries.length > 0 ? ' ' + attrEntries.map(([k, v]) => `${k}="${entities.encodeXML(v)}"`).join(' ') : '';
}

function encodeAndRestore(translated: string, placeholders: Map<string, string>): string {
    let result = entities.encodeXML(translated);
    // 占位符 key (e.g. NO_TRANSLATE_0_) 全部为 ASCII，encodeXML 不会改变它们
    for (const [key, html] of placeholders) {
        result = result.replaceAll(key, html);
    }
    return result;
}

function pushChunk(parts: string[], chunk: Chunk, translated: string) {
    const attrStr = buildAttrsStr(chunk.attrs);
    const body = encodeAndRestore(translated, chunk.placeholders);
    parts.push(`<${chunk.tagName}${attrStr}>${body}</${chunk.tagName}>`);
}

function flushList(parts: string[], buffer: string[], listParent: ListParent | null) {
    if (buffer.length > 0 && listParent) {
        const attrStr = buildAttrsStr(listParent.attrs);
        parts.push(`<${listParent.tagName}${attrStr}>${buffer.join('\n')}</${listParent.tagName}>`);
    }
    buffer.length = 0;
}

function listParentEqual(a?: ListParent, b?: ListParent): boolean {
    if (!a || !b) {
        return false;
    }
    if (a.tagName !== b.tagName) {
        return false;
    }
    const aKeys = Object.keys(a.attrs);
    const bKeys = Object.keys(b.attrs);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (a.attrs[key] !== b.attrs[key]) {
            return false;
        }
    }
    return true;
}

export function reassembleHtml(chunks: Chunk[], translations: string[]): string {
    const parts: string[] = [];
    const listBuffer: string[] = [];
    let currentListParent: ListParent | null = null;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const translated = translations[i];

        if (chunk.tagName === 'li' && chunk.listParent) {
            if (!listParentEqual(currentListParent ?? undefined, chunk.listParent)) {
                flushList(parts, listBuffer, currentListParent);
                currentListParent = chunk.listParent;
            }
            const attrStr = buildAttrsStr(chunk.attrs);
            const body = encodeAndRestore(translated, chunk.placeholders);
            listBuffer.push(`<li${attrStr}>${body}</li>`);
        } else {
            flushList(parts, listBuffer, currentListParent);
            currentListParent = null;
            pushChunk(parts, chunk, translated);
        }
    }

    flushList(parts, listBuffer, currentListParent);

    return parts.join('\n');
}
