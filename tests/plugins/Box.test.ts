import { describe, expect, it } from 'vitest';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { Readable, Writable } from 'node:stream';
import BoxPlugin from '../../src/plugins/shape-box/BoxPlugin.js';
import { BoxProvider } from '../../src/plugins/shape-box/BoxProvider.js';
import { BoxShape } from '../../src/plugins/shape-box/BoxShape.js';
import { createRuntime } from '../../src/host/Runtime.js';
import { Repl } from '../../src/host/Repl.js';
import { MemoryFiles } from '../core/fixtures/MemoryFiles.js';
import { SamplePlugin } from '../core/fixtures/SamplePlugin.js';
import { BoxFillHandler } from '../../src/plugins/shape-box/BoxFillHandler.js';
import type { AttributeHandler, AttributeContext } from '../../src/core/public/AttributeHandler.js';
import type { ShapeView } from '../../src/core/public/Shape.js';

const manifest = { name: '@svgframe/plugin-shape-box', contributes: {
  shapes: ['box'], attributes: ['box-fill', 'box-label'], decorators: ['box-type-label'],
} };
async function setup() {
  const files = new MemoryFiles();
  const runtime = await createRuntime({ files, plugins: [{ manifest, plugin: new BoxPlugin() }] });
  return { ...runtime, files, run: (line: string) => runtime.dispatcher.dispatch(line) };
}
const attribute = (shape: ShapeView, name: string) => shape.attributes.find(([key]) => key === name)?.[1];

describe('box independent implementation and runtime integration', () => {
  it('creates and clones its template without any other plugin and validates geometry and source structure', () => {
    const provider = new BoxProvider(); const box = provider.create('n', [120, 100, 160, 60, '开始']);
    expect(box.children.map(child => child.id)).toEqual(['n-rect', 'n-label']);
    expect(box.children[0]!.getAttribute('fill')).toBe('#4a90d9');
    expect(box.children[1]!.getAttribute('x')).toBe(140); expect(box.children[1]!.getAttribute('y')).toBe(135);
    const copy = box.clone(); copy.move(10, 20); copy.scale(2);
    expect(box.children[0]!.getAttribute('x')).toBe(120); expect(copy.children[0]!.getAttribute('x')).toBe(260);
    expect(copy).toBeInstanceOf(BoxShape);
    expect(() => provider.create('bad', [0, 0, -1, 2, 'x'])).toThrow('invalid value for width');
    expect(() => provider.create('bad', [0])).toThrow('usage: create box');
    expect(() => box.withChildren(box.children.slice(1))).toThrow('invalid box');
  });

  it('makes fill and label independent undo units, with fallback for regular shapes', async () => {
    const r = await setup(); await r.run('init'); await r.run('create box n 1 2 3 4 "开始"');
    for (const [name, part, field, value, original] of [
      ['fill', 'rect', 'fill', '#f5a623', '#4a90d9'], ['label', 'label', 'text', '处理数据 v2', '开始'],
    ]) {
      const count = r.session.undoCount;
      await r.run(`set n ${name} "${value}"`);
      expect(r.session.undoCount).toBe(count + 1);
      expect(attribute(r.session.state.document!.getShape(`n-${part}`), field!)).toBe(value);
      await r.run('undo'); expect(attribute(r.session.state.document!.getShape(`n-${part}`), field!)).toBe(original);
      await r.run('redo'); expect(attribute(r.session.state.document!.getShape(`n-${part}`), field!)).toBe(value);
    }
    await r.run('set n-rect fill blue');
    await expect(r.run('set n-rect label wrong')).rejects.toThrow('unknown attribute: label');
  });

  it('supports nesting, whole-tree geometry/history and protects children and all derived IDs atomically', async () => {
    const r = await setup();
    for (const line of ['init', 'create g outer', 'create box n 1 2 3 4 "parent" in outer',
      'create box nested 10 20 30 40 "child" in n', 'create rect clash-label 0 0 1 1 in outer']) await r.run(line);
    const before = r.session.state.document!.roots; const history = r.session.undoCount;
    for (const line of ['create box clash 0 0 1 1 "x"', 'delete n-rect', 'addto outer n-label', 'group stolen n-rect', 'ungroup n']) {
      await expect(r.run(line)).rejects.toThrow();
      expect(r.session.state.document!.roots).toEqual(before); expect(r.session.undoCount).toBe(history);
    }
    await r.run('move n 5 6'); expect(attribute(r.session.state.document!.getShape('nested-rect'), 'x')).toBe(15);
    await r.run('undo'); expect(r.session.state.document!.roots).toEqual(before);
    await r.run('redo'); await r.run('scale n 2');
    expect(attribute(r.session.state.document!.getShape('nested-rect'), 'x')).toBe(30);
    await r.run('group pair n clash-label'); await r.run('ungroup pair');
    const ready = r.session.state.document!.roots; await r.run('delete n'); await r.run('undo');
    expect(r.session.state.document!.roots).toEqual(ready);
  });

  it('round-trips and degrades without box; malformed and duplicate-ID reads retain document and history', async () => {
    const r = await setup(); await r.run('init'); await r.run('create box n 1 2 3 4 "标题"'); await r.run('save box.svg');
    const xml = await r.files.read('box.svg'); expect(xml).toContain('data-kind="box"');
    const before = r.session.state.document!.roots; await r.run('read box.svg'); expect(r.session.state.document!.roots).toEqual(before);
    const plain = await createRuntime({ files: r.files }); await plain.dispatcher.dispatch('read box.svg');
    expect(plain.session.state.document!.getShape('n').type).toBe('g');
    for (const bad of [xml.replace('n-rect', 'wrong'), xml.replace(/<rect[^>]+\/>/u, '<circle id="n-rect" cx="1" cy="2" r="3"/>'),
      xml.replace('n-label', 'n-rect')]) {
      await r.files.write('bad.svg', bad); const count = r.session.undoCount;
      await expect(r.run('read bad.svg')).rejects.toThrow();
      expect(r.session.state.document!.roots).toEqual(before); expect(r.session.undoCount).toBe(count);
    }
  });

  it('rejects handler conflicts and rolls back partial handler failures without clearing redo', async () => {
    const r = await setup(); await r.run('init'); await r.run('create box n 1 2 3 4 "标题"'); await r.run('move n 1 1'); await r.run('undo');
    await r.registry.activate({ name: 'failure', contributes: { attributes: ['box-broken'] } }, new SamplePlugin(ctx => {
      ctx.registerAttribute(new class implements AttributeHandler {
        name = 'box-broken';
        handles(shape: ShapeView, name: string) { return shape.type === 'box' && name === 'broken'; }
        apply(context: AttributeContext): never { context.document.getShape('n-rect').set('fill', 'bad'); throw new Error('partial failure'); }
      }());
    }));
    const before = r.session.state.document!.roots;
    await expect(r.run('set n broken value')).rejects.toThrow('partial failure');
    expect(r.session.state.document!.roots).toEqual(before); expect(r.session.redoCount).toBe(1);
    await r.registry.activate({ name: 'conflict', contributes: { attributes: ['box-other-fill'] } }, new SamplePlugin(ctx => {
      ctx.registerAttribute(new class extends BoxFillHandler { public override get name() { return 'box-other-fill'; } }());
    }));
    await expect(r.run('set n fill red')).rejects.toThrow('attribute handler conflict');
    expect(r.session.state.document!.roots).toEqual(before); expect(r.session.redoCount).toBe(1);
  });

  it('replays course version B with byte-identical code/config output and SVG', async () => {
    const a = await setup(); const temporary = await mkdtemp(join(process.cwd(), '.box-test-'));
    try {
      const file = join(temporary, 'plugins.config.json');
      await writeFile(file, JSON.stringify({ plugins: [{ module: resolve('dist/plugins/shape-box') }] }));
      const files = new MemoryFiles(); const errors: string[] = [];
      const b = await createRuntime({ files, configFile: file, report: message => errors.push(message) }); expect(errors).toEqual([]);
      const input = await readFile('doc/transcript/flowchart-box.txt', 'utf8');
      const replay = async (runtime: typeof b) => {
        const chunks: Buffer[] = []; const output = new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
        const status = await new Repl(runtime.dispatcher, Readable.from([input]), output).run();
        return { bytes: Buffer.concat(chunks), status };
      };
      const left = await replay(a); const right = await replay(b);
      expect(left.status).toBe(0); expect(right.status).toBe(0); expect(left.bytes.equals(right.bytes)).toBe(true);
      expect(left.bytes.toString()).toContain('box#n2 label restored: "处理数据"');
      expect(left.bytes.toString()).toContain('g#n1 (box)');
      expect(left.bytes.toString()).toContain('saved to flowchart-box.svg (8 elements)');
      expect(await a.files.read('flowchart-box.svg')).toBe(await files.read('flowchart-box.svg'));
    } finally {
      if (dirname(temporary) !== process.cwd() || !basename(temporary).startsWith('.box-test-')) throw new Error('unexpected test directory');
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
