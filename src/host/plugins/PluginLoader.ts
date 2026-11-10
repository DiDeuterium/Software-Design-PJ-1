import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin, PluginManifest, Contributions } from '../../core/public/Plugin.js';
import type { PluginRegistry } from '../../core/registry/PluginRegistry.js';

interface Entry { module: string; enabled?: boolean; options?: unknown }
const categories = ['shapes', 'commands', 'decorators', 'attributes'] as const;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Host-only module discovery. No concrete plugin names or imports. */
export class PluginLoader {
  public constructor(private readonly registry: PluginRegistry, private readonly report: (message: string) => void) {}

  public async activate(manifest: PluginManifest, plugin: Plugin, options?: unknown): Promise<void> {
    try { await this.registry.activate(manifest, plugin, options); }
    catch (error: unknown) { this.report(error instanceof Error ? error.message : String(error)); }
  }

  public async loadConfig(file: string): Promise<void> {
    const config = resolve(file);
    let entries: Entry[];
    try {
      const data: unknown = JSON.parse(await readFile(config, 'utf8'));
      if (!object(data) || !Array.isArray(data.plugins) || data.plugins.some((item: unknown) =>
        !object(item) || typeof item.module !== 'string' || item.module.length === 0 ||
        item.enabled !== undefined && typeof item.enabled !== 'boolean')) throw new Error('invalid');
      entries = data.plugins as Entry[];
    } catch { this.report('invalid plugin config'); return; }
    for (const entry of entries) if (entry.enabled !== false) await this.load(entry, config);
  }

  private async load(entry: Entry, config: string): Promise<void> {
    let path: string;
    try { path = createRequire(pathToFileURL(config)).resolve(entry.module); }
    catch { this.report(`plugin not found: ${entry.module}`); return; }
    let name = entry.module;
    try {
      const manifest = await this.manifest(path); name = manifest.name;
      // Resolve separately: dependency/evaluation errors here are NOT "not found".
      const module: Record<string, unknown> = await import(pathToFileURL(path).href);
      if (module.default === undefined) { this.report(`plugin has no default export: ${entry.module}`); return; }
      const plugin = typeof module.default === 'function' ? new (module.default as new () => Plugin)() : module.default;
      if (!object(plugin) || typeof plugin.activate !== 'function') throw new Error('default export must provide activate');
      await this.activate(manifest, plugin as unknown as Plugin, entry.options);
    } catch (error: unknown) {
      this.report(`plugin failed to activate: ${name} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  private async manifest(modulePath: string): Promise<PluginManifest> {
    let directory = dirname(modulePath);
    for (;;) {
      let text: string | undefined;
      try { text = await readFile(join(directory, 'package.json'), 'utf8'); }
      catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (text !== undefined) {
        const data: unknown = JSON.parse(text);
        if (!object(data) || typeof data.name !== 'string' || data.name.length === 0 ||
          data.contributes !== undefined && (!object(data.contributes) || Object.entries(data.contributes).some(([key, value]) =>
            !categories.includes(key as typeof categories[number]) || !Array.isArray(value) || value.some(name => typeof name !== 'string')))) {
          throw new Error('invalid plugin manifest');
        }
        return { name: data.name, ...(data.contributes === undefined ? {} : { contributes: data.contributes as Contributions }) };
      }
      const parent = dirname(directory);
      if (parent === directory) throw new Error('plugin package.json not found');
      directory = parent;
    }
  }
}
