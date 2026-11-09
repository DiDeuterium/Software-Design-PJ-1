import type { ShapeProvider } from './ShapeProvider.js';
import type { Command } from './Command.js';
import type { TreeDecorator } from './TreeDecorator.js';
import type { AttributeHandler } from './AttributeHandler.js';

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: 'directory' | 'file' | 'other';
}

/** Target interface of the future filesystem adapter; no Node Dirent leaks. */
export interface DirectoryReader {
  read(path: string): Promise<readonly DirectoryEntry[]>;
}

export interface PluginServices {
  readonly directory: DirectoryReader;
}

export interface PluginContext {
  readonly services: PluginServices;
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerDecorator(decorator: TreeDecorator): void;
  registerAttribute(handler: AttributeHandler): void;
}

export interface Contributions {
  readonly shapes?: readonly string[];
  readonly commands?: readonly string[];
  readonly decorators?: readonly string[];
  readonly attributes?: readonly string[];
}

export interface PluginManifest {
  readonly name: string;
  readonly contributes?: Contributions;
}

export interface Plugin {
  activate(context: PluginContext, options: unknown): void | Promise<void>;
}
