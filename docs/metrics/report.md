# 自动生成的 CLI 重构指标

基线：251127e69abb2512dc787efe6a92dd30ab9514d4

候选：cf0e544fc50d25560a1fc0734c259f715977c262

源文件内容摘要：3dc31ec49454ecd06d91769da371082c501dbc2e6203299cdf2b707c1b66eecb

| 类别 | final 文件/行数/复杂度 | 候选文件/行数/复杂度 | 复杂度增量 |
| --- | --- | --- | --- |
| core | 56 / 2028 / 521 | 28 / 1165 / 382 | -139 |
| host | 7 / 360 / 128 | 5 / 154 / 37 | -91 |
| plugins | 0 / 0 / 0 | 128 / 2756 / 784 | 784 |
| vscode | 0 / 0 / 0 | 5 / 91 / 42 | 42 |

## 候选文件清单与职责

| 文件 | 类别 | 行数 | 复杂度 | 职责 |
| --- | --- | --- | --- | --- |
| extensions/svg-tools/src/OutlineElement.ts | vscode | 14 | 10 | Phase 1 命令、解析或领域协作 |
| extensions/svg-tools/src/OutlineParser.ts | vscode | 26 | 14 | Phase 1 命令、解析或领域协作 |
| extensions/svg-tools/src/SvgDecorationProvider.ts | vscode | 18 | 8 | Phase 1 命令、解析或领域协作 |
| extensions/svg-tools/src/SvgSymbolProvider.ts | vscode | 19 | 6 | Phase 1 命令、解析或领域协作 |
| extensions/svg-tools/src/extension.ts | vscode | 14 | 4 | Phase 1 命令、解析或领域协作 |
| src/application/commands/AddToCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/AttributeValueReader.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/BackCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/CanvasQueryCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/Command.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/CommandResult.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/CreateCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/DeleteCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/DocumentCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/EditCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/FrontCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/GroupCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/HelpCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/InitCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/MoveCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/MoveDescription.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/QueryCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/ReadCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/ResizeCanvasCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/SaveCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/ScaleCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/SetCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/ShowCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/TreeCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/commands/UngroupCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/history/HistoryManager.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/history/UndoableCommand.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/ports/FileStore.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/ports/Presentation.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/ports/SvgCodec.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/ports/SvgReadResult.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/session/EditorSession.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/application/session/EditorState.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/bootstrap/main.ts | host | 7 | 1 | 宿主装配、终端或 IO 适配 |
| src/cli/CommandDispatcher.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/cli/Repl.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/cli/Token.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/cli/Tokenizer.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/core/attributes/AttributeDispatcher.ts | core | 22 | 5 | 属性处理器分发与缺省回退 |
| src/core/cli/CommandDispatcher.ts | core | 16 | 5 | Phase 1 命令、解析或领域协作 |
| src/core/cli/Token.ts | core | 14 | 3 | Phase 1 命令、解析或领域协作 |
| src/core/cli/Tokenizer.ts | core | 43 | 17 | Phase 1 命令、解析或领域协作 |
| src/core/document/DocumentFactory.ts | core | 6 | 1 | 文档结构、不变量与独立快照 |
| src/core/document/EditorDocument.ts | core | 175 | 95 | 文档结构、不变量与独立快照 |
| src/core/history/HistoryEntry.ts | core | 14 | 4 | 串行事务、会话与撤销重做 |
| src/core/presentation/Presentation.ts | core | 36 | 15 | 展示与树标签组合 |
| src/core/public/AttributeHandler.ts | core | 26 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Command.ts | core | 23 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Document.ts | core | 31 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Extensions.ts | core | 12 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Plugin.ts | core | 42 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Ports.ts | core | 25 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Session.ts | core | 29 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/Shape.ts | core | 28 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/ShapeProvider.ts | core | 46 | 0 | 公开领域、扩展点或服务契约 |
| src/core/public/ShapeValidation.ts | core | 51 | 15 | 公开领域、扩展点或服务契约 |
| src/core/public/TreeDecorator.ts | core | 21 | 0 | 公开领域、扩展点或服务契约 |
| src/core/registry/PluginRegistry.ts | core | 86 | 27 | 插件原子注册与清单校验 |
| src/core/session/EditorSession.ts | core | 92 | 42 | 串行事务、会话与撤销重做 |
| src/core/session/StateDraft.ts | core | 20 | 8 | 串行事务、会话与撤销重做 |
| src/core/shapes/ShapeFactory.ts | core | 37 | 23 | 图形领域行为或 provider 查询 |
| src/core/svg/SvgCodec.ts | core | 87 | 44 | 通用 XML/SVG 解析与编码 |
| src/core/svg/SvgElement.ts | core | 19 | 5 | 通用 XML/SVG 解析与编码 |
| src/core/svg/SvgXmlReader.ts | core | 110 | 49 | 通用 XML/SVG 解析与编码 |
| src/core/svg/XmlText.ts | core | 38 | 17 | 通用 XML/SVG 解析与编码 |
| src/core/tree/TreeLabels.ts | core | 16 | 7 | 展示与树标签组合 |
| src/domain/document/DocumentSnapshot.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/document/SvgDocument.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/factory/ShapeFactory.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/factory/ShapeParameter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/CircleShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/EllipseShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/GroupShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/LineShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/RectShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/Shape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/ShapeMutation.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/ShapeValidation.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/TextShape.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/shapes/TreeAccess.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/domain/traversal/ShapeVisitor.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/host/Repl.ts | host | 57 | 11 | 宿主装配、终端或 IO 适配 |
| src/host/Runtime.ts | host | 41 | 11 | 宿主装配、终端或 IO 适配 |
| src/host/filesystem/LocalDirectoryReader.ts | host | 10 | 4 | 宿主装配、终端或 IO 适配 |
| src/host/filesystem/LocalFileStore.ts | host | 39 | 10 | 宿主装配、终端或 IO 适配 |
| src/infrastructure/filesystem/LocalFileStore.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/infrastructure/svg/FastXmlSvgCodec.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/infrastructure/svg/SvgElement.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/infrastructure/svg/SvgWriter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/infrastructure/svg/SvgXmlReader.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/infrastructure/svg/XmlText.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/plugins/builtin/BuiltinCommand.ts | plugins | 15 | 7 | 默认图形/命令插件实现 |
| src/plugins/builtin/BuiltinNode.ts | plugins | 59 | 36 | 默认图形/命令插件实现 |
| src/plugins/builtin/BuiltinPlugin.ts | plugins | 142 | 74 | 默认图形/命令插件实现 |
| src/plugins/builtin/BuiltinProvider.ts | plugins | 42 | 18 | 默认图形/命令插件实现 |
| src/plugins/builtin/legacy/application/commands/AddToCommand.ts | plugins | 21 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/AttributeValueReader.ts | plugins | 42 | 12 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/BackCommand.ts | plugins | 16 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/CanvasQueryCommand.ts | plugins | 10 | 1 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/Command.ts | plugins | 7 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/CommandResult.ts | plugins | 17 | 4 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/CreateCommand.ts | plugins | 31 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/DeleteCommand.ts | plugins | 18 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/DocumentCommand.ts | plugins | 14 | 1 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/EditCommand.ts | plugins | 17 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/FrontCommand.ts | plugins | 16 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/GroupCommand.ts | plugins | 21 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/HelpCommand.ts | plugins | 13 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/InitCommand.ts | plugins | 22 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/MoveCommand.ts | plugins | 25 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/MoveDescription.ts | plugins | 38 | 11 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/QueryCommand.ts | plugins | 13 | 1 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/ReadCommand.ts | plugins | 23 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/ResizeCanvasCommand.ts | plugins | 21 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/SaveCommand.ts | plugins | 26 | 4 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/ScaleCommand.ts | plugins | 20 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/SetCommand.ts | plugins | 29 | 5 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/ShowCommand.ts | plugins | 19 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/TreeCommand.ts | plugins | 19 | 2 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/commands/UngroupCommand.ts | plugins | 19 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/history/HistoryManager.ts | plugins | 54 | 11 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/history/UndoableCommand.ts | plugins | 49 | 9 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/ports/FileStore.ts | plugins | 4 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/ports/Presentation.ts | plugins | 7 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/ports/SvgCodec.ts | plugins | 7 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/ports/SvgReadResult.ts | plugins | 14 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/session/EditorSession.ts | plugins | 62 | 18 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/application/session/EditorState.ts | plugins | 40 | 10 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/cli/CommandDispatcher.ts | plugins | 93 | 50 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/cli/Repl.ts | plugins | 57 | 10 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/cli/Token.ts | plugins | 14 | 3 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/cli/Tokenizer.ts | plugins | 43 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/document/DocumentSnapshot.ts | plugins | 26 | 7 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/document/SvgDocument.ts | plugins | 239 | 99 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/factory/ShapeFactory.ts | plugins | 108 | 28 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/factory/ShapeParameter.ts | plugins | 1 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/CircleShape.ts | plugins | 62 | 15 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/EllipseShape.ts | plugins | 69 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/GroupShape.ts | plugins | 44 | 13 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/LineShape.ts | plugins | 73 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/RectShape.ts | plugins | 69 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/Shape.ts | plugins | 103 | 32 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/ShapeMutation.ts | plugins | 20 | 5 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/ShapeValidation.ts | plugins | 51 | 15 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/TextShape.ts | plugins | 60 | 15 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/shapes/TreeAccess.ts | plugins | 4 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/domain/traversal/ShapeVisitor.ts | plugins | 16 | 0 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/filesystem/LocalFileStore.ts | plugins | 39 | 10 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/svg/FastXmlSvgCodec.ts | plugins | 81 | 30 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/svg/SvgElement.ts | plugins | 19 | 5 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/svg/SvgWriter.ts | plugins | 59 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/svg/SvgXmlReader.ts | plugins | 110 | 49 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/infrastructure/svg/XmlText.ts | plugins | 38 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/presentation/HelpFormatter.ts | plugins | 32 | 1 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/presentation/ShowFormatter.ts | plugins | 27 | 10 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/presentation/StyleFormatter.ts | plugins | 12 | 5 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/plugins/builtin/legacy/presentation/TreeFormatter.ts | plugins | 51 | 17 | 默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现 |
| src/presentation/HelpFormatter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/presentation/ShowFormatter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/presentation/StyleFormatter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
| src/presentation/TreeFormatter.ts | plugins | 2 | 0 | 旧路径兼容导出；不被新 CLI 内核导入 |
