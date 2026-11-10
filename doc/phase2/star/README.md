# 步骤7：modified-star 树标签

日期：2026-11-10。步骤6提交 c2a83b6 已推送；本步骤尚未提交。

## 接入与使用

新增 src/plugins/tree-star 包：TreeStarPlugin 注册 ModifiedStarDecorator，package.json 声明 decorators:[modified-star]。仅依赖 core/public，不导入 box、渲染器或宿主实现。根配置在 box 后加载该包，因此同一行的标签为 (box) *；交换注册顺序则为 * (box)，两插件互不感知。

```powershell
npm run build
node dist/bootstrap/main.js --config plugins.config.json
```

单独禁用 tree-star 项即可保留 (box) 而不显示星号。不传配置时所有可选标签均不加载，默认树不增加任何字符。代码装配同样使用 createRuntime 的 plugins 数组，插件实例为 new TreeStarPlugin()，清单为 `{name:'@svgframe/plugin-tree-star',contributes:{decorators:['modified-star']}}`。

## 状态语义（落实 ADR-03）

- 成功 init/read/save 时重建保存基线；失败操作没有成功事件，不重设基线。save-as 成功同样重建；路径本身不算图形内容。
- 节点比较自身 id、type、容器标志、规范化属性和值，以及有序的直接子项 ID。属性键排序后比较，不把读回的属性排列变化当编辑；原属性数组不修改。
- 新节点在保存基线中不存在，立即标 *。编辑恢复为原值或 undo 回保存点后星号消失，redo 再次偏离基线时恢复。成功的无内容变化命令不凭历史次数加星。
- 子节点自身属性变化不传播给祖先。直接子项增删、重排属于容器自身变化，容器加星；根行比较画布尺寸、根项顺序和完整子树，任意内容差异均加星。删除节点不再有自己的行，由根行及直接父容器反映结构变化。
- canvas 修改发送 edit，保留保存基线；不因文档类历史屏障而误当成保存。只读查询不修改基线。

基线保存在标签实例的 savedNodes 和 savedDocument 私有字段，没有模块级可变状态。只持有内容签名，不保留可变模型引用。onCommit 只处理三类基线事件，labels 比较传入只读视图；不额外缓存当前文档或修改会话，渲染器只负责拼接标签。比较以内容为准，不依赖 XML 缩进、对象身份或外部文件字节。

示例：保存 box 后执行 set n label "新标题"，text#n-label 行和 svg 根行加星，g#n (box) 行不自动加星。一次 undo 回到保存内容后，树恢复保存时状态，(box) 标签保留。

## 验证及接入边界

严格类型检查、生产构建与 tests/plugins/TreeStar.test.ts 的5项测试通过：

1. 独立状态机覆盖 init、新建、编辑、保存、再编辑、undo、redo、read 重置。
2. 自身/祖先规则、子项增删/排序、整树删除及画布尺寸差异。
3. 属性顺序规范化与实例基线隔离。
4. 实际会话中的 box 双标签、失败编辑/保存/读取、查询、保存点撤销、redo、save-as、无内容变化编辑及重新 init/read。
5. 同实例实现的代码/配置装配结果一致、注册顺序，以及禁用星号后的无标签树 Buffer 与固定第一阶段格式一致。

运行源码只新增 tree-star 包并修改配置；内核、宿主、加载器、渲染器和所有既有插件无改动，继续使用原清单复制构建步骤。可从接入前 c2a83b6 检查这些既有路径差异。本轮没有重复第一阶段全量回归或六组基线；全部场景与接入提交差异举证留在步骤8，最终指标和干净检出留在步骤9。
