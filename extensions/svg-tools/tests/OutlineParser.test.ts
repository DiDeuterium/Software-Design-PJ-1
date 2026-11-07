import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OutlineParser } from '../src/OutlineParser';

const parser = new OutlineParser();
test('nested groups, id-less elements, root and source ranges', () => {
  const xml = '<svg>\r\n <g id="group"><rect id="a"/><g><text>hello</text></g></g>\r\n</svg>';
  const roots = parser.parse(xml);
  assert.equal(roots[0]?.name, 'svg');
  const group = roots[0]!.children[0]!;
  assert.equal(group.name, 'g#group');
  assert.equal(group.children[0]?.name, 'rect#a');
  assert.equal(group.children[1]?.children[0]?.name, 'text');
  for (const element of [roots[0]!, group, ...group.children]) {
    assert.equal(xml.slice(element.nameStart, element.nameStart + element.tag.length), element.tag);
    assert.equal(xml[element.start], '<');
    assert.equal(xml[element.end - 1], '>');
  }
  assert.equal(roots[0]!.end, xml.length);
});
test('fresh parse reflects unsaved text edits without cached state', () => {
  assert.equal(parser.parse('<svg><rect id="old"/></svg>')[0]?.children[0]?.name, 'rect#old');
  assert.equal(parser.parse('<svg><circle id="new"/></svg>')[0]?.children[0]?.name, 'circle#new');
});
for (const xml of ['<svg><g>', '<svg><rect', '<svg><g></svg>', '<svg id="open', '<svg/><svg/>', '', '<rect/>']) {
  test('invalid or incomplete XML returns empty: ' + xml, () => assert.deepEqual(parser.parse(xml), []));
}
test('recovers after invalid XML', () => {
  parser.parse('<svg><g>');
  assert.equal(parser.parse('<svg/>')[0]?.name, 'svg');
});
test('comments, declarations, CDATA and > inside attributes retain offsets', () => {
  const xml = '<?xml version="1.0"?><!-- <fake/> --><svg><g id="a&gt;b"><text><![CDATA[<fake/>]]></text></g></svg>';
  const group = parser.parse(xml)[0]!.children[0]!;
  assert.equal(group.name, 'g#a>b');
  assert.equal(xml.slice(group.start, group.start + 3), '<g ');
  assert.equal(group.children.length, 1);
});
test('UTF-16 offsets before and after emoji, CRLF and namespace prefixes', () => {
  const xml = '<s:svg xmlns:s="http://www.w3.org/2000/svg">\r\n<s:text>😀</s:text><s:g id="n"/></s:svg>';
  const child = parser.parse(xml)[0]!.children[1]!;
  assert.equal(xml.slice(child.start, child.end), '<s:g id="n"/>');
});
test('general SVG outside strict CLI subset, missing canvas and duplicate IDs are displayable', () => {
  const xml = '<svg><path id="a" transform="translate(1 2)"/><text id="a"><tspan>label</tspan></text></svg>';
  assert.equal(parser.parse(xml)[0]!.children.length, 2);
});
test('cancellation returns no partial tree', () => {
  assert.deepEqual(parser.parse('<svg><g/></svg>', () => true), []);
});
