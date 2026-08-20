---
title: 路由开发质量标准
type: concept
created: 2026-08-20
updated: 2026-08-20
sources: [raw/route-review-guidelines.md]
topic: 路由开发
tags: [route, review, 规范]
status: current
context: 2
---

# 路由开发质量标准

本 fork 的路由质量标准，整理自上游 PR 评审标准（已移除上游 PR 流程相关条目），与根目录 `AGENTS.md` 的 Review guidelines 同源。开发或修改路由时逐条对照；工作流见 [项目架构与开发工作流](project-architecture.md)。

来源：[Route Development Guidelines](../raw/route-review-guidelines.md)

## 路由配置

- **新增自研路由时同步登记两处**：`lib/custom-namespaces.ts`（/dashboard 页面的自研清单数据源）和 `docs/simple-wiki/wiki/custom-routes.md`。
- `example` 必须以 `/` 开头，是可运行的路由路径，不是完整 URL。
- 路由 `name` 不重复 namespace 名（namespace 在 `namespace.ts` 已定义）。
- `radar[].source` 用相对路径，不带 `https://` 前缀，如 `source: ['www.example.com/path']`。
- `radar[].target` 与路由路径一致；源 URL 没有的路径参数不要写进 target。
- `namespace.ts` 的 `url` 不带 `https://` 前缀。
- `categories` 只给一个分类。
- 不单独建 `README.md` / `radar.ts`；描述写进 `Route['description']`，radar 规则写进 `Route['radar']`。
- 不向 `lib/router.js` 加路由（已废弃）。
- `requirePuppeteer: true` 仅当路由真的用 Puppeteer，feature 标志不得虚标。
- `parameters` 对象的键必须与路径参数一一对应，不多不少。
- 已有路由参数的文档默认值、可用 example 不随意改动，除非已损坏。

## 代码风格

- 变量用 `camelCase`，不用 `snake_case`。
- 类型导入用 `import type { ... }`。
- import 保持排序，linter 报顺序问题就跑 autofix。
- 普通字符串不用模板字面量。
- cheerio 的 `load()` 对同一内容只调一次，复用 `$` 对象。
- 关闭 Puppeteer page/browser 必须 `await`。
- 属性不存在就直接省略，不显式赋 `null`。
- item 只用 `lib/types.ts` 定义的属性，自定义属性（如 `avatar`）会被忽略。
- 判断前缀用 `startsWith()` 而非 `includes()`。
- 多个条件赋值尽量合并为 `||` / `??` 单表达式。
- 注释用英文。
- 箭头函数参数始终加括号，即使单参数。

## 数据处理

- 循环抓详情页时必须用 `cache.tryGet()` 缓存。
- `description` 只放正文；标题、作者、日期、标签各有专属字段。
- 标签/分类提取到 `category` 字段，不塞进 `description`。
- 源站有日期就必须给 `pubDate`，用 `parseDate` 解析。
- 不用 `new Date()` 兜底 `pubDate`；没日期就留空（undefined）。
- 不手动截断标题，RSSHub 核心自动处理。
- 每条 item 的 `link` 必须唯一（会用作 `guid`），避免导致重复 guid 的兜底 URL。
- feed 的 `link` 指向人类可读网页，不指向 API 端点。

## API 与抓取

- 目标站有 API 就用 API，不抓 HTML。
- `ofetch` 自动 `JSON.parse`，不要手动解码 `\u003C` 之类的转义。
- 只取第一页，不为用户实现翻页参数。
- 限制条目数用内置通用参数 `limit`，不自造参数。
- 路由配置用路径参数（`:param`），不用 querystring。
- 不做自定义标签/分类过滤，交给通用参数。
- API 需要动态 hash 时，从网页动态提取，不硬编码。
- 需要真实浏览器 UA 时用内置 `config.trueUA`。

## 媒体与附件

- `enclosure_type` 必须是合法 MIME 类型（`video/youtube` 不合法，用 `video/mp4` 等）。
- `enclosure_url` 必须直指可下载的媒体文件，不是含媒体的网页。
- 视频缩略图用 `<video>` 的 `poster` 属性，不另加 `<img>`。
- 路由里不加 `referrerpolicy`，中间件统一处理。

## Puppeteer 使用

- 显式限定放行的请求类型（如仅 `document`），不放行图片脚本等。
- 等待用 `page.waitForSelector()`，不用固定 `setTimeout`。
- 不在 `Promise.all()` 里调 Puppeteer（会开多个浏览器会话）。
- 不用返回带提示信息的空数组绕过空条目检查——feed 坏了要能被察觉。

## 错误处理与代码组织

- 错误信息要清晰、可操作，让用户知道哪里出了问题。
- 函数定义尽量提升到最高作用域，不在循环/回调里定义可外提的函数。
- 循环里避免 `await`，用 `Promise.all()` 加并发控制。
- 使用 config / namespace 里的 URL 前确认不会 404。
