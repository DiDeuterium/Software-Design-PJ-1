import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class UngroupCommand extends EditCommand {
  private readonly id: string;

  public constructor(id: string) { super(); this.id = id; }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const count = shape.children.length;
    const parent = shape.parent;
    document.ungroup(this.id);
    const destination = parent === undefined ? 'svg' : `${parent.type}#${parent.id}`;
    return new CommandResult(`g#${this.id} ungrouped; ${count} children promoted to ${destination}`, [],
      `g#${this.id} restored with ${count} children in ${destination}`);
  }
}
