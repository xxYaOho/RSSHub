# 自定义路由使用说明

本文件记录自行开发的 RSSHub 订阅源路由，非上游官方路由。

## 路由列表

### 优设网 (uisdc.com)

专业设计师交流平台，涵盖设计文章、AI 资讯、知识卡片等内容。

<RouteEnvironments name="uisdc">
<RouteEnvironment name="news" path="/uisdc/news" example="/uisdc/news" category="design" lang="zh-CN">

优设读报 — 每日 AI 与科技要闻简报。数据来源为页面内嵌 JSON (`var uisdc_news`)，无需 HTML 解析。

<RouteEnvironments name="archives" path="/uisdc/archives/:tag?" example="/uisdc/archives" category="design" lang="zh-CN">

设计文章列表。支持按标签过滤。

**参数:**

| 参数  | 必填 | 说明                                             |
| ----- | ---- | ------------------------------------------------ |
| `tag` | 否   | 标签 slug，如 `aigc`、`ui设计`。不填获取全部分类 |

**示例:**

- `/uisdc/archives` — 全部文章
- `/uisdc/archives/aigc` — AIGC 标签文章
- `/uisdc/archives/ui设计` — UI 设计标签文章

<RouteEnvironments name="group" path="/uisdc/group/:sort?" example="/uisdc/group/latest" category="design" lang="zh-CN">

优设 9 图知识卡片频道。

**参数:**

| 参数   | 必填 | 说明                                            |
| ------ | ---- | ----------------------------------------------- |
| `sort` | 否   | 排序方式：`latest` (最新，默认) 或 `hot` (最热) |

</RouteEnvironments>
</RouteEnvironments>
</RouteEnvironments>

### 少数派 (sspai.com) — 上游路由，本地修复

上游 RSSHub 自带的路由，本地做了图片防盗链修复和性能优化。

修复内容：

- 所有 `<img>` 的 `cdnfile.sspai.com` URL 改写为 `/sspai/image-proxy` 代理
- 图片通过代理服务端加 Referer 从 CDN 取图，同时压缩为 800px WebP（体积减少 70-95%）
- 去掉 `support_webp=true` 参数（改为代理层统一处理）
- 修复 `tag.ts` 的 `description` 未初始化 bug
- 修复 `series-update.ts` 的 `cdn.sspai.com`（DNS 不解析）→ `cdnfile.sspai.com`

## 数据源说明

| 路由                 | 数据来源                                   | 提取方式                      |
| -------------------- | ------------------------------------------ | ----------------------------- |
| `/uisdc/news`        | `uisdc.com/news`                           | 内嵌 JSON (`var uisdc_news`)  |
| `/uisdc/archives`    | `uisdc.com/archives` + 详情页              | cheerio 静态 HTML             |
| `/uisdc/group`       | `uisdc.com/group` + 详情页                 | cheerio 静态 HTML             |
| `/sspai/*`           | `sspai.com/api/v1/articles` + 文章详情 API | API JSON                      |
| `/sspai/image-proxy` | `cdnfile.sspai.com` via 服务端代理         | 取图 + WebP 压缩 + Redis 缓存 |

> **注意:** 优设网 WordPress REST API (`/wp-json/`) 已禁用。Archives 和 group 路由的列表页无日期信息，需进入各详情页获取 `pubDate`。首次请求较慢 (group 约 7s)，后续由 Redis 缓存加速。
>
> **少数派图片代理:** 出于防盗链兼容，sspai 所有路由的图片 `<img src>` 已改写为代理 URL，不直连 CDN。代理路由受限于 RSSHub 中间件管线的模板渲染，利用 `registry.ts:210` 的 `Response` 直接返回绕过模板层。

## 本机部署

### 架构

```
Docker Compose:
  └── redis (缓存)

宿主机:
  └── pnpm dev (RSSHub, 含自定义路由)
```

### 启动

```bash
# 1. 启动 Redis
docker compose up -d

# 2. 启动 RSSHub (开发模式，加载自定义路由)
CACHE_TYPE=redis REDIS_URL=redis://localhost:6379/ pnpm dev
```

> 生产 Docker 镜像 (`diygod/rsshub`) 只含预编译路由，不含本地开发的自定义路由。因此 RSSHub 必须通过 `pnpm dev` 在宿主机运行。

### 访问

- 本机: `http://localhost:1200`
- Tailscale 内网: `http://100.66.149.21:1200`

## 开发新路由

详见 `.claude/skills/rsshub-route-dev/SKILL.md`，包含从站点调研到代码实现的 SOP。

### 关键约定

- 路由文件放在 `lib/routes/<namespace>/`
- 开发时路由自动发现，无需手动注册
- 不使用已废弃的 `lib/router.js`
- 详情页抓取必须用 `cache.tryGet()` 缓存

### 文件结构

```
lib/routes/uisdc/
├── namespace.ts    # 命名空间定义
├── utils.ts        # 共享工具 (详情页抓取)
├── news.ts         # 每日要闻
├── archives.ts     # 设计文章
└── group.ts        # 频道
```
