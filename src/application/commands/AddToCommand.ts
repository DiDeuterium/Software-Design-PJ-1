import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class AddToCommand extends EditCommand {
  private readonly containerId: string;
  private readonly id: string;

  public constructor(containerId: string, id: string) {
    super(); this.containerId = containerId; this.id = id;
  }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const label = `${shape.type}#${shape.id}`;
    const parent = shape.parent;
    const origin = parent === undefined ? 'svg' : `${parent.type}#${parent.id}`;
    document.addTo(this.containerId, this.id);
    return new CommandResult(`${label} moved into g#${this.containerId}`, [], `${label} restored into ${origin}`);
  }
}
