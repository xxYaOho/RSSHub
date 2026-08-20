---
title: 开发与生产环境
type: concept
created: 2026-08-20
updated: 2026-08-20
sources: [raw/project-guide-claude.md, raw/mise-production-flow.md, raw/mise-update-no-git.md]
topic: 部署运维
tags: [deploy, pm2, worktree, redis, mise]
status: current
context: 2
---

# 开发与生产环境

本 fork 的运行环境划分与部署流程。翻译相关的环境变量配置见 [双语翻译功能](translation-feature.md)，端口残留等故障排查见 [已知问题与踩坑](known-issues.md)。

来源：[CLAUDE.md](../raw/project-guide-claude.md)、[mise 生产流程固化与 pm2 启动脚本化](../raw/mise-production-flow.md)

## 环境对比

| 环境 | 端口 | 分支           | 目录                                   | 启动方式                                            | 特点                                                                   |
| ---- | ---- | -------------- | -------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| 生产 | 1200 | master         | 本仓库 `/Users/teatin/Projects/RSSHub` | pm2 托管 `scripts/prod/start.sh`（mise 任务流驱动） | 进程守护、掉线自重启、开机自启，直接跑 TS 源码无需 build；node 24.19.0 |
| 开发 | 1300 | dev (worktree) | `/Users/teatin/.worktree/RSSHub/dev`   | `pnpm dev` (tsx watch)                              | 热重载、独立目录                                                       |

两个环境共享同一个 Redis：Docker 容器，端口 6379，宿主机直接 `localhost:6379` 访问。启动：`docker compose up -d redis`（两个环境都需要）。

## 生产（mise 任务流 + pm2）

生产流程已由 mise 固化（来源：[mise 生产流程固化与 pm2 启动脚本化](../raw/mise-production-flow.md)，任务流定义后经 [更正: merge 不进 mise, update 纯部署](../raw/mise-update-no-git.md) 修正）。`.mise.toml` 锁定 node = 24、pnpm = 10（对齐 package.json engines `^22.22.2 || ^24.15.0`，此前本机跑 v26 有 engine 警告）；首次使用 `mise trust && mise install`。上游自带的 nix/devenv（`.envrc`、`flake.nix`、`devenv.nix`）保持休眠不用。

- `mise run update`：纯部署 = `pnpm install --frozen-lockfile` → restart → health。把**当前本地 master** 送上生产线，不含任何 git 操作，随时可跑、无副作用（来源：[更正: merge 不进 mise, update 纯部署](../raw/mise-update-no-git.md)）
- `mise run restart`：`pm2 delete rsshub` + `pm2 start scripts/prod/start.sh --name rsshub` + `pm2 save`（持久化供开机 resurrect）
- `mise run health`：curl :1200 轮询最多 60 秒
- `mise run logs`：pm2 logs rsshub

git 操作（merge dev → master、pull、push）全部归人工/git 侧：merge 可能冲突需要人判断，任务执行器无法处理（来源：[更正: merge 不进 mise, update 纯部署](../raw/mise-update-no-git.md)）。

> [!NOTE] 已被取代的旧论断（来源 [mise 生产流程固化与 pm2 启动脚本化](../raw/mise-production-flow.md)，2026-08-20 起由 [更正: merge 不进 mise, update 纯部署](../raw/mise-update-no-git.md) 取代，保留供溯源）
>
> - 「`mise run update` = release（merge dev）→ install → restart → health」→ update 已不含 git 操作，纯部署。
> - 「`mise run release`：守卫（工作树干净）→ `git merge --no-ff dev` → `git push origin master`」→ release 任务已移除，merge/push 归人工。

pm2 启动命令已迁入 `scripts/prod/start.sh`（版本化、单一真源），环境变量全量在脚本内；改环境变量 = 改脚本 + `mise run restart`。mise shim 经 PATH 传入 pm2 进程，生产现运行于 node 24.19.0。

> [!NOTE] 已被取代的旧论断（来源 [CLAUDE.md](../raw/project-guide-claude.md)，2026-08-20 起由 [mise 生产流程固化与 pm2 启动脚本化](../raw/mise-production-flow.md) 取代，保留供溯源）
>
> - 「启动前需 `source ~/.zshrc` 加载 DEEPSEEK 等环境变量，完整启动命令见 CLAUDE.md 的 pm2 段落」→ 现环境变量全量在 `start.sh` 内；整源 zshrc 会踩 `_bun` 坑（见 [已知问题与踩坑](known-issues.md)），脚本只 eval DEEPSEEK 两行。
> - 「管理用 `pm2 restart rsshub` / `pm2 stop` / `pm2 logs` 等手动命令」→ 现统一走 mise 任务流。

- **关键坑**（pm2 行为本身仍成立）：`pm2 restart`（含 `--update-env`）不重新读取 `.env`，只更新当前 shell 变量；`mise run restart` 已固定 delete + start 重建进程规避。
- 生产缓存参数：`CACHE_TYPE=redis`、`CACHE_EXPIRE=2100`（35 分钟，理由见 [已知问题与踩坑](known-issues.md)），已固化在 `start.sh` 内。

## 开发（worktree）

```bash
# 首次创建
git worktree add -b dev /Users/teatin/.worktree/RSSHub/dev master
cd /Users/teatin/.worktree/RSSHub/dev && pnpm install

# 启动
PORT=1300 CACHE_TYPE=redis REDIS_URL=redis://localhost:6379/ pnpm dev
```

需要翻译功能时追加翻译环境变量（可用 `screen -dmS rsshub-dev` 后台运行，完整命令见 [CLAUDE.md](../raw/project-guide-claude.md)）。

## 部署流程

`worktree dev 开发 → 人工 merge dev → master 并推送 → mise run update`（安装依赖 → 重建 pm2 → 健康检查；merge/git 操作归人工，来源：[更正: merge 不进 mise, update 纯部署](../raw/mise-update-no-git.md)）。

> [!NOTE] 已被取代的旧论断（来源 [CLAUDE.md](../raw/project-guide-claude.md)）
>
> 旧流程「merge 到 master → pm2 restart rsshub」—— pm2 restart 不刷新环境变量与进程环境，已由 `mise run update` 取代。
