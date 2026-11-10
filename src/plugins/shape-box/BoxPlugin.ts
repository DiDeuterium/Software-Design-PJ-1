import type { Plugin, PluginContext } from '../../core/public/Plugin.js';
import { BoxProvider } from './BoxProvider.js';
import { BoxFillHandler } from './BoxFillHandler.js';
import { BoxLabelHandler } from './BoxLabelHandler.js';
import { BoxTypeDecorator } from './BoxTypeDecorator.js';

export default class BoxPlugin implements Plugin {
  public activate(context: PluginContext): void {
    context.registerShape(new BoxProvider());
    context.registerAttribute(new BoxFillHandler()); context.registerAttribute(new BoxLabelHandler());
    context.registerDecorator(new BoxTypeDecorator());
  }
}
