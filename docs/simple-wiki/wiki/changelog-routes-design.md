---
title: Changelog 路由设计（ChatGPT 与 Kimi Code）
type: decision
created: 2026-08-20
updated: 2026-08-20
sources: [raw/2026-08-20-changelog-routes-design.md]
topic: 路由开发
tags: [route, changelog, chatgpt, kimicode, 设计]
status: current
context: 1
---

# Changelog 路由设计（ChatGPT 与 Kimi Code）

2026-08-20 新增两个 changelog 订阅路由的设计决策。实现时遵循 [路由开发质量标准](route-standards.md)，参考实现为 `lib/routes/claude/code-changelog.ts`；完成后应登记到 [自开发路由清单](custom-routes.md)。

来源：[ChatGPT 与 Kimi Code Changelog 路由设计](../raw/2026-08-20-changelog-routes-design.md)

## 数据源结论

- **ChatGPT & Codex**（`https://learn.chatgpt.com/docs/changelog`）：服务端渲染静态 HTML，无需 Puppeteer。每条更新为 `<li id data-codex-topics>`，含 `<time>`、`<h3>`、`<article class="prose-content">`。`data-codex-topics` 取值 `general` / `codex-app` / `codex-mobile` / `codex-cli`，可多值。
- **Kimi Code**（`https://moonshotai.github.io/kimi-code/{lang}/release-notes/changelog.html`）：VitePress 静态页，仅 `zh`/`en` 两版，结构一致。每版本一个 `<h2 id="_0-37-2-2026-08-19">`，版本号与日期从 id 解析，规避中文页全角括号差异。

## 路由设计决策

- `/chatgpt/changelog/:type?`：新建 namespace `chatgpt`。`:type?` 默认 `all`，合法值与源站筛选一一对应；非法值抛出带合法值说明的错误。**决策：抓全量页一次，按 `data-codex-topics` 包含关系本地过滤**，而非跟随官方的 `?type=` 多次请求。条目 link/guid 用 `页面URL#<li id>` 保证唯一。
- `/kimicode/changelog/:language?`：新建 namespace `kimicode`。`:language?` 默认 `zh`，合法值 `zh`/`en`。`description` 取该 h2 到下一个 h2 之间的全部内容 HTML。
- 两路由 category 均为 `program-update`；feed `link` 指人类可读 changelog 页。

## 共用约定（及理由）

- 单次请求列表页即得全部内容，无详情页循环，故无需 `cache.tryGet`。
- 不分页；数量限制交给内置 `limit` 通用参数。
- 类型/语言筛选属于源站自身的内容分版，按路由配置（路径参数）实现，不违反「不做自定义标签过滤」的红线。

## 验证方式

dev server 分别请求各合法参数组合与一个非法值，检查 title / pubDate / link 唯一性 / description 完整性。
