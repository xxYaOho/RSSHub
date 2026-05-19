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

## 部署架构

区分**开发**和**生产**两个运行模式，端口不冲突，可同时运行。

```
开发环境 (端口 1300):
  宿主机 → pnpm dev (tsx watch 热重载)

生产环境 (端口 1200):
  Docker Compose → rsshub (构建镜像运行)
                   → redis (缓存)
```

### 开发模式（端口 1300）

用于路由开发、测试、调试。宿主机直接运行，利用 `tsx watch` 热重载自定义路由。

```bash
# 1. 启动 Redis
docker compose up -d redis

# 2. 启动 RSSHub 开发服务器
PORT=1300 CACHE_TYPE=redis REDIS_URL=redis://localhost:6379/ pnpm dev

# 访问: http://localhost:1300
```

### 生产模式（端口 1200）

用于稳定服务。Docker Compose 构建镜像运行，不挂载源码。

```bash
# 1. 准备环境变量
cp .env.example .env
# 编辑 .env 填入 API Key 等真实值

# 2. 构建并启动
docker compose up -d --build

# 访问: http://localhost:1200
# 查看日志: docker compose logs -f rsshub
```

**部署流程：**

```
开发路由 → 本地测试 (:1300) → 构建容器 → 重启生产 (:1200)
```

### 环境变量配置

生产配置通过 `.env` 文件加载，关键变量：

| 变量                                     | 说明                                           |
| ---------------------------------------- | ---------------------------------------------- |
| `PORT`                                   | 服务端口（生产默认 1200）                      |
| `CACHE_TYPE`                             | 缓存类型：`memory` 或 `redis`                  |
| `REDIS_URL`                              | Redis 连接地址（生产用 `redis://redis:6379/`） |
| `OPENAI_API_ENDPOINT` / `OPENAI_API_KEY` | DeepSeek / OpenAI 翻译                         |
| `TRANSLATE_GEMMA_ENDPOINT`               | LM Studio 翻译（需带 `/v1` 后缀）              |
| `TRANSLATE_GEMMA_API_KEY`                | LM Studio API Key                              |

> **注意**: `docker compose restart` 不会重新加载 `.env` 变更。修改 `.env` 后需执行 `docker compose down && docker compose up -d` 才能生效。

### 访问地址

| 环境 | 本机                    | Tailscale 内网              |
| ---- | ----------------------- | --------------------------- |
| 开发 | `http://localhost:1300` | `http://100.66.149.21:1300` |
| 生产 | `http://localhost:1200` | `http://100.66.149.21:1200` |

## 开发新路由

详见 `.claude/skills/rsshub-route-dev/SKILL.md`，包含从站点调研到代码实现的 SOP。

## 翻译功能

支持通过 URL 查询参数对 RSS 内容进行翻译，兼容任意路由（包括外部 RSS 代理）。

### 三个翻译参数

| 参数              | 引擎                              | 特点                                        | 适用场景                 |
| ----------------- | --------------------------------- | ------------------------------------------- | ------------------------ |
| `?chatgpt`        | DeepSeek / OpenAI                 | 整篇一次性翻译，支持摘要/翻译/双语模式      | 常规对话模型，速度快     |
| `?translategemma` | TranslateGemma-12b-it (LM Studio) | 按段落/标题/列表分段翻译，保留 HTML 结构    | 专业 MT 模型，翻译质量高 |
| `?autots`         | 智能切换                          | 先尝试 translategemma，失败自动回退 chatgpt | 一键翻译，无需关心底层   |

### 多语言支持 (`?autots`)

| 代码                                     | 语言     |
| ---------------------------------------- | -------- |
| `?autots` 或 `?autots=cn` / `?autots=zh` | 简体中文 |
| `?autots=jp` / `?autots=ja`              | 日文     |
| `?autots=en`                             | 英文     |
| `?autots=ko`                             | 韩文     |
| `?autots=fr`                             | 法文     |
| `?autots=de`                             | 德文     |

### 环境变量配置

```bash
# OpenAI 主配置（DeepSeek）
OPENAI_API_ENDPOINT="https://api.deepseek.com/v1"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="deepseek-v4-flash"
OPENAI_INPUT_OPTION="bilingual"          # description / title / both / bilingual
OPENAI_MAX_TOKENS="16384"
OPENAI_PROMPT_TITLE="Translate the following title into Simplified Chinese..."
OPENAI_PROMPT="Translate the following content into Simplified Chinese..."

# OpenAI fallback（本地 LM Studio）
OPENAI_FALLBACK_API_ENDPOINT="http://100.106.114.92:1234/v1"
OPENAI_FALLBACK_API_KEY="lmstudio"
OPENAI_FALLBACK_MODEL="qwen3.6-35b-a3b"

# TranslateGemma 配置（本地 LM Studio）
# 注意：endpoint 必须包含 /v1 后缀，代码会自动拼接 /chat/completions
TRANSLATE_GEMMA_ENDPOINT="http://100.106.114.92:1234/v1"
TRANSLATE_GEMMA_API_KEY="lmstudio"
TRANSLATE_GEMMA_MODEL="translategemma-12b-it"
TRANSLATE_GEMMA_MAX_INPUT_TOKENS="1200"   # 每段最大 token 数
TRANSLATE_GEMMA_PROMPT="Translate from English to Simplified Chinese."
```

### 使用示例

```bash
# 外部 RSS + chatgpt 双语翻译
curl "http://localhost:1200/proxy/rss?url=https://example.com/feed.xml&chatgpt&limit=5"

# 外部 RSS + TranslateGemma 分段翻译
curl "http://localhost:1200/proxy/rss?url=https://example.com/feed.xml&translategemma&limit=1"

# 外部 RSS + autots 智能翻译（默认中文）
curl "http://localhost:1200/proxy/rss?url=https://example.com/feed.xml&autots&limit=1"

# 外部 RSS + autots 翻译成日文
curl "http://localhost:1200/proxy/rss?url=https://example.com/feed.xml&autots=jp&limit=1"

# 任意 RSSHub 路由 + 翻译
curl "http://localhost:1200/uisdc/news?translategemma&limit=3"
```

### 性能对比（单篇英文文章）

| 引擎                                   | 耗时  | 质量             |
| -------------------------------------- | ----- | ---------------- |
| DeepSeek V4 Flash (`?chatgpt`)         | ~26s  | 最佳             |
| TranslateGemma 12B (`?translategemma`) | ~64s  | 高（段落级精准） |
| qwen3.6-35b (`?chatgpt` fallback)      | ~125s | 较好             |

> **注意**: `?translategemma` 采用分段翻译，长文会拆成多个 chunk 串行处理，因此总耗时比 `?chatgpt` 长，但保留了段落和标题结构，不会出现整篇文本截断的问题。

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
