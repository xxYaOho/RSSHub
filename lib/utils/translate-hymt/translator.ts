import { config } from '@/config';
import ofetch from '@/utils/ofetch';

// Hy-MT2 专用翻译：目标语言固定中文，不设置 system prompt，携带模型推荐参数
export async function translateChunk(text: string): Promise<string> {
    const { endpoint, apiKey, model, prompt, temperature, topP, topK, repetitionPenalty, maxTokens } = config.translatehymt;

    if (!endpoint) {
        throw new Error('TRANSLATE_HYMT_ENDPOINT is not configured');
    }

    const body = {
        model,
        messages: [
            {
                role: 'user',
                content: `${prompt}\n\n${text}`,
            },
        ],
        temperature,
        top_p: topP,
        top_k: topK,
        repetition_penalty: repetitionPenalty,
        max_tokens: maxTokens,
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await ofetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        body,
        headers,
        timeout: 300000,
    });

    return response.choices[0].message.content || '';
}
