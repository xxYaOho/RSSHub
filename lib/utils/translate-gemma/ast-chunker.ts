import type { CheerioAPI, Element } from 'cheerio';
import { load } from 'cheerio';

export interface ListParent {
    tagName: string;
    attrs: Record<string, string>;
}

export interface Chunk {
    tagName: string;
    attrs: Record<string, string>;
    text: string;
    placeholders: Map<string, string>;
    listParent?: ListParent;
}

// <li> 独立作为 chunk，重组时由 reassembler 恢复 <ul>/<ol> 结构
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote']);

function extractChunk($: CheerioAPI, $el: any): Chunk {
    const clone = $el.clone();
    const placeholders = new Map<string, string>();
    let placeholderId = 0;

    clone.find('code, pre').each((_: number, codeEl: any) => {
        const key = `NO_TRANSLATE_${placeholderId++}_`;
        const $code = $(codeEl);
        placeholders.set(key, $.html($code));
        $code.replaceWith(key);
    });

    const text = clone.text().trim();
    const el = $el[0];
    const attrs: Record<string, string> = {};
    if (el.attribs) {
        for (const key of Object.keys(el.attribs)) {
            attrs[key] = el.attribs[key];
        }
    }

    const tagName = el.tagName.toLowerCase();
    const chunk: Chunk = {
        tagName,
        attrs,
        text,
        placeholders,
    };

    // li 元素记录父列表信息，供重组器恢复 ul/ol 结构
    if (tagName === 'li') {
        const parent = $el.parent()[0];
        if (parent) {
            const parentTag = parent.tagName.toLowerCase();
            if (parentTag === 'ul' || parentTag === 'ol') {
                const parentAttrs: Record<string, string> = {};
                if (parent.attribs) {
                    for (const key of Object.keys(parent.attribs)) {
                        parentAttrs[key] = parent.attribs[key];
                    }
                }
                chunk.listParent = {
                    tagName: parentTag,
                    attrs: parentAttrs,
                };
            }
        }
    }

    return chunk;
}

export function chunkHtml(html: string): Chunk[] {
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
            const chunk = extractChunk($, $(el));
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

    return chunks;
}
