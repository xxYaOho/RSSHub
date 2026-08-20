---
title: 已知问题与踩坑
type: pitfall
created: 2026-08-20
updated: 2026-08-20
sources: [raw/project-guide-claude.md, raw/mise-production-flow.md]
topic: 部署运维
tags: [pitfall, cache, pm2, 端口, mise]
status: current
context: 1
---

# 已知问题与踩坑

运维与开发中已确认的坑及解法。环境背景见 [开发与生产环境](environments-deployment.md)。

来源：[CLAUDE.md](../raw/project-guide-claude.md)、[mise 生产流程固化与 pm2 启动脚本化](../raw/mise-production-flow.md)

## 缓存过期时间与阅读器刷新间隔不匹配导致超时

- **现象**：Reeder 等阅读器 30 分钟自动刷新，而默认 `CACHE_EXPIRE=300`（5 分钟），每次请求都是冷缓存抓取；家庭网络（Mac Mini + Tailscale）下冷抓取偶发超时。
- **解法**：`CACHE_EXPIRE` 调到略长于阅读器刷新间隔（2100 秒 / 35 分钟），保证命中缓存。已固化在 `scripts/prod/start.sh` 内。

## 端口残留进程

- **来源**：`tsx watch` 子进程不随终端关闭退出，多次 `pnpm dev &` 会积累；`npx tsx lib/index.ts` 测试后 node 子进程可能残留（用 `ps aux | grep tsx` 排查 kill）。pm2 占用 1200 是正常生产进程，不算残留。
- **判据**：curl 返回 `503` + "Welcome to RSSHub!" HTML，说明端口上的进程不是当前 dev server。
- **排查**：`lsof -i :1300` / `lsof -i :1200 | grep LISTEN`。

## macOS 代理环境变量干扰 curl

- 本机有 `http_proxy` 等代理变量，curl 本地服务会走代理导致异常。一律加 `--noproxy '*'`。

## pm2 环境变量不随 restart 更新

- `pm2 restart`（含 `--update-env`）不重新读 `.env`，只更新当前 shell 变量。改环境变量必须 `pm2 delete rsshub && pm2 start ...` 重建；`mise run restart` 已固定这一重建动作（见 [开发与生产环境](environments-deployment.md)）。

## bash 下 source ~/.zshrc 被 bun 补全脚本 `_bun` 打断

- **现象**：`mise run update` 首跑生产进程 errored，日志 `/Users/teatin/.bun/_bun: line 922: syntax error near unexpected token '('`。
- **根因**：`scripts/prod/start.sh` 用 bash 执行，而 `~/.zshrc:30` source 的 bun 补全脚本 `_bun` 是 zsh 专有语法，bash 解析报错；`set -e` 致脚本退出，pm2 重启循环 15 次后 errored。旧流程没踩到是因为当时在交互式 zsh 里 source，zsh 能解析 `_bun`。
- **解法**：不 source 整个 zshrc，只 eval 需要的行：`eval "$(grep -E '^DEEPSEEK_(BASE_URL|API_KEY)=' ~/.zshrc)"`。
- **注意**：`DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY` 在 `~/.zshrc:62-63` 是**无 export 的赋值行**（靠交互 shell 展开生效），grep 模式不要加 `^export`。

## 已修复：cache key 未包含翻译参数（commit 532dd9886）

- `lib/middleware/cache.ts` 的缓存 key 已包含 `chatgpt`/`autots`/`translategemma`/`translatehymt`/`llmgemma` 及语言代码，带翻译与不带翻译的请求用独立 `controlKey`，不再互相阻塞或污染缓存。
- 升级后旧缓存 key 哈希变化，首次请求重新生成，属正常现象。
