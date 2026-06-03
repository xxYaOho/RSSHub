import logger from '@/utils/logger';

import { chunkHtml } from './ast-chunker';
import { reassembleHtml } from './reassembler';
import { translateChunk } from './translator';

export * from './translator';

const CONCURRENCY_LIMIT = 3;
const MAX_RETRIES = 2;

export async function translateHtml(html: string, customPrompt?: string): Promise<string> {
    const chunks = chunkHtml(html);

    if (chunks.length === 0) {
        return html;
    }

    logger.debug(`[translategemma] Translating ${chunks.length} chunks`);

    const startTime = Date.now();
    const translations: string[] = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
        const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
        // oxlint-disable-next-line no-await-in-loop -- 故意分批串行处理，避免压垮 LM Studio
        const batchResults = await Promise.all(
            batch.map(async (chunk, batchIndex) => {
                const globalIndex = i + batchIndex;
                if (chunk.noTranslate) {
                    return ''; // reassembler 使用 rawHtml
                }
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        // oxlint-disable-next-line no-await-in-loop
                        return await translateChunk(chunk.text, customPrompt); // 故意在 retry 循环内 await
                    } catch (error) {
                        if (attempt === MAX_RETRIES) {
                            logger.error(`[translategemma] Chunk ${globalIndex} failed after ${MAX_RETRIES + 1} attempts:`, error);
                            return chunk.text;
                        }
                        logger.warn(`[translategemma] Chunk ${globalIndex} attempt ${attempt + 1} failed, retrying...`);
                        // oxlint-disable-next-line no-await-in-loop
                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }
                return chunk.text;
            })
        );
        translations.push(...batchResults);
    }

    const duration = Date.now() - startTime;

    logger.debug(`[translategemma] Translation completed in ${duration}ms`);

    return reassembleHtml(chunks, translations);
}
