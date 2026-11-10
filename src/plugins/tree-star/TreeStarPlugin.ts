import type { Plugin, PluginContext } from '../../core/public/Plugin.js';
import { ModifiedStarDecorator } from './ModifiedStarDecorator.js';

export default class TreeStarPlugin implements Plugin {
  public activate(context: PluginContext): void { context.registerDecorator(new ModifiedStarDecorator()); }
}
