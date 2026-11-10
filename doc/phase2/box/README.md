# 步骤6：box 复合图形插件

日期：2026-11-10。接入前提交为969ca05（步骤5，已推送）；本步骤尚未提交。

## 注册与运行

新增包 src/plugins/shape-box，package.json 声明 shapes:[box]、attributes:[box-fill,box-label]、decorators:[box-type-label]。BoxPlugin 类分别注册 BoxProvider、两个处理器和 BoxTypeDecorator。插件只导入 core/public 和包内类，不依赖内置插件或宿主实现。

```powershell
npm run build
node dist/bootstrap/main.js --config plugins.config.json
```

根配置在 stats、dir 之后增加 ./dist/plugins/shape-box。可单独禁用，未加载时 create box 报未知类型，带 data-kind="box" 的 g 按既有框架契约降级为普通 g。

代码装配使用 createRuntime({plugins:[{manifest,plugin:new BoxPlugin()}]})，manifest 与包清单相同。tests/plugins/Box.test.ts 用代码和配置分别加载同一个实现；版本B输入为 [flowchart-box.txt](../../transcript/flowchart-box.txt)，只包含命令，没有提示符和预期输出。完整 REPL 输出 Buffer、退出码及保存 SVG 均比较一致。独立的 A/B 接入提交差异举证仍按步骤8计划保留，不把运行一致性当作提交差异证据。

## 模型与职责

| 类 | 职责 |
| --- | --- |
| BoxProvider | 创建参数校验、模板、SVG读回/编码、展示及创建反馈 |
| BoxShape | 容器封装、深复制、整体几何操作、必要部件和解组约束 |
| BoxPart | 插件本地 rect/text 模板叶子，实现公开 ShapeNode；不调用内置图形工厂 |
| BoxFillHandler | fill 转发到 `<id>-rect`，提供修改及撤销反馈 |
| BoxLabelHandler | label 转发到 `<id>-label` 的 text，提供修改及撤销反馈 |
| BoxTypeDecorator | 仅对 box 标题行返回 (box)，不修改渲染器 |
| BoxPlugin | 注册以上扩展实例 |

语法为 create box &lt;id&gt; &lt;x&gt; &lt;y&gt; &lt;w&gt; &lt;h&gt; "标题"，支持既有 in 子句。宽高非负，数值有限。内部矩形使用同一位置/尺寸，默认 fill=#4a90d9；文字使用固定模板偏移 (x+20,y+35)，与课程示例一致，不依赖文字测量。必要部件 ID 为 `<id>-rect`、`<id>-label`。

创建先形成脱离文档的完整子树，再由既有文档事务检查所有 ID；任一派生 ID 冲突整条失败。BoxShape 支持额外合法子项和嵌套 box；clone/withChildren 保持类型及结构约束。整体 move/scale 先在副本上检查各子项，再执行；整个 box 可以被删除、撤销恢复或收编进普通分组。

必要部件必须是直接子项且类型分别为 rect/text。delete、addto、group 抽走这些部件时，既有结构提交调用 validateChildren 并拒绝整次操作。重排及新增合法子项允许。ungroup box 通过 assertUngroup 报 cannot ungroup composite shape: &lt;id&gt;；普通分组仍沿用第一阶段规则。

## 属性事务与读回

fill 与 label 各由一个 AttributeHandler 处理，只修改当前 set 的候选文档。一次命令一个历史单元，undo 整体恢复、redo 整体重做。无命中时仍用原白名单；普通 rect 不接受 label。冲突直接拒绝，处理器部分修改后抛错则丢弃候选，保留文档及非空 redo，不转默认路径。框架协议与 ADR-01 未改动。

序列化使用 `<g id="..." data-kind="box">`，孩子仍是标准 SVG rect/text/g。已装插件时由 provider 验证必要部件，缺失或类型错误拒绝整个读取；重复 ID 由全局检查拒绝。失败不替换原文档或历史。无插件读回为普通 g，保留孩子与几何，失去便利属性和结构保护；再次保存不保留复合类型标记。详见既有 ADR-02。

## 验证及接入差异

严格类型检查、生产构建通过；6项针对性测试覆盖独立模板和深复制、两属性分别 undo/redo、嵌套和整体几何、派生ID冲突、必要部件保护、整体删除恢复、读回/降级/错误读取、处理器冲突与部分失败、版本B的 A/B 原始字节一致。普通分组夹具曾被放在根级导致既有解组限制，修正夹具后仅重验相关两项通过，没有修改生产规则。

本步骤运行源码只新增 shape-box 包并修改配置；未修改内核、宿主、加载器、默认插件或 stats/dir。构建继续使用步骤5已有的通用清单复制脚本，没有新增业务分支。指标保持步骤3冻结快照，收尾再按最终代码 SHA 生成。

提交前可核对（下列路径均实际存在）：

```powershell
git diff 969ca05 -- src/core src/host src/bootstrap src/plugins/builtin src/plugins/command-stats src/plugins/command-dir
# 应为空；新增 shape-box 不在这些既有路径中
git diff --name-status 969ca05
# 结合未跟踪文件清单检查新增包和测试/文档/配置
```

本轮不重复第一阶段全量回归、无标签字节基线和 VS Code 验收。下一步为步骤7 modified-star，使其与已有 (box) 标签独立共存。
