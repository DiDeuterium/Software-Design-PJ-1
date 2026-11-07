import * as vscode from 'vscode';
import { OutlineParser } from './OutlineParser';
import type { OutlineElement } from './OutlineElement';

export class SvgSymbolProvider implements vscode.DocumentSymbolProvider {
  private readonly parser = new OutlineParser();
  public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    if (!/\.svg$/iu.test(document.uri.path)) return [];
    return this.parser.parse(document.getText(), () => token.isCancellationRequested)
      .map(element => this.symbol(document, element));
  }
  private symbol(document: vscode.TextDocument, element: OutlineElement): vscode.DocumentSymbol {
    const range = new vscode.Range(document.positionAt(element.start), document.positionAt(element.end));
    const selection = new vscode.Range(document.positionAt(element.nameStart), document.positionAt(element.nameStart + element.tag.length));
    const symbol = new vscode.DocumentSymbol(element.name, '', vscode.SymbolKind.Object, range, selection);
    symbol.children = element.children.map(child => this.symbol(document, child));
    return symbol;
  }
}
