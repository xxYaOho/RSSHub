---
title: 自开发路由清单
type: entity
created: 2026-08-20
updated: 2026-08-20
sources: [raw/custom-routes-manual.md]
topic: 路由开发
tags: [route, sspai, proxy, 清单]
status: current
context: 1
---

# 自开发路由清单

本 fork 的自开发路由与对上游路由的本地修改速查。翻译参数详见 [双语翻译功能](translation-feature.md)。

实例内置 Dashboard 页面 `/dashboard`（生产 `http://127.0.0.1:1200/dashboard`，`?tab=features` 直达功能页），可视化展示下列全部自研路由与功能，数据实时来自路由注册表。自研清单真源：`lib/custom-namespaces.ts`，新增自研路由时与该文件同步更新。

来源：[自定义路由手册](../raw/custom-routes-manual.md)

## 优设网 `/uisdc`

| 路由     | 路径                    | 说明                                                       |
| -------- | ----------------------- | ---------------------------------------------------------- |
| 每日读报 | `/uisdc/news`           | AI 与科技要闻简报，数据来自页面内嵌 JSON                   |
| 设计文章 | `/uisdc/archives/:tag?` | 设计文章列表，可选 `tag` 过滤（如 `/uisdc/archives/aigc`） |
| 9图卡片  | `/uisdc/group/:sort?`   | 知识卡片频道，`sort` 可选 `latest`（默认）或 `hot`         |

## 少数派 `/sspai`（上游路由的本地修复）

- 图片 `<img>` 的 CDN URL 改写为 `/sspai/image-proxy` 代理，绕过防盗链并压缩为 800px WebP
- 修复 `tag.ts` 的 `description` 未初始化导致 RSS 校验失败
- 修复 `series-update.ts` 的 `cdn.sspai.com`（DNS 不解析）→ `cdnfile.sspai.com`

路由与上游一致，不单独列出。

### 少数派图片代理 `/sspai/image-proxy`

少数派 CDN（`cdnfile.sspai.com`）有防盗链，直接引用图片 403。代理在服务端加 Referer 取图，压缩为 800px WebP（体积减少 70-95%），结果由 Redis 缓存。所有 sspai 路由的 `<img src>` 已自动改写为代理 URL。

## RSS 代理 `/proxy`

`/proxy/rss?url=<外部RSS地址>`：抓取任意外部 RSS/Atom feed，透传 RSSHub 中间件，配合翻译参数实现多语言 RSS。

## 其他自开发路由

| 命名空间          | 路径                                     | 说明                                         |
| ----------------- | ---------------------------------------- | -------------------------------------------- |
| `/claude`         | `/claude/blog`、`/claude/code-changelog` | Anthropic 官方博客、Claude Code CLI 更新日志 |
| `/humanlayer`     | `/humanlayer/blog`                       | HumanLayer 官方博客                          |
| `/bangumi.online` | —                                        | 番组在线订阅源                               |
| `/mwm`            | `/mwm`                                   | —                                            |
| `/runyeah`        | `/runyeah/posts`                         | —                                            |

新增的 ChatGPT / Kimi Code changelog 路由设计见 [Changelog 路由设计（ChatGPT 与 Kimi Code）](changelog-routes-design.md)。
