import type { CheerioAPI } from 'cheerio';
import { load } from 'cheerio';
import type { Element } from 'domhandler';
import * as entities from 'entities';

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
    noTranslate?: boolean; // 标记该 chunk 不翻译，原样输出
    rawHtml?: string; // noTranslate chunk 的原始 innerHTML
}

// <li> 独立作为 chunk，重组时由 reassembler 恢复 <ul>/<ol> 结构
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote']);

function extractAttrs(el: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (el.attribs) {
        for (const [key, value] of Object.entries(el.attribs)) {
            attrs[key] = value;
        }
    }
    return attrs;
}

function extractChunk($: CheerioAPI, $el: any): Chunk {
    const clone = $el.clone();
    const placeholders = new Map<string, string>();
    let placeholderId = 0;

    clone.find('code, pre').each((_: number, codeEl: any) => {
        const key = `NO_TRANSLATE_${placeholderId++}_`;
        const codeTag = codeEl.tagName.toLowerCase();
        const codeAttrs = Object.entries(codeEl.attribs || {})
            .map(([k, v]) => ` ${k}="${entities.encodeXML(String(v))}"`)
            .join('');
        placeholders.set(key, `<${codeTag}${codeAttrs}>${$(codeEl).html()}</${codeTag}>`);
        $(codeEl).replaceWith(key);
    });

    const text = clone.text().trim();
    const attrs = extractAttrs($el[0]);

    const tagName = $el[0].tagName.toLowerCase();
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
                    for (const [key, value] of Object.entries(parent.attribs as Record<string, string>)) {
                        parentAttrs[key] = value;
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
        if ((el as any).type === 'text') {
            const text = (el as any).data?.trim();
            if (text) {
                chunks.push({ tagName: 'p', attrs: {}, text, placeholders: new Map() });
            }
            return;
        }

        if (el.type !== 'tag') {
            return;
        }

        const tagName = el.tagName.toLowerCase();

        if (tagName === 'code' || tagName === 'pre') {
            chunks.push({
                tagName,
                attrs: extractAttrs(el),
                text: '',
                placeholders: new Map(),
                noTranslate: true,
                rawHtml: $(el).html() ?? undefined,
            });
            return;
        }

        if (BLOCK_TAGS.has(tagName)) {
            const chunk = extractChunk($, $(el));
            if (chunk.text) {
                chunks.push(chunk);
            }
            return;
        }

        const children = el.children || [];
        for (const child of children) {
            traverse(child as Element);
        }
    }

    const rootChildren = $.root()[0].children || [];
    for (const child of rootChildren) {
        traverse(child as Element);
    }

    return chunks;
}
