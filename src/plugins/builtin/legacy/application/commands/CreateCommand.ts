import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import { ShapeFactory } from '../../domain/factory/ShapeFactory.js';
import type { ShapeParameter } from '../../domain/factory/ShapeParameter.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';

export class CreateCommand extends EditCommand {
  private readonly type: string;
  private readonly id: string;
  private readonly parameters: readonly ShapeParameter[];
  private readonly parentId: string | undefined;
  private readonly factory: ShapeFactory;

  public constructor(type: string, id: string, parameters: readonly ShapeParameter[] = [], parentId?: string, factory = new ShapeFactory()) {
    super();
    this.type = type;
    this.id = id;
    this.parameters = Object.freeze([...parameters]);
    this.parentId = parentId;
    this.factory = factory;
  }

  public override apply(document: SvgDocument): CommandResult {
    const shape = this.factory.create(this.type, this.id, this.parameters);
    document.insert(shape, this.parentId);
    const label = `${shape.type}#${shape.id}`;
    const parent = shape.parent;
    const destination = parent === undefined ? '' : ` in ${parent.type}#${parent.id}`;
    return new CommandResult(`${label} created${destination}`, [], `${label} deleted`);
  }
}
