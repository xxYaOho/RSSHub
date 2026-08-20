---
class: material
ingested: true
metadata: ~
---

# mise 生产流程固化与 pm2 启动脚本化

日期：2026-08-20

## 决策

采用 mise 管理项目工具链与生产流程（`.mise.toml`），固定 `mise run update` 一键上线。
上游自带的 nix/devenv（`.envrc`、`flake.nix`、`devenv.nix`）保持休眠不用。

## 工具链

- `.mise.toml` 锁定 node = 24、pnpm = 10（对齐 package.json engines `^22.22.2 || ^24.15.0`，此前本机跑 v26 有 engine 警告）
- 首次使用 `mise trust && mise install`

## 任务流

- `mise run release`：守卫（工作树干净）→ `git merge --no-ff dev` → `git push origin master`；冲突即中止，不触达生产
- `mise run update`：release → `pnpm install --frozen-lockfile` → restart → health
- `mise run restart`：`pm2 delete rsshub` + `pm2 start scripts/prod/start.sh --name rsshub` + `pm2 save`（持久化供开机 resurrect）
- `mise run health`：curl :1200 轮询最多 60 秒
- `mise run logs`：pm2 logs rsshub

## pm2 启动脚本化

- pm2 启动命令从 wiki 文档迁入 `scripts/prod/start.sh`（版本化、单一真源），pm2 fork 模式直接托管该脚本
- 环境变量全量在脚本内；改环境变量 = 改脚本 + `mise run restart`
- 生产现运行于 node 24.19.0（mise shim 经 PATH 传入 pm2 进程）

## 踩坑：bash 下 source ~/.zshrc 失败

- 现象：`mise run update` 首跑生产进程 errored，日志 `/Users/teatin/.bun/_bun: line 922: syntax error near unexpected token '('`
- 根因：`start.sh` 用 bash 执行，而 `~/.zshrc` 第 30 行 source 的 bun 补全脚本 `_bun` 是 zsh 专有语法，bash 解析报错；`set -e` 致脚本退出，pm2 重启循环 15 次后 errored
- 旧流程没踩到是因为当时在交互式 zsh 里 source，zsh 能解析 `_bun`
- 解法：不 source 整个 zshrc，只 eval 需要的行：`eval "$(grep -E '^DEEPSEEK_(BASE_URL|API_KEY)=' ~/.zshrc)"`
- 注意：`DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY` 在 `~/.zshrc:62-63` 是**无 export 的赋值行**（靠交互 shell 展开生效），grep 模式不要加 `^export`
