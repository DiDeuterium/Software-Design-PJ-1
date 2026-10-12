/** Internal two-phase geometry update: construct every plan before applying. */
export class ShapeMutation {
  private readonly action: () => void;

  public constructor(action: () => void) {
    this.action = action;
  }

  public apply(): void {
    this.action();
  }

  public static combine(mutations: readonly ShapeMutation[]): ShapeMutation {
    return new ShapeMutation(() => {
      for (const mutation of mutations) {
        mutation.apply();
      }
    });
  }
}
