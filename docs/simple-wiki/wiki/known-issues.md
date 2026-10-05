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

## LM Studio Hy-MT2 卡死（模型 loaded 但推理无响应）

- **现象**：`?translatehymt`/`?autots` 的翻译请求长时间不返回；日志大量 `[translatehymt] Chunk N failed after 3 attempts: ... TimeoutError`、`[autots] hymt warmup failed ... within 180s`；codex-cli 等 autots 订阅每轮刷新 250s+，translatehymt 请求可拖数小时（实测 33,041s）。
- **判据**：`/v1/models` 秒回且 `api/v0/models` 显示 `state: loaded`，但 `/v1/chat/completions` 一直无响应；`lsof -p <pid> -iTCP@127.0.0.1:1234 | wc -l` 显示 RSSHub 与 LM Studio 两侧各积累近万条 ESTABLISHED。
- **解法**：先重启 LM Studio（卡死时 `osascript` quit 与 SIGTERM 均无效，需 `kill -KILL`，再 `open -a "LM Studio"` 并等模型 `state: loaded`），再 `mise run restart` 重建 RSSHub 清连接。恢复后首轮翻译约 65s，随后缓存命中为毫秒级。
- **注意**：hymt 300s 超时 ×3 重试 + 180s 预热会让一个卡死模型把请求拖数小时，属待改进点（应快速失败回退）。

## GitHub releases.atom 会输出未发布的草稿 release

- **现象**：`/dsh/changelog` 里出现正文与真实 release notes 不符的条目——标题像版本号（`dsh-v0.1.5-rc.3`），正文却是发版自动化写入的 merge commit 标题（`Merge pull request #4909 from deepseek-harness/worktree/release-dsh-0…`）。曾有阅读器只收到这样一条"新条目"。
- **根因**：deepseek-harness 的发版流程是「合并 release PR 时先建 release 草稿（正文 = merge commit 标题），几小时后再填 notes 发布」。该仓库 25 条 release 的 `created_at` 全部早于 `published_at`（差几十分钟到十几小时），`dsh-v0.2.1-alpha.1` 的 `created_at` 与 `commits/master` 上 PR #5648 的 merge 时间精确到秒一致。而 `releases.atom` 会把未发布的草稿一并输出，草稿窗口内 feed 显示的就是 merge 标题。
- **判据**：`api.github.com/repos/<owner>/<repo>/releases` 只返回已发布 release；某条目只存在于 atom、API 里没有、`/releases/tags/<tag>` 404，即从未发布的草稿（如 `dsh-v0.1.5-rc.3`，自 2026-09-22 挂到现在）。
- **解法**：路由层过滤正文为 commit 标题的条目（`lib/routes/dsh/changelog.ts` 的 `isCommitSubjectBody`）；彻底方案是与 releases API 交叉校验、只保留已发布 tag。
- **注意**：cheerio `$('content').text()` 返回的是**已解码的 HTML 字符串**（含 `<p>` 等标签），做文本匹配前需先剥标签，否则 `^Merge` 匹配不上。

## 单测大批量失败：缺 `assets/build/routes.json` 与沙箱端口限制

- **现象**：`npx vitest run` 出现 20+ 个测试文件失败，报 `Cannot find module '/assets/build/routes.json' imported from lib/registry.ts`（`NODE_ENV=test` 时注册表读该产物），或 `listen EPERM 0.0.0.0`（测试自建 HTTP server 被沙箱拒）。
- **解法**：跑单测前先 `pnpm build:routes` 生成 `assets/build/`（该目录已 gitignore，不在仓库里）；本机在沙箱内跑会大面积 `EPERM`，需在沙箱外执行。
- **剩余环境类失败**：`lib/utils/playwright*.test.ts`（5 个）报 `Executable doesn't exist at .../ms-playwright/chromium_headless_shell-*`，需 `npx playwright install`；`lib/middleware/parameter.test.ts > fulltext` 走真实网络（`github.com/...`），并发全量跑时可能超 60s 超时，单文件跑稳定通过。
