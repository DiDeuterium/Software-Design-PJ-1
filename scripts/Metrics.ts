import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceMetrics } from './metrics/SourceMetrics.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trimEnd();
const args = process.argv.slice(2);
if (args.some(arg => !['--worktree', '--ref'].includes(arg) && args[args.indexOf(arg) - 1] !== '--ref') ||
  args.includes('--worktree') && args.includes('--ref') || args.includes('--ref') && args[args.indexOf('--ref') + 1] === undefined) {
  throw new Error('usage: Metrics.ts [--ref <commit> | --worktree]');
}
const walk = (directory: string): string[] => {
  try { return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.ts') ? [relative(root, path).replace(/\\/gu, '/')] : [];
  }); } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};
type Role = 'core' | 'host' | 'plugins';
const role = (path: string): Role => {
  if (path.startsWith('src/core/')) return 'core';
  if (path.startsWith('src/host/') || path.startsWith('src/bootstrap/') || path.startsWith('src/infrastructure/')) return 'host';
  if (path.startsWith('src/plugins/')) return 'plugins';
  return 'core'; // Phase 1 monolith; compatibility shims are overridden below.
};
const responsibility = (path: string): string => {
  if (path.includes('/legacy/')) return '默认插件内保留的 Phase 1 模型、兼容行为及旧 API 实现';
  if (path.includes('/public/')) return '公开领域、扩展点或服务契约';
  if (path.includes('/document/')) return '文档结构、不变量与独立快照';
  if (path.includes('/session/') || path.includes('/history/')) return '串行事务、会话与撤销重做';
  if (path.includes('/svg/')) return '通用 XML/SVG 解析与编码';
  if (path.includes('/presentation/') || path.includes('/tree/')) return '展示与树标签组合';
  if (path.includes('/registry/')) return '插件原子注册与清单校验';
  if (path.includes('/attributes/')) return '属性处理器分发与缺省回退';
  if (path.includes('/shapes/')) return '图形领域行为或 provider 查询';
  if (path.includes('/plugins/')) return '默认图形/命令插件实现';
  if (path.includes('/host/') || path.includes('/bootstrap/')) return '宿主装配、终端或 IO 适配';
  return 'Phase 1 命令、解析或领域协作';
};
const snapshot = (ref: string, worktree = false) => {
  const commit = git('rev-parse', `${ref}^{commit}`);
  const paths = worktree ? [...walk(resolve(root, 'src')), ...walk(resolve(root, 'extensions/svg-tools/src'))] :
    git('ls-tree', '-r', '--name-only', commit, '--', 'src', 'extensions/svg-tools/src').split('\n').filter(path => path.endsWith('.ts'));
  const digest = createHash('sha256');
  const files = paths.sort().map(path => {
    const text = worktree ? readFileSync(resolve(root, path), 'utf8') : execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8' });
    digest.update(path + '\0' + text + '\0');
    const compatibility = text.startsWith('/** Phase 1 compatibility export;');
    return { path, role: path.startsWith('extensions/') ? 'vscode' as const : compatibility ? 'plugins' as const : role(path),
      responsibility: compatibility ? '旧路径兼容导出；不被新 CLI 内核导入' : responsibility(path), ...sourceMetrics(path, text) };
  });
  const totals = (['core', 'host', 'plugins', 'vscode'] as const).map(category => {
    const group = files.filter(file => file.role === category);
    return { role: category, files: group.length, lines: group.reduce((sum, file) => sum + file.lines, 0),
      complexity: group.reduce((sum, file) => sum + file.complexity, 0) };
  });
  return { revision: worktree ? `working-tree based on ${commit} (preview, not a historical delivery)` : commit,
    contentSha256: digest.digest('hex'), files, totals };
};
const baseline = snapshot('final');
const candidate = snapshot(args.includes('--ref') ? args[args.indexOf('--ref') + 1]! : 'HEAD', args.includes('--worktree'));
const graph = (data: ReturnType<typeof snapshot>): string => {
  const cli = data.files.filter(file => file.role !== 'vscode'); const paths = new Map(cli.map(file => [file.path, file]));
  const module = (path: string): string => path.startsWith('src/plugins/') ? path.split('/').slice(0, 3).join('/') :
    path.split('/').slice(0, path.startsWith('src/core/') || path.startsWith('src/host/') ? 3 : 2).join('/');
  const modules = [...new Set(cli.map(file => module(file.path)))].sort();
  const edges = new Set<string>();
  for (const file of cli) for (const imported of file.dependencies) {
    if (!imported.startsWith('.')) continue;
    const target = posix.normalize(posix.join(posix.dirname(file.path), imported)).replace(/\.js$/u, '.ts');
    if (paths.has(target) && module(target) !== module(file.path)) edges.add(`M${modules.indexOf(module(file.path))} --> M${modules.indexOf(module(target))}`);
  }
  return ['@startuml', `title Generated CLI dependencies: ${data.revision}`,
    ...modules.map((name, i) => `component "${name}" as M${i}`), ...[...edges].sort(), '@enduml', ''].join('\n');
};
const directory = resolve(root, 'docs/metrics'); mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'metrics.json'), JSON.stringify({ method: 'physical LOC; sum of per-function McCabe decisions + 1; nested functions counted separately',
  baseline, candidate }, null, 2) + '\n');
writeFileSync(resolve(directory, 'before.puml'), graph(baseline));
writeFileSync(resolve(directory, 'after.puml'), graph(candidate));
const table = ['| 类别 | final 文件/行数/复杂度 | 候选文件/行数/复杂度 | 复杂度增量 |', '| --- | --- | --- | --- |'];
for (const current of candidate.totals) {
  const previous = baseline.totals.find(item => item.role === current.role)!;
  table.push(`| ${current.role} | ${previous.files} / ${previous.lines} / ${previous.complexity} | ${current.files} / ${current.lines} / ${current.complexity} | ${current.complexity - previous.complexity} |`);
}
writeFileSync(resolve(directory, 'report.md'), ['# 自动生成的 CLI 重构指标', '', `基线：${baseline.revision}`, '',
  `候选：${candidate.revision}`, '', `源文件内容摘要：${candidate.contentSha256}`, '', ...table, '',
  '## 候选文件清单与职责', '', '| 文件 | 类别 | 行数 | 复杂度 | 职责 |', '| --- | --- | --- | --- | --- |',
  ...candidate.files.map(file => `| ${file.path} | ${file.role} | ${file.lines} | ${file.complexity} | ${file.responsibility} |`), ''].join('\n'));
console.log(`Metrics generated: ${candidate.files.length} files; ${candidate.revision}`);
