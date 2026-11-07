import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SvgDecorationProvider } from '../src/SvgDecorationProvider';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('software-design-pj1.pj1-svg-tools');
  assert.ok(extension);
  await extension.activate();
  assert.equal(vscode.workspace.getConfiguration('workbench').get<Record<string, string>>('editorAssociations')?.['*.svg'], 'default');
  const root = vscode.workspace.workspaceFolders![0]!.uri;
  const uri = vscode.Uri.joinPath(root, 'example.svg');
  const original = await vscode.workspace.fs.readFile(uri);
  const hash = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);
  const symbols = async (): Promise<vscode.DocumentSymbol[]> =>
    (await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri)) ?? [];
  const before = await symbols();
  assert.equal(before[0]?.name, 'svg');
  const flow = before[0]!.children[0]!;
  assert.equal(flow.name, 'g#flow');
  assert.equal(flow.children[0]?.name, 'rect#start');
  assert.equal(flow.children[1]?.name, 'text');
  assert.equal(flow.children[2]?.children[0]?.name, 'circle#end');
  const selected = flow.children[0]!.selectionRange;
  assert.equal(selected.start.line, 2);
  editor.selection = new vscode.Selection(selected.start, selected.end);
  editor.revealRange(selected);
  assert.equal(editor.selection.start.line, 2);
  const provider = new SvgDecorationProvider();
  const token = new vscode.CancellationTokenSource();
  assert.equal((await provider.provideFileDecoration(uri, token.token))?.badge, '[]');
  assert.equal(await provider.provideFileDecoration(vscode.Uri.joinPath(root, 'folder.svg'), token.token), undefined);
  assert.equal(await provider.provideFileDecoration(vscode.Uri.joinPath(root, 'notes.txt'), token.token), undefined);
  const replace = async (text: string): Promise<void> => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), text);
    assert.equal(await vscode.workspace.applyEdit(edit), true);
  };
  try {
    await replace(doc.getText().replace('id="start"', 'id="changed"'));
    assert.equal((await symbols())[0]?.children[0]?.children[0]?.name, 'rect#changed');
    await replace('<svg><g');
    assert.deepEqual(await symbols(), []);
    await replace(new TextDecoder().decode(original));
    assert.equal((await symbols())[0]?.children[0]?.children[0]?.name, 'rect#start');
    assert.equal(hash(await vscode.workspace.fs.readFile(uri)), hash(original), 'Plugin must not change disk content');
  } finally {
    await replace(new TextDecoder().decode(original));
    await doc.save();
    provider.dispose(); token.dispose();
  }
  console.log('HOST ACCEPTANCE PASSED: registration, symbols, source location, unsaved edits, incomplete XML, recovery, badge and unchanged file.');
}
