# INDEX

> [!IMPORTANT]
> Headline 2 为主题聚类, 无主题内容默认放在 Headline 1 中. 同主题条目达到 3 条时, 为它们创建独立主题.
> 每页一行, 先查阅编译后的知识, 按需查阅源材料:
> `- [title](file.md) | <context>k | <一句话描述> | tag, tag`

## 路由开发

- [路由开发质量标准](route-standards.md) | 2k | 路由配置/代码风格/数据处理/抓取/媒体/Puppeteer 的质量红线清单 | route, review, 规范
- [自开发路由清单](custom-routes.md) | 1k | 本 fork 自开发路由与 sspai 等上游路由的本地修复速查 | route, sspai, proxy, 清单
- [Changelog 路由设计（ChatGPT 与 Kimi Code）](changelog-routes-design.md) | 1k | 两个 changelog 路由的数据源结论与设计决策 | route, changelog, chatgpt, kimicode, 设计

## 项目架构

- [项目架构与开发工作流](project-architecture.md) | 1k | Hono 架构、路由自动发现、中间件管线、新路由开发流程 | architecture, route, workflow

## 部署运维

- [开发与生产环境](environments-deployment.md) | 2k | master/pm2/1200 生产与 worktree dev/1300 开发的环境划分；生产流程由 mise 任务流（update/restart/health/logs）固化，update 纯部署不含 git | deploy, pm2, worktree, redis, mise
- [双语翻译功能](translation-feature.md) | 1k | 翻译路由参数、环境变量、LM Studio 模型生命周期与 benchmark | translation, llm, lmstudio, deepseek
- [已知问题与踩坑](known-issues.md) | 1k | 缓存过期、端口残留、pm2 环境变量、bash source zshrc 被 `_bun` 打断等运维坑及解法 | pitfall, cache, pm2, 端口, mise
