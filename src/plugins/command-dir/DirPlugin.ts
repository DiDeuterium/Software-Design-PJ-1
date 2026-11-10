import type { Plugin, PluginContext } from '../../core/public/Plugin.js';
import { DirCommand } from './DirCommand.js';

export default class DirPlugin implements Plugin {
  public activate(context: PluginContext): void { context.registerCommand(new DirCommand(context.services.directory)); }
}
