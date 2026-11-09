import type { ShapeProvider } from '../public/ShapeProvider.js';
import type { Command } from '../public/Command.js';
import type { TreeDecorator } from '../public/TreeDecorator.js';
import type { AttributeHandler } from '../public/AttributeHandler.js';
import type { Plugin, PluginContext, PluginManifest, PluginServices } from '../public/Plugin.js';
import type { Extensions } from '../public/Extensions.js';

interface Entries {
  shapes: ShapeProvider[];
  commands: Command[];
  decorators: TreeDecorator[];
  attributes: AttributeHandler[];
}

/** Shared atomic registration path. Module resolution belongs to the host. */
export class PluginRegistry {
  private committed: Extensions = Object.freeze({
    shapes: Object.freeze([]), commands: Object.freeze([]),
    decorators: Object.freeze([]), attributes: Object.freeze([]),
  });
  private activating = false;

  public constructor(private readonly services: PluginServices) {}

  public get view(): Extensions { return this.committed; }

  public async activate(manifest: PluginManifest, plugin: Plugin, options?: unknown): Promise<void> {
    if (this.activating) throw new Error('plugin activation already in progress');
    this.activating = true;
    const staged: Entries = { shapes: [], commands: [], decorators: [], attributes: [] };
    let open = true;
    // Latch registration errors: a plugin cannot catch one and commit a partial batch.
    let registrationFailure: Error | undefined;
    const add = <K extends keyof Entries>(category: K, value: Entries[K][number]): void => {
      if (!open) throw new Error('plugin registration context is closed');
      if (registrationFailure !== undefined) throw registrationFailure;
      if (!/^[a-z][a-z0-9-]*$/u.test(value.name)) {
        registrationFailure = new Error(`invalid registration name: ${category}/${value.name}`);
        throw registrationFailure;
      }
      if ([...this.committed[category], ...staged[category]].some(entry => entry.name === value.name)) {
        registrationFailure = new Error(`duplicate registration: ${category}/${value.name}`);
        throw registrationFailure;
      }
      // The context below fixes the category/value pairing before calling add.
      (staged[category] as Entries[K][number][]).push(value);
    };
    const context: PluginContext = Object.freeze({
      services: this.services,
      registerShape: (value: ShapeProvider) => add('shapes', value),
      registerCommand: (value: Command) => add('commands', value),
      registerDecorator: (value: TreeDecorator) => add('decorators', value),
      registerAttribute: (value: AttributeHandler) => add('attributes', value),
    });
    try {
      try { await plugin.activate(context, options); }
      catch (error: unknown) {
        if (registrationFailure !== undefined) throw registrationFailure;
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`plugin failed to activate: ${manifest.name} (${reason})`);
      }
      if (registrationFailure !== undefined) throw registrationFailure;
      open = false;
      const categories = ['shapes', 'commands', 'decorators', 'attributes'] as const;
      const names = (values: readonly string[]): string => [...values].sort().join(',');
      const declared = categories.map(category => `${category}=[${names(manifest.contributes?.[category] ?? [])}]`).join('; ');
      const registered = categories.map(category => `${category}=[${names(staged[category].map(entry => entry.name))}]`).join('; ');
      const repeatedDeclaration = categories.some(category => {
        const values = manifest.contributes?.[category] ?? [];
        return new Set(values).size !== values.length;
      });
      if (repeatedDeclaration || declared !== registered) {
        throw new Error(`plugin manifest mismatch: ${manifest.name} (declared: ${declared}, registered: ${registered})`);
      }
      this.committed = Object.freeze({
        shapes: Object.freeze([...this.committed.shapes, ...staged.shapes]),
        commands: Object.freeze([...this.committed.commands, ...staged.commands]),
        decorators: Object.freeze([...this.committed.decorators, ...staged.decorators]),
        attributes: Object.freeze([...this.committed.attributes, ...staged.attributes]),
      });
    } finally {
      open = false;
      this.activating = false;
    }
  }
}
