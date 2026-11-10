import type { Shape } from '../domain/shapes/Shape.js';

export class StyleFormatter {
  public format(shape: Shape): string[] {
    const attributes: readonly (readonly [string, string | number | undefined])[] = [
      ['fill', shape.fill], ['stroke', shape.stroke], ['stroke-width', shape.strokeWidth],
    ];
    return attributes.flatMap(([name, value]) => value === undefined ? [] : [
      `${name}=${typeof value === 'string' && /[\s"\\]/u.test(value) ? JSON.stringify(value) : value}`,
    ]);
  }
}
