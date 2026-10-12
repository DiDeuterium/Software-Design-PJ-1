import { EditCommand } from '../../../src/application/commands/EditCommand.js';
import type { CommandResult } from '../../../src/application/commands/CommandResult.js';
import type { SvgDocument } from '../../../src/domain/document/SvgDocument.js';

/** Test fixture only: concrete production edit commands are a later milestone. */
export class TestEditCommand extends EditCommand {
  private readonly action: (document: SvgDocument) => CommandResult | Promise<CommandResult>;
  private readonly undoDescription: ((result: CommandResult) => CommandResult) | undefined;

  public constructor(
    action: (document: SvgDocument) => CommandResult | Promise<CommandResult>,
    undoDescription?: (result: CommandResult) => CommandResult,
  ) {
    super();
    this.action = action;
    this.undoDescription = undoDescription;
  }

  public override apply(document: SvgDocument): CommandResult | Promise<CommandResult> {
    return this.action(document);
  }

  public override describeUndo(result: CommandResult): CommandResult {
    return this.undoDescription?.(result) ?? super.describeUndo(result);
  }
}
