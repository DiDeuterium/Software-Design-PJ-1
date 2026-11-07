# Phase 2 步骤 0：第一阶段兼容基线

完成日期：2026-11-07。当前开发分支为 phase2，由 final 创建；基线提交固定为 251127e69abb2512dc787efe6a92dd30ab9514d4，既有 final 标签未移动。本步骤没有修改生产代码、第一阶段要求或依赖。

## 已固定的输入与输出

| 输入文件 | 覆盖范围 | 预期退出码 |
| --- | --- | --- |
| cli-1.txt | 课程 §6 完整会话，含非法分组、保存后 undo、读取及补 ID | 1 |
| flowchart-a.txt | 课程 §6.1 版本 A，含嵌套、移动与撤销、中文、保存 | 0 |
| help.txt | 无文档时帮助及完整内置命令顺序 | 0 |
| empty.txt | 空行、注释、提示符、EOF | 0 |
| no-document.txt | 无文档错误、未知命令及错误后继续 | 1 |
| shapes-history.txt | 六类图形、带归属创建、无标签 tree/子树、show、canvas、编辑、分组/解组/迁移/排序、undo/redo、保存屏障 | 1 |

输入只含命令与注释，没有提示符和预期输出。每个场景的 stdout.txt、stderr.txt 单独保存；退出码和 stdout 的 SHA-256 见 [manifest.json](manifest.json)。非零退出码对应刻意包含的错误，是测试预期。

other.svg 为固定读入样例；cli-1.demo.svg、flowchart-a.flowchart.svg、shapes-history.shapes.svg 是对应场景实际生成的产物。[before.puml](before.puml) 保存重构前的模块依赖图，后续与 Phase 2 图进行比较。

## 复现与后续回归

从仓库根目录执行：

```powershell
npm ci
npm run build
node --import tsx scripts/Phase1Baseline.ts check
```

检查直接比较 stdout、stderr 和 SVG 的原始 Buffer，另行核对退出码；不删除提示符、不归一化空格/换行，也不允许新增标签。每个场景使用独立临时工作目录，日志保存在比较目录之外，场景结束后清理临时目录。

后续重构时禁用全部可选插件，包括树标签，再运行 check。也可指定候选编译入口及启动参数：

```powershell
node --import tsx scripts/Phase1Baseline.ts check --entry D:/path/to/main.js -- --config D:/path/to/builtins-only.json
```

比较入口及配置路径应使用绝对路径，因为子进程工作目录是独立临时目录。默认测试入口为本仓库 dist/bootstrap/main.js。

首次基线由 record 模式录制。该模式要求当前源码、依赖与构建配置字节等同 final，并重新构建；已有 manifest 时拒绝覆盖。后续开发使用 check，不重新录制期望输出。check 还会确认 final 仍指向原提交。

## 本次验证结果

- record 模式首次录制成功；check 模式六个场景全部逐字节匹配。
- npm run check 通过：严格类型检查、19 个文件中的 520 项测试、生产构建。
- 基线工具单独通过 TypeScript strict 类型检查。
- 已有 CommandDispatcher、ShapeFactory 的固定映射，以及 Visitor、SVG 写回等耦合点留待后续框架步骤处理，本步骤不改动它们。
- 本轮尚未提交推送，也没有创建 p2 标签；VS Code 实践和四个扩展点均未开始实现。
