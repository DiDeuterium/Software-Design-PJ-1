import { CommandDispatcher } from '../cli/CommandDispatcher.js';
import { Repl } from '../cli/Repl.js';
import { EditorSession } from '../application/session/EditorSession.js';
import { TreeFormatter } from '../presentation/TreeFormatter.js';
import { ShowFormatter } from '../presentation/ShowFormatter.js';
import { HelpFormatter } from '../presentation/HelpFormatter.js';

// Composition only: no shape, document or history rules in the entry point.
const dispatcher = new CommandDispatcher(new EditorSession(), new TreeFormatter(), new ShowFormatter(), new HelpFormatter());
const repl = new Repl(dispatcher, process.stdin, process.stdout);
process.exitCode = await repl.run();
