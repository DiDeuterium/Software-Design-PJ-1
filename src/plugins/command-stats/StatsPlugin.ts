import type { Plugin, PluginContext } from '../../core/public/Plugin.js';
import { StatsCommand } from './StatsCommand.js';

export default class StatsPlugin implements Plugin {
  public activate(context: PluginContext): void { context.registerCommand(new StatsCommand()); }
}
