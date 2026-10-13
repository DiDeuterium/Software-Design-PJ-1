# Software Design PJ1 — SVG CLI Editor

TypeScript 面向对象 SVG 编辑器。当前已接入 CLI：六种图形、全部十个编辑命令、undo/redo、init/canvas 和 tree/show/help 可以在终端使用。SVG 文件读写将在下一阶段实现。

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

CLI 显示启动提示与 `svg>`；支持空行、整行注释，EOF 或交互 Ctrl+C 退出。输入错误后继续读取，有错误时最终退出码为 1。启动时没有文档，先执行 init；help 无需文档。read/save 会明确提示尚未实现，当前编辑结果只保存在进程内存中。

启动后可逐行输入：

```text
init 800 600
create g node
create rect box 120 100 160 60 #4a90d9 in node
create text label 155 135 "开始" in node
tree
move node 0 100
undo
redo
show label
```

完整中文示例见 [examples/flowchart.cli](examples/flowchart.cli)。PowerShell 回放时使用 UTF-8：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
Get-Content -Raw -Encoding UTF8 examples/flowchart.cli | npm run cli
```

双引号参数支持 `\"` 和 `\\`，允许空字符串；未知转义与未闭合引号报错。只有整行首个非空白字符为 # 时才是注释，颜色值不会被截断。带空格的 Windows 路径需要双引号，并在引号内将反斜杠写成 `\\`，也可使用 `/`。

init 无参数使用 800×600，仅给宽度时高度为 600。canvas 无参数查询，仅给宽度时保留当前高度。成功 init 或修改 canvas 会清空并锁定历史，直到下一次成功编辑；tree/show/help/canvas 查询不影响历史。tree 显示显式属性，show 展示实际父级与自身属性，未设置的继承样式不会伪装成自身属性。

## 验证

```powershell
npm run typecheck
npm test
npm run build
```

也可执行 `npm run check` 连续完成上述三项，或用 `npm run test:watch` 进入测试监听。

当前 14 个测试文件、436 项测试覆盖领域模型、应用机制、全部编辑命令、分词分发、Visitor 展示及真实 CLI 回放，包括中文/空文本/转义/颜色、错误恢复、创建归属、混合结构序列、精确撤销重做、失败时 redo 保留和文档屏障。SVG 读写测试将在下一阶段加入。

## 目录

- `src/domain`：已实现图形、集中工厂、文档树管理、快照与遍历协议。
- `src/application`：命令基类、十个编辑命令、初始化/画布/查询命令、展示端口、历史与会话；文件及编解码端口待实现。
- `src/cli`：保留引号信息的分词器、统一命令分发、异步 REPL。
- `src/presentation`：TreeFormatter、ShowFormatter、HelpFormatter 与显式样式展示。
- `src/infrastructure`：SVG 与文件适配器（待实现）。
- `src/bootstrap`：依赖装配与启动。
- `tests`：自动测试；`examples`：已加入可回放的流程图命令脚本，SVG 示例待后续加入。

空目录用 .gitkeep 保留。业务类遵循一类一文件；bootstrap/main.ts 和工具配置是装配入口，不承载领域逻辑。

## 提交约定

Commit 信息使用 `类型 - 简要中文说明`，类型按内容选择，例如 `feature`、`fix`、`doc`、`test`、`chore`。

示例：`feature - 搭建工程骨架与测试工具链`。每个开发步骤完成并验证后，先询问用户，再进行提交和推送。
