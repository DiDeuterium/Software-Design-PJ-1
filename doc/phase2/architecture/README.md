# 步骤2：CLI 扩展点与公开契约

日期：2026-11-09。依据第二阶段要求 §1、§3–6，以及用户确认的编号开发计划。

本步骤定义公开接口、注册事务及可独立验证的属性分发和标签组合。第一阶段 CLI 尚未切换到这些接口，默认运行行为不变；这里不宣称已经完成“框架可扩展”过程节点。该节点须在步骤3完成 CLI 迁移、实际回归及首次指标产出后验收。

## 目录与依赖边界

| 目录 | 定位 | 当前状态 |
| --- | --- | --- |
| src/core/public | 插件可依赖的领域协议、四个扩展点、会话端口、注册上下文和目录访问接口 | 本步骤新增 |
| src/core/registry | 暂存、重名检查、清单核对与原子提交 | 本步骤新增 PluginRegistry |
| src/core/attributes、src/core/tree | 属性分发和标签行尾组合 | 本步骤新增；尚未接入原 SetCommand/TreeFormatter |
| src/core 下的文档、会话、历史与通用渲染模块 | 消费公开协议，不引用具体图形、命令和标签 | 步骤3迁移；现有实现仍在 src/domain、src/application 等目录 |
| plugins/builtin-shapes、plugins/builtin-commands | 默认装配的六种 provider 与原有命令；保留 Phase 1 输出 | 步骤3建立，不在本步骤提前迁移 |
| src/host | 组合根、代码装配、配置与通用模块加载、真实 IO 适配器 | 步骤3–4建立；现有入口仍为 src/bootstrap/main.ts |
| plugins/command-stats、plugins/command-dir、plugins/shape-box、plugins/tree-star | 后续各独立插件包；box 包同时贡献属性和类型标签 | 步骤5–7新增 |
| tests/core/fixtures | 类形式的图形、命令、标签、处理器及候选文档/会话替身 | 只用于契约可行性验证，不是正式业务插件 |

运行依赖方向为：宿主 → 内核与插件；插件 → core/public；内核实现 → core/public。公开接口只相互依赖，不引用原 CLI 实现、Node 文件系统或宿主。插件不得导入 core/registry 等实现目录。未来需供插件使用的领域能力先成为公开协议，不能通过导入内部类绕过边界。

重构前图保留在 [baseline/before.puml](../baseline/before.puml)。[target.puml](target.puml) 是目标图；当前代码尚不满足整张目标图，最终实际依赖图和指标在后续生成，不把目标图作为已完成证据。

## 扩展点清单

以下路径相对仓库根。接口和本步骤调用位置均已存在；“后续接入处”是计划位置，尚未作为最终交付清单验收。

| 接口与职责 | 本步骤调用位置 | 类形式的现有验证实现 | 禁用/未命中行为与违约规则 | 后续接入处 |
| --- | --- | --- | --- | --- |
| ShapeProvider：创建、读回、编码、展示与操作反馈 | tests/core/ExtensionContracts.test.ts 的复合图形用例，调用 SampleProvider.create/read/write/present | tests/core/fixtures/SampleProvider.ts | 当前注册表可为空；迁移后未注册 create 类型报原有 unknown shape type；未知 SVG 元素按原有规则拒绝。provider 返回的类型、ID、子树与编码须符合请求；违反时拒绝整个候选操作 | 通用 ShapeFactory.create/fromAttributes、SvgWriter、TreeFormatter、ShowFormatter 及操作反馈服务；步骤3消除六类型 Visitor 枚举 |
| Command：命令名、语法、帮助、参数解释及调用会话 | 同一测试文件的独立命令用例，调用 SampleCommand.run | tests/core/fixtures/SampleCommand.ts | 空注册表不分发命令；迁移后未知名称维持 error: unknown command: &lt;name&gt;。参数规则由命令解释，不靠内核按名字分支 | CommandDispatcher.dispatch、HelpFormatter.format；步骤3迁移现有命令表 |
| TreeDecorator：给标题行追加标签，可在实例中维护提交状态 | src/core/tree/TreeLabels.ts 的 TreeLabels.append | tests/core/fixtures/SampleDecorator.ts | 空列表原样返回标题，连尾空格也不增加；按注册顺序拼接，不允许空白或换行标签，报 invalid tree label；回调抛错不产生部分树输出 | TreeFormatter.format/appendChildren 在每行标题后统一调用；会话成功提交后投递事件 |
| AttributeHandler：定义某图形某属性的修改语义 | src/core/attributes/AttributeDispatcher.ts 的 AttributeDispatcher.apply | tests/core/fixtures/SampleHandler.ts | 无命中调用目标的原 set 白名单；多命中报 attribute handler conflict: &lt;id&gt;/&lt;attr&gt;；handles/apply 抛错即失败，不回退。候选事务负责丢弃所有部分修改 | SetCommand.apply 在 Session.edit 内调用，删除固定类型 AttributeValueReader 依赖 |

上述内部错误消息不带 `error:`；未来由 CLI 或加载器在输出边界统一添加一次，避免双前缀。Phase 1 已有错误文字保持不变。ShapeProvider 与 Command 的完整生产调用、错误恢复、输出兼容仍是步骤3验收任务，替身验证不能代替它们。

## 公开协议的关键约束

接口原文见 [src/core/public](../../../src/core/public)。每个具体类单独成文件，字段由实现类封装；接口中的 readonly 属性是访问协议，不是允许插件把模型字段直接暴露为可写。

### 图形、文档与 SVG

- ShapeNode 将容器能力与 type 字符串分开。children、clone、move、scale 统一支持叶子和复合树；不通过 asGroup 返回某个具体 GroupShape。
- view() 返回脱离可变模型的深只读数据。属性使用有序键值对，包含自身几何、样式或文本；子项保持文档顺序。树标签、handles、展示与序列化只读该视图。
- validateChildren 是纯校验；withChildren 返回保持子类型的独立结构草稿。文档在全局 ID、归属、无环和每个容器的不变量全部通过后才整体提交。删除、移出、分组收编及快照恢复都不能绕过同一校验。assertUngroup 封装复合图形的解组限制。
- ShapeProvider.name 是稳定的领域类型注册名。创建后须核对返回类型、请求 ID 和整棵新增子树的 ID；provider 不能自行向当前文档插入半成品。
- 创建参数保留 string/number，CommandToken 保留 quoted 标志，防止把引号内的 `in` 当归属子句。图形参数与帮助由 provider 所属插件提供。
- SVG 解析器只生成通用元素数据。常规元素按标签查 provider；带 data-kind 的 g 优先查对应 provider；未找到时移除该保留元数据，交给普通 g provider 降级。除此之外的未知属性仍遵循 Phase 1 拒绝规则。具体读回策略见 ADR-02。
- provider.write 返回有序属性、标签与可选文本；通用写出器负责转义、缩进和遍历 children，不能按具体图形类型分支。provider.present 提供标题、几何明细；feedback 可提供创建、移动、属性修改等正向/撤销文案，避免固定 Visitor 成为新图形的阻碍。

### 命令、会话与属性

- 公开的 Command 是可注册的命令定义。现有 application/commands/Command 是执行策略抽象，两者当前并存；步骤3迁移时将旧执行策略重命名或包装为内部动作，不能让插件误导入旧抽象充当新接口。
- Command.run 通过 Session.query/edit/document/undo/redo 调用内核；分发器不能在 run 外再次占用串行队列，否则 run 调用 Session.edit/undo 时可能等待自身而死锁。队列由会话端口的各入口统一管理。
- query 接受独立只读 SessionView，允许没有文档；edit 接受候选 EditDocument；document 接受文档/路径草稿，成功后沿用 Phase 1 历史屏障。失败不修改当前文档、路径或历史。
- CommandContext 暴露已提交 Extensions、AttributeWriter、工作目录和 Session，不暴露注册器、可变历史栈或宿主模块。帮助从已提交的命令/provider 元数据生成；内置插件负责既有分组、顺序与文案，不能顺手重排 help。
- 属性处理器只在当前候选事务中修改目标及相关子部件，不再次发起会话操作、不做文件 IO。AttributeChange 提供修改前后值及可选文案，支持便捷属性没有对应的自身字段。
- handles 只有深只读视图。返回多个命中结果时拒绝，不能因加载顺序静默覆盖。成功的一次 set 只有一个快照历史单元；失败不清空已有 redo。详见 ADR-01。

### 标签与成功事件

TreeDecorator.labels 只返回标签，通用渲染器负责一个空格连接；无标签时不添加任何字符。注册顺序是标签顺序，标签互不查询彼此。

会话只在 init/read/save/edit/undo/redo 成功提交后发送 SessionEvent。事件含独立只读文档；失败不发送，query/dir/stats 不发送。onCommit 不得发起编辑或异步改动会话。观察者失败发生在提交之后，不能宣称原命令已回滚；步骤3事件分发器须隔离该故障、报告标签错误并停用故障实例，保证后续命令可运行。TreeLabels 当前只实现渲染组合，未实现事件总线。dirty 的具体规则见 ADR-03。

### 注册与装配

公开 PluginContext 提供四个 register 方法与服务端口；服务 DirectoryReader 为后续 dir 适配器的目标接口，不泄露 Node Dirent。插件 activate 接收原样 options，由插件自己验证和使用，加载器不解释业务字段。

PluginRegistry.activate 的注册路径已经可运行：创建暂存上下文 → 调用 activate → 校验重复及 contributes → 一次替换已提交视图。注册名限定为小写字母开头、后接小写字母/数字/连字符。同名禁止范围是同一类别；图形与命令可各自叫 sample。

重名、无效注册名会锁定当前批次失败，插件自行捕获也不能继续提交。清单忽略列表顺序，但不能漏报、多报、类别错报或重复声明。激活完成或失败后上下文关闭；延迟注册报错。失败保留此前成功注册的实例与顺序，后续插件仍可加载。activate 按顺序调用，并发调用明确拒绝；模块级回滚只保证框架注册，不承诺撤销插件自行发起的外部副作用，插件不得在激活中修改文档或写文件。

代码装配和配置装配都必须调用这条路径。步骤4才实现模块解析、package.json 清单读取、配置校验、错误输出与继续加载；当前没有 --config、动态加载器或正式 plugins.config.json。四类加载错误格式及清单时机见 ADR-04。

## 本步骤验证与限度

执行 npm run typecheck 和 npx vitest run tests/core/ExtensionContracts.test.ts。

9 项契约测试覆盖：四类实例原子注册、options、过期上下文；重复注册及插件吞掉错误后的回滚；清单不符和 activate 抛错；空注册表与无文档查询；复合树创建/读写/展示/复制/结构保护；两个标签组合和实例状态；多子部件属性修改一次 undo/redo；冲突与部分修改失败保留文档及非空 redo；无命中时白名单回退。

ContractSession/ContractDocument 是可行性测试替身。它们不实现完整结构编辑、真实 IO 或生产串行队列，未使用的方法明确抛错。测试说明接口可以表达这些要求，不证明原 CLI 已完成重构或正式 box 已可用。原有生产文件未修改，本轮不重复运行第一阶段 520 项测试、六组基线或 VS Code 验收；步骤3完成运行迁移时再统一执行相应回归。

## 后续编号与验收边界

0 基线、1 VS Code 实践已完成；2 为本步骤。接下来严格按以下顺序推进：

| 步骤 | 范围 | 进入下一步的条件 |
| --- | --- | --- |
| 3 | CLI 迁移到四个扩展点，六种图形与旧命令默认注册，拆开固定 Visitor/GroupShape 依赖，首次 metrics | 测试图形跨创建/展示/保存读回/历史可用，缺省与失败行为通过，Phase 1 回归及原始字节一致 |
| 4 | A/B 双装配，共用注册事务，通用模块加载器 | Windows 构建后模块解析、四类加载失败、重复/回滚、非法配置均验证 |
| 5 | 独立 stats、dir 包与目录适配器 | 独立启停/测试、真实目录组合、无文档与历史不变、A/B 一致 |
| 6 | 独立 box 包，含属性处理与 (box) 标签 | 不改内核/加载器/既有插件；完整复合场景、保护与读回、分别保留 A/B 接入证据 |
| 7 | modified-star 标签 | 状态分支和双标签并存通过，接入不改内核/渲染器 |
| 8 | A/B transcript、原始输出与接入提交差异举证 | 路径存在、差异为空、目录内容固定且日志在外 |
| 9 | 最终报告/实际依赖图/历史生成指标/干净检出/p2 | 用户批准提交推送与最终标签；final 不移动 |

步骤3框架节点和步骤4装配路径完成并单独提交后，再接入正式业务插件，避免用后续插件提交补改内核。不得为追赶步骤编号将这些节点混在一个提交中。
