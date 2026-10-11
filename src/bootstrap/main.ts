import { CommandDispatcher } from '../cli/CommandDispatcher.js';
import { Repl } from '../cli/Repl.js';

// Composition only: no shape, document or history rules in the entry point.
const repl = new Repl(new CommandDispatcher(), process.stdin, process.stdout);
process.exitCode = await repl.run();
