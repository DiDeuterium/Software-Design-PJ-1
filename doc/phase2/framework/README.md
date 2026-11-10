# 步骤3：默认 CLI 迁移与框架验收

日期：2026-11-09。步骤2提交 c0dd4e2 已推送；本步骤尚未提交，不创建或移动标签。

## 当前运行路径

src/bootstrap/main.ts → src/host/Runtime.ts 的 createRuntime → PluginRegistry.activate 注册默认 BuiltinPlugin → core/cli/CommandDispatcher.dispatch → Command.run → Session.query/edit/document/undo/redo。

组合根创建 IO 适配器、codec、展示端口、图形工厂和会话，再注入默认插件。内核不知道具体插件、六种类型或命令名。默认包用 BuiltinProvider 六个实例和 BuiltinCommand 十九个实例注册原有能力；参数解释、帮助文案与反馈均属于该包。

启动方式仍是 npm run cli / npm start。createRuntime({ builtins: false }) 可以构造空框架，查询报告未知命令。目前没有 --config，未实现正式 stats、dir、box 或 modified-star。

## 源码边界与兼容成本

| 位置 | 责任 |
| --- | --- |
| src/core/public | 插件可依赖的公开领域、扩展点、会话和服务端口 |
| src/core/document | 通用索引、父级与结构事务，依赖 ShapeNode，不依赖 GroupShape |
| src/core/session、history | 串行候选事务、独立读视图、精确 before/after、历史屏障与成功事件 |
| src/core/cli、shapes、presentation、svg | 通用分词/分发、provider 查询与违约检查、树/show、XML/SVG 编码 |
| src/host | 装配、终端、文件与目录适配器；具体默认包仅在组合根装配 |
| src/plugins/builtin | 默认图形/命令插件；BuiltinNode 复用第一阶段封装、校验与几何行为 |
| src/plugins/builtin/legacy | 第一阶段兼容实现；固定 Visitor 与旧映射不再充当运行内核扩展协议 |
| 原 src/domain、application、cli、presentation、infrastructure | 两行兼容导出，维护既有 API 和测试；新内核不导入 |

保留兼容 API 的代价是旧会话、命令等实现与新路径暂时并存。原520项测试不能全部说成直接覆盖新内核；因此另用生产 Runtime 贯通测试和编译入口字节基线核验新路径。指标计入全部兼容实现和导出，不隐藏源码成本，也不宣称总代码量减少。后续若移除旧 API，应单独评估，不能塞进业务插件接入提交。

BuiltinProvider 内部仍用旧 Visitor 描述自己的六种模型；通用内核从不调用该 Visitor。新类型只实现公开协议，普通 g 也能包含新复合类型。

## 四个扩展点的实际调用清单

接口均位于 src/core/public。下表路径相对 src。

| 接口 | 生产调用文件与函数 | 已有实现 | 禁用/缺省行为 | 违约与失败 |
| --- | --- | --- | --- | --- |
| ShapeProvider | core/shapes/ShapeFactory.ts 的 create/read/forShape；core/svg/SvgCodec.ts 的 decode/encode；core/presentation/Presentation.ts 的 tree/show | BuiltinProvider 六实例；测试 ProbeProvider | 默认六类；未知创建类型报 unknown shape type；未知元素拒绝；g 的未知 data-kind 降为普通 g | ID/类型不符报 shape provider contract violation；重复 ID、不变量及无效编码拒绝；read 失败不换文档 |
| Command | core/cli/CommandDispatcher.ts 的 dispatch；BuiltinPlugin.activate 注册的 help 回调 | BuiltinCommand 十九实例；测试 SampleCommand | 原命令与 help 保持；未注册名称报 unknown command | 重名整批失败；参数由命令校验；执行失败不阻塞后续队列 |
| TreeDecorator | core/presentation/Presentation.ts 的 tree → core/tree/TreeLabels.ts 的 append；core/session/EditorSession.ts 的 notify | 测试 SampleDecorator、RecordingDecorator；正式标签待步骤6–7 | 默认无标签，不增加空格 | 空白/多行标签报 invalid tree label；渲染不返回部分树；观察者故障报告诊断并停用该实例，不撤销已提交状态 |
| AttributeHandler | BuiltinPlugin.activate 内 set 的 Session.edit 回调 → core/attributes/AttributeDispatcher.ts 的 apply | 测试 SampleHandler、ProbeHandler；正式 box 处理器待步骤6 | 无命中走旧白名单；rect 的 fill 可改，未定义属性拒绝 | 多命中报 attribute handler conflict；处理失败不回退；丢弃候选，保留 undo/redo，不发送事件 |

内部错误不带 error:，由输出边界统一添加。注册清单、重名与回滚已经共用 PluginRegistry.activate；模块加载、配置与继续启动在步骤4完成。

## 事务与结构契约

EditorSession.edit 保持“候选副本 → 执行 → 独立副本提交 → 一个历史单元”。HistoryEntry 保存前后文档，redo 不再次执行插件。query 返回冻结视图；回调保留的候选引用不能改动正式状态。

EditorDocument 先校验候选全树的 ID、重复对象、归属、循环及 validateChildren，再通过 withChildren 替换并更新索引。delete/addto/group/ungroup/重排经过同一路径。必要部件与解组限制由容器协议定义，不出现 box 名称分支。

本步骤为实际命令细化公开协议：文档增加 size/parentOf；新增 FileStore、SvgCodec、DocumentFactory、ShapeCreation、Presentation 端口；Session.document 接收成功事件种类。canvas 修改保持历史屏障，但发送 edit，不重设保存基线。init/read/save 发送相应成功事件。所有这些通用能力均在正式业务插件之前完成。

目录适配器已预置在宿主，通过公开 DirectoryReader 返回通用条目；本步骤没有 dir 命令及其专用验收。标签只在成功提交后收事件；实例自己持有状态，观察者错误隔离。

## 验证与检查修正

- 严格类型检查、生产构建通过。
- 完整回归22文件、539项通过：原520项、步骤2契约9项、本步骤生产框架9项、指标口径1项。
- 生产 Runtime 验证新类型创建、嵌套、展示、移动、缩放、分组、读写与降级；必要子项/ID保护；真实属性事务；无文档命令；并发排队；事件隔离和候选引用隔离。
- 编译入口的六组 stdout、stderr、退出码和 SVG 产物与 final 全部逐字节一致；final 未移动。
- 依赖边界测试检查 core 只相对导入 core；默认插件导入内核时只允许 public，禁止 host 反向依赖。
- 首次指标已生成三类 LOC、文件职责、函数复杂度与增量及实际前后图。工作树报告明确标为预览，提交后须按 SHA 重算。

检查发现 show 的普通分组子项数量最初显示为0，原因是适配器读取了内部空模型。字节比较定位后改为真实 ShapeView.children，补入断言；修正后只重验9项框架测试与六组基线通过，未重复整套测试。首次全量测试遇到沙箱临时缓存不可见，在正常环境重跑通过，没有修改业务逻辑绕过环境问题。

命令：npm run typecheck、npm test、npm run build、node --import tsx scripts/Phase1Baseline.ts check。指标见 [复现说明](../../../docs/metrics/README.md)、[报告](../../../docs/metrics/report.md)、[实际依赖图](../../../docs/metrics/after.puml)。未重跑无改动的 VS Code 验收或干净检出。

下一步为步骤4的 A/B 装配与通用模块加载。先单独提交本框架节点，再在后续提交接入正式业务插件，不在插件提交中补改内核。
