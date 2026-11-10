import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { ShapeValidation } from '../../domain/shapes/ShapeValidation.js';
import type { ShapeParameter } from '../../domain/factory/ShapeParameter.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class ScaleCommand extends EditCommand {
  private readonly id: string;
  private readonly factor: ShapeParameter;

  public constructor(id: string, factor: ShapeParameter) { super(); this.id = id; this.factor = factor; }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const factor = ShapeValidation.factor(ShapeValidation.number(this.factor));
    document.scale(this.id, factor);
    const label = `${shape.type}#${shape.id}`;
    return new CommandResult(`${label} scaled by ${factor}`, [], `${label} restored after scaling`);
  }
}
