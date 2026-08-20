---
class: material
ingested: true
metadata: ~
---

# 更正: merge 不进 mise, update 纯部署

日期：2026-08-20

对 [mise 生产流程固化与 pm2 启动脚本化](mise-production-flow.md) 的设计修正。

## 决策

`mise run update` 不包含任何 git 操作。merge dev → master、pull、push 全部留在人工/git 侧
（merge 可能冲突，需要人判断，任务执行器无法处理，只会在半途中止制造混乱）。

用户原始需求：让生产环境更新方便点，避免忘记重启 pm2。

## 最终任务流

- `mise run update`：`pnpm install --frozen-lockfile` → restart → health。把**当前本地 master** 送上生产线，随时可跑，无副作用
- `mise run restart` / `health` / `logs`：不变
- `release` 任务已移除（曾短暂存在：merge dev + push origin）
