import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class DeleteCommand extends EditCommand {
  private readonly id: string;

  public constructor(id: string) { super(); this.id = id; }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const label = `${shape.type}#${shape.id}`;
    const parent = shape.parent;
    const origin = parent === undefined ? 'svg' : `${parent.type}#${parent.id}`;
    document.delete(this.id);
    return new CommandResult(`${label} deleted`, [], `${label} restored into ${origin}`);
  }
}
