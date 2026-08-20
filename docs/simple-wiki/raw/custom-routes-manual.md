---
class: material
ingested: true
metadata: ~
---

# 自定义路由手册

本项目的自开发路由和新增功能速查。

## 路由列表

### 优设网 `/uisdc`

| 路由     | 路径                    | 说明                                                       |
| -------- | ----------------------- | ---------------------------------------------------------- |
| 每日读报 | `/uisdc/news`           | AI 与科技要闻简报，数据来自页面内嵌 JSON                   |
| 设计文章 | `/uisdc/archives/:tag?` | 设计文章列表，可选 `tag` 过滤（如 `/uisdc/archives/aigc`） |
| 9图卡片  | `/uisdc/group/:sort?`   | 知识卡片频道，`sort` 可选 `latest`（默认）或 `hot`         |

### 少数派 `/sspai`

上游路由，本地做了以下修复：

- 图片 `<img>` 的 CDN URL 改写为 `/sspai/image-proxy` 代理，绕过防盗链并压缩为 800px WebP
- 修复 `tag.ts` 的 `description` 未初始化导致 RSS 校验失败
- 修复 `series-update.ts` 的 `cdn.sspai.com`（DNS 不解析）→ `cdnfile.sspai.com`

路由与上游一致，不单独列出。

### RSS 代理 `/proxy`

| 路由     | 路径                           | 说明                                             |
| -------- | ------------------------------ | ------------------------------------------------ |
| RSS 代理 | `/proxy/rss?url=<外部RSS地址>` | 抓取任意外部 RSS/Atom feed，支持配合翻译参数使用 |

### Anthropic `/claude`

| 路由      | 路径                     | 说明                     |
| --------- | ------------------------ | ------------------------ |
| 官方博客  | `/claude/blog`           | Anthropic 官方技术博客   |
| Code 更新 | `/claude/code-changelog` | Claude Code CLI 更新日志 |

### HumanLayer `/humanlayer`

| 路由 | 路径               | 说明                |
| ---- | ------------------ | ------------------- |
| 博客 | `/humanlayer/blog` | HumanLayer 官方博客 |

### 番组在线 `/bangumi.online`

番组在线的 RSS 订阅源。

### 其他

| 路由    | 路径             | 说明 |
| ------- | ---------------- | ---- |
| MWM     | `/mwm`           | —    |
| RunYeah | `/runyeah/posts` | —    |

## 翻译功能

通过 URL 查询参数启用，兼容任意路由。

| 参数              | 引擎                                | 特点                                     |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| `?chatgpt`        | DeepSeek / OpenAI                   | 整篇一次性翻译，速度快                   |
| `?translategemma` | TranslateGemma-12b (本地 LM Studio) | 按段落/标题/列表分段翻译，保留 HTML 结构 |
| `?autots`         | 智能切换                            | 先尝试 translategemma，失败回退 chatgpt  |

`?autots` 语言代码：

| 代码                | 语言     |
| ------------------- | -------- |
| `cn` / `zh`（默认） | 简体中文 |
| `jp` / `ja`         | 日文     |
| `en`                | 英文     |
| `ko`                | 韩文     |
| `fr`                | 法文     |
| `de`                | 德文     |

**使用示例：**

```bash
# 外部 RSS + 双语翻译
curl "http://localhost:1200/proxy/rss?url=https://example.com/feed.xml&chatgpt&limit=5"

# 任意路由 + 智能翻译
curl "http://localhost:1200/uisdc/news?autots&limit=3"
```

**注意：**

- 翻译期间（数十秒到数分钟），同一 path 的无参请求会阻塞最多 60 秒。建议配合 `limit=1` 减少翻译量。`/proxy/rss` 无此限制。
- 首次翻译后会缓存，后续请求直接命中缓存，不再阻塞。

## 少数派图片代理

`/sspai/image-proxy` 是 sspai 路由专用的图片代理。

少数派 CDN（`cdnfile.sspai.com`）有防盗链限制，直接引用图片会 403。代理在服务端添加 Referer 头取图，同时压缩为 800px WebP（体积减少 70-95%），结果由 Redis 缓存。

所有 sspai 路由的 `<img src>` 已自动改写为代理 URL，无需手动处理。
