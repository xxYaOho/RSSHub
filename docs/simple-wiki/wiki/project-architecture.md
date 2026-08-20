---
title: 项目架构与开发工作流
type: concept
created: 2026-08-20
updated: 2026-08-20
sources: [raw/project-guide-claude.md]
topic: 项目架构
tags: [architecture, route, workflow]
status: current
context: 1
---

# 项目架构与开发工作流

RSSHub 是基于 Hono (TypeScript) 的 RSS 聚合服务，插件式路由系统。本页为架构要点与新路由开发流程；质量红线见 [路由开发质量标准](route-standards.md)，环境部署见 [开发与生产环境](environments-deployment.md)。

来源：[CLAUDE.md](../raw/project-guide-claude.md)

## 常用命令

- `pnpm dev` 热重载开发（默认 :1200）；`pnpm dev:cache` 带生产缓存
- `pnpm build` / `pnpm start` 生产构建与运行
- `pnpm test` = lint + vitest 覆盖率；`pnpm vitest:watch`；`pnpm vitest:fullroutes` 全路由集成测试
- `pnpm lint`（oxlint 类型感知）；`pnpm format`（oxlint fix + oxfmt）

## 核心机制

- **路由自动发现**（`lib/registry.ts`）：路由不手动注册。dev 模式动态扫描 `lib/routes/<namespace>/`；生产模式加载 `assets/build/routes.js`（由 `scripts/workflow/build-routes.ts` 生成）。目录即 namespace。模块导出 `route`（feed）、`namespace`（元数据）或 `apiRoute`（`/api/` 前缀）之一。字面路径段优先于 `:param` 段。
- **中间件管线**（`lib/app-bootstrap.tsx`）顺序固定：trimTrailingSlash → compress → JSX renderer → logger → trace → honeybadger → sentry → accessControl → debug → **template**（把 `Data` 渲染为 RSS/Atom/JSON）→ header → antiHotlink → parameter（limit/format/filter 等通用参数）→ cache。handler 通过 `ctx.set('data', result)` 交付数据；若直接返回 `Response` 则跳过后续管线。
- **路由文件结构**：导出 `route: Route` 对象（path/categories/example/parameters/features/radar/name/maintainers/handler）和 `handler(ctx)`，handler 返回 `Data`（`{ title, link, description?, item: DataItem[] }`）或 `Response`。
- **namespace.ts**：每个 namespace 目录一份，`{ name, url（无 https://）, lang }`。
- **关键工具**（`lib/utils/`）：`ofetch`（首选 HTTP）、`got`（legacy）、`cache.tryGet`（条目级缓存）、`parseDate`、`config`。
- **TypeScript**：路径别名 `@/` → `lib/`；`Data`/`DataItem`/`Route`/`Namespace` 在 `lib/types.ts`；handler 的 `ctx` 是 Hono `Context`。
- **配置**：全部走环境变量，`lib/config.ts` 在 import 时计算并冻结。常用：`PORT`、`CACHE_TYPE`、`REDIS_URL`、`ACCESS_KEY`、各路由凭证；翻译配置见 [双语翻译功能](translation-feature.md)。

## 新路由开发流程

1. **调研目标站**，按优先级尝试：
    1. WordPress REST API（`/wp-json/wp/v2/posts`）
    2. 页面内嵌 JSON（`<script>` 里的 `var xxx = "[{...}]"`，用正则提取后双重 `JSON.parse` 解码）
    3. 静态 HTML：`ofetch` + `cheerio`
    4. JS 动态渲染：用 Playwright 开真实 DOM 确认结构，再决定是否 `requirePuppeteer`
    - 看真实 DOM 用 Playwright（`browser_navigate` + `browser_evaluate`），不要只信 WebFetch（只返回渲染文本）。
2. **选抓取策略**：列表含日期/作者 → 不进详情页；列表只有标题+链接 → 两阶段（列表 + `cache.tryGet()` 进详情页补全）；每篇内容各异 → 必须进详情页取 description。
3. **边写边测**：
    - 快速测试（不起服务）：`echo "import app from './app.js'; const r = await app.request('http://localhost/<route>'); console.log(r.status)" | pnpm tsx -`
    - 对运行中服务：`curl -s --noproxy '*' http://localhost:1300/<route>`（macOS 代理环境变量会干扰 curl，必须加 `--noproxy '*'`）
    - 测试新路由指向 dev 端口 1300，用 `lsof -i :1300` 确认 dev server 在监听。
4. **测试写法**：vitest + msw mock HTTP；路由集成测试在 `lib/routes.test.ts`。
5. **收尾**：删除临时 `lib/test-*.ts`，排查端口残留进程（见 [已知问题与踩坑](known-issues.md)）。
