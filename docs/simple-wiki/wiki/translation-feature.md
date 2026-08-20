---
title: 双语翻译功能
type: concept
created: 2026-08-20
updated: 2026-08-20
sources: [raw/project-guide-claude.md, raw/custom-routes-manual.md]
topic: 部署运维
tags: [translation, llm, lmstudio, deepseek]
status: current
context: 1
---

# 双语翻译功能

通过 URL 查询参数为任意路由启用翻译，常配合 `/proxy/rss`（外部 RSS 透传）使用。生产/开发的环境变量启动命令见 [开发与生产环境](environments-deployment.md)。

来源：[CLAUDE.md](../raw/project-guide-claude.md)、[自定义路由手册](../raw/custom-routes-manual.md)

## 路由参数

| 参数              | 引擎                                 | 特点                                                                       |
| ----------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| `?chatgpt`        | DeepSeek / OpenAI（`OPENAI_*` 配置） | 整篇一次性翻译，速度快                                                     |
| `?translatehymt`  | Hy-MT2（本机 LM Studio）             | 固定译中文                                                                 |
| `?translategemma` | TranslateGemma-12b（LM Studio）      | 按段落/标题/列表分段翻译，保留 HTML 结构；默认英译中，`=jp` 等指定目标语言 |
| `?llmgemma`       | 通用 LLM                             | 整篇翻译，`=jp` 等指定目标语言                                             |
| `?autots`         | 智能切换                             | 优先本地模型，失败回退 chatgpt                                             |

`?autots` 语言代码：`cn/zh`（默认，简体中文）、`jp/ja`、`en`、`ko`、`fr`、`de`。`?autots=cn` 走 Hy-MT2（固定中文），其余语言跳过 Hy-MT2 直接走 DeepSeek。

> 注：[自定义路由手册](../raw/custom-routes-manual.md) 称 autots「先 translategemma 后 chatgpt」，与代码不符。经核实 `lib/middleware/parameter.ts`（autots 段注释及实现）：autots 实际为 **translatehymt 优先（仅 cn）、chatgpt 回退**，与 [CLAUDE.md](../raw/project-guide-claude.md) 一致。 translategemma 不参与 autots 链路。

## 使用注意

- 翻译期间（数十秒到数分钟），同一 path 的无参请求最多阻塞 60 秒；建议配 `limit=1` 减少翻译量。`/proxy/rss` 无此限制。
- 首次翻译结果会缓存，后续请求直接命中，不再阻塞。

## 环境变量

- `OPENAI_API_ENDPOINT` / `OPENAI_API_KEY` / `OPENAI_MODEL`：chatgpt 翻译（DeepSeek、OpenAI 等）；另有 `OPENAI_INPUT_OPTION`、`OPENAI_MAX_TOKENS`、`OPENAI_PROMPT_TITLE`、`OPENAI_PROMPT`。
- `OPENAI_FALLBACK_API_ENDPOINT` / `OPENAI_FALLBACK_API_KEY` / `OPENAI_FALLBACK_MODEL`：回退 LLM。
- `TRANSLATE_GEMMA_ENDPOINT` / `TRANSLATE_GEMMA_API_KEY` / `TRANSLATE_GEMMA_MODEL`：TranslateGemma（LM Studio）。**endpoint 必须带 `/v1` 后缀**，代码自行追加 `/chat/completions`。
- `TRANSLATE_GEMMA_MAX_INPUT_TOKENS`（默认 1200）分段长度上限；`TRANSLATE_GEMMA_PROMPT` 翻译指令。
- `TRANSLATE_HYMT_ENDPOINT` / `TRANSLATE_HYMT_API_KEY` / `TRANSLATE_HYMT_MODEL`：Hy-MT2。
- `LMSTUDIO_AUTO_UNLOAD`（默认 `false` = 模型常驻）：`true` 时翻译完成 30 秒后自动卸载模型释放显存。生产环境 Hy-MT2 常驻，无需设置。

## LM Studio 模型生命周期

- 翻译前自动预热：模型未加载时先发单请求排队加载（LM Studio 未加载时并发请求会立即 500），加载完成后才并发翻译。
- 翻译后按 `LMSTUDIO_AUTO_UNLOAD` 决定是否自动卸载。

## Benchmark（2 篇文章，clean cache）

| 模型                | 耗时/篇 | 年费   | 质量 |
| ------------------- | ------- | ------ | ---- |
| DeepSeek V4 Flash   | ~26s    | <$0.10 | 最佳 |
| qwen2.5-14b（本地） | ~48s    | 免费   | 良好 |
| qwen3.6-35b（本地） | ~125s   | 免费   | 较好 |
