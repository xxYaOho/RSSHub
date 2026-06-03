import { describe, expect, it } from 'vitest';

import { chunkHtml } from './ast-chunker';

describe('chunkHtml', () => {
    it('should extract each block element as a separate chunk without merging', () => {
        const html = '<p>First paragraph.</p><p>Second paragraph.</p><p>Third paragraph.</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(3);
        expect(chunks[0].tagName).toBe('p');
        expect(chunks[0].text).toBe('First paragraph.');
        expect(chunks[1].tagName).toBe('p');
        expect(chunks[1].text).toBe('Second paragraph.');
        expect(chunks[2].tagName).toBe('p');
        expect(chunks[2].text).toBe('Third paragraph.');
    });

    it('should extract headings as separate chunks', () => {
        const html = '<h2>Heading 1</h2><p>Paragraph 1</p><h2>Heading 2</h2><p>Paragraph 2</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(4);
        expect(chunks[0]).toMatchObject({ tagName: 'h2', text: 'Heading 1' });
        expect(chunks[1]).toMatchObject({ tagName: 'p', text: 'Paragraph 1' });
        expect(chunks[2]).toMatchObject({ tagName: 'h2', text: 'Heading 2' });
        expect(chunks[3]).toMatchObject({ tagName: 'p', text: 'Paragraph 2' });
    });

    it('should extract each li as an independent chunk with listParent', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(3);
        for (const chunk of chunks) {
            expect(chunk.tagName).toBe('li');
            expect(chunk.listParent).toBeDefined();
            expect(chunk.listParent!.tagName).toBe('ul');
        }
        expect(chunks[0].text).toBe('Item 1');
        expect(chunks[1].text).toBe('Item 2');
        expect(chunks[2].text).toBe('Item 3');
    });

    it('should preserve ordered list parent info', () => {
        const html = '<ol class="numbered"><li>First</li><li>Second</li></ol>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(2);
        expect(chunks[0].tagName).toBe('li');
        expect(chunks[0].listParent).toBeDefined();
        expect(chunks[0].listParent!.tagName).toBe('ol');
        expect(chunks[0].listParent!.attrs).toEqual({ class: 'numbered' });
    });

    it('should pass through code and pre elements as noTranslate chunks', () => {
        const html = '<p>Before code.</p><pre><code>const x = 1;</code></pre><p>After code.</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toMatchObject({ tagName: 'p', text: 'Before code.' });
        expect(chunks[1]).toMatchObject({ tagName: 'pre', noTranslate: true });
        expect(chunks[1].rawHtml).toBe('<code>const x = 1;</code>');
        expect(chunks[2]).toMatchObject({ tagName: 'p', text: 'After code.' });
    });

    it('should replace code elements with placeholders preserving wrapper tags', () => {
        const html = '<p>Some text with <code>inline code</code> inside.</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].tagName).toBe('p');
        expect(chunks[0].placeholders.size).toBe(1);
        // Text should contain the placeholder key instead of actual code
        expect(chunks[0].text).not.toContain('<code>');
        // Placeholder value must include the <code> wrapper tag
        const placeholderValues = [...chunks[0].placeholders.values()];
        expect(placeholderValues[0]).toBe('<code>inline code</code>');
    });

    it('should preserve code attributes in placeholder values', () => {
        const html = '<p>Check <code class="language-js">let x;</code></p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(1);
        const placeholderValues = [...chunks[0].placeholders.values()];
        expect(placeholderValues[0]).toBe('<code class="language-js">let x;</code>');
    });

    it('should handle bare text nodes as paragraph chunks', () => {
        const html = 'Plain text without any HTML tags';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toMatchObject({ tagName: 'p', text: 'Plain text without any HTML tags' });
    });

    it('should handle text nodes mixed with block elements inside a div', () => {
        const html = '<div>Intro text<p>Block text</p>Outro text</div>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toMatchObject({ tagName: 'p', text: 'Intro text' });
        expect(chunks[1]).toMatchObject({ tagName: 'p', text: 'Block text' });
        expect(chunks[2]).toMatchObject({ tagName: 'p', text: 'Outro text' });
    });

    it('should skip empty block elements', () => {
        const html = '<p></p><p>Content</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toMatchObject({ tagName: 'p', text: 'Content' });
    });

    it('should handle mixed content: paragraphs, headings, and lists', () => {
        const html = '<p>Intro</p><h2>Section</h2><ul><li>A</li><li>B</li></ul><p>Outro</p>';
        const chunks = chunkHtml(html);

        expect(chunks).toHaveLength(5);
        expect(chunks[0]).toMatchObject({ tagName: 'p', text: 'Intro' });
        expect(chunks[1]).toMatchObject({ tagName: 'h2', text: 'Section' });
        expect(chunks[2]).toMatchObject({ tagName: 'li', text: 'A' });
        expect(chunks[3]).toMatchObject({ tagName: 'li', text: 'B' });
        expect(chunks[4]).toMatchObject({ tagName: 'p', text: 'Outro' });
    });
});
