import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { ShapeParameter } from '../../domain/factory/ShapeParameter.js';
import { EditCommand } from './EditCommand.js';
import { CommandResult } from './CommandResult.js';
import { AttributeValueReader } from './AttributeValueReader.js';

export class SetCommand extends EditCommand {
  private readonly id: string;
  private readonly attribute: string;
  private readonly value: ShapeParameter;

  public constructor(id: string, attribute: string, value: ShapeParameter) {
    super(); this.id = id; this.attribute = attribute; this.value = value;
  }

  public override apply(document: SvgDocument): CommandResult {
    const shape = document.getShape(this.id);
    const reader = new AttributeValueReader(this.attribute);
    const before = reader.read(shape);
    document.set(this.id, this.attribute, this.value);
    const label = `${shape.type}#${shape.id} updated: ${this.attribute}=`;
    return new CommandResult(label + this.format(reader.read(shape)), [], label + this.format(before));
  }

  private format(value: ShapeParameter | undefined): string {
    if (value === undefined) return '(unset)';
    return this.attribute === 'text' ? JSON.stringify(value) : String(value);
  }
}
