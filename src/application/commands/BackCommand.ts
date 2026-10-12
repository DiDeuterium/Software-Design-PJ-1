import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class BackCommand extends EditCommand {
  private readonly id: string;

  public constructor(id: string) { super(); this.id = id; }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const label = `${shape.type}#${shape.id}`;
    document.back(this.id);
    return new CommandResult(`${label} moved to back`, [], `${label} restored to previous z-order`);
  }
}
