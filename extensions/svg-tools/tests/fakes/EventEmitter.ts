export class EventEmitter<T> {
  private listeners: ((value: T) => void)[] = [];
  public event = (listener: (value: T) => void): { dispose(): void } => {
    this.listeners.push(listener); return { dispose: () => { this.listeners = this.listeners.filter(item => item !== listener); } };
  };
  public fire(value: T): void { this.listeners.forEach(listener => listener(value)); }
  public dispose(): void { this.listeners = []; }
}
