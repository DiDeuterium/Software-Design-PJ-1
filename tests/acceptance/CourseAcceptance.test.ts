import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TempWorkspace } from '../infrastructure/TempWorkspace.js';
import { CourseScenario } from './CourseScenario.js';
import { FastXmlSvgCodec } from '../../src/infrastructure/svg/FastXmlSvgCodec.js';
import { TreeFormatter } from '../../src/presentation/TreeFormatter.js';

const entry = fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url));
const tsx = import.meta.resolve('tsx');
const requirements = await readFile(new URL('../../phase_cli_1.md', import.meta.url), 'utf8');
const external = await readFile(new URL('../../examples/other.svg', import.meta.url), 'utf8');

describe('complete course acceptance transcripts', () => {
  let workspace: TempWorkspace;
  beforeEach(async () => {
    workspace = await TempWorkspace.create();
    await writeFile(workspace.file('other.svg'), external, 'utf8');
  });
  afterEach(async () => { await workspace.dispose(); });

  it.each(['session', 'flowchart'] as const)('matches every output of the original %s transcript', async section => {
    const scenario = CourseScenario.extract(requirements, section);
    const result = spawnSync(process.execPath, ['--import', tsx, entry], {
      cwd: workspace.directory, input: scenario.input, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    // §6 intentionally contains two errors; execution must reach the final tree.
    expect(result.status, result.stdout).toBe(section === 'session' ? 1 : 0);
    const lines = scenario.outputLines(result.stdout);
    expect(lines).toHaveLength(scenario.expected.length);
    lines.forEach((line, index) => {
      expect(scenario.matches(line, scenario.expected[index]!),
        'output ' + (index + 1) + ': expected ' + scenario.expected[index] + '\nreceived ' + line).toBe(true);
    });
    const codec = new FastXmlSvgCodec();
    const name = section === 'session' ? 'demo.svg' : 'flowchart.svg';
    const saved = codec.decode(await readFile(workspace.file(name), 'utf8'));
    expect(saved.warnings).toEqual([]);
    const document = saved.document;
    expect([document.width, document.height, document.size]).toEqual([800, 600, section === 'session' ? 5 : 8]);
    if (section === 'session') {
      expect(document.roots.map(shape => shape.id)).toEqual(['bg', 'title', 'markers']);
      expect(document.getShape('markers').children.map(shape => shape.id)).toEqual(['c1', 'box']);
      expect(document.getShape('c1')).toMatchObject({ cx: 130, cy: 100, r: 20, fill: 'red' });
      expect(document.getShape('title')).toMatchObject({ text: 'My Diagram' });
      expect(document.getShape('box')).toMatchObject({ x: 200, y: 80, width: 60, height: 60, fill: '#3366ff' });
      expect(lines.filter(line => line.startsWith('error:'))).toEqual([
        'error: cannot group a container into its own descendant: markers',
        'error: undo not allowed after io command',
      ]);
      expect(lines.filter(line => line.startsWith('warning:'))).toEqual(['warning: assigned id rect1 to unnamed <rect>']);
      expect(await readFile(workspace.file('other.svg'), 'utf8')).toBe(external);
    } else {
      expect(document.getShape('flowchart').children.map(shape => shape.id)).toEqual(['node1', 'node2', 'arrow1']);
      expect(document.getShape('node2').children.map(shape => shape.id)).toEqual(['process', 'process-label']);
      expect(document.getShape('process')).toMatchObject({ x: 520, y: 100, width: 160, height: 60, fill: '#f5a623' });
      expect(document.getShape('process-label')).toMatchObject({ x: 545, y: 135, text: '处理数据 v2' });
      expect(document.getShape('arrow1')).toMatchObject({ x1: 280, y1: 130, x2: 520, y2: 130, stroke: 'black' });
    }
    const reloaded = spawnSync(process.execPath, ['--import', tsx, entry], {
      cwd: workspace.directory, input: 'read ' + name + '\ntree\n', encoding: 'utf8', timeout: 10_000,
    });
    expect(reloaded.error).toBeUndefined();
    expect(reloaded.status, reloaded.stderr + reloaded.stdout).toBe(0);
    expect(reloaded.stderr).toBe('');
    expect(scenario.outputLines(reloaded.stdout)).toEqual([
      'read ' + name + ' (' + document.size + ' elements)', ...new TreeFormatter().format(document).split('\n'),
    ]);
  });
});
