import ts from 'typescript-ast';

export function sourceMetrics(path: string, text: string) {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const functions: { line: number; name: string; complexity: number }[] = [];
  const dependencies: string[] = [];
  const exports: string[] = [];
  const branch = (node: ts.Node): boolean => ts.isIfStatement(node) || ts.isConditionalExpression(node) ||
    ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isCatchClause(node) || ts.isCaseClause(node) ||
    (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind));
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node) && 'body' in node && node.body !== undefined) {
      let complexity = 1;
      const count = (child: ts.Node): void => {
        if (ts.isFunctionLike(child)) return; // counted independently, not twice
        if (branch(child)) complexity++;
        ts.forEachChild(child, count);
      };
      count(node.body as ts.Node);
      const name = node.name?.getText(file) ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(file) : '(anonymous)');
      functions.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, name, complexity });
    }
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      dependencies.push(node.moduleSpecifier.text);
    }
    if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name !== undefined) exports.push(node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const lines = text.length === 0 ? [] : text.replace(/\r\n?/gu, '\n').replace(/\n$/u, '').split('\n');
  return { lines: lines.length, nonBlankLines: lines.filter(line => line.trim().length > 0).length,
    complexity: functions.reduce((sum, item) => sum + item.complexity, 0), functions, dependencies, exports };
}
