# 步骤4：代码与配置双装配

完成日期：2026-11-10。步骤3代码提交 cf0e544，历史指标提交7b92eb2，均已推送。步骤4尚未提交。

## 两种入口

代码装配位于 src/host/Runtime.ts：createRuntime 的 plugins 数组接收 manifest、plugin 类实例及 options。默认六图形与十九条命令仍由组合根注册。配置装配增加 configFile；CLI 使用：

```powershell
npm run build
node dist/bootstrap/main.js --config plugins.config.json
# 或源码运行
npm run cli -- --config plugins.config.json
```

仓库根的 plugins.config.json 当前为 {"plugins":[]}，因此默认能力与无配置启动一致。不会隐式加载配置，必须显式传入 --config。

配置示例（示意模块名，正式插件将在后续步骤添加）：

```json
{
  "plugins": [
    { "module": "./plugins/example", "options": { "fill": "red" } },
    { "module": "@svgframe/example", "enabled": false }
  ]
}
```

module 为非空字符串；enabled 可省略，默认为启用；options 原样传给 activate(context, options)。整个配置先校验再激活；数组顺序决定加载顺序，enabled:false 不解析、不求值。相对路径相对配置文件所在目录，包名通过该位置的 Node createRequire.resolve 解析，再将文件路径转换为 file URL 进行动态 import，适用于 Windows 路径。包应通过 main 或 exports 的通用入口公开 JS 文件；本实现使用 Node require 条件解析入口，再以 import 求值。

插件 package.json 提供 name 与 contributes，四类列表为 shapes、commands、decorators、attributes，缺省为空。加载器从解析出的入口目录向上寻找最近 package.json。默认导出可以是提供 activate 的类实例，也可以是无参可构造的类；插件的服务依赖通过 context.services 获取，业务配置通过 options 获取。没有默认导出单独报错。

## 共用注册事务

src/host/plugins/PluginLoader.ts 的 activate 是 A/B 共用入口，两者最终调用同一个 PluginRegistry.activate。内核和既有默认插件在本步骤未修改。

流程仍为暂存注册 → activate 返回 → 核对同类重名与 contributes 集合 → 一次发布。清单失败、重名或激活异常撤销当前插件的所有暂存项；此前成功项保留，继续后续插件。代码装配同样不能绕过清单校验。类实例有状态时由实例字段封装。

PluginLoader 只解析模块字符串，没有具体插件导入、包名映射或业务条件。模块解析与求值分开，因此模块内部缺依赖或求值抛错归为 plugin failed to activate，而非顶层 plugin not found。

## 错误输出

宿主在 stderr 每条输出一行 error:，随后照常启动 REPL：

| 情况 | 消息（省略统一 error: 前缀） |
| --- | --- |
| 无法找到顶层模块 | plugin not found: &lt;module&gt; |
| 无默认导出 | plugin has no default export: &lt;module&gt; |
| 清单不一致 | plugin manifest mismatch: &lt;name&gt; (declared: …, registered: …) |
| 求值、依赖或激活失败 | plugin failed to activate: &lt;name&gt; (&lt;reason&gt;) |
| 同类重名 | duplicate registration: &lt;category&gt;/&lt;name&gt; |
| 配置读取、语法或结构错误 | invalid plugin config |

配置错误保留默认内置能力；可选插件失败不使主程序退出。错误消息内的换行在 CLI 输出边界折为一行。

## 验证与范围

严格类型检查和生产构建通过。tests/host/PluginLoader.test.ts 的10项针对性测试通过，覆盖同实现与 options 的 A/B 命令结果序列化字节一致、编译后 --config 调用、配置目录相对路径、包名、顺序、禁用项不求值、四条失败路径、依赖错误区分、重复注册与回滚、失败后后续插件可用、非法配置及代码装配清单校验。

测试在临时独立插件包中生成实际 package.json 和 ESM 模块，退出后清理；编译入口使用同一实际文件。没有新增正式 stats/dir/box/标签，也没有声称完成步骤8的全量 transcript 与 A/B 接入提交差异举证。本轮未重复第一阶段539项全量回归、六组基线或 VS Code 验收。

下一步为步骤5：分别新增 stats、dir 包，通过这里已有的装配入口接入，不修改加载器或内核。正式业务插件的独立提交及 A/B 差异证据仍须后续保留。
