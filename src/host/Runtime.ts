import { PluginRegistry } from '../core/registry/PluginRegistry.js';
import { EditorSession } from '../core/session/EditorSession.js';
import { AttributeDispatcher } from '../core/attributes/AttributeDispatcher.js';
import { CommandDispatcher } from '../core/cli/CommandDispatcher.js';
import { DocumentFactory } from '../core/document/DocumentFactory.js';
import { ShapeFactory } from '../core/shapes/ShapeFactory.js';
import { Presentation } from '../core/presentation/Presentation.js';
import { SvgCodec } from '../core/svg/SvgCodec.js';
import type { Plugin, PluginManifest, PluginServices } from '../core/public/Plugin.js';
import type { FileStore } from '../core/public/Ports.js';
import type { Extensions } from '../core/public/Extensions.js';
import { BuiltinPlugin } from '../plugins/builtin/BuiltinPlugin.js';
import { LocalFileStore } from './filesystem/LocalFileStore.js';
import { LocalDirectoryReader } from './filesystem/LocalDirectoryReader.js';
import { PluginLoader } from './plugins/PluginLoader.js';

export interface RuntimeOptions {
  readonly configFile?: string;
  readonly builtins?: boolean;
  readonly workingDirectory?: string;
  readonly files?: FileStore;
  readonly services?: PluginServices;
  readonly report?: (message: string) => void;
  readonly plugins?: readonly { readonly manifest: PluginManifest; readonly plugin: Plugin; readonly options?: unknown }[];
}

/** Only composition knows concrete defaults. Config/module loading is step 4. */
export async function createRuntime(options: RuntimeOptions = {}) {
  const registry = new PluginRegistry(options.services ?? { directory: new LocalDirectoryReader() });
  const session = new EditorSession(() => registry.view.decorators, options.report);
  const extensions = (): Extensions => ({ ...registry.view,
    decorators: registry.view.decorators.filter(decorator => session.enabled(decorator)) });
  const shapes = new ShapeFactory(extensions);
  const presentation = new Presentation(extensions);
  const codec = new SvgCodec(extensions);
  if (options.builtins !== false) await registry.activate(BuiltinPlugin.manifest,
    new BuiltinPlugin(options.files ?? new LocalFileStore(), codec, new DocumentFactory(), presentation, shapes));
  const loader = new PluginLoader(registry, options.report ?? (() => undefined));
  for (const entry of options.plugins ?? []) await loader.activate(entry.manifest, entry.plugin, entry.options);
  if (options.configFile !== undefined) await loader.loadConfig(options.configFile);
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const dispatcher = new CommandDispatcher(() => ({ session, extensions: extensions(),
    attributes: new AttributeDispatcher(extensions().attributes), workingDirectory }));
  return { registry, session, dispatcher, codec, presentation, shapes };
}
