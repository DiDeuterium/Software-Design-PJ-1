# Software Design PJ1 — SVG CLI Editor

TypeScript 面向对象 SVG 编辑器。当前完成工程骨架：启动入口、输入循环和开发工具链；图形、文档、历史及编辑命令尚未实现。

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

当前测试验证真实子进程的启动、EOF、注释与连续错误后的退出码。未来随各功能加入领域、应用和 SVG 读写测试。

## 目录

- `src/domain`：图形、文档、工厂、遍历协议（当前为空目录占位）。
- `src/application`：命令、历史、端口、会话（当前为空目录占位）。
- `src/cli`：REPL 与命令分发边界。
- `src/presentation`：展示（待实现）。
- `src/infrastructure`：SVG 与文件适配器（待实现）。
- `src/bootstrap`：依赖装配与启动。
- `tests`：自动测试；`examples`：后续命令脚本和 SVG 示例。

空目录用 .gitkeep 保留。业务类遵循一类一文件；bootstrap/main.ts 和工具配置是装配入口，不承载领域逻辑。

## 提交约定

Commit 信息使用 `类型 - 简要中文说明`，类型按内容选择，例如 `feature`、`fix`、`doc`、`test`、`chore`。

示例：`feature - 搭建工程骨架与测试工具链`。每个开发步骤完成并验证后，先询问用户，再进行提交和推送。
