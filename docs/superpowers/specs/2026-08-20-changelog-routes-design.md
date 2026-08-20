# ChatGPT 与 Kimi Code Changelog 路由设计

日期：2026-08-20

## 目标

新增两个 RSSHub 路由，分别订阅 ChatGPT & Codex 官方更新日志与 Kimi Code CLI 更新日志。

## 数据源分析

### ChatGPT & Codex changelog

- 页面：`https://learn.chatgpt.com/docs/changelog`，服务端渲染静态 HTML，无需 Puppeteer
- 条目结构：每个版本的 `<h2>` 下挂 `<ul>`，每条更新为
  `<li id="codex-2026-08-17-mobile" data-codex-topics="codex-mobile">`，内部含
  `<time>`（日期）、`<h3>`（标题）、`<article class="prose-content">`（正文 HTML）
- 类型属性 `data-codex-topics` 取值：`general`、`codex-app`（桌面端）、`codex-mobile`（Remote）、`codex-cli`，逗号分隔可多值
- 官方筛选为 `?type=` 查询参数；本路由抓全量页一次，按 `data-codex-topics` 包含关系在本地过滤，避免多次请求
- 条目 anchor 即 `li` 的 `id`，可构造唯一条目链接

### Kimi Code changelog

- 页面：`https://moonshotai.github.io/kimi-code/{lang}/release-notes/changelog.html`，VitePress 静态页
- 语言版本仅两种：`zh`、`en`，结构一致
- 条目结构：每个版本一个 `<h2 id="_0-37-2-2026-08-19">0.37.2 (2026-08-19)</h2>`
  （中文页标题用全角括号，但 id 完全一致），下挂 Features / Polish / Bug Fixes 等小节的 `<ul>`
- 按 h2 切分；版本号与日期均可从 id `_0-37-2-2026-08-19` 解析，规避全角/半角括号差异

## 路由设计

### 路由 1：`/chatgpt/changelog/:type?`

- 新建 namespace `chatgpt`（`name: 'ChatGPT'`），与既有 `claude`/`openai` 的产品/公司 namespace 并存惯例一致
- `:type?` 路径参数，可选，默认 `all`；合法值：`all`、`general`、`codex-app`、`codex-mobile`、`codex-cli`，与原页面筛选一一对应
    - 非法值抛出带合法值说明的错误
    - 多类型条目：`data-codex-topics` 包含所求类型即命中
- 条目字段：
    - `title`：条目标题（如 `ChatGPT for iOS 1.2026.223`），取 h3 文本
    - `pubDate`：`<time>` 文本，`parseDate` 解析
    - `link` / `guid`：`https://learn.chatgpt.com/docs/changelog#<li id>`
    - `description`：`<article>` 正文 HTML，仅正文，不混入标题作者等
- feed `link` 指向 `https://learn.chatgpt.com/docs/changelog`（人类可读页面）
- category：`program-update`（单一分类）；radar source `learn.chatgpt.com/docs/changelog`

### 路由 2：`/kimicode/changelog/:language?`

- 新建 namespace `kimicode`（`name: 'Kimi Code'`，`url: 'moonshotai.github.io/kimi-code'`）
- `:language?` 路径参数，可选，默认 `zh`；合法值：`zh`、`en`，非法值报错并列出合法值
- 条目字段：
    - `title`：版本号（如 `0.37.2`），从 h2 id 解析
    - `pubDate`：日期部分（如 `2026-08-19`），从 h2 id 解析
    - `link` / `guid`：`https://moonshotai.github.io/kimi-code/<lang>/release-notes/changelog.html#<h2 id>`
    - `description`：该 h2 到下一个 h2 之间的全部内容 HTML
- feed `link` 指向对应语言的 changelog 页面
- category：`program-update`；radar source 覆盖 zh/en 两个页面

## 共用约定

- 单次请求列表页即得全部内容，无详情页循环，无需 `cache.tryGet`
- 不分页，仅输出当前页内容；数量限制交给 RSSHub 内置 `limit` 通用参数（middleware 处理）
- 不做自定义标签过滤（类型/语言是源站自身的内容分版，属路由配置而非标签过滤）
- 参考实现：`lib/routes/claude/code-changelog.ts`
- 代码风格遵循项目 AGENTS.md Review guidelines（camelCase、`import type`、英文注释等）

## 文件清单

- `lib/routes/chatgpt/namespace.ts`（新建）
- `lib/routes/chatgpt/changelog.ts`（新建）
- `lib/routes/kimicode/namespace.ts`（新建）
- `lib/routes/kimicode/changelog.ts`（新建）

## 验证方式

- 本地启动 dev server，分别请求：
    - `/chatgpt/changelog`、`/chatgpt/changelog/codex-cli`、`/chatgpt/changelog/general` 及一个非法 type
    - `/kimicode/changelog`、`/kimicode/changelog/en` 及一个非法 language
- 检查条目的 title / pubDate / link 唯一性 / description 完整性
