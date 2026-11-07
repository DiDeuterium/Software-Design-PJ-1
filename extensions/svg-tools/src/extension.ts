import * as vscode from 'vscode';
import { SvgDecorationProvider } from './SvgDecorationProvider';
import { SvgSymbolProvider } from './SvgSymbolProvider';

export function activate(context: vscode.ExtensionContext): void {
  const decorations = new SvgDecorationProvider();
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(decorations, watcher,
    watcher.onDidCreate(uri => decorations.refresh(uri)),
    watcher.onDidDelete(uri => decorations.refresh(uri)),
    watcher.onDidChange(uri => decorations.refresh(uri)),
    vscode.window.registerFileDecorationProvider(decorations),
    vscode.languages.registerDocumentSymbolProvider({ pattern: '**/*.[sS][vV][gG]' }, new SvgSymbolProvider(), { label: 'PJ1 SVG Outline' }));
}
