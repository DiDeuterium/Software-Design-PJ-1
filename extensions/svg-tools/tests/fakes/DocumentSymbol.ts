export class DocumentSymbol {
  public children: DocumentSymbol[] = [];
  public constructor(public name: string, public detail: string, public kind: number, public range: unknown, public selectionRange: unknown) {}
}
