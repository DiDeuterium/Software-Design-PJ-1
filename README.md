# Software Design PJ1 — SVG CLI Editor

TypeScript 面向对象 SVG 编辑器。当前完成工程骨架、领域模型、命令历史与基础编辑命令：create/delete/move/scale/set，以及集中图形工厂。结构编辑命令、CLI 编辑接入和 SVG 读写尚未实现。

架构与行为约定见 [doc/README.md](doc/README.md)，课程要求见 [phase_cli_1.md](phase_cli_1.md)。

## 环境与安装

使用 Node.js 22.12 及以上的 22.x，或 24.x / 26 及以上版本，npm 10 及以上。当前验证环境是 Node.js 22.17.1、npm 10.9.2。

在工程根目录执行：

```powershell
npm ci
```

依赖版本固定在 package.json 与 package-lock.json；项目级 .npmrc 使用 npm 官方源，不改变全局设置。

## 运行

开发时直接运行 TypeScript：

```powershell
npm run cli
```

编译后运行 JavaScript：

```powershell
npm run build
npm start
```

CLI 显示启动提示与 `svg>`；支持空行、整行注释，EOF 或交互 Ctrl+C 退出。当前所有非空命令均返回 `error: unknown command: <name>`；这是骨架占位行为，不表示这些课程命令已经实现。输入错误后继续读取，最终退出码为 1。

## 验证

```powershell
npm run typecheck
npm test
npm run build
```

也可执行 `npm run check` 连续完成上述三项，或用 `npm run test:watch` 进入测试监听。

当前 10 个测试文件、321 项测试覆盖 CLI 骨架、领域模型、应用机制和五个真实基础编辑命令，包括六种创建参数、父容器归属、成功反馈、精确撤销重做、失败时 redo 保留及异步顺序。基础命令在应用 API 上执行，CLI 分发仍未接入。后续加入结构命令与 SVG 读写测试。

## 目录

- `src/domain`：已实现图形、集中工厂、文档树管理、快照与遍历协议。
- `src/application`：已实现命令基类、五个基础编辑命令、历史管理、会话与状态；文件及编解码端口待实现。
- `src/cli`：REPL 与命令分发边界。
- `src/presentation`：展示（待实现）。
- `src/infrastructure`：SVG 与文件适配器（待实现）。
- `src/bootstrap`：依赖装配与启动。
- `tests`：自动测试；`examples`：后续命令脚本和 SVG 示例。

空目录用 .gitkeep 保留。业务类遵循一类一文件；bootstrap/main.ts 和工具配置是装配入口，不承载领域逻辑。

## 提交约定

Commit 信息使用 `类型 - 简要中文说明`，类型按内容选择，例如 `feature`、`fix`、`doc`、`test`、`chore`。

示例：`feature - 搭建工程骨架与测试工具链`。每个开发步骤完成并验证后，先询问用户，再进行提交和推送。
