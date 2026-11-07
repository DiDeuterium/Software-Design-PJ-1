import { SaxesParser } from 'saxes';
import { OutlineElement } from './OutlineElement';

export class OutlineParser {
  public parse(source: string, cancelled: () => boolean = () => false): readonly OutlineElement[] {
    const roots: OutlineElement[] = [];
    const stack: OutlineElement[] = [];
    const parser = new SaxesParser({ position: true });
    let start = 0;
    let invalid = false;
    parser.on('error', () => { invalid = true; });
    parser.on('opentagstart', tag => { start = parser.position - tag.name.length - 2; });
    parser.on('opentag', tag => {
      if (cancelled()) throw new Error('cancelled');
      const id = typeof tag.attributes['id'] === 'string' ? tag.attributes['id'] : undefined;
      const element = new OutlineElement(tag.name, id, start, start + 1, parser.position);
      const parent = stack.at(-1);
      if (parent) parent.append(element); else roots.push(element);
      stack.push(element);
    });
    parser.on('closetag', () => { stack.pop()?.close(parser.position); });
    try { parser.write(source).close(); } catch { return []; }
    if (invalid || cancelled() || roots.length !== 1 || roots[0]!.tag.split(':').at(-1) !== 'svg') return [];
    return roots;
  }
}
