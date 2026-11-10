import type { Plugin, PluginContext, PluginManifest } from '../../core/public/Plugin.js';
import type { CommandContext, CommandToken } from '../../core/public/Command.js';
import type { CommandOutput, DocumentDraft } from '../../core/public/Session.js';
import type { FileStore, SvgCodec, DocumentFactory, Presentation, ShapeCreation } from '../../core/public/Ports.js';
import type { EditDocument } from '../../core/public/Document.js';
import type { AttributeValue, ShapeView } from '../../core/public/Shape.js';
import { ShapeValidation as V } from '../../core/public/ShapeValidation.js';
import { BuiltinProvider } from './BuiltinProvider.js';
import { BuiltinCommand } from './BuiltinCommand.js';
import { HelpFormatter } from './legacy/presentation/HelpFormatter.js';

/** The default package owns names, parameter rules, help and all legacy feedback. */
export class BuiltinPlugin implements Plugin {
  public constructor(private readonly files: FileStore, private readonly codec: SvgCodec,
    private readonly documents: DocumentFactory, private readonly views: Presentation, private readonly shapes: ShapeCreation) {}

  public static readonly shapeNames = ['rect', 'circle', 'ellipse', 'line', 'text', 'g'] as const;
  public static readonly commandNames = ['init', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group',
    'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo', 'read', 'save'] as const;
  public static readonly manifest: PluginManifest = { name: '@svgframe/builtin', contributes: {
    shapes: BuiltinPlugin.shapeNames, commands: BuiltinPlugin.commandNames,
  } };

  public activate(context: PluginContext): void {
    const definitions: readonly (readonly [string, readonly string[], string])[] = [
      ['rect', ['x', 'y', 'width', 'height'], 'rect <id> <x> <y> <w> <h> [fill]'],
      ['circle', ['cx', 'cy', 'r'], 'circle <id> <cx> <cy> <r> [fill]'],
      ['ellipse', ['cx', 'cy', 'rx', 'ry'], 'ellipse <id> <cx> <cy> <rx> <ry> [fill]'],
      ['line', ['x1', 'y1', 'x2', 'y2'], 'line <id> <x1> <y1> <x2> <y2> [stroke]'],
      ['text', ['x', 'y', 'text'], 'text <id> <x> <y> "content"'], ['g', [], 'g <id>'],
    ];
    for (const [name, attributes, syntax] of definitions) context.registerShape(new BuiltinProvider(name, attributes, syntax));
    const add = (name: string, syntax: string, min: number, max: number,
      action: (tokens: readonly CommandToken[], ctx: CommandContext) => Promise<CommandOutput>): void => {
      context.registerCommand(new BuiltinCommand(name, syntax, min, max, action));
    };
    const args = (tokens: readonly CommandToken[]): readonly string[] => tokens.map(token => token.value);
    const label = (shape: ShapeView): string => `${shape.type}#${shape.id}`;
    const origin = (document: EditDocument, id: string): string => {
      const parent = document.parentOf(id); return parent === undefined ? 'svg' : label(parent);
    };
    const document = (draft: DocumentDraft): EditDocument => {
      if (draft.document === undefined) throw new Error("no document. use 'init' or 'read' first");
      return draft.document;
    };
    const create = (ctx: CommandContext, type: string, id: string, values: readonly AttributeValue[]) => {
      void ctx;
      return this.shapes.create(type, id, values);
    };
    add('init', 'init [w] [h]', 0, 2, (t, c) => c.session.document(draft => {
      const d = this.documents.create(V.number(t[0]?.value ?? 800), V.number(t[1]?.value ?? 600));
      draft.replace(d); return { message: `canvas ${d.width}x${d.height} created` };
    }, 'init'));
    add('canvas', 'canvas [w] [h]', 0, 2, (t, c) => t.length === 0 ? c.session.query(state => {
      if (state.document === undefined) throw new Error("no document. use 'init' or 'read' first");
      return { message: `canvas ${state.document.width}x${state.document.height}` };
    }) : c.session.document(draft => {
      const d = document(draft); d.resize(V.number(t[0]!.value), V.number(t[1]?.value ?? d.height));
      return { message: `canvas resized to ${d.width}x${d.height}` };
    }));
    add('create', 'create <type> <id> [params] [in <containerId>]', 2, Infinity, (t, c) => c.session.edit(d => {
      const type = t[0]!.value; const id = t[1]!.value; const parameters = t.slice(2);
      const marker = parameters.at(-2); const hasParent = marker?.value === 'in' && !marker.quoted;
      const parentId = hasParent ? parameters.at(-1)!.value : undefined;
      const values = args(hasParent ? parameters.slice(0, -2) : parameters);
      const shape = create(c, type, id, values); d.insert(shape, parentId);
      const feedback = c.extensions.shapes.find(entry => entry.name === type)!.feedback({
        name: 'create', before: undefined, after: d.getShape(id).view(), arguments: values,
      });
      return feedback ?? { message: `${label(shape)} created${parentId === undefined ? '' : ` in ${label(d.getShape(parentId))}`}`,
        undoMessage: `${label(shape)} deleted` };
    }));
    add('delete', 'delete <id>', 1, 1, (t, c) => c.session.edit(d => {
      const id = t[0]!.value; const name = label(d.getShape(id)); const parent = origin(d, id); d.delete(id);
      return { message: `${name} deleted`, undoMessage: `${name} restored into ${parent}` };
    }));
    add('move', 'move <id> <dx> <dy>', 3, 3, (t, c) => c.session.edit(d => {
      const id = t[0]!.value; const before = d.getShape(id).view(); const dx = V.number(t[1]!.value); const dy = V.number(t[2]!.value);
      d.move(id, dx, dy); const after = d.getShape(id).view();
      const feedback = c.extensions.shapes.find(entry => entry.name === after.type)?.feedback({
        name: 'move', before, after, arguments: [dx, dy],
      });
      return feedback ?? { message: `${label(after)} moved by (${dx},${dy})`, undoMessage: `${label(before)} moved back by (${-dx},${-dy})` };
    }));
    add('scale', 'scale <id> <factor>', 2, 2, (t, c) => c.session.edit(d => {
      const id = t[0]!.value; const name = label(d.getShape(id)); const factor = V.factor(V.number(t[1]!.value)); d.scale(id, factor);
      return { message: `${name} scaled by ${factor}`, undoMessage: `${name} restored after scaling` };
    }));
    add('set', 'set <id> <attr> <value>', 3, 3, (t, c) => c.session.edit(d => {
      const [id, attribute, value] = args(t) as readonly [string, string, string];
      const shape = d.getShape(id); const change = c.attributes.apply(d, id, attribute, value);
      const format = (v: AttributeValue | undefined): string => v === undefined ? '(unset)' : attribute === 'text' ? JSON.stringify(v) : String(v);
      const prefix = `${label(shape)} updated: ${attribute}=`;
      return { message: change.message ?? prefix + format(change.after), undoMessage: change.undoMessage ?? prefix + format(change.before) };
    }));
    add('group', 'group <newGid> <id1> <id2>...', 2, Infinity, (t, c) => c.session.edit(d => {
      const [id, ...ids] = args(t); d.group(create(c, 'g', id!, []), ids);
      const count = d.getShape(id!).children.length;
      return { message: `g#${id} created with ${count} children`, undoMessage: `g#${id} removed; ${count} children restored to original parents` };
    }));
    add('ungroup', 'ungroup <gid>', 1, 1, (t, c) => c.session.edit(d => {
      const id = t[0]!.value; const count = d.getShape(id).children.length; const parent = origin(d, id); d.ungroup(id);
      return { message: `g#${id} ungrouped; ${count} children promoted to ${parent}`, undoMessage: `g#${id} restored with ${count} children in ${parent}` };
    }));
    add('addto', 'addto <gid> <id>', 2, 2, (t, c) => c.session.edit(d => {
      const container = t[0]!.value; const id = t[1]!.value; const name = label(d.getShape(id)); const parent = origin(d, id);
      d.addTo(container, id); return { message: `${name} moved into g#${container}`, undoMessage: `${name} restored into ${parent}` };
    }));
    for (const name of ['front', 'back'] as const) add(name, `${name} <id>`, 1, 1, (t, c) => c.session.edit(d => {
      const id = t[0]!.value; const title = label(d.getShape(id)); d[name](id);
      return { message: `${title} moved to ${name}`, undoMessage: `${title} restored to previous z-order` };
    }));
    add('tree', 'tree [id]', 0, 1, (t, c) => c.session.query(state => {
      if (state.document === undefined) throw new Error("no document. use 'init' or 'read' first");
      return { message: this.views.tree(state.document, t[0]?.value) };
    }));
    add('show', 'show <id>', 1, 1, (t, c) => c.session.query(state => {
      if (state.document === undefined) throw new Error("no document. use 'init' or 'read' first");
      return { message: this.views.show(state.document, state.document.getShape(t[0]!.value)) };
    }));
    add('help', 'help', 0, 0, (_t, c) => c.session.query(() => {
      const lines = [new HelpFormatter().format()];
      const builtins = new Set<string>(BuiltinPlugin.commandNames); const shapes = new Set<string>(BuiltinPlugin.shapeNames);
      for (const command of c.extensions.commands) if (!builtins.has(command.name)) lines.push(...command.help);
      for (const provider of c.extensions.shapes) if (!shapes.has(provider.name)) lines.push(`  create ${provider.createSyntax}`);
      return { message: lines.join('\n') };
    }));
    add('undo', 'undo', 0, 0, (_t, c) => c.session.undo());
    add('redo', 'redo', 0, 0, (_t, c) => c.session.redo());
    add('read', 'read <file.svg>', 1, 1, (t, c) => c.session.document(async draft => {
      const path = t[0]!.value; const result = this.codec.decode(await this.files.read(path));
      draft.replace(result.document, path);
      return { message: `read ${path} (${result.document.size} elements)`, warnings: result.warnings };
    }, 'read'));
    add('save', 'save [file.svg]', 0, 1, (t, c) => c.session.document(async draft => {
      const d = document(draft); const path = t[0]?.value ?? draft.path;
      if (path === undefined) throw new Error("no save path. use 'save <file.svg>' first");
      const content = this.codec.encode(d.view()); draft.setPath(path); await this.files.write(path, content);
      return { message: `saved to ${path} (${d.size} elements)` };
    }, 'save'));
  }
}
