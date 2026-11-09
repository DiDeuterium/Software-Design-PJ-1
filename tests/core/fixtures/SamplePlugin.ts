import type { Plugin, PluginContext } from '../../../src/core/public/Plugin.js';

export class SamplePlugin implements Plugin {
  public constructor(private readonly activateAction: (context: PluginContext, options: unknown) => void | Promise<void>) {}
  public activate(context: PluginContext, options: unknown): void | Promise<void> {
    return this.activateAction(context, options);
  }
}
