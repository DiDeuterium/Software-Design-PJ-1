import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { SvgElement } from './SvgElement.js';
import { XmlText } from './XmlText.js';

type XmlNode = Record<string, unknown>;

export class SvgXmlReader {
  private static readonly svgNamespace = 'http://www.w3.org/2000/svg';
  private readonly parser = new XMLParser({
    preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '',
    parseTagValue: false, parseAttributeValue: false, trimValues: false,
    processEntities: false, commentPropName: '#comment', cdataPropName: '#cdata',
    maxNestedTags: Infinity,
    onDangerousProperty: name => { throw new Error('invalid svg: unsupported XML name: ' + name); },
  });

  public read(source: string): SvgElement {
    XmlText.validate(source);
    const normalized = source.replace(/\r\n?/gu, '\n');
    const structural = normalized.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/gu, '');
    if (/<!DOCTYPE/iu.test(structural)) throw new Error('invalid svg: DOCTYPE is not supported');
    const validation = XMLValidator.validate(normalized);
    if (validation !== true) throw new Error('invalid svg: ' + validation.err.msg);
    let parsed: unknown;
    try { parsed = this.parser.parse(normalized); }
    catch (error: unknown) {
      throw new Error('invalid svg: ' + (error instanceof Error ? error.message : 'XML parse failed'));
    }
    const content = this.content(this.nodes(parsed), new Map([['', SvgXmlReader.svgNamespace]]), true);
    if (content.elements.length !== 1 || content.text.trim().length > 0) {
      throw new Error('invalid svg: expected one svg root');
    }
    const root = content.elements[0]!;
    if (root.name !== 'svg') throw new Error('invalid svg: expected svg root');
    return root;
  }

  private content(nodes: readonly XmlNode[], namespaces: ReadonlyMap<string, string>, top = false):
    { elements: SvgElement[]; text: string } {
    const elements: SvgElement[] = [];
    let text = '';
    for (const node of nodes) {
      const name = Object.keys(node).find(key => key !== ':@');
      if (name === undefined) throw new Error('invalid svg: missing element name');
      if (name === '#comment') continue;
      if (name === '#text') { text += XmlText.decode(String(node[name])); continue; }
      if (name === '#cdata') {
        text += this.nodes(node[name]).map(part => XmlText.validate(String(part['#text'] ?? ''))).join('');
        continue;
      }
      if (name === '?xml' && top) {
        const attributes = this.attributes(node);
        for (const key of attributes.keys()) {
          if (!['version', 'encoding', 'standalone'].includes(key)) {
            throw new Error('invalid svg: unsupported XML declaration attribute: ' + key);
          }
        }
        const standalone = attributes.get('standalone');
        if (standalone !== undefined && standalone !== 'yes' && standalone !== 'no') {
          throw new Error('invalid svg: invalid standalone declaration');
        }
        if (attributes.get('version') !== '1.0') throw new Error('invalid svg: only XML 1.0 is supported');
        const encoding = attributes.get('encoding');
        if (encoding !== undefined && encoding.toUpperCase() !== 'UTF-8') {
          throw new Error('invalid svg: only UTF-8 encoding is supported');
        }
        continue;
      }
      if (name.startsWith('?')) throw new Error('invalid svg: processing instructions are not supported');
      elements.push(this.element(name, node, namespaces));
    }
    return { elements, text };
  }

  private element(qualifiedName: string, node: XmlNode, inherited: ReadonlyMap<string, string>): SvgElement {
    const namespaces = new Map(inherited);
    const attributes = this.attributes(node);
    for (const [name, value] of attributes) {
      if (name === 'xmlns' || name.startsWith('xmlns:')) {
        namespaces.set(name === 'xmlns' ? '' : name.slice(6), value);
        attributes.delete(name);
      }
    }
    const parts = qualifiedName.split(':');
    if (parts.length > 2) throw new Error('invalid svg: invalid namespace name: ' + qualifiedName);
    const prefix = parts.length === 2 ? parts[0]! : '';
    if (namespaces.get(prefix) !== SvgXmlReader.svgNamespace) {
      throw new Error('invalid svg: unsupported namespace for ' + qualifiedName);
    }
    const name = parts.at(-1)!;
    const content = this.content(this.nodes(node[qualifiedName]), namespaces);
    return new SvgElement(name, attributes, content.elements, content.text);
  }

  private attributes(node: XmlNode): Map<string, string> {
    const raw = node[':@'];
    if (raw === undefined) return new Map();
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('invalid svg: invalid attributes');
    }
    return new Map(Object.entries(raw).map(([name, value]) => [name, XmlText.decode(String(value), true)]));
  }

  private nodes(value: unknown): XmlNode[] {
    if (!Array.isArray(value) || value.some(node => node === null || typeof node !== 'object' || Array.isArray(node))) {
      throw new Error('invalid svg: invalid XML structure');
    }
    return value as XmlNode[];
  }
}
