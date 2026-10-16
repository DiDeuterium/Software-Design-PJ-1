# Software Design PJ1 — SVG CLI Editor

TypeScript 面向对象 SVG 编辑器。六种图形、全部十个编辑命令、undo/redo、init/canvas、tree/show/help 和 SVG read/save 均已接入 CLI。完整课程场景和用户回传截图的视觉验收已通过，下一步进行最终交付整理。

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

CLI 显示启动提示与 `svg>`；支持空行、整行注释，EOF 或交互 Ctrl+C 退出。输入错误后继续读取，有错误时最终退出码为 1。启动时没有文档，先执行 init 或 read；help 无需文档。编辑在内存中进行，执行 save 才写入文件。

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
save diagram.svg
```

完整中文示例见 [examples/flowchart.cli](examples/flowchart.cli)。PowerShell 回放时使用 UTF-8：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
Get-Content -Raw -Encoding UTF8 examples/flowchart.cli | npm run cli
```

双引号参数支持 `\"` 和 `\\`，允许空字符串；未知转义与未闭合引号报错。只有整行首个非空白字符为 # 时才是注释，颜色值不会被截断。带空格的 Windows 路径需要双引号，并在引号内将反斜杠写成 `\\`，也可使用 `/`。

init 无参数使用 800×600，仅给宽度时高度为 600。canvas 无参数查询，仅给宽度时保留当前高度。成功 init/read/save 或修改 canvas 会清空并锁定历史，直到下一次成功编辑；tree/show/help/canvas 查询不影响历史。tree 显示显式属性，show 展示实际父级与自身属性，未设置的继承样式不会伪装成自身属性。

## SVG 读写

从项目根目录启动后，可输入：

```text
read examples/other.svg
tree
move g1 10 20
save "edited diagram.svg"
set t1 text "中文 & <标签>"
save
```

read 成功时替换当前文档并记住路径；缺失 ID 自动补全，警告在完整导入成功后输出。显式 save 成功更新默认路径，无参数 save 使用最近一次成功 read/save 的路径；init 清空默认路径。相对路径均以启动进程的工作目录为基准。

save 默认覆盖已有文件，先在同目录写入独占临时文件并刷盘，再替换目标。读写失败保留当前文档、默认路径和历史；无法完成替换时保留旧文件，尽力清理本次临时文件。

导入支持 UTF-8 / XML 1.0 的 rect、circle、ellipse、line、text、g，以及设计文档规定的属性。根 width/height 必须存在且为正数（数值或 px）；viewBox 只能省略或等价于 `0 0 width height`。支持 SVG 命名空间、注释、文本 CDATA、XML 标准实体和数字字符引用；不支持 transform、未知元素/属性、DOCTYPE、自定义实体或处理指令，遇到这些内容整次 read 失败。完整支持矩阵见 [设计文档 §5.1](doc/README.md#51-svg-导入与属性支持矩阵落实-d09)。

示例：[other.svg](examples/other.svg) 是课程中的外部 SVG，含一个缺失 ID；[flowchart.svg](examples/flowchart.svg) 由编译后的 CLI 回放流程图脚本并保存生成，已验证可以重新读入。

## 验证

```powershell
npm run typecheck
npm test
npm run build
```

也可执行 `npm run check` 连续完成上述三项，或用 `npm run test:watch` 进入测试监听。

当前 19 个测试文件、520 项测试覆盖领域模型、应用机制、全部命令、CLI 回放、SVG 严格导入和读写往返。文件测试覆盖真实覆盖保存、临时写入/刷盘/替换失败、旧文件保留、临时文件清理、默认路径和历史屏障。

完整课程会话和版本 A 的逐条验收、编译入口输出、SVG 产物及用户提供的预览截图见 [验收记录](doc/acceptance/README.md)。§6 会话包含两条预期错误，脚本退出码为 1，测试按预期错误和后续完整输出判断通过。

## 目录

- `src/domain`：已实现图形、集中工厂、文档树管理、快照与遍历协议。
- `src/application`：编辑/文档/查询命令、历史与会话，以及展示、文件、SVG 编解码端口。
- `src/cli`：保留引号信息的分词器、统一命令分发、异步 REPL。
- `src/presentation`：TreeFormatter、ShowFormatter、HelpFormatter 与显式样式展示。
- `src/infrastructure`：FastXmlSvgCodec、XML 输入验证、SVG Writer Visitor 与本地文件替换适配器。
- `src/bootstrap`：依赖装配与启动。
- `tests`：自动测试；`examples`：流程图命令脚本、生成的 SVG 和课程导入示例。

业务类遵循一类一文件；bootstrap/main.ts 和工具配置是装配入口，不承载领域逻辑。

## 提交约定

Commit 信息使用 `类型 - 简要中文说明`，类型按内容选择，例如 `feature`、`fix`、`doc`、`test`、`chore`。

示例：`feature - 搭建工程骨架与测试工具链`。每个开发步骤完成并验证后，先询问用户，再进行提交和推送。
