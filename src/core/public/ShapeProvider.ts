import type { AttributeValue, ShapeNode, ShapeView } from './Shape.js';

/** Parsed data, independent of fast-xml-parser and of the XML writer. */
export interface ShapeInput {
  readonly id: string;
  readonly tag: string;
  readonly attributes: readonly (readonly [string, string])[];
  readonly text: string;
  readonly children: readonly ShapeNode[];
}

export interface ShapeEncoding {
  readonly tag: string;
  /** Ordered attributes, including id; writer owns escaping and whitespace. */
  readonly attributes: readonly (readonly [string, AttributeValue])[];
  readonly text?: string;
}

export interface ShapePresentation {
  readonly treeTitle: string;
  readonly treeDetails: string;
  readonly showDetails: readonly string[];
}

/** Optional operation messages replace fixed-type feedback Visitors. */
export interface ShapeOperation {
  readonly name: 'create' | 'delete' | 'move' | 'scale' | 'set';
  readonly before: ShapeView | undefined;
  readonly after: ShapeView | undefined;
  readonly arguments: readonly AttributeValue[];
}

export interface ShapeFeedback {
  readonly message: string;
  readonly undoMessage: string;
}

export interface ShapeProvider {
  readonly name: string;
  readonly createSyntax: string;
  create(id: string, parameters: readonly AttributeValue[]): ShapeNode;
  read(input: ShapeInput): ShapeNode;
  write(shape: ShapeView): ShapeEncoding;
  present(shape: ShapeView): ShapePresentation;
  feedback(operation: ShapeOperation): ShapeFeedback | undefined;
}
