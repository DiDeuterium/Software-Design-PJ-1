import * as vscode from 'vscode';

export class SvgDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChangeFileDecorations = this.changes.event;
  public async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.FileDecoration | undefined> {
    if (token.isCancellationRequested || !/\.svg$/iu.test(uri.path)) return undefined;
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (token.isCancellationRequested || (stat.type & vscode.FileType.File) === 0) return undefined;
      const decoration = new vscode.FileDecoration('[]', 'SVG file');
      decoration.propagate = false;
      return decoration;
    } catch { return undefined; }
  }
  public refresh(uri: vscode.Uri): void { this.changes.fire(uri); }
  public dispose(): void { this.changes.dispose(); }
}
