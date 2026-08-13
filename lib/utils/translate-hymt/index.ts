import logger from '@/utils/logger';

// chunker/reassembler 是模型无关的通用 HTML 工具，直接复用 translate-gemma 的
import { chunkHtml } from '../translate-gemma/ast-chunker';
import { reassembleHtml } from '../translate-gemma/reassembler';
import { translateChunk } from './translator';

export * from './translator';

const CONCURRENCY_LIMIT = 3;
const MAX_RETRIES = 2;

export async function translateHtml(html: string): Promise<string> {
    const chunks = chunkHtml(html);

    if (chunks.length === 0) {
        return html;
    }

    logger.debug(`[translatehymt] Translating ${chunks.length} chunks`);

    const startTime = Date.now();
    const translations: string[] = [];
    let failedChunks = 0;

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
                    // oxlint-disable-next-line no-await-in-loop
                    try {
                        // oxlint-disable-next-line no-await-in-loop -- 故意在 retry 循环内 await
                        return await translateChunk(chunk.text);
                    } catch (error) {
                        if (attempt === MAX_RETRIES) {
                            logger.error(`[translatehymt] Chunk ${globalIndex} failed after ${MAX_RETRIES + 1} attempts:`, error);
                            failedChunks++;
                            return chunk.text;
                        }
                        logger.warn(`[translatehymt] Chunk ${globalIndex} attempt ${attempt + 1} failed, retrying...`);
                        // oxlint-disable-next-line no-await-in-loop
                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }
                return chunk.text;
            })
        );
        translations.push(...batchResults);
    }

    if (failedChunks > 0) {
        // 有 chunk 翻译失败：抛异常让调用方感知（autots 可回退 chatgpt），而不是静默返回原文
        throw new Error(`[translatehymt] ${failedChunks}/${chunks.length} chunks failed to translate`);
    }

    const duration = Date.now() - startTime;

    logger.debug(`[translatehymt] Translation completed in ${duration}ms`);

    return reassembleHtml(chunks, translations);
}
