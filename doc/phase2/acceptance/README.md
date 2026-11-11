# 步骤8：统一验收与接入差异举证

日期：2026-11-11。生产代码冻结在4e8e80d；本步骤没有修改生产 src、内核、加载器或既有插件。用户授权创建一个本地 A 方式演示提交，未授权推送该分支。本轮没有创建 p2。

## 验收结论

严格类型检查、生产构建、26个文件中的567项测试通过。另执行12组真实进程 A/B 会话，比较未经归一化的 stdout/stderr Buffer、退出码、SVG文件名和原始内容，全部一致。

| 会话组 | 插件集合 | 验证 |
| --- | --- | --- |
| builtin-cli-1、flowchart-a、help、empty、no-document、shapes-history | 仅默认能力，所有可选插件关闭 | A/B逐字节一致；两者再对照 final 的独立六组原始基线，输出/退出码/SVG均一致 |
| full-cli-1、full-flowchart-a | stats、dir、box、modified-star | 课程§6与§6.1版本A，在全插件环境中A/B一致 |
| full-flowchart-box | 同上 | §6.1版本B，创建、组合移动/撤销、fill传播、label修改/撤销、双标签树与8元素SVG一致 |
| full-commands | 同上 | 无文档dir、空统计、DFS统计、undo/redo后统计、帮助与固定目录输出一致 |
| full-labels-history | 同上 | 保存、再编辑、undo/redo、再次保存、移动后undo、读回、统计与标签生命周期一致 |
| historical-box-A-B | 默认能力+box | 从实际 A/B 接入提交各自构建运行，版本B原始输出、退出码与SVG一致 |

cli-1 的退出码1是原会话预期错误，不表示验收失败；其余输入期望退出码0。所有 stderr 为空，正常业务错误按原CLI规则出现在 stdout。完整输入、A/B输出、SVG和SHA-256见 [evidence](evidence/manifest.json)，输入与输出分文件存放。没有覆盖步骤0基线。

每组 A/B 使用同一个绝对工作目录、相同初始文件和同一插件顺序；options均未提供。A 是显式代码实例化，B 是通用配置加载，两者经过同一注册事务。日志和配置在被列举目录之外。commands会话目录始终为两个子目录、隐藏文件与other.svg；脚本核对条目不变并断言确定的目录输出。其他会话的保存产物在B运行前重置为相同初态。

测试中的加载器失败/回滚、各插件独立行为、真实目录适配器、属性事务和dirty分支随567项完整套件统一通过；没有重复运行未变更的 VS Code 界面验收。此前截图与宿主证据继续有效。

## 接入提交的差异证据

| 证据 | 提交 | 父提交 | 运行代码变化 |
| --- | --- | --- | --- |
| 命令插件 B | 969ca05 | 60e0f23 | 新增stats/dir包，修改配置；附通用构建清单复制脚本与package构建元数据 |
| box B | c2a83b6 | 969ca05 | 仅新增box包并修改配置，其他变化为测试/文档 |
| 星号 B | 4e8e80d | c2a83b6 | 仅新增tree-star包并修改配置，其他变化为测试/文档 |
| box A | 921b642 | 969ca05 | 仅新增与B完全相同的box包，修改一个顶层装配文件 src/host/Runtime.ts |

A位于本地分支 demo/phase2-box-code，没有合并进phase2，也没有推送。A/B共享父提交969ca05；A的唯一装配变化是静态导入BoxPlugin并经同一加载/注册事务激活。配置加载器和内核均未更改。B接入没有修改任何既有运行源码。

[差异清单](diffs/manifest.json) 记录完整SHA、实际存在的保护路径及检查结果。每项附 names.txt、完整patch和protected.diff。脚本先用git ls-tree确认父提交中的内核/宿主/入口/所有既有插件目录存在，再检查差异；新增插件目录不纳入既有插件范围。A只排除已允许的那一个装配文件，其余保护目录差异仍为空。A/B的box包也直接比较为空，证明不是换了另一个实现。

命令接入中的 CopyPluginManifests.mjs 只在构建时将新增包清单复制到dist，没有具体包名映射，不被运行CLI导入；package.json只改build命令，不用构建元数据夹带运行逻辑。所有兼容文件和历史成本仍在指标范围内，未借本次举证清理旧代码。

人工复核了 src/host/plugins/PluginLoader.ts：运行时只按配置字符串调用Node解析和动态import，再读取通用清单，没有具体插件import、名称映射或按包名的条件分支。仅搜索关键词不是结论依据；本步骤没有修改该加载器。

## 从远端检出后恢复本地演示提交

演示提交另存为增量 [Git bundle](diffs/box-code-demo.bundle)，已经git bundle verify通过，所需基提交969ca05在phase2历史中。这样无需推送演示分支，未来检出远端项目也能恢复其提交对象。

```powershell
git bundle verify doc/phase2/acceptance/diffs/box-code-demo.bundle
# 新检出仓库中尚无演示分支时执行：
git fetch ./doc/phase2/acceptance/diffs/box-code-demo.bundle refs/heads/demo/phase2-box-code:refs/heads/demo/phase2-box-code
git diff 921b642^ 921b642 --name-status
git diff c2a83b6^ c2a83b6 --name-status
git diff 921b642 c2a83b6 -- src/plugins/shape-box
```

最后一条应为空。直接查看保存的patch也可审阅全部变化；bundle用于核验真正的commit，不用补丁冒充提交。

## 复现

在仓库根准备两个独立历史工作树（当前phase2不会切换）：

```powershell
npm ci
npm run build
git worktree add .step8-box-code demo/phase2-box-code
git worktree add --detach .step8-box-config c2a83b6
node node_modules/typescript/bin/tsc -p .step8-box-code/tsconfig.build.json
node .step8-box-code/scripts/CopyPluginManifests.mjs
node node_modules/typescript/bin/tsc -p .step8-box-config/tsconfig.build.json
node .step8-box-config/scripts/CopyPluginManifests.mjs
node scripts/Phase2Acceptance.mjs
node scripts/Phase2DiffEvidence.mjs
```

嵌套工作树从父仓库解析已安装的依赖，无需重复安装。验收脚本创建的场景目录在结束时清理；证据写入本目录。复现完可用git worktree remove移除这两个工作树，演示分支和提交仍保留。

本轮生产构建和完整测试各执行一次，比较/举证通过后仅整理文档与归档，没有再次运行整套。步骤9还需最终文档收敛、基于冻结代码的指标更新、干净检出，以及经用户确认后的提交推送与p2标签。
