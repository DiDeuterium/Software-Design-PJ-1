import type { CommandOutput, Session } from './Session.js';
import type { Extensions } from './Extensions.js';
import type { AttributeWriter } from './AttributeHandler.js';

export interface CommandToken {
  readonly value: string;
  readonly quoted: boolean;
}

export interface CommandContext {
  readonly session: Session;
  readonly workingDirectory: string;
  readonly extensions: Extensions;
  readonly attributes: AttributeWriter;
}

export interface Command {
  readonly name: string;
  readonly syntax: string;
  /** Owned by the plugin; built-in layout will retain final's exact bytes. */
  readonly help: readonly string[];
  run(tokens: readonly CommandToken[], context: CommandContext): Promise<CommandOutput>;
}
