import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class GroupCommand extends EditCommand {
  private readonly id: string;
  private readonly targetIds: readonly string[];

  public constructor(id: string, targetIds: readonly string[]) {
    super();
    this.id = id;
    this.targetIds = Object.freeze([...targetIds]);
  }

  public override apply(document: SvgDocument): CommandResult {
    const group = document.group(this.id, this.targetIds);
    const count = group.children.length;
    return new CommandResult(`g#${group.id} created with ${count} children`, [],
      `g#${group.id} removed; ${count} children restored to original parents`);
  }
}
