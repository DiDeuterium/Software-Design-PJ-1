import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { ShapeValidation } from '../../domain/shapes/ShapeValidation.js';
import type { ShapeParameter } from '../../domain/factory/ShapeParameter.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';
import { MoveDescription } from './MoveDescription.js';

export class MoveCommand extends EditCommand {
  private readonly id: string;
  private readonly dx: ShapeParameter;
  private readonly dy: ShapeParameter;

  public constructor(id: string, dx: ShapeParameter, dy: ShapeParameter) {
    super(); this.id = id; this.dx = dx; this.dy = dy;
  }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const dx = ShapeValidation.number(this.dx);
    const dy = ShapeValidation.number(this.dy);
    const undoMessage = new MoveDescription(-dx, -dy, true).describe(shape);
    document.move(this.id, dx, dy);
    return new CommandResult(new MoveDescription(dx, dy).describe(shape), [], undoMessage);
  }
}
