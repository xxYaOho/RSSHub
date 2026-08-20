#!/usr/bin/env bash
# 生产进程入口: 由 pm2 直接托管 (fork 模式, 无 interpreter)
# 环境变量变更后必须 `pm2 delete rsshub && pm2 start` 重建进程才生效 —— 用 `mise run restart`, 不要手动 restart
# DEEPSEEK_BASE_URL / DEEPSEEK_API_KEY 来自 ~/.zshrc
set -euo pipefail

# 只提取 DEEPSEEK 变量, 不 source 整个 ~/.zshrc (其中的 bun 补全是 zsh 语法, bash 下会报错)
eval "$(grep -E '^DEEPSEEK_(BASE_URL|API_KEY)=' ~/.zshrc)"

exec env \
  PORT=1200 \
  CACHE_TYPE=redis \
  REDIS_URL=redis://localhost:6379/ \
  CACHE_EXPIRE=2100 \
  OPENAI_API_ENDPOINT="${DEEPSEEK_BASE_URL}/v1" \
  OPENAI_API_KEY="${DEEPSEEK_API_KEY}" \
  OPENAI_MODEL=deepseek-v4-flash \
  OPENAI_INPUT_OPTION=bilingual \
  OPENAI_MAX_TOKENS=16384 \
  OPENAI_PROMPT_TITLE='Translate the following title into Simplified Chinese. Reply with ONLY the translation, nothing else.' \
  OPENAI_PROMPT='Translate the following content into Simplified Chinese. Reply with ONLY the translation, nothing else.' \
  OPENAI_FALLBACK_API_ENDPOINT=http://100.106.114.92:1234/v1 \
  OPENAI_FALLBACK_API_KEY=lmstudio \
  OPENAI_FALLBACK_MODEL=qwen3.6-35b-a3b \
  TRANSLATE_GEMMA_ENDPOINT=http://100.106.114.92:1234/v1 \
  TRANSLATE_GEMMA_API_KEY=lmstudio \
  TRANSLATE_GEMMA_MODEL=translategemma-12b-it \
  TRANSLATE_GEMMA_MAX_INPUT_TOKENS=1200 \
  TRANSLATE_GEMMA_PROMPT='Translate from English to Simplified Chinese.' \
  TRANSLATE_HYMT_ENDPOINT=http://localhost:1234/v1 \
  TRANSLATE_HYMT_API_KEY=lmstudio \
  TRANSLATE_HYMT_MODEL=hy-mt2-7b \
  npx tsx lib/index.ts
