import type { FileStore } from '../ports/FileStore.js';
import type { SvgCodec } from '../ports/SvgCodec.js';
import type { EditorState } from '../session/EditorState.js';
import { DocumentCommand } from './DocumentCommand.js';
import { CommandResult } from './CommandResult.js';

export class ReadCommand extends DocumentCommand {
  private readonly path: string;
  private readonly files: FileStore;
  private readonly codec: SvgCodec;

  public constructor(path: string, files: FileStore, codec: SvgCodec) {
    super(); this.path = path; this.files = files; this.codec = codec;
  }

  public override async apply(state: EditorState): Promise<CommandResult> {
    const source = await this.files.read(this.path);
    const result = this.codec.decode(source);
    const document = result.document;
    state.replaceDocument(document, this.path);
    return new CommandResult('read ' + this.path + ' (' + document.size + ' elements)', result.warnings);
  }
}
