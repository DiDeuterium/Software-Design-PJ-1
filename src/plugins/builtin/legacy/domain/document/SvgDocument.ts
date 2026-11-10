import { Shape } from '../shapes/Shape.js';
import { GroupShape } from '../shapes/GroupShape.js';
import { ShapeValidation } from '../shapes/ShapeValidation.js';
import { treeChildren, treeEdit, treeOwner } from '../shapes/TreeAccess.js';
import { DocumentSnapshot } from './DocumentSnapshot.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private rootsValue: readonly Shape[] = Object.freeze([]);
  private index = new Map<string, Shape>();
  private readonly ownership = {};

  public constructor(width = 800, height = 600, roots: readonly Shape[] = []) {
    this.widthValue = this.canvasDimension(width, 'width');
    this.heightValue = this.canvasDimension(height, 'height');
    for (const root of roots) this.assertDetached(root);
    this.commit(roots);
  }

  public get width(): number { return this.widthValue; }
  public get height(): number { return this.heightValue; }
  public get roots(): readonly Shape[] { return this.rootsValue; }
  public get size(): number { return this.index.size; }

  public find(id: string): Shape | undefined { return this.index.get(id); }

  public getShape(id: string): Shape {
    const shape = this.find(id);
    if (shape === undefined) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  public resize(width: number, height: number): void {
    const nextWidth = this.canvasDimension(width, 'width');
    const nextHeight = this.canvasDimension(height, 'height');
    this.widthValue = nextWidth;
    this.heightValue = nextHeight;
  }

  public insert(shape: Shape, parentId?: string, position?: number): void {
    const parent = parentId === undefined ? undefined : this.getContainer(parentId);
    this.assertDetached(shape);
    const siblings = this.siblings(parent);
    const insertionIndex = position ?? siblings.length;
    if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > siblings.length) {
      throw new Error(`invalid insertion index: ${insertionIndex}`);
    }
    const next = [...siblings.slice(0, insertionIndex), shape, ...siblings.slice(insertionIndex)];
    this.replaceSiblings(parent, next);
  }

  public delete(id: string): Shape {
    const shape = this.getShape(id);
    const parent = shape.parent?.asGroup();
    this.replaceSiblings(parent, this.siblings(parent).filter(sibling => sibling !== shape));
    return shape;
  }

  public move(id: string, dx: number, dy: number): void { this.getShape(id).move(dx, dy); }
  public scale(id: string, factor: number): void { this.getShape(id).scale(factor); }
  public set(id: string, attribute: string, value: string | number): void { this.getShape(id).set(attribute, value); }

  public addTo(containerId: string, id: string): void {
    const target = this.getContainer(containerId);
    const shape = this.getShape(id);
    if (shape === target || this.isAncestor(shape, target)) {
      throw new Error(`cannot add a container into itself or its descendant: ${id}`);
    }
    const source = shape.parent?.asGroup();
    const overrides = new Map<GroupShape, readonly Shape[]>();
    let roots = this.rootsValue;
    const remaining = this.siblings(source).filter(sibling => sibling !== shape);
    if (source === undefined) roots = remaining;
    else overrides.set(source, remaining);
    const targetChildren = overrides.get(target) ?? target.children;
    overrides.set(target, [...targetChildren, shape]);
    this.commit(roots, overrides);
  }

  public front(id: string): void { this.reorder(id, true); }
  public back(id: string): void { this.reorder(id, false); }

  public group(newId: string, ids: readonly string[]): GroupShape {
    ShapeValidation.id(newId);
    if (this.index.has(newId)) throw new Error(`id already exists: ${newId}`);
    if (ids.length === 0) throw new Error('group requires at least one shape');
    const selectedIds = new Set<string>();
    const selected = ids.map(id => {
      if (selectedIds.has(id)) throw new Error(`duplicate group target: ${id}`);
      selectedIds.add(id);
      return this.getShape(id);
    });
    for (const container of selected) {
      if (selected.some(other => other !== container && this.isAncestor(container, other))) {
        throw new Error(`cannot group a container into its own descendant: ${container.id}`);
      }
    }
    const selectedSet = new Set(selected);
    const ordered = this.preorder().filter(shape => selectedSet.has(shape));
    const first = ordered[0];
    if (first === undefined) throw new Error('group requires at least one shape');
    const commonParent = first.parent?.asGroup();
    const sameParent = ordered.every(shape => shape.parent === first.parent);
    const destination = sameParent ? commonParent : undefined;
    const originalDestination = this.siblings(destination);
    const anchor = sameParent ? first : this.topRoot(first);
    const insertionIndex = originalDestination.indexOf(anchor);
    const overrides = new Map<GroupShape, readonly Shape[]>();
    let roots = this.rootsValue;
    for (const shape of ordered) {
      const source = shape.parent?.asGroup();
      if (source === undefined) roots = roots.filter(root => root !== shape);
      else overrides.set(source, (overrides.get(source) ?? source.children).filter(child => child !== shape));
    }
    const group = new GroupShape(newId);
    overrides.set(group, ordered);
    const destinationChildren = destination === undefined ? roots : overrides.get(destination) ?? destination.children;
    const next = [...destinationChildren.slice(0, insertionIndex), group, ...destinationChildren.slice(insertionIndex)];
    if (destination === undefined) roots = next;
    else overrides.set(destination, next);
    this.commit(roots, overrides);
    return group;
  }

  public ungroup(id: string): GroupShape {
    const group = this.getContainer(id, false);
    const parent = group.parent?.asGroup();
    if (parent === undefined) throw new Error(`cannot ungroup top-level container: ${id}`);
    const position = parent.children.indexOf(group);
    const siblings = [...parent.children.slice(0, position), ...group.children, ...parent.children.slice(position + 1)];
    this.commit(this.rootsValue, new Map([[parent, siblings], [group, []]]));
    return group;
  }

  public clone(): SvgDocument {
    return new SvgDocument(this.widthValue, this.heightValue, this.rootsValue.map(shape => shape.clone()));
  }

  public snapshot(): DocumentSnapshot { return new DocumentSnapshot(this); }

  public restore(snapshot: DocumentSnapshot): void {
    this.commit(snapshot.copyRoots());
    this.widthValue = snapshot.width;
    this.heightValue = snapshot.height;
  }

  private canvasDimension(value: number, attribute: string): number {
    const result = ShapeValidation.number(value);
    if (result <= 0) throw new Error(`invalid value for ${attribute}: ${value}`);
    return result;
  }

  private assertDetached(shape: Shape): void {
    if (shape[treeOwner]() !== undefined) throw new Error(`shape already belongs to a document: ${shape.id}`);
    if (shape.parent !== undefined) throw new Error(`shape already has a parent: ${shape.id}`);
  }

  private getContainer(id: string, forInsertion = true): GroupShape {
    const shape = this.find(id);
    if (shape === undefined) {
      throw new Error(`${forInsertion ? 'no such container' : 'no such shape'}: ${id}`);
    }
    const group = shape.asGroup();
    if (group === undefined) throw new Error(`not a container: ${id}`);
    return group;
  }

  private siblings(parent: GroupShape | undefined): readonly Shape[] {
    return parent === undefined ? this.rootsValue : parent.children;
  }

  private replaceSiblings(parent: GroupShape | undefined, siblings: readonly Shape[]): void {
    if (parent === undefined) this.commit(siblings);
    else this.commit(this.rootsValue, new Map([[parent, siblings]]));
  }

  private reorder(id: string, toFront: boolean): void {
    const shape = this.getShape(id);
    const parent = shape.parent?.asGroup();
    const others = this.siblings(parent).filter(sibling => sibling !== shape);
    this.replaceSiblings(parent, toFront ? [...others, shape] : [shape, ...others]);
  }

  private isAncestor(ancestor: Shape, shape: Shape): boolean {
    for (let parent = shape.parent; parent !== undefined; parent = parent.parent) {
      if (parent === ancestor) return true;
    }
    return false;
  }

  private topRoot(shape: Shape): Shape {
    let result = shape;
    while (result.parent !== undefined) result = result.parent;
    return result;
  }

  private preorder(): readonly Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => {
      result.push(shape);
      for (const child of shape.children) visit(child);
    };
    for (const root of this.rootsValue) visit(root);
    return result;
  }

  /** Validate the whole candidate tree before changing any live object or index. */
  private commit(roots: readonly Shape[], overrides = new Map<GroupShape, readonly Shape[]>()): void {
    const nextIndex = new Map<string, Shape>();
    const parents = new Map<Shape, Shape | undefined>();
    const visit = (shape: Shape, parent: Shape | undefined): void => {
      if (parents.has(shape)) throw new Error(`invalid tree: repeated or cyclic shape: ${shape.id}`);
      if (nextIndex.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      const owner = shape[treeOwner]();
      if (owner !== undefined && owner !== this.ownership) {
        throw new Error(`shape already belongs to a document: ${shape.id}`);
      }
      parents.set(shape, parent);
      nextIndex.set(shape.id, shape);
      const group = shape.asGroup();
      const children = group === undefined ? shape.children : overrides.get(group) ?? group.children;
      for (const child of children) visit(child, shape);
    };
    for (const root of roots) visit(root, undefined);
    const frozenRoots = Object.freeze([...roots]);
    const frozenOverrides = new Map([...overrides].map(([group, children]) => [group, Object.freeze([...children])]));
    const removed = new Set([...this.index.values()].filter(shape => !parents.has(shape)));
    // Removed subtrees remain reusable: only their root loses its parent.
    for (const shape of removed) {
      const oldParent = shape.parent;
      shape[treeEdit](oldParent !== undefined && removed.has(oldParent) ? oldParent : undefined, undefined);
    }
    for (const [group, children] of frozenOverrides) group[treeChildren](children);
    for (const [shape, parent] of parents) shape[treeEdit](parent, this.ownership);
    this.rootsValue = frozenRoots;
    this.index = nextIndex;
  }
}
