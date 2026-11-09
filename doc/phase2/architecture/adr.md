# 第二阶段 ADR

日期：2026-11-09。状态：步骤2采用的开发决策；已实现的契约辅助类与测试见 [架构记录](README.md)，完整 CLI 接入将在步骤3起实现。用户提供的原计划已建议以下规则，本轮据此具体化。

## ADR-01：属性处理与事务边界

背景：box 的 fill/label 会修改内部子部件；旧 AttributeValueReader 只认识六种图形，自身属性白名单不能表达便捷语义。

决定：AttributeHandler.handles 接收深只读 ShapeView 与属性名；apply 接收 AttributeContext，内含本次候选 EditDocument 和目标 ShapeNode。通过公开 getShape、set 等方法修改子部件，不接触字段或历史栈。处理器必须是类或实例，使用独立稳定注册名。

同一次 set 收集全部命中；零个走原 set 白名单，一个执行处理器，多个直接报 attribute handler conflict: &lt;id&gt;/&lt;attr&gt;。不按优先级选择或组合，减少顺序依赖。handles/apply 抛错均终止命令；命中后失败不再走默认路径。

Session.edit 仅创建一个候选副本。所有处理器修改、结果文案和不变量检查成功后，复制提交并创建一个 before/after 历史单元；undo/redo 整体恢复。失败丢弃候选，文档、dirty、路径、undo/redo 保持原状，不发送成功事件。候选引用不得保留到回调外，提交也不能让处理器保留的引用指向正式状态。沿用第一阶段 UndoableCommand 的复制提交思路，不要求插件自己补偿。

代价：快照仍为 O(N)；冲突须由装配者消除。接口只约束受信任插件，不是针对恶意代码的安全沙箱。契约测试用替身验证多节点修改、整体 undo/redo、冲突和部分修改抛错；生产事务接入和真实 box 属性测试分别留在步骤3、6。

## ADR-02：box 读回降级与结构所有权

背景：box 序列化为 g，但有两个必要部件；直接使用普通分组规则会允许破坏其结构。框架又不能出现 box 名称分支。

决定：通用 codec 识别 g 的保留 data-kind 元数据，以注册类型查 provider。已安装该 provider 时由其 read 验证；未安装时去除 data-kind 并交给普通 g provider，保留孩子和几何，放弃复合语义。普通未知元素、未知非保留属性继续按 Phase 1 子集规则拒绝。

box provider 保持 `<id>-rect`、`<id>-label` 派生规则。必要部件须为 box 的直接子节点且类型正确；允许额外的合法嵌套子项。有插件但必要部件缺失/类型错误时拒绝整个读取，不静默降级、不构造残缺 box。重复 ID 在 provider 之前或最终候选全树校验中拒绝，绝不靠降级消除冲突。

创建先生成脱离文档的整棵子树，再统一检查全部 ID。结构修改先计算完整候选树，调用每个容器的 validateChildren，再提交；必要部件不得被直接删除、移出或通过 group 收编。普通几何/样式修改、同容器内排序以及新增合法嵌套节点允许。整体 box 删除/移动/被分组允许。assertUngroup 拒绝复合图形，独立于根级分组检查，错误为 cannot ungroup composite shape: &lt;id&gt;。

withChildren 与 clone 必须保留具体子类型及其不变量，快照恢复也校验。内核只执行通用协议，具体部件规则由 box 类提供。

代价：无插件读入后再保存将不保留 data-kind，重新安装也不会自动恢复复合语义。严格拒绝残缺 box 会减少容错，但能保证编辑状态有效。完整测试在步骤6进行；当前 sample 替身仅证明公开协议能承载必要部件检查。

## ADR-03：dirty、祖先传播和标签顺序

背景：Phase 1 没有树标签。dirty 若仅记录发生过编辑，undo 回到保存点仍会误显示未保存变化。

决定：modified-star 实例保存最近一次成功 init/read/save 的只读内容基线；比较当前内容与该基线。新节点因基线不存在而立即加星。失败操作和只读查询不改变基线；失败 save/read 不重置。undo 回到保存点星号消失，redo 使内容再次不同时恢复星号。init/read 成功建立新文档基线；save-as 成功同样更新基线，路径变化本身不视为图形内容变化。

每个节点比较自身类型、几何/样式/文本以及有序的直接子项 ID。子节点自身属性变化不自动给祖先加星；子项增删或重排属于容器自身变化。根行比较画布尺寸与完整文档树，任一内容不同即加星。数据应稳定规范化，不把属性容器的引用身份当内容，不依赖 XML 缩进或外部文件字节。

标签按注册顺序，用一个空格拼接。修改星号与 (box) 互不感知；不通过名字强制固定谁先谁后。零标签时不追加空格，不改变 Phase 1 树字节。

状态只存在插件实例字段，成功提交事件提供深只读数据。标签只读渲染不反向编辑模型；观察者抛错由框架隔离和停用，不能把已经成功的保存或编辑错误地报告为回滚。

代价：每次比较可能为 O(N)，符合当前快照规模；保留两个标签并存时的顺序可解释性。完整 dirty 状态机测试在步骤7，不用 sample 标签的简单状态测试冒充已完成。

## ADR-04：激活后校验清单与批次原子注册

背景：A/B 若直接暴露全局注册表，插件在第三次注册失败时会留下前两次，禁用/装配顺序也难以重现。

决定：PluginRegistry.activate 是 A/B 共用路径。插件只拿本批暂存 PluginContext，activate 返回后按 shapes/commands/decorators/attributes 四类比较 contributes 与实际名称集合。未写类别视为空集合；列表顺序不影响匹配，实际注册顺序保留为运行顺序；声明列表中的重复名称也拒绝。

同类重名立即锁定整个批次失败，含同一插件内和与此前插件冲突。插件捕获错误也不能解除失败标志。校验通过后一次发布新 Extensions 视图；失败不发布、不删除此前实例。上下文结束即关闭，不允许定时器或未等待异步操作迟到注册。宿主按配置数组串行加载，enabled: false 不求值模块，也不注册。

代码装配由宿主给出实例和清单；配置装配从模块与 package.json 读取同一信息，并传同一个 options。路径解析只在宿主；相对路径以配置目录为基准，包名按运行环境解析规则。加载器没有具体包名映射或业务分支。

输出规则：顶层模块解析失败 → error: plugin not found: &lt;module&gt;；已解析模块没有默认导出 → error: plugin has no default export: &lt;module&gt;；清单不符 → error: plugin manifest mismatch: &lt;name&gt; (declared: …, registered: …)；求值/依赖或 activate 失败 → error: plugin failed to activate: &lt;name&gt; (&lt;reason&gt;)；重名 → error: duplicate registration: &lt;category&gt;/&lt;name&gt;。不能把模块内部缺依赖误报为顶层包不存在。

配置语法或结构错误在激活可选插件前判定，输出 error: invalid plugin config，仍启动默认六图形/旧命令。单个插件失败只丢弃该批，继续后续插件。清单类别及字段的运行时校验在步骤4宿主完成，不以 TypeScript 类型代替 JSON 校验。

代价：注册回滚不支持撤销任意外部副作用，activate 契约禁止文件写入和文档编辑。当前已实现原子注册、清单匹配、锁定错误、关闭上下文；模块加载、无默认导出、非法配置与 CLI 继续启动在步骤4完成。
