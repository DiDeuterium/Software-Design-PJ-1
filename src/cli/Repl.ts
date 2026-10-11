import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from './CommandDispatcher.js';

/** Owns terminal IO only; editing and history belong to application. */
export class Repl {
  private readonly dispatcher: CommandDispatcher;
  private readonly input: Readable;
  private readonly output: Writable;

  public constructor(
    dispatcher: CommandDispatcher,
    input: Readable,
    output: Writable,
  ) {
    this.dispatcher = dispatcher;
    this.input = input;
    this.output = output;
  }

  public async run(): Promise<number> {
    const reader = createInterface({ input: this.input, output: this.output });
    let exitCode = 0;

    // Interactive Ctrl+C closes the loop; piped scripts finish on EOF.
    reader.on('SIGINT', () => reader.close());
    reader.setPrompt('svg> ');
    this.output.write('svg-editor 0.1 — CLI scaffold (commands pending)\n');
    reader.prompt();

    try {
      for await (const line of reader) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
          try {
            this.dispatcher.dispatch(line);
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'command failed';
            this.output.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`);
            exitCode = 1;
          }
        }
        reader.prompt();
      }
    } finally {
      reader.close();
    }

    return exitCode;
  }
}
