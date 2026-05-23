import { config } from '@/config';
import ofetch from '@/utils/ofetch';

export async function translateChunk(text: string, customPrompt?: string): Promise<string> {
    const { endpoint, apiKey, model, prompt } = config.translategemma;

    if (!endpoint) {
        throw new Error('TRANSLATE_GEMMA_ENDPOINT is not configured');
    }

    const body = {
        model,
        messages: [
            {
                role: 'user',
                content: `${customPrompt || prompt}\n\n${text}`,
            },
        ],
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
