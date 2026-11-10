import type { DocumentView, EditDocument } from '../../../src/core/public/Document.js';
import type { ShapeNode, ShapeView } from '../../../src/core/public/Shape.js';
import { ContractShape } from './ContractShape.js';

export class ContractDocument implements EditDocument {
  private readonly nodes: readonly ContractShape[];
  public constructor(roots: readonly ContractShape[] = []) { this.nodes = Object.freeze([...roots]); }
  public get width(): number { return 800; }
  public get height(): number { return 600; }
  public get roots(): readonly ContractShape[] { return this.nodes; }
  public get size(): number {
    const count = (nodes: readonly ShapeView[]): number => nodes.reduce((total, node) => total + 1 + count(node.children), 0);
    return count(this.nodes);
  }
  public parentOf(id: string): ContractShape | undefined {
    this.getShape(id);
    const find = (nodes: readonly ContractShape[]): ContractShape | undefined => {
      for (const node of nodes) {
        if (node.children.some(child => child.id === id)) return node;
        const result = find(node.children);
        if (result !== undefined) return result;
      }
      return undefined;
    };
    return find(this.nodes);
  }
  public getShape(id: string): ContractShape {
    const find = (nodes: readonly ContractShape[]): ContractShape | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const child = find(node.children);
        if (child !== undefined) return child;
      }
      return undefined;
    };
    const shape = find(this.nodes);
    if (shape === undefined) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  public clone(): ContractDocument { return new ContractDocument(this.nodes.map(node => node.clone())); }
  public view(): DocumentView {
    const roots = Object.freeze(this.nodes.map(node => node.view()));
    const index = new Map<string, ShapeView>();
    const visit = (shape: ShapeView): void => { index.set(shape.id, shape); shape.children.forEach(visit); };
    roots.forEach(visit);
    const parents = new Map<string, ShapeView>();
    const collect = (shape: ShapeView): void => { shape.children.forEach(child => { parents.set(child.id, shape); collect(child); }); };
    roots.forEach(collect);
    return Object.freeze({ width: this.width, height: this.height, size: this.size, roots,
      parentOf(id: string): ShapeView | undefined { return parents.get(id); }, getShape(id: string): ShapeView {
      const result = index.get(id);
      if (result === undefined) throw new Error(`no such shape: ${id}`);
      return result;
    } });
  }
  public move(id: string, dx: number, dy: number): void { this.getShape(id).move(dx, dy); }
  public scale(id: string, factor: number): void { this.getShape(id).scale(factor); }
  // Structure is intentionally outside this contract harness, never silently stubbed.
  public resize(_width: number, _height: number): never { throw new Error('not used in contract harness'); }
  public insert(_shape: ShapeNode, _parentId?: string): never { throw new Error('not used in contract harness'); }
  public delete(_id: string): never { throw new Error('not used in contract harness'); }
  public addTo(_containerId: string, _id: string): never { throw new Error('not used in contract harness'); }
  public group(_container: ShapeNode, _ids: readonly string[]): never { throw new Error('not used in contract harness'); }
  public ungroup(_id: string): never { throw new Error('not used in contract harness'); }
  public front(_id: string): never { throw new Error('not used in contract harness'); }
  public back(_id: string): never { throw new Error('not used in contract harness'); }
}
