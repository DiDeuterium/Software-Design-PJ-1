import type { SvgCodec } from '../../application/ports/SvgCodec.js';
import { SvgReadResult } from '../../application/ports/SvgReadResult.js';
import { SvgDocument } from '../../domain/document/SvgDocument.js';
import { ShapeFactory } from '../../domain/factory/ShapeFactory.js';
import { ShapeValidation } from '../../domain/shapes/ShapeValidation.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import type { SvgElement } from './SvgElement.js';
import { SvgXmlReader } from './SvgXmlReader.js';
import { SvgWriter } from './SvgWriter.js';

export class FastXmlSvgCodec implements SvgCodec {
  private readonly factory: ShapeFactory;
  private readonly reader = new SvgXmlReader();
  private readonly writer = new SvgWriter();

  public constructor(factory = new ShapeFactory()) { this.factory = factory; }

  public decode(source: string): SvgReadResult {
    const root = this.reader.read(source);
    const attributes = root.attributes;
    for (const name of attributes.keys()) {
      if (!['width', 'height', 'viewBox'].includes(name)) throw new Error('unsupported svg attribute: ' + name);
    }
    if (root.text.trim().length > 0) throw new Error('invalid svg: unexpected text in svg');
    const width = this.dimension(attributes.get('width'), 'width');
    const height = this.dimension(attributes.get('height'), 'height');
    const viewBox = attributes.get('viewBox');
    if (viewBox !== undefined) {
      const parts = viewBox.trim().split(/\s*,\s*|\s+/u);
      let values: number[] = [];
      try { values = parts.map(part => ShapeValidation.number(part)); } catch { /* Report the original viewBox. */ }
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== width || values[3] !== height) {
        throw new Error('unsupported svg viewBox: ' + viewBox);
      }
    }
    const used = new Set<string>();
    this.collectIds(root.children, used);
    const counters = new Map<string, number>();
    const warnings: string[] = [];
    const shapes = root.children.map(element => this.shape(element, used, counters, warnings));
    return new SvgReadResult(new SvgDocument(width, height, shapes), warnings);
  }

  public encode(document: SvgDocument): string { return this.writer.write(document); }

  private dimension(value: string | undefined, name: string): number {
    if (value === undefined) throw new Error('invalid svg: missing ' + name);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px)?$/u.test(value.trim())) {
      throw new Error('invalid number: ' + value);
    }
    const numeric = value.trim().replace(/px$/u, '');
    const result = ShapeValidation.number(numeric);
    if (result <= 0) throw new Error('invalid value for ' + name + ': ' + value);
    return result;
  }

  private collectIds(elements: readonly SvgElement[], used: Set<string>): void {
    for (const element of elements) {
      const id = element.attributes.get('id');
      if (id !== undefined && id !== '') {
        ShapeValidation.id(id);
        if (used.has(id)) throw new Error('id already exists: ' + id);
        used.add(id);
      }
      this.collectIds(element.children, used);
    }
  }

  private shape(element: SvgElement, used: Set<string>, counters: Map<string, number>, warnings: string[]): Shape {
    let id = element.attributes.get('id');
    if (id === undefined || id === '') {
      let next = counters.get(element.name) ?? 1;
      do { id = element.name + next++; } while (used.has(id));
      counters.set(element.name, next);
      used.add(id);
      warnings.push('assigned id ' + id + ' to unnamed <' + element.name + '>');
    }
    const children = element.children.map(child => this.shape(child, used, counters, warnings));
    return this.factory.fromAttributes(element.name, id, element.attributes, element.text, children);
  }
}
