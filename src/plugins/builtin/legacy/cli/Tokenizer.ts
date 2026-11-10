import { Token } from './Token.js';

export class Tokenizer {
  public tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return Object.freeze([]);
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/u.test(line[index]!)) { index++; continue; }
      const quoted = line[index] === '"';
      let value = '';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const character = line[index++]!;
          if (character === '"') { closed = true; break; }
          if (character === '\\') {
            const escaped = line[index++];
            if (escaped !== '"' && escaped !== '\\') {
              throw new Error(`invalid escape sequence: \\${escaped ?? ''}`);
            }
            value += escaped;
          } else {
            value += character;
          }
        }
        if (!closed) throw new Error('unterminated quoted string');
        if (index < line.length && !/\s/u.test(line[index]!)) {
          throw new Error('expected whitespace after quoted string');
        }
      } else {
        while (index < line.length && !/\s/u.test(line[index]!)) {
          const character = line[index++]!;
          if (character === '"') throw new Error('expected whitespace before quoted string');
          value += character;
        }
      }
      tokens.push(new Token(value, quoted));
    }
    return Object.freeze(tokens);
  }
}
