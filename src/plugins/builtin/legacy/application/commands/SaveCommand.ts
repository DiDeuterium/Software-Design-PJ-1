import type { FileStore } from '../ports/FileStore.js';
import type { SvgCodec } from '../ports/SvgCodec.js';
import type { EditorState } from '../session/EditorState.js';
import { DocumentCommand } from './DocumentCommand.js';
import { CommandResult } from './CommandResult.js';

export class SaveCommand extends DocumentCommand {
  private readonly path: string | undefined;
  private readonly files: FileStore;
  private readonly codec: SvgCodec;

  public constructor(path: string | undefined, files: FileStore, codec: SvgCodec) {
    super(); this.path = path; this.files = files; this.codec = codec;
  }

  public override async apply(state: EditorState): Promise<CommandResult> {
    const document = state.getDocument();
    const path = this.path ?? state.path;
    if (path === undefined) throw new Error("no save path. use 'save <file.svg>' first");
    const content = this.codec.encode(document);
    const result = new CommandResult('saved to ' + path + ' (' + document.size + ' elements)');
    state.setPath(path);
    await this.files.write(path, content);
    return result;
  }
}
