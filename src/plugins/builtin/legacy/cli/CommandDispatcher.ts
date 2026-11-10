import type { Command } from '../application/commands/Command.js';
import type { CommandResult } from '../application/commands/CommandResult.js';
import type { EditorSession } from '../application/session/EditorSession.js';
import type { TreeView, ShapeView, HelpView } from '../application/ports/Presentation.js';
import type { FileStore } from '../application/ports/FileStore.js';
import type { SvgCodec } from '../application/ports/SvgCodec.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ResizeCanvasCommand } from '../application/commands/ResizeCanvasCommand.js';
import { CanvasQueryCommand } from '../application/commands/CanvasQueryCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { Tokenizer } from './Tokenizer.js';
import type { Token } from './Token.js';

/** Sole command-name dispatch point; future refactoring: command registration. */
export class CommandDispatcher {
  private readonly session: EditorSession;
  private readonly tokenizer = new Tokenizer();
  private readonly handlers: ReadonlyMap<string, (tokens: readonly Token[]) => Promise<CommandResult>>;

  public constructor(session: EditorSession, tree: TreeView, show: ShapeView, help: HelpView,
    files: FileStore, codec: SvgCodec) {
    this.session = session;
    this.handlers = new Map<string, (tokens: readonly Token[]) => Promise<CommandResult>>([
      ['init', t => this.command(t, 0, 2, 'init [w] [h]', a => new InitCommand(a[0], a[1]))],
      ['canvas', t => this.command(t, 0, 2, 'canvas [w] [h]', a =>
        a.length === 0 ? new CanvasQueryCommand() : new ResizeCanvasCommand(a[0]!, a[1]))],
      ['create', t => this.create(t)],
      ['delete', t => this.command(t, 1, 1, 'delete <id>', a => new DeleteCommand(a[0]!))],
      ['move', t => this.command(t, 3, 3, 'move <id> <dx> <dy>', a => new MoveCommand(a[0]!, a[1]!, a[2]!))],
      ['scale', t => this.command(t, 2, 2, 'scale <id> <factor>', a => new ScaleCommand(a[0]!, a[1]!))],
      ['set', t => this.command(t, 3, 3, 'set <id> <attr> <value>', a => new SetCommand(a[0]!, a[1]!, a[2]!))],
      ['group', t => this.command(t, 2, Infinity, 'group <newGid> <id1> <id2>...', a => new GroupCommand(a[0]!, a.slice(1)))],
      ['ungroup', t => this.command(t, 1, 1, 'ungroup <gid>', a => new UngroupCommand(a[0]!))],
      ['addto', t => this.command(t, 2, 2, 'addto <gid> <id>', a => new AddToCommand(a[0]!, a[1]!))],
      ['front', t => this.command(t, 1, 1, 'front <id>', a => new FrontCommand(a[0]!))],
      ['back', t => this.command(t, 1, 1, 'back <id>', a => new BackCommand(a[0]!))],
      ['tree', t => this.command(t, 0, 1, 'tree [id]', a => new TreeCommand(tree, a[0]))],
      ['show', t => this.command(t, 1, 1, 'show <id>', a => new ShowCommand(show, a[0]!))],
      ['help', t => this.command(t, 0, 0, 'help', () => new HelpCommand(help))],
      ['undo', t => { this.arity(t, 0, 0, 'undo'); return this.session.undo(); }],
      ['redo', t => { this.arity(t, 0, 0, 'redo'); return this.session.redo(); }],
      ['read', t => this.command(t, 1, 1, 'read <file.svg>', a => new ReadCommand(a[0]!, files, codec))],
      ['save', t => this.command(t, 0, 1, 'save [file.svg]', a => new SaveCommand(a[0], files, codec))],
    ]);
  }

  public async dispatch(line: string): Promise<CommandResult | undefined> {
    const tokens = this.tokenizer.tokenize(line);
    const name = tokens[0]?.value;
    if (name === undefined) return undefined;
    const handler = this.handlers.get(name);
    if (handler === undefined) throw new Error(`unknown command: ${name}`);
    return handler(tokens.slice(1));
  }

  private command(tokens: readonly Token[], min: number, max: number, syntax: string,
    build: (args: readonly string[]) => Command): Promise<CommandResult> {
    this.arity(tokens, min, max, syntax);
    return this.session.execute(build(tokens.map(token => token.value)));
  }

  private create(tokens: readonly Token[]): Promise<CommandResult> {
    this.arity(tokens, 2, Infinity, 'create <type> <id> [params] [in <containerId>]');
    // Inspect only parameters, never a type or ID named "in".
    const parameters = tokens.slice(2);
    const marker = parameters.at(-2);
    const hasParent = marker?.value === 'in' && !marker.quoted;
    const parentId = hasParent ? parameters.at(-1)!.value : undefined;
    const values = (hasParent ? parameters.slice(0, -2) : parameters).map(token => token.value);
    return this.session.execute(new CreateCommand(tokens[0]!.value, tokens[1]!.value, values, parentId));
  }

  private arity(tokens: readonly Token[], min: number, max: number, syntax: string): void {
    if (tokens.length < min || tokens.length > max) {
      throw new Error(`invalid arguments. usage: ${syntax}`);
    }
  }

}
