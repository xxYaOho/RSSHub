---
title: 开发与生产环境
type: concept
created: 2026-08-20
updated: 2026-08-20
sources: [raw/project-guide-claude.md]
topic: 部署运维
tags: [deploy, pm2, worktree, redis]
status: current
context: 1
---

# 开发与生产环境

本 fork 的运行环境划分与部署流程。翻译相关的环境变量配置见 [双语翻译功能](translation-feature.md)，端口残留等故障排查见 [已知问题与踩坑](known-issues.md)。

来源：[CLAUDE.md](../raw/project-guide-claude.md)

## 环境对比

| 环境 | 端口 | 分支           | 目录                                   | 启动方式               | 特点                                                     |
| ---- | ---- | -------------- | -------------------------------------- | ---------------------- | -------------------------------------------------------- |
| 生产 | 1200 | master         | 本仓库 `/Users/teatin/Projects/RSSHub` | pm2 + tsx              | 进程守护、掉线自重启、开机自启，直接跑 TS 源码无需 build |
| 开发 | 1300 | dev (worktree) | `/Users/teatin/.worktree/RSSHub/dev`   | `pnpm dev` (tsx watch) | 热重载、独立目录                                         |

两个环境共享同一个 Redis：Docker 容器，端口 6379，宿主机直接 `localhost:6379` 访问。启动：`docker compose up -d redis`（两个环境都需要）。

## 生产（pm2）

- 启动前需 `source ~/.zshrc` 加载 DEEPSEEK 等环境变量；完整启动命令（含全部翻译环境变量）见 [CLAUDE.md](../raw/project-guide-claude.md) 的 pm2 段落。
- 管理：`pm2 restart rsshub` / `pm2 stop` / `pm2 logs` / `pm2 status`。
- **关键坑**：`pm2 restart`（含 `--update-env`）不重新读取 `.env`，只更新当前 shell 变量。改环境变量必须 `pm2 delete rsshub && pm2 start ...` 重建进程。
- 生产缓存参数：`CACHE_TYPE=redis`、`CACHE_EXPIRE=2100`（35 分钟，理由见 [已知问题与踩坑](known-issues.md)）。

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

`worktree dev 开发 → merge 到 master → pm2 restart rsshub`
