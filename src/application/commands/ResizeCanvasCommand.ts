import { ShapeValidation } from '../../domain/shapes/ShapeValidation.js';
import type { EditorState } from '../session/EditorState.js';
import { DocumentCommand } from './DocumentCommand.js';
import { CommandResult } from './CommandResult.js';

export class ResizeCanvasCommand extends DocumentCommand {
  private readonly width: string | number;
  private readonly height: string | number | undefined;

  public constructor(width: string | number, height?: string | number) {
    super();
    this.width = width;
    this.height = height;
  }

  public override apply(state: EditorState): CommandResult {
    const document = state.getDocument();
    document.resize(ShapeValidation.number(this.width), ShapeValidation.number(this.height ?? document.height));
    return new CommandResult(`canvas resized to ${document.width}x${document.height}`);
  }
}
