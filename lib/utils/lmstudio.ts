import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';

// LM Studio 模型卸载：用完随手释放显存。
// OpenAI 兼容端点（/v1/chat/completions）只负责推理；卸载走 LM Studio native API：
// POST /api/v1/models/unload {"instance_id": "<model-id>"}
// 用 debounce 延迟卸载：模型重载代价大（实测 ~60s），连续使用时不反复加载/卸载，
// 空闲 30 秒后自动释放。

const UNLOAD_DELAY = 30000;
const pendingUnloads = new Map<string, ReturnType<typeof setTimeout>>();

const keyOf = (endpoint: string, model: string) => `${endpoint}|${model}`;

// 使用前调用：取消待执行的卸载，避免本次请求触发重载
export function cancelUnload(endpoint: string | undefined, model: string | undefined): void {
    if (!endpoint || !model) {
        return;
    }
    const k = keyOf(endpoint, model);
    const timer = pendingUnloads.get(k);
    if (timer) {
        clearTimeout(timer);
        pendingUnloads.delete(k);
    }
}

// 使用后调用：延迟卸载，UNLOAD_DELAY 内无新请求则释放模型
export function scheduleUnload(endpoint: string | undefined, model: string | undefined): void {
    if (!endpoint || !model) {
        return;
    }
    cancelUnload(endpoint, model);
    const k = keyOf(endpoint, model);
    pendingUnloads.set(
        k,
        setTimeout(() => {
            pendingUnloads.delete(k);
            void unloadModel(endpoint, model);
        }, UNLOAD_DELAY)
    );
}

// 翻译前调用：确保模型已加载。
// LM Studio 模型未加载时只允许一个请求排队加载（其余并发立即 500），
// 预热用单请求触发加载，成功后翻译的并发请求才安全。
export async function warmupModel(endpoint: string | undefined, model: string | undefined, apiKey?: string): Promise<void> {
    if (!endpoint || !model) {
        return;
    }
    const deadline = Date.now() + 180000; // 冷启动最长 3 分钟
    while (Date.now() < deadline) {
        // oxlint-disable-next-line no-await-in-loop -- 串行重试直到模型加载完成，不能并发
        try {
            // oxlint-disable-next-line no-await-in-loop -- 同上
            await ofetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                body: { model, messages: [{ role: 'user', content: 'ok' }], max_tokens: 1 },
                headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
                timeout: 120000, // 排队加载时单次请求可达 60s+
            });
            return;
        } catch {
            // 加载中或并发加载冲突，等待后重试
            // oxlint-disable-next-line no-await-in-loop -- 同上
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    throw new Error(`[lmstudio] Model ${model} failed to warm up within 180s`);
}

export async function unloadModel(endpoint: string, model: string): Promise<void> {
    const baseUrl = endpoint.replace(/\/v1\/?$/, '');
    try {
        await ofetch(`${baseUrl}/api/v1/models/unload`, {
            method: 'POST',
            body: { instance_id: model },
            timeout: 10000,
        });
        logger.debug(`[lmstudio] Unloaded ${model} (${baseUrl})`);
    } catch (error) {
        // 尽力而为：模型未加载或端点非 LM Studio 时失败仅告警，不阻塞翻译
        logger.warn(`[lmstudio] Unload failed for ${model} (${baseUrl}):`, error);
    }
}
