# Software Design PJ1 — SVG CLI Editor

TypeScript 面向对象 SVG 编辑器。第二阶段步骤3已完成 CLI 插件框架迁移，默认保留六种图形、全部原命令和 SVG read/save。第一阶段课程场景、预览和干净检出记录保留；本轮新入口通过回归及字节兼容验证，后续双装配与正式插件仍待实现。

最终设计文档见 [doc/README.md](doc/README.md)，行为约定见 [设计决策](doc/decisions.md)，课程要求见 [phase_cli_1.md](phase_cli_1.md)。

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

导入支持 UTF-8 / XML 1.0 的 rect、circle、ellipse、line、text、g，以及已确认的属性。根 width/height 必须存在且为正数（数值或 px）；viewBox 只能省略或等价于 `0 0 width height`。支持 SVG 命名空间、注释、文本 CDATA、XML 标准实体和数字字符引用；不支持 transform、未知元素/属性、DOCTYPE、自定义实体或处理指令，遇到这些内容整次 read 失败。完整支持矩阵见 [设计决策](doc/decisions.md)。

示例：[other.svg](examples/other.svg) 是课程中的外部 SVG，含一个缺失 ID；[flowchart.svg](examples/flowchart.svg) 由编译后的 CLI 回放流程图脚本并保存生成，已验证可以重新读入。

## 验证

```powershell
npm run typecheck
npm test
npm run build
```

也可执行 `npm run check` 连续完成上述三项，或用 `npm run test:watch` 进入测试监听。

当前22个测试文件、539项测试包含原520项回归、9项契约、9项生产框架贯通及1项指标口径测试。另用六组原始字节基线核验新编译入口。文件测试覆盖覆盖保存、临时写入/刷盘/替换失败、旧文件保留、默认路径和历史屏障。

完整课程会话和版本 A 的逐条验收、编译入口输出、SVG 产物及用户提供的预览截图见 [验收记录](doc/acceptance/README.md)。§6 会话包含两条预期错误，脚本退出码为 1，测试按预期错误和后续完整输出判断通过。

另在全新 Git 检出中，使用独立空 npm 缓存安装依赖，完成全部检查、源码/编译启动及完整会话回放。验证后工作区和锁文件保持不变，详见 [干净检出验证记录](doc/verification/README.md)。

## 目录

- `src/core`：公开扩展点、通用文档与事务、历史、注册分发、展示和 SVG 编解码。
- `src/host`：装配、终端、本地文件与目录适配；`src/bootstrap`：启动入口。
- `src/plugins/builtin`：默认六类图形和十九条命令，legacy 中保留第一阶段兼容实现。
- 原 `src/domain`、`application`、`cli`、`presentation`、`infrastructure`：旧路径兼容导出，新内核不导入。
- `scripts/Metrics.ts`、`docs/metrics`：指标生成和实际依赖图。
- `tests`：自动测试；`examples`：流程图命令脚本、生成的 SVG 和课程导入示例。

业务类遵循一类一文件；bootstrap/main.ts 和工具配置是装配入口，不承载领域逻辑。

## 第二阶段进度

第二阶段当前完成 VS Code 扩展实践：源码与运行步骤见 [SVG Tools](extensions/svg-tools/README.md)，模式分析、复用评估和实际截图见 [实践记录](doc/phase2/vscode/README.md)。该扩展独立执行 npm ci、npm run check 及真实扩展宿主测试，不包含在根目录 CLI 的测试计数中。

步骤2的 [契约与 ADR](doc/phase2/architecture/README.md) 已落地；步骤3完成 [框架迁移](doc/phase2/framework/README.md)，[指标](docs/metrics/README.md) 已按代码提交 cf0e544 重算。步骤4完成 [代码/配置双装配](doc/phase2/assembly/README.md)，可通过 `npm run cli -- --config plugins.config.json` 启动。下一步为步骤5的 stats/dir；正式 box 和树标签也尚未接入。

## 提交约定

Commit 信息使用 `类型 - 简要中文说明`，类型按内容选择，例如 `feature`、`fix`、`doc`、`test`、`chore`。

示例：`feature - 搭建工程骨架与测试工具链`。每个开发步骤完成并验证后，先询问用户，再进行提交和推送。
