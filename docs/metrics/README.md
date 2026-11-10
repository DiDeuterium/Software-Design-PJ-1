# 指标复现

从仓库根执行：

```powershell
node --import tsx scripts/Metrics.ts --worktree
node --import tsx scripts/Metrics.ts --ref <已提交的代码SHA>
```

第一条用于开发预览，读取 final 的 Git 历史和当前工作树，报告明确标注 preview；不冒充 final → p2 的最终历史指标。第二条两侧都通过 git ls-tree/git show 读取历史，正式提交后和收尾时使用它。省略参数时候选为 HEAD。生成 metrics.json、report.md、before.puml、after.puml；输出不含时间戳，内容摘要帮助识别测量源码。报告提交本身不改变 src 范围，收尾用冻结的代码提交重算，再核对 p2。

范围为 src/**/*.ts，按 core、host、plugins 拆分；extensions/svg-tools/src 单列 vscode，不混入 CLI 增量。排除测试、脚本、依赖、声明包和构建产物。第一阶段按原目录职责归类；第二阶段 src/core 属内核，src/host 与入口属于装配/适配，默认插件及旧路径兼容导出归 plugins。所有旧实现都计入，不因迁移保留代码而隐藏其行数成本。

行数为包含空行和注释的物理行数。圈复杂度按 TypeScript AST 对每个有函数体的函数/方法/构造函数/访问器/箭头函数计算：起始 1，if、条件表达式、各循环、catch、非 default 的 case、&&、||、?? 各加 1；嵌套函数单算，接口签名不算，可选链不算。文件值为函数之和，JSON 保存函数级明细；这是明确口径的静态 McCabe 近似，不声称执行路径覆盖率。注释和字符串内容不计分支。

项目使用 TypeScript 7 原生编译器，其根入口不再提供旧版内存 AST API。新增开发依赖 typescript-ast（npm alias，固定 TypeScript 5.9.3）仅供指标解析与依赖边界测试，生产 CLI 不加载它，也不替代现有构建编译器。脚本使用该版本统一解析 final 与候选，避免前后口径变化。

文件职责从目录规则自动生成，实际依赖图从 import/export 的相对模块路径生成；不把目标架构图当作实际图。完整核验还须结合接口清单与源代码，不能仅凭图上没有边判定契约成立。
