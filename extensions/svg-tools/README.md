# PJ1 SVG Tools

第二阶段第一部分的独立 VS Code 扩展，提供 Explorer 文件标记和原生 Outline。CLI 不加载此包；其依赖、构建及测试与 CLI 分开。

## 安装与启动

使用 Node.js 22.12 以上与 VS Code 1.85 以上；实际验证版本为 VS Code 1.145.0。

在本目录执行：

```powershell
npm ci
npm run build
```

在 VS Code 中打开本目录，按 F5，选择 Run PJ1 SVG Tools。亦可从本目录运行：

```powershell
code --new-window --extensionDevelopmentPath="$PWD" "$PWD/examples" "$PWD/examples/example.svg"
```

这是扩展开发宿主运行方式，不要求发布到 Marketplace 或修改已有扩展。开发中修改源码后需重新 build，再在开发宿主执行 Developer: Reload Window。

打开 Explorer 的 Outline 区域，展开 svg、g#flow、g#nested；点击 rect#start 应定位第 3 行。example.svg 和 incomplete.svg 右侧有 []，notes.txt 和 folder.svg 目录没有。临时编辑 ID 可观察更新；破坏 XML 时大纲清空，修复后恢复。

扩展通过 configurationDefaults 提供 SVG 使用普通文本编辑器的默认关联，以免大纲定位被内置图片编辑器接管；用户显式设置优先，不写用户配置文件。如已有图片预览标签，先使用 Reopen as Source Text 切换为源码。

## 验证

```powershell
npm run check
$env:VSCODE_EXECUTABLE = 'D:\App\Microsoft VS Code\Code.exe'
npm run test:host
```

第一条运行独立类型检查、打包及 17 项单元测试。第二条使用已安装的 VS Code，在独立测试用户目录和扩展目录中运行真实宿主验收，不下载另一份编辑器。VSCODE_EXECUTABLE 请改为本机 Code.exe 路径。测试配置和产物已忽略，不进入 Git。

host.ts 验证真实注册的 DocumentSymbolProvider、层级、行号、未保存编辑、无效 XML、恢复、文件装饰和原始文件 SHA-256 不变；测试关闭后保持样例原内容。测试替身只用于普通 Node 单元测试，不打包到扩展运行入口。

职责、模式分析、复用评估、截图与真实观察见 [实践记录](../../doc/phase2/vscode/README.md)。
