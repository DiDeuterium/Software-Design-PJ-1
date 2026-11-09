/** Ordered own attributes; children are represented separately, never flattened. */
export type AttributeValue = string | number;

export interface ShapeView {
  readonly id: string;
  readonly type: string;
  readonly isContainer: boolean;
  readonly attributes: readonly (readonly [string, AttributeValue])[];
  readonly children: readonly ShapeView[];
}

/** Public domain protocol. Implementations keep their fields private. */
export interface ShapeNode extends ShapeView {
  readonly children: readonly ShapeNode[];
  /** Detached, deeply immutable data: no setters, owners or mutable references. */
  view(): ShapeView;
  clone(): ShapeNode;
  getAttribute(name: string): AttributeValue | undefined;
  set(name: string, value: AttributeValue): void;
  move(dx: number, dy: number): void;
  scale(factor: number): void;
  /** Pure precondition used before structural commit and snapshot restoration. */
  validateChildren(candidate: readonly ShapeNode[]): void;
  /** Detached replacement for a validated structural draft; preserves subtype. */
  withChildren(candidate: readonly ShapeNode[]): ShapeNode;
  /** Composite ownership policy, independent of the type name. */
  assertUngroup(): void;
}
