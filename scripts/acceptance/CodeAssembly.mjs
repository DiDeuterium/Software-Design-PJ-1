import { readFileSync } from 'node:fs';
import { createRuntime } from '../../dist/host/Runtime.js';
import { Repl } from '../../dist/host/Repl.js';
import StatsPlugin from '../../dist/plugins/command-stats/StatsPlugin.js';
import DirPlugin from '../../dist/plugins/command-dir/DirPlugin.js';
import BoxPlugin from '../../dist/plugins/shape-box/BoxPlugin.js';
import TreeStarPlugin from '../../dist/plugins/tree-star/TreeStarPlugin.js';

// Test composition root A, deliberately explicit; no change to the generic loader.
const entries = [ ['command-stats', StatsPlugin], ['command-dir', DirPlugin], ['shape-box', BoxPlugin], ['tree-star', TreeStarPlugin] ];
const plugins = process.argv.includes('--builtins-only') ? [] : entries.map(([directory, Plugin]) => ({
  manifest: JSON.parse(readFileSync(new URL(`../../dist/plugins/${directory}/package.json`, import.meta.url), 'utf8')),
  plugin: new Plugin(),
}));
const runtime = await createRuntime({ plugins, report: message => process.stderr.write(`error: ${message}\n`) });
process.exitCode = await new Repl(runtime.dispatcher, process.stdin, process.stdout).run();
