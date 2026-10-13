import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { SvgReadResult } from './SvgReadResult.js';

export interface SvgCodec {
  decode(source: string): SvgReadResult;
  encode(document: SvgDocument): string;
}
