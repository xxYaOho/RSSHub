import type { Element } from 'cheerio';
import { load } from 'cheerio';

export interface Chunk {
    tagName: string;
    attrs: Record<string, string>;
    text: string;
    placeholders: Map<string, string>;
}

// 列表用 <ul>/<ol> 整体作为 chunk，而不是逐个 <li>，避免重组时丢失列表结构
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote']);

function estimateTokens(text: string): number {
    const cjkCount = (text.match(/[一-鿿぀-ゟ゠-ヿ]/g) || []).length;
    const nonCjkCount = text.length - cjkCount;
    return Math.ceil(cjkCount + nonCjkCount / 3);
}

function extractChunk($el: any): Chunk {
    const clone = $el.clone();
    const placeholders = new Map<string, string>();
    let placeholderId = 0;

    clone.find('code, pre').each((_: number, codeEl: any) => {
        const key = `NO_TRANSLATE_${placeholderId++}_`;
        const html = $el.constructor(codeEl).prop('outerHTML');
        placeholders.set(key, html);
        $el.constructor(codeEl).replaceWith(key);
    });

    const text = clone.text().trim();
    const el = $el[0];
    const attrs: Record<string, string> = {};
    if (el.attribs) {
        for (const key of Object.keys(el.attribs)) {
            attrs[key] = el.attribs[key];
        }
    }

    return {
        tagName: el.tagName.toLowerCase(),
        attrs,
        text,
        placeholders,
    };
}

export function chunkHtml(html: string, maxTokens: number = 1200): Chunk[] {
    const $ = load(`<div>${html}</div>`, null, false);
    const chunks: Chunk[] = [];

    function traverse(el: Element) {
        if (el.type !== 'tag') {
            return;
        }

        const tagName = el.tagName.toLowerCase();

        if (tagName === 'code' || tagName === 'pre') {
            return;
        }

        if (BLOCK_TAGS.has(tagName)) {
            const chunk = extractChunk($(el));
            if (chunk.text) {
                chunks.push(chunk);
            }
            return;
        }

        for (const child of el.children || []) {
            traverse(child as Element);
        }
    }

    for (const child of $.root()[0].children || []) {
        traverse(child as Element);
    }

    // 合并相邻的同类小 chunk
    const merged: Chunk[] = [];
    let current: Chunk | null = null;

    for (const chunk of chunks) {
        const currentTokens = current ? estimateTokens(current.text) : 0;
        const chunkTokens = estimateTokens(chunk.text);

        if (current && current.tagName === chunk.tagName && currentTokens + chunkTokens <= maxTokens) {
            current.text += '\n\n' + chunk.text;
            for (const [k, v] of chunk.placeholders) {
                current.placeholders.set(k, v);
            }
        } else {
            if (current) {
                merged.push(current);
            }
            current = { ...chunk };
        }
    }

    if (current) {
        merged.push(current);
    }

    return merged;
}
