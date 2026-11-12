# 第二阶段最终检出与交付核对

日期：2026-11-11。验证提交4408b4f9b7782dc9174b5df7d154f5e3506daf31，已推送phase2。最终报告、指标和本记录随 `p2` 交付。

## 干净检出

从本地已提交历史执行git clone --no-hardlinks --branch phase2到独立目录 .pj1-p2-clean-20261111。开始时根包及extensions/svg-tools都没有node_modules或dist；没有复用原工作区的依赖目录。

分别以独立空npm缓存运行npm ci：CLI安装51包，扩展安装47包，均成功。根npm run build完成TypeScript编译与通用插件清单复制；扩展npm run build完成严格类型检查与打包。未更改锁文件。

scripts/FinalCheckout.mjs验证：

- 从同一个空工作目录分别启动源码和编译入口，显式加载根配置中的全部四个可选插件。
- 运行help、无文档dir、init、box创建、label/fill、move/undo/redo、stats、tree、save/read及再统计。
- 两次退出码0、stderr空；stdout和生成SVG原始字节相同，SVG含box元数据，统计为两叶子/一容器。
- 配置、输出证据位于被列举目录之外；两次使用相同初始目录。
- Git bundle verify通过，检出仓库在运行前后git status均为空。

输入、两入口stdout/stderr/SVG和SHA-256见 [final-checkout](final-checkout/manifest.json)。Node版本为22.17.1，npm10.9.2。可用 `node scripts/FinalCheckout.mjs <独立检出绝对路径>` 复验；先按锁文件安装并构建两个包。

上一轮统一验收已对相同生产源码完成567项测试及12组A/B比较，本轮未重复整套或再次操作VS Code界面。扩展真实宿主与截图沿用未改动源码的步骤1证据。

## 最终文档与指标

doc/README.md已重写为交付报告，只保留课程所需的架构、扩展点清单、A/B说明、四条ADR、dir适配器、VS Code分析/演示、过程与质量证据，不把开发讨论堆作附录。各阶段原始记录仍在独立文档。

运行 `node --import tsx scripts/Metrics.ts --ref 4408b4f` 从Git历史生成docs/metrics的文件职责、core/host/plugins行数、函数复杂度增量和实际前后PlantUML，VS Code单列。候选源码摘要为f2cdd329646deb99bd4fc81423a08d39b2c0e580f5f7088e4e989c7f9adb6dc8，包含全部正式插件，不再使用步骤3的早期快照。

当前对4408b4f的src及extensions/svg-tools/src差异为空，两个锁文件差异也为空。最终文档提交不改变计量范围；创建p2后可用 `node --import tsx scripts/Metrics.ts --ref p2` 核对相同源码摘要与各项数字，候选SHA文字变化本身不代表指标变化。

## 收尾状态

| 交付项 | 状态 |
| --- | --- |
| 必做VS Code与CLI功能 | 已完成；未做选做图形/导出扩展 |
| 统一验收与A/B真实提交差异证据 | 已完成，4408b4f已推送；演示分支仅本地，bundle随仓库 |
| 最终报告、冻结历史指标与干净检出结论 | 随 p2 交付 |
| final | 保持251127e69abb2512dc787efe6a92dd30ab9514d4 |
| p2 | 指向最终交付提交 |

以 `git show p2:doc/README.md` 查看最终交付报告。
