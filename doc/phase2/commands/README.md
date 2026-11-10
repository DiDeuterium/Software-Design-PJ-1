# 步骤5：stats 与 dir 命令插件

日期：2026-11-10。步骤4提交60e0f23已推送。本步骤尚未提交；不移动 final。

## 包与装配

两个包分别位于 src/plugins/command-stats 与 src/plugins/command-dir，均包含命令类、默认导出的插件类及声明 contributes.commands 的 package.json。它们仅依赖 core/public，不依赖内置命令表、其他插件或宿主实现。

构建新增 scripts/CopyPluginManifests.mjs：通用复制 src/plugins 下的 package.json 到 dist 对应位置，不解释插件名、不参与 CLI 运行。package.json 的 build 脚本因此增加复制步骤，属于构建元数据支持；内核、加载器、组合根和既有插件均无改动。插件入口为各包的 StatsPlugin.js / DirPlugin.js。

配置装配：

```powershell
npm run build
node dist/bootstrap/main.js --config plugins.config.json
```

根配置按 stats、dir 顺序引用 ./dist/plugins/command-stats 与 ./dist/plugins/command-dir。可单独移除或设置 enabled:false。无 --config 时仍保持原有默认能力，不加载这两个命令；未加载时不进入 help，执行报 error: unknown command: stats/dir。源码启动也须先构建供配置引用的插件文件，再执行 npm run cli -- --config plugins.config.json。

代码装配示例（在仓库根的 ESM 脚本中）：

```js
import { createRuntime } from './dist/host/Runtime.js';
import StatsPlugin from './dist/plugins/command-stats/StatsPlugin.js';
import DirPlugin from './dist/plugins/command-dir/DirPlugin.js';
const runtime = await createRuntime({ plugins: [
  { manifest: { name: '@svgframe/plugin-command-stats', contributes: { commands: ['stats'] } }, plugin: new StatsPlugin() },
  { manifest: { name: '@svgframe/plugin-command-dir', contributes: { commands: ['dir'] } }, plugin: new DirPlugin() }
] });
console.log((await runtime.dispatcher.dispatch('dir')).message);
```

A/B 都调用既有 PluginRegistry 注册事务，命令实现相同，dir 同样从 context.services.directory 取得目录端口；不另造一套注册或 IO 路径。正式接入提交差异的 A/B 分支举证仍在步骤8统一整理，不把本工作树记录冒充最终提交证据。

## stats 规则

StatsCommand.run 不接受参数，通过 Session.query 获取只读文档。从根的子项依次深度优先遍历；isContainer 节点只计 containers，其孩子继续统计；叶子按 type 在 Map 中累计，输出顺序为首次出现顺序，根 SVG 不计数。该协议同样适用于未来 box，无需预先判断 box 名称。空文档为 (total 0, containers 0)；无文档沿用原错误。输出示例：rect: 3  circle: 1  text: 2  (total 6, containers 2)。

## dir 与 Adapter 对应

| 角色 | 接口/类 | 责任 |
| --- | --- | --- |
| Client | DirCommand | 参数、分类、稳定排序和行输出；不调用 Node fs |
| Target | core/public/Plugin.ts 的 DirectoryReader、DirectoryEntry | read(path) 返回 name 与 directory/file/other |
| Adapter | host/filesystem/LocalDirectoryReader | 既有宿主适配器，把 readdir 的 Dirent 转成公开条目 |
| Adaptee | node:fs/promises.readdir | 实际读取直接子项，不递归 |

目标路径为 CommandContext.workingDirectory，即宿主记录的进程工作目录，不是 SVG 路径；read/save 不改变它。目录在前、文件在后，各组按 JS 字符串比较（UTF-16 码元顺序）升序，避免受机器 locale 影响。隐藏项保留，. 和 .. 排除。特殊项（含符号链接）排在文件后，显示 [OTHER]，不遍历目标。标签后统一两个空格；空目录显示 (empty directory)。读取失败抛出 cannot read directory: &lt;path&gt;，REPL 添加 error: 并继续接收命令。

dir 无需 SVG 文档；stats 与 dir 均通过 query 执行，不进入历史、不触发文档屏障、不发送提交事件，不改变文档/路径/dirty 基线。失败也保持原状态。

## 针对性验证

类型检查、生产构建和 tests/plugins/Commands.test.ts 的7项测试通过：

- stats 独立使用会话/模型替身，覆盖嵌套容器、复合类型、首次出现顺序、空文档、无文档和参数错误。
- dir 注入 DirectoryReader 替身，覆盖混合条目、隐藏项、特殊项、稳定排序、空目录、失败和参数拒绝。
- 各插件独立启用与帮助注册；未启用另一插件时报告未知命令。
- 实际会话中统计和目录查询成功/失败均保留内容、路径、undo/redo、屏障及提交事件；read/save 后仍读取原工作目录。
- 真实临时目录与已有适配器组合，A/B 使用相同目录、顺序与同一命令实现，原始 REPL Buffer 与退出码一致。配置和输出存于被列举目录之外，目录内容全程固定。

本轮不重复全量回归、六组第一阶段基线或 VS Code 验收。框架内部没有变更；指标仍保持步骤3历史快照，后续按收尾代码 SHA 更新。下一步为步骤6的 box 插件接入。
