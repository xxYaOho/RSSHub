# To Agent

RSSHub 项目的 fork 仓库, 保留完整的 RSSHub 能力和用途, 增加 human 使用需求的特性功能. 每次迭代时先同步上游 RSSHub 的更新 (upstream remote: `DIYgod/RSSHub`), 不要向上游提出 PR.

## First Read

- 先读 `README.md` 了解项目
- 阅读 `docs/simple-wiki/wiki/INDEX.md` 了解项目的事实真源和知识, 便于后续渐进式查阅

## 任务导览

- 写/改路由 → 先读 `docs/simple-wiki/wiki/route-standards.md` 和 `project-architecture.md`；新增自研路由须同步登记 `lib/custom-namespaces.ts` 与 `custom-routes.md`（/dashboard 数据源）
- 生产线更新上线 → `mise run update` (install → pm2 重建 → 健康检查); 细节见 `environments-deployment.md`
- 部署/重启/环境 → `environments-deployment.md`; 故障排查 → `known-issues.md`
- 翻译功能 → `translation-feature.md`
- 自开发路由清单 → `custom-routes.md`

## 环境

- **生产**: master 分支 (本仓库), pm2 守护, 端口 1200
- **开发**: worktree `/Users/teatin/.worktree/RSSHub/dev` (dev 分支), 端口 1300, 用完即关
- 详见 `docs/simple-wiki/wiki/environments-deployment.md`

## Simple Wiki

只沉淀可复用知识, 一次性日志、临时命令输出、未经验证的猜测和普通 TODO 不应进入 wiki。

- `docs/simple-wiki/raw` 记录稳定原始材料：项目目标、决策、验证契约和研报等等。
- `docs/simple-wiki/wiki` 是给未来 agent 查阅的知识文档, `INDEX.md` 是目录导览, 优先从导览开始查阅。当某个改动产生会影响未来 agent 判断的知识时，同步更新这些页面。
- 大量查阅资料时, 使用 skill yes-swiki 专属子代理 swarm-reader 完成阅读; 候选页 context 总和阈值见 SCHEMA.md。
- `docs/simple-wiki/LINT.md` 记录查阅中确认的存疑文档及反馈：主体条目待 librarian 核实，「ESCALATE」区块内待人工裁决. 查阅中发现存疑，先向 human 反馈，确认后才写入 LINT.md.
