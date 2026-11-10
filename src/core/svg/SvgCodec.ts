import type { SvgCodec as Port } from '../public/Ports.js';
import type { DocumentView } from '../public/Document.js';
import type { ShapeView, ShapeNode } from '../public/Shape.js';
import type { Extensions } from '../public/Extensions.js';
import { EditorDocument } from '../document/EditorDocument.js';
import { ShapeFactory } from '../shapes/ShapeFactory.js';
import { ShapeValidation as V } from '../public/ShapeValidation.js';
import { SvgXmlReader } from './SvgXmlReader.js';
import type { SvgElement } from './SvgElement.js';
import { XmlText } from './XmlText.js';

export class SvgCodec implements Port {
  private readonly reader = new SvgXmlReader();
  private readonly shapes: ShapeFactory;
  public constructor(extensions: () => Extensions) { this.shapes = new ShapeFactory(extensions); }
  public decode(source: string): { document: EditorDocument; warnings: readonly string[] } {
    const root = this.reader.read(source); const attributes = root.attributes;
    for (const name of attributes.keys()) {
      if (!['width', 'height', 'viewBox'].includes(name)) throw new Error('unsupported svg attribute: ' + name);
    }
    if (root.text.trim().length > 0) throw new Error('invalid svg: unexpected text in svg');
    const width = this.dimension(attributes.get('width'), 'width');
    const height = this.dimension(attributes.get('height'), 'height');
    const viewBox = attributes.get('viewBox');
    if (viewBox !== undefined) {
      const parts = viewBox.trim().split(/\s*,\s*|\s+/u); let values: number[] = [];
      try { values = parts.map(part => V.number(part)); } catch { /* preserve original error format */ }
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== width || values[3] !== height) {
        throw new Error('unsupported svg viewBox: ' + viewBox);
      }
    }
    const used = new Set<string>();
    const collect = (elements: readonly SvgElement[]): void => {
      for (const element of elements) {
        const id = element.attributes.get('id');
        if (id !== undefined && id !== '') {
          V.id(id); if (used.has(id)) throw new Error(`id already exists: ${id}`); used.add(id);
        }
        collect(element.children);
      }
    };
    collect(root.children);
    const counters = new Map<string, number>(); const warnings: string[] = [];
    const build = (element: SvgElement): ShapeNode => {
      let id = element.attributes.get('id');
      if (id === undefined || id === '') {
        let next = counters.get(element.name) ?? 1;
        do { id = element.name + next++; } while (used.has(id));
        counters.set(element.name, next); used.add(id);
        warnings.push(`assigned id ${id} to unnamed <${element.name}>`);
      }
      return this.shapes.read({ id, tag: element.name, attributes: [...element.attributes], text: element.text,
        children: element.children.map(build) });
    };
    return { document: new EditorDocument(width, height, root.children.map(build)), warnings };
  }
  public encode(document: DocumentView): string {
    const write = (shape: ShapeView, depth: number): string => {
      const encoded = this.shapes.forShape(shape).write(shape);
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(encoded.tag) ||
        encoded.attributes.some(([name]) => !/^[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(name)) ||
        new Set(encoded.attributes.map(([name]) => name)).size !== encoded.attributes.length ||
        encoded.attributes.find(([name]) => name === 'id')?.[1] !== shape.id) {
        throw new Error(`shape provider contract violation: ${shape.type}`);
      }
      const indent = '  '.repeat(depth);
      const attributes = encoded.attributes.map(([name, value]) => ` ${name}="${XmlText.encode(String(value), true)}"`).join('');
      if (shape.children.length > 0) {
        if (encoded.text !== undefined && encoded.text.length > 0) throw new Error('invalid svg: mixed content');
        return `${indent}<${encoded.tag}${attributes}>\n${shape.children.map(child => write(child, depth + 1)).join('\n')}\n${indent}</${encoded.tag}>`;
      }
      return encoded.text === undefined ? `${indent}<${encoded.tag}${attributes}/>` :
        `${indent}<${encoded.tag}${attributes}>${XmlText.encode(encoded.text)}</${encoded.tag}>`;
    };
    const body = document.roots.map(shape => write(shape, 1)).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">` +
      (body.length === 0 ? '' : '\n' + body) + '\n</svg>\n';
  }
  private dimension(value: string | undefined, name: string): number {
    if (value === undefined) throw new Error('invalid svg: missing ' + name);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px)?$/u.test(value.trim())) throw new Error('invalid number: ' + value);
    const result = V.number(value.trim().replace(/px$/u, ''));
    if (result <= 0) throw new Error(`invalid value for ${name}: ${value}`);
    return result;
  }
}
