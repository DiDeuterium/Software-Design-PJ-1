import { describe, expect, it } from 'vitest';
import { FastXmlSvgCodec } from '../../src/infrastructure/svg/FastXmlSvgCodec.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

describe('strict SVG codec', () => {
  const codec = new FastXmlSvgCodec();

  it('imports all shapes and SVG defaults, preserving order, nesting and explicit styles', () => {
    const result = codec.decode('<svg width="400px" height="300" viewBox="0,0,400,300">' +
      '<rect id="r" width="10" fill="#ffffff"/><g id="g" fill="red" stroke-width="0">' +
      '<circle id="c"/><ellipse id="e" cx="-1.5" rx="2"/><line id="l" x2="3" stroke="black"/>' +
      '<text id="t" x="4"> 中文 </text><g id="empty"/></g></svg>');
    const document = result.document;
    expect([document.width, document.height, document.size]).toEqual([400, 300, 7]);
    expect(document.roots.map(s => s.id)).toEqual(['r', 'g']);
    expect(document.getShape('g').children.map(s => s.id)).toEqual(['c', 'e', 'l', 't', 'empty']);
    expect(document.getShape('r')).toMatchObject({ x: 0, y: 0, width: 10, height: 0, fill: '#ffffff' });
    expect(document.getShape('c')).toMatchObject({ cx: 0, cy: 0, r: 0, fill: undefined });
    expect(document.getShape('e')).toMatchObject({ cx: -1.5, cy: 0, rx: 2, ry: 0 });
    expect(document.getShape('l')).toMatchObject({ x1: 0, y1: 0, x2: 3, y2: 0 });
    expect(document.getShape('t')).toMatchObject({ x: 4, y: 0, text: ' 中文 ' });
    expect(document.getShape('g').strokeWidth).toBe(0);
    expect(result.warnings).toEqual([]);
    DocumentAssertions.consistent(document);
    DocumentAssertions.unchanged(codec.decode(codec.encode(document)).document, document.snapshot());
  });

  it('reserves all explicit IDs before generating per-tag IDs in preorder', () => {
    const source = '<svg width="1" height="2"><rect/><g><rect id=""/><circle/><text/>' +
      '</g><rect id="rect1"/><circle id="circle1"/><g id="g1"/><rect id="rect3"/></svg>';
    const result = codec.decode(source);
    expect(result.document.roots.map(s => s.id)).toEqual(['rect2', 'g2', 'rect1', 'circle1', 'g1', 'rect3']);
    expect(result.document.getShape('g2').children.map(s => s.id)).toEqual(['rect4', 'circle2', 'text1']);
    expect(result.warnings).toEqual([
      'assigned id rect2 to unnamed <rect>', 'assigned id g2 to unnamed <g>',
      'assigned id rect4 to unnamed <rect>', 'assigned id circle2 to unnamed <circle>',
      'assigned id text1 to unnamed <text>',
    ]);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    result.document.delete('rect2');
    expect(result.document.find('rect2')).toBeDefined();
    expect(codec.decode(source).warnings).toEqual(result.warnings);
  });

  it('supports declarations, comments, namespace prefixes and local SVG namespace declarations', () => {
    const xml = '\ufeff<?xml version="1.0" encoding="UTF-8"?>\n<!-- before -->' +
      '<s:svg xmlns:s="http://www.w3.org/2000/svg" width="1" height="2">' +
      '<s:g id="g"><text xmlns="http://www.w3.org/2000/svg" id="t">a<!-- comment -->b</text>' +
      '</s:g></s:svg><!-- after -->';
    const document = codec.decode(xml).document;
    expect(document.getShape('t')).toMatchObject({ text: 'ab' });
    expect(document.getShape('t').parent?.id).toBe('g');
  });

  it('decodes predefined/numeric entities once, preserves CDATA and whitespace, and normalizes literal CRLF', () => {
    const xml = '<svg width="1" height="2"><text id="t"> \t&amp;lt;&lt;&gt;&quot;&apos;' +
      '&#x1F600;&#13;\r\n<![CDATA[&unknown;<plain>]]> </text></svg>';
    const text = codec.decode(xml).document.getShape('t') as TextShape;
    expect(text.text).toBe(' \t&lt;<>"\'😀\r\n&unknown;<plain> ');
  });

  it('round-trips the exact domain state including hostile-looking literals, multiline text and attribute whitespace', () => {
    const text = new TextShape('t<&"\'', -1.25, 2e-8, ' \t中文<&"\'>\r\n  next\n&copy; 😀 ');
    text.set('fill', 'literal & "\t\r\n<color>');
    const rect = new RectShape('constructor', 0, 0, 3, 4);
    const group = new GroupShape('__proto__', [text, rect, new GroupShape('empty')]);
    group.set('stroke', 'none');
    group.set('stroke-width', 0.5);
    const document = new SvgDocument(123.5, 456.25, [group]);
    const before = document.snapshot();
    const xml = codec.encode(document);
    expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&#13;');
    expect(xml).toContain('&#9;');
    expect(xml).not.toContain('transform=');
    const restored = codec.decode(xml);
    DocumentAssertions.unchanged(restored.document, before);
    DocumentAssertions.unchanged(document, before);
    expect(restored.warnings).toEqual([]);
    expect(codec.encode(restored.document)).toBe(xml);
  });

  it('round-trips empty documents and emits no default styles', () => {
    const source = '<svg width="1" height="2"><rect id="r"/><text id="t"/></svg>';
    const xml = codec.encode(codec.decode(source).document);
    expect(xml).not.toContain('fill=');
    expect(xml).not.toContain('stroke=');
    expect(codec.decode(codec.encode(new SvgDocument())).document.size).toBe(0);
  });

  it('round-trips nesting beyond the XML library default without changing text indentation', () => {
    let shape = new GroupShape('g0', [new TextShape('t', 0, 0, 'line1\n  line2')]);
    for (let i = 1; i < 125; i++) shape = new GroupShape('g' + i, [shape]);
    const document = new SvgDocument(1, 2, [shape]);
    const restored = codec.decode(codec.encode(document)).document;
    expect(restored.size).toBe(126);
    expect(restored.getShape('t')).toMatchObject({ text: 'line1\n  line2' });
    DocumentAssertions.consistent(restored);
  });

  it.each([
    ['<rect id="same"/><g><circle id="same"/></g>', 'id already exists: same'],
    ['<rect id="bad id"/>', 'invalid id: bad id'],
    ['<rect transform="translate(1 2)"/>', 'unsupported svg attribute: transform'],
    ['<g data-kind="box"/>', 'unsupported svg attribute: data-kind'],
    ['<rect style="fill:red"/>', 'unsupported svg attribute: style'],
    ['<circle width="2"/>', 'unsupported svg attribute: width'],
    ['<text text="hello"/>', 'unsupported svg attribute: text'],
    ['<path d="M0 0"/>', 'unsupported svg element: path'],
    ['<box/>', 'unsupported svg element: box'],
    ['<svg/>', 'unsupported svg element: svg'],
    ['<text><tspan>bad</tspan></text>', 'unsupported svg element: tspan'],
    ['<rect><circle/></rect>', 'invalid svg: child elements not allowed in rect'],
    ['<text><g/></text>', 'invalid svg: child elements not allowed in text'],
    ['<g>content</g>', 'invalid svg: unexpected text in g'],
    ['<rect>content</rect>', 'invalid svg: unexpected text in rect'],
    ['<rect width="-1"/>', 'invalid value for width: -1'],
    ['<circle r="Infinity"/>', 'invalid number: Infinity'],
    ['<line x1="1px"/>', 'invalid number: 1px'],
    ['<text>&bogus;</text>', 'invalid svg: unknown or malformed entity'],
    ['<text>&#0;</text>', 'invalid svg: invalid XML character'],
    ['<text>&#xD800;</text>', 'invalid svg: invalid XML character'],
    ['<text>&#x110000;</text>', 'invalid svg: invalid character reference'],
    ['<rect fill="raw&bad"/>', 'invalid svg: unknown or malformed entity'],
    ['<rect fill="<raw"/>', 'invalid svg:'],
    ['<g xmlns="urn:foreign"/>', 'invalid svg: unsupported namespace'],
    ['<x:rect/>', 'invalid svg: unsupported namespace'],
    ['<rect xmlns:s="http://www.w3.org/2000/svg" s:x="1"/>', 'unsupported svg attribute: s:x'],
    ['<?custom payload?>', 'invalid svg: processing instructions'],
  ])('rejects unsupported or invalid child content: %s', (body, message) => {
    expect(() => codec.decode('<svg width="10" height="20">' + body + '</svg>')).toThrow(message);
  });

  it.each([
    ['', 'invalid svg:'],
    ['<svg width="1" height="2"><rect></svg>', 'invalid svg:'],
    ['<svg width="1" height="2"/><svg width="1" height="2"/>', 'invalid svg:'],
    ['<svg width="1" width="2" height="2"/>', 'invalid svg:'],
    ['<svg height="2"/>', 'invalid svg: missing width'],
    ['<svg width="1"/>', 'invalid svg: missing height'],
    ['<svg width="0" height="2"/>', 'invalid value for width: 0'],
    ['<svg width="1%" height="2"/>', 'invalid number:'],
    ['<svg width="1 px" height="2"/>', 'invalid number:'],
    ['<svg width="NaN" height="2"/>', 'invalid number:'],
    ['<svg width="1" height="2" fill="red"/>', 'unsupported svg attribute: fill'],
    ['<svg width="1" height="2" viewBox="1 0 1 2"/>', 'unsupported svg viewBox:'],
    ['<svg width="1" height="2" viewBox="0 0 2 2"/>', 'unsupported svg viewBox:'],
    ['<svg width="1" height="2" viewBox="0 0 bad 2"/>', 'unsupported svg viewBox:'],
    ['<svg width="1" height="2" viewBox="0,,0,1,2"/>', 'unsupported svg viewBox:'],
    ['<svg width="1" height="2" xmlns="urn:foreign"/>', 'invalid svg: unsupported namespace'],
    ['<svg width="1" height="2">stray</svg>', 'invalid svg: unexpected text in svg'],
    ['<!DOCTYPE svg [<!ENTITY x "expanded">]><svg width="1" height="2"/>', 'invalid svg: DOCTYPE'],
    ['<?xml version="1.1"?><svg width="1" height="2"/>', 'invalid svg: only XML 1.0'],
    ['<?xml version="1.0" encoding="GBK"?><svg width="1" height="2"/>', 'invalid svg: only UTF-8'],
    ['<?xml version="1.0" standalone="maybe"?><svg width="1" height="2"/>', 'invalid svg: invalid standalone'],
    ['<?xml version="1.0" extra="yes"?><svg width="1" height="2"/>', 'invalid svg: unsupported XML declaration attribute'],
    ['<svg width="1" height="2"><!-- unclosed</svg>', 'invalid svg:'],
  ])('rejects malformed documents: %s', (xml, message) => {
    expect(() => codec.decode(xml)).toThrow(message);
  });

  it('rejects unrepresentable output instead of writing invalid XML', () => {
    const document = new SvgDocument(1, 2, [new TextShape('t', 0, 0, '\u0000')]);
    expect(() => codec.encode(document)).toThrow('invalid svg: invalid XML character');
  });
});
