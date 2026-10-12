import type { Shape } from '../shapes/Shape.js';
import { RectShape } from '../shapes/RectShape.js';
import { CircleShape } from '../shapes/CircleShape.js';
import { EllipseShape } from '../shapes/EllipseShape.js';
import { LineShape } from '../shapes/LineShape.js';
import { TextShape } from '../shapes/TextShape.js';
import { GroupShape } from '../shapes/GroupShape.js';
import { ShapeValidation } from '../shapes/ShapeValidation.js';
import type { ShapeParameter } from './ShapeParameter.js';

/** The sole shape-name dispatch point; future refactoring: provider registration. */
export class ShapeFactory {
  private readonly builders = new Map<string, (id: string, parameters: readonly ShapeParameter[]) => Shape>([
    ['rect', this.createRect.bind(this)],
    ['circle', this.createCircle.bind(this)],
    ['ellipse', this.createEllipse.bind(this)],
    ['line', this.createLine.bind(this)],
    ['text', this.createText.bind(this)],
    ['g', this.createGroup.bind(this)],
  ]);

  public create(type: string, id: string, parameters: readonly ShapeParameter[] = []): Shape {
    const build = this.builders.get(type);
    if (build === undefined) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return build(id, parameters);
  }

  private arity(parameters: readonly ShapeParameter[], min: number, max: number, syntax: string): void {
    if (parameters.length < min || parameters.length > max) {
      throw new Error(`invalid arguments. usage: ${syntax} [in <containerId>]`);
    }
  }

  private parameter(parameters: readonly ShapeParameter[], index: number): ShapeParameter {
    const value = parameters[index];
    if (value === undefined) throw new Error('invalid arguments. usage: create <type> <id> [params]');
    return value;
  }

  private number(parameters: readonly ShapeParameter[], index: number): number {
    return ShapeValidation.number(this.parameter(parameters, index));
  }

  private style<T extends Shape>(shape: T, attribute: string, value: ShapeParameter | undefined): T {
    if (value !== undefined) shape.set(attribute, value);
    return shape;
  }

  private createRect(id: string, p: readonly ShapeParameter[]): RectShape {
    this.arity(p, 4, 5, 'create rect <id> <x> <y> <w> <h> [fill]');
    return this.style(new RectShape(id, this.number(p, 0), this.number(p, 1), this.number(p, 2), this.number(p, 3)), 'fill', p[4]);
  }

  private createCircle(id: string, p: readonly ShapeParameter[]): CircleShape {
    this.arity(p, 3, 4, 'create circle <id> <cx> <cy> <r> [fill]');
    return this.style(new CircleShape(id, this.number(p, 0), this.number(p, 1), this.number(p, 2)), 'fill', p[3]);
  }

  private createEllipse(id: string, p: readonly ShapeParameter[]): EllipseShape {
    this.arity(p, 4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
    return this.style(new EllipseShape(id, this.number(p, 0), this.number(p, 1), this.number(p, 2), this.number(p, 3)), 'fill', p[4]);
  }

  private createLine(id: string, p: readonly ShapeParameter[]): LineShape {
    this.arity(p, 4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke]');
    return this.style(new LineShape(id, this.number(p, 0), this.number(p, 1), this.number(p, 2), this.number(p, 3)), 'stroke', p[4]);
  }

  private createText(id: string, p: readonly ShapeParameter[]): TextShape {
    this.arity(p, 3, 3, 'create text <id> <x> <y> "content"');
    return new TextShape(id, this.number(p, 0), this.number(p, 1), ShapeValidation.text(this.parameter(p, 2), 'text'));
  }

  private createGroup(id: string, p: readonly ShapeParameter[]): GroupShape {
    this.arity(p, 0, 0, 'create g <id>');
    return new GroupShape(id);
  }
}
