import { SvgDocument } from '../../domain/document/SvgDocument.js';
import { ShapeValidation } from '../../domain/shapes/ShapeValidation.js';
import type { EditorState } from '../session/EditorState.js';
import { DocumentCommand } from './DocumentCommand.js';
import { CommandResult } from './CommandResult.js';

export class InitCommand extends DocumentCommand {
  private readonly width: string | number;
  private readonly height: string | number;

  public constructor(width: string | number = 800, height: string | number = 600) {
    super();
    this.width = width;
    this.height = height;
  }

  public override apply(state: EditorState): CommandResult {
    const document = new SvgDocument(ShapeValidation.number(this.width), ShapeValidation.number(this.height));
    state.replaceDocument(document);
    return new CommandResult(`canvas ${document.width}x${document.height} created`);
  }
}
