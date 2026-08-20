# LOG

> [!IMPORTANT]
> 倒序添加, 最新日志在上方. Headline 2 为日期, 内部收纳多条日志.
>
> ```
> ## YYYY-MM-DD
> - <ingest|lint> | <主题或页面> | <一句话说明>
> ```

## 2026-08-20

- ingest | 部署运维 | 编译 raw/mise-update-no-git.md：update 改为纯部署（不含 git），release 任务移除，旧论断按 superseded 标注保留，同步 INDEX
- ingest | 部署运维 | 编译 raw/mise-production-flow.md：环境页改写为 mise 任务流 + start.sh（旧 pm2 手动流程标注 superseded），known-issues 新增 `_bun` 踩坑条目，同步 INDEX
- ingest | 路由开发/项目架构/部署运维 | 编译 4 份 raw（路由规范、CLAUDE.md、路由手册、changelog 路由设计）为 7 个 wiki 页，同步 INDEX；autots 描述矛盾经代码核实后按实际行为收录
