import { test } from 'node:test';
import assert from 'node:assert/strict';
import type * as vscode from 'vscode';
import { SvgDecorationProvider } from '../src/SvgDecorationProvider';
import { SvgSymbolProvider } from '../src/SvgSymbolProvider';
import { setStat } from './FakeVscode';

const token = { isCancellationRequested: false } as vscode.CancellationToken;
const uri = (path: string): vscode.Uri => ({ path }) as vscode.Uri;
test('only SVG files decorated, no propagation or writes; failures and cancellation ignored', async () => {
  const provider = new SvgDecorationProvider();
  setStat(1);
  assert.equal((await provider.provideFileDecoration(uri('/file.svg'), token))?.badge, '[]');
  assert.equal((await provider.provideFileDecoration(uri('/FILE.SVG'), token))?.propagate, false);
  assert.equal(await provider.provideFileDecoration(uri('/notes.txt'), token), undefined);
  setStat(2);
  assert.equal(await provider.provideFileDecoration(uri('/folder.svg'), token), undefined);
  setStat(0);
  assert.equal(await provider.provideFileDecoration(uri('/unknown.svg'), token), undefined);
  setStat(1, true);
  assert.equal(await provider.provideFileDecoration(uri('/missing.svg'), token), undefined);
  setStat(1);
  assert.equal(await provider.provideFileDecoration(uri('/file.svg'), { isCancellationRequested: true } as vscode.CancellationToken), undefined);
  provider.dispose();
});
test('decoration refresh event is disposed', () => {
  const provider = new SvgDecorationProvider();
  const seen: string[] = [];
  provider.onDidChangeFileDecorations(item => { if (item && !Array.isArray(item)) seen.push(item.path); });
  provider.refresh(uri('/file.svg'));
  provider.dispose();
  provider.refresh(uri('/other.svg'));
  assert.deepEqual(seen, ['/file.svg']);
});
test('symbol adapter creates hierarchy and exact line selections from current buffer', () => {
  let value = '<svg>\r\n<g id="g"><rect/></g></svg>';
  const doc = { uri: uri('/example.svg'), getText: () => value, positionAt: (offset: number) => {
    const before = value.slice(0, offset).split('\n'); return { line: before.length - 1, character: before.at(-1)!.length };
  } } as vscode.TextDocument;
  const provider = new SvgSymbolProvider();
  const root = provider.provideDocumentSymbols(doc, token)[0]!;
  assert.equal(root.children[0]?.name, 'g#g');
  assert.equal(root.children[0]?.children[0]?.name, 'rect');
  assert.deepEqual(root.children[0]?.selectionRange.start, { line: 1, character: 1 });
  value = '<svg><text id="new"/></svg>';
  assert.equal(provider.provideDocumentSymbols(doc, token)[0]?.children[0]?.name, 'text#new');
  value = '<svg>';
  assert.deepEqual(provider.provideDocumentSymbols(doc, token), []);
  value = '<svg/>';
  assert.equal(provider.provideDocumentSymbols(doc, token).length, 1);
});
