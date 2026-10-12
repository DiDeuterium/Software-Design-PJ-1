/** Shared value checks; no IO or shape-type dispatch. */
export class ShapeValidation {
  public static id(value: string): string {
    if (value.length === 0 || /\s/u.test(value)) {
      throw new Error(`invalid id: ${value}`);
    }
    return value;
  }

  public static number(value: string | number): number {
    if (typeof value === 'string' &&
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value.trim())) {
      throw new Error(`invalid number: ${value}`);
    }
    const result = Number(value);
    if (!Number.isFinite(result)) {
      throw new Error(`invalid number: ${value}`);
    }
    return result;
  }

  public static finite(value: number, attribute: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`invalid value for ${attribute}: ${value}`);
    }
    return value;
  }

  public static nonnegative(value: string | number, attribute: string): number {
    const result = this.number(value);
    if (result < 0) {
      throw new Error(`invalid value for ${attribute}: ${value}`);
    }
    return result;
  }

  public static factor(value: number): number {
    const result = this.number(value);
    if (result <= 0) {
      throw new Error('scale factor must be positive');
    }
    return result;
  }

  public static text(value: string | number, attribute: string): string {
    if (typeof value !== 'string') {
      throw new Error(`invalid value for ${attribute}: ${value}`);
    }
    return value;
  }
}
