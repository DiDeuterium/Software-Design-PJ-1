import type { ShapeProvider } from './ShapeProvider.js';
import type { Command } from './Command.js';
import type { TreeDecorator } from './TreeDecorator.js';
import type { AttributeHandler } from './AttributeHandler.js';

/** Committed entries only; consumed at invocation time, not during activation. */
export interface Extensions {
  readonly shapes: readonly ShapeProvider[];
  readonly commands: readonly Command[];
  readonly decorators: readonly TreeDecorator[];
  readonly attributes: readonly AttributeHandler[];
}
