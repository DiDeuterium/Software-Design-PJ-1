import { createRuntime } from '../host/Runtime.js';
import { Repl } from '../host/Repl.js';

// Composition only: no shape, document or history rules in the entry point.
const runtime = await createRuntime({ report: message => process.stderr.write(`error: ${message}\n`) });
const repl = new Repl(runtime.dispatcher, process.stdin, process.stdout);
process.exitCode = await repl.run();
