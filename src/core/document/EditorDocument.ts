import type { DocumentView, EditDocument } from '../public/Document.js';
import type { ShapeNode, ShapeView } from '../public/Shape.js';
import { ShapeValidation as V } from '../public/ShapeValidation.js';

/** Generic composite document. All structural changes validate before commit. */
export class EditorDocument implements EditDocument {
  private widthValue: number;
  private heightValue: number;
  private nodes: readonly ShapeNode[] = [];
  private index = new Map<string, ShapeNode>();
  private parents = new Map<string, ShapeNode | undefined>();
  private static readonly owners = new WeakMap<ShapeNode, EditorDocument>();

  public constructor(width = 800, height = 600, roots: readonly ShapeNode[] = []) {
    this.widthValue = this.dimension(width, 'width');
    this.heightValue = this.dimension(height, 'height');
    this.commit(roots);
  }
  public get width(): number { return this.widthValue; }
  public get height(): number { return this.heightValue; }
  public get roots(): readonly ShapeNode[] { return this.nodes; }
  public get size(): number { return this.index.size; }
  public getShape(id: string): ShapeNode {
    const shape = this.index.get(id);
    if (shape === undefined) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  public parentOf(id: string): ShapeNode | undefined { this.getShape(id); return this.parents.get(id); }
  public clone(): EditorDocument { return new EditorDocument(this.width, this.height, this.nodes.map(node => node.clone())); }
  public view(): DocumentView {
    const roots = Object.freeze(this.nodes.map(node => node.view()));
    const index = new Map<string, ShapeView>();
    const parents = new Map<string, ShapeView | undefined>();
    const visit = (node: ShapeView, parent?: ShapeView): void => {
      index.set(node.id, node); parents.set(node.id, parent);
      node.children.forEach(child => visit(child, node));
    };
    roots.forEach(root => visit(root));
    const getShape = (id: string): ShapeView => {
      const shape = index.get(id);
      if (shape === undefined) throw new Error(`no such shape: ${id}`);
      return shape;
    };
    return Object.freeze({ width: this.width, height: this.height, size: this.size, roots, getShape,
      parentOf(id: string): ShapeView | undefined { getShape(id); return parents.get(id); } });
  }
  public resize(width: number, height: number): void {
    const w = this.dimension(width, 'width'); const h = this.dimension(height, 'height');
    this.widthValue = w; this.heightValue = h;
  }
  public insert(shape: ShapeNode, parentId?: string): void {
    if (EditorDocument.owners.has(shape)) throw new Error(`shape already belongs to a document: ${shape.id}`);
    const parent = parentId === undefined ? undefined : this.container(parentId);
    const overrides = new Map<ShapeNode, readonly ShapeNode[]>();
    if (parent === undefined) this.commit([...this.nodes, shape]);
    else { overrides.set(parent, [...parent.children, shape]); this.commit(this.nodes, overrides); }
  }
  public delete(id: string): void {
    const shape = this.getShape(id); const parent = this.parentOf(id);
    const remaining = this.siblings(parent).filter(child => child !== shape);
    this.commit(parent === undefined ? remaining : this.nodes,
      parent === undefined ? new Map() : new Map([[parent, remaining]]));
  }
  public move(id: string, dx: number, dy: number): void { this.getShape(id).move(dx, dy); }
  public scale(id: string, factor: number): void { this.getShape(id).scale(factor); }
  public addTo(containerId: string, id: string): void {
    const target = this.container(containerId); const shape = this.getShape(id);
    if (shape === target || this.ancestor(shape, target)) {
      throw new Error(`cannot add a container into itself or its descendant: ${id}`);
    }
    const source = this.parentOf(id);
    const remaining = this.siblings(source).filter(child => child !== shape);
    const overrides = new Map<ShapeNode, readonly ShapeNode[]>();
    if (source !== undefined) overrides.set(source, remaining);
    overrides.set(target, [...(overrides.get(target) ?? target.children), shape]);
    this.commit(source === undefined ? remaining : this.nodes, overrides);
  }
  public group(container: ShapeNode, ids: readonly string[]): void {
    V.id(container.id);
    if (this.index.has(container.id)) throw new Error(`id already exists: ${container.id}`);
    if (!container.isContainer) throw new Error(`not a container: ${container.id}`);
    if (ids.length === 0) throw new Error('group requires at least one shape');
    const selected = new Set<ShapeNode>();
    for (const id of ids) {
      const shape = this.getShape(id);
      if (selected.has(shape)) throw new Error(`duplicate group target: ${id}`);
      selected.add(shape);
    }
    for (const shape of selected) {
      if ([...selected].some(other => shape !== other && this.ancestor(shape, other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const ordered = [...this.index.values()].filter(shape => selected.has(shape));
    const first = ordered[0]!; const firstParent = this.parentOf(first.id);
    const sameParent = ordered.every(shape => this.parentOf(shape.id) === firstParent);
    const destination = sameParent ? firstParent : undefined;
    let anchor = first;
    if (!sameParent) while (this.parentOf(anchor.id) !== undefined) anchor = this.parentOf(anchor.id)!;
    const position = this.siblings(destination).indexOf(anchor);
    const overrides = new Map<ShapeNode, readonly ShapeNode[]>();
    let roots = this.nodes;
    for (const shape of ordered) {
      const parent = this.parentOf(shape.id);
      if (parent === undefined) roots = roots.filter(child => child !== shape);
      else overrides.set(parent, (overrides.get(parent) ?? parent.children).filter(child => child !== shape));
    }
    overrides.set(container, ordered);
    const siblings = destination === undefined ? roots : overrides.get(destination) ?? destination.children;
    const next = [...siblings.slice(0, position), container, ...siblings.slice(position)];
    if (destination === undefined) roots = next;
    else overrides.set(destination, next);
    this.commit(roots, overrides);
  }
  public ungroup(id: string): void {
    const shape = this.container(id, false); shape.assertUngroup();
    const parent = this.parentOf(id);
    if (parent === undefined) throw new Error(`cannot ungroup top-level container: ${id}`);
    const position = parent.children.indexOf(shape);
    this.commit(this.nodes, new Map([[parent,
      [...parent.children.slice(0, position), ...shape.children, ...parent.children.slice(position + 1)]]]));
  }
  public front(id: string): void { this.reorder(id, true); }
  public back(id: string): void { this.reorder(id, false); }
  private reorder(id: string, front: boolean): void {
    const shape = this.getShape(id); const parent = this.parentOf(id);
    const remaining = this.siblings(parent).filter(child => child !== shape);
    const next = front ? [...remaining, shape] : [shape, ...remaining];
    this.commit(parent === undefined ? next : this.nodes, parent === undefined ? new Map() : new Map([[parent, next]]));
  }
  private siblings(parent?: ShapeNode): readonly ShapeNode[] { return parent?.children ?? this.nodes; }
  private ancestor(candidate: ShapeNode, node: ShapeNode): boolean {
    let parent = this.parentOf(node.id);
    while (parent !== undefined) { if (parent === candidate) return true; parent = this.parentOf(parent.id); }
    return false;
  }
  private container(id: string, insertion = true): ShapeNode {
    const shape = this.index.get(id);
    if (shape === undefined) throw new Error(`${insertion ? 'no such container' : 'no such shape'}: ${id}`);
    if (!shape.isContainer) throw new Error(`not a container: ${id}`);
    return shape;
  }
  private dimension(value: number, attribute: string): number {
    const result = V.number(value);
    if (result <= 0) throw new Error(`invalid value for ${attribute}: ${value}`);
    return result;
  }
  private commit(roots: readonly ShapeNode[], overrides = new Map<ShapeNode, readonly ShapeNode[]>()): void {
    const seen = new Set<ShapeNode>(); const ids = new Set<string>();
    const build = (node: ShapeNode): ShapeNode => {
      if (seen.has(node)) throw new Error(`invalid tree: repeated or cyclic shape: ${node.id}`);
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      const owner = EditorDocument.owners.get(node);
      if (owner !== undefined && owner !== this) throw new Error(`shape already belongs to a document: ${node.id}`);
      V.id(node.id); ids.add(node.id); seen.add(node);
      const children = overrides.get(node) ?? node.children;
      node.validateChildren(children);
      const next = children.map(build);
      if (overrides.has(node) || next.some((child, i) => child !== node.children[i])) return node.withChildren(next);
      return node;
    };
    const nextRoots = roots.map(build);
    const index = new Map<string, ShapeNode>(); const parents = new Map<string, ShapeNode | undefined>();
    const visit = (node: ShapeNode, parent?: ShapeNode): void => {
      if (index.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      node.validateChildren(node.children);
      index.set(node.id, node); parents.set(node.id, parent);
      node.children.forEach(child => visit(child, node));
    };
    nextRoots.forEach(root => visit(root));
    for (const node of this.index.values()) EditorDocument.owners.delete(node);
    for (const node of index.values()) EditorDocument.owners.set(node, this);
    this.nodes = Object.freeze(nextRoots); this.index = index; this.parents = parents;
  }
}
