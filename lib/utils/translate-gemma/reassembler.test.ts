import { describe, expect, it } from 'vitest';

import type { Chunk } from './ast-chunker';
import { reassembleHtml } from './reassembler';

describe('reassembleHtml', () => {
    it('should reassemble paragraphs without merging', () => {
        const chunks: Chunk[] = [
            { tagName: 'p', attrs: {}, text: 'Hello', placeholders: new Map() },
            { tagName: 'p', attrs: {}, text: 'World', placeholders: new Map() },
        ];
        const translations = ['Hello', 'World'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<p>Hello</p>\n<p>World</p>');
    });

    it('should reassemble unordered list items into a single ul', () => {
        const chunks: Chunk[] = [
            { tagName: 'li', attrs: {}, text: 'Item 1', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } },
            { tagName: 'li', attrs: {}, text: 'Item 2', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } },
            { tagName: 'li', attrs: {}, text: 'Item 3', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } },
        ];
        const translations = ['Item 1', 'Item 2', 'Item 3'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<ul><li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li></ul>');
    });

    it('should reassemble ordered list items into a single ol', () => {
        const chunks: Chunk[] = [
            { tagName: 'li', attrs: {}, text: 'First', placeholders: new Map(), listParent: { tagName: 'ol', attrs: { class: 'steps' } } },
            { tagName: 'li', attrs: {}, text: 'Second', placeholders: new Map(), listParent: { tagName: 'ol', attrs: { class: 'steps' } } },
        ];
        const translations = ['First', 'Second'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<ol class="steps"><li>First</li>\n<li>Second</li></ol>');
    });

    it('should split list when listParent changes', () => {
        const chunks: Chunk[] = [
            { tagName: 'li', attrs: {}, text: 'A', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } },
            { tagName: 'li', attrs: {}, text: 'B', placeholders: new Map(), listParent: { tagName: 'ol', attrs: {} } },
        ];
        const translations = ['A', 'B'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<ul><li>A</li></ul>\n<ol><li>B</li></ol>');
    });

    it('should handle mixed paragraphs and lists', () => {
        const chunks: Chunk[] = [
            { tagName: 'p', attrs: {}, text: 'Intro', placeholders: new Map() },
            { tagName: 'li', attrs: {}, text: 'Item', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } },
            { tagName: 'p', attrs: {}, text: 'Outro', placeholders: new Map() },
        ];
        const translations = ['Intro', 'Item', 'Outro'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<p>Intro</p>\n<ul><li>Item</li></ul>\n<p>Outro</p>');
    });

    it('should restore code placeholders', () => {
        const placeholders = new Map([['NO_TRANSLATE_0_', '<code>const x = 1;</code>']]);
        const chunks: Chunk[] = [{ tagName: 'p', attrs: {}, text: 'Some NO_TRANSLATE_0_ text', placeholders }];
        const translations = ['Some NO_TRANSLATE_0_ text'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<p>Some <code>const x = 1;</code> text</p>');
    });

    it('should preserve li attributes', () => {
        const chunks: Chunk[] = [{ tagName: 'li', attrs: { class: 'active' }, text: 'Active', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} } }];
        const translations = ['Active'];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<ul><li class="active">Active</li></ul>');
    });

    it('should pass through noTranslate chunks verbatim', () => {
        const chunks: Chunk[] = [
            { tagName: 'p', attrs: {}, text: '', placeholders: new Map(), noTranslate: true, rawHtml: 'Original content' },
            { tagName: 'pre', attrs: { class: 'code' }, text: '', placeholders: new Map(), noTranslate: true, rawHtml: '<code>const x = 1;</code>' },
        ];
        const translations = ['', ''];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<p>Original content</p>\n<pre class="code"><code>const x = 1;</code></pre>');
    });

    it('should pass through noTranslate list items verbatim', () => {
        const chunks: Chunk[] = [{ tagName: 'li', attrs: {}, text: '', placeholders: new Map(), listParent: { tagName: 'ul', attrs: {} }, noTranslate: true, rawHtml: 'Raw item' }];
        const translations = [''];
        const result = reassembleHtml(chunks, translations);

        expect(result).toBe('<ul><li>Raw item</li></ul>');
    });
});
