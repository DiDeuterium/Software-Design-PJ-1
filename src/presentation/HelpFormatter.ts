export class HelpFormatter {
  public format(): string {
    return [
      'Document:',
      '  init [w] [h]                 defaults: 800x600; omitted h: 600',
      '  canvas [w] [h]               query or resize; omitted h: current height',
      '  read <file.svg>               pending SVG persistence phase',
      '  save [file.svg]               pending SVG persistence phase',
      'Edit:',
      '  create <type> <id> [params] [in <containerId>]',
      '    rect <id> <x> <y> <w> <h> [fill]',
      '    circle <id> <cx> <cy> <r> [fill]',
      '    ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '    line <id> <x1> <y1> <x2> <y2> [stroke]',
      '    text <id> <x> <y> "content"',
      '    g <id>',
      '  delete <id>',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id> / back <id>',
      'Display and history:',
      '  tree [id] / show <id> / help / undo / redo',
      'Whole-line # comments only; colors such as #ffffff are values.',
      'Double-quoted arguments support escaped quotes and backslashes.',
      'EOF or Ctrl+C exits. Successful init/resize blocks undo/redo until the next edit.',
    ].join('\n');
  }
}
