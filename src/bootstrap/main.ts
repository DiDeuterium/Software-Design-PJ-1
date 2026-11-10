import { createRuntime } from '../host/Runtime.js';
import { Repl } from '../host/Repl.js';

// Composition only: no shape, document or history rules in the entry point.
const args = process.argv.slice(2);
const configFile = args.length === 2 && args[0] === '--config' ? args[1] : undefined;
if (args.length !== 0 && configFile === undefined) process.stderr.write('error: usage: svg-editor [--config <file>]\n');
const runtime = await createRuntime({ ...(configFile === undefined ? {} : { configFile }),
  report: message => process.stderr.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`) });
const repl = new Repl(runtime.dispatcher, process.stdin, process.stdout);
process.exitCode = await repl.run();
