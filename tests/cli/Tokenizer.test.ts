import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

describe('Tokenizer', () => {
  const tokenizer = new Tokenizer();

  it.each(['', '  \t ', '# comment "unterminated', '  # 中文注释'])('ignores %j', line => {
    expect(tokenizer.tokenize(line)).toEqual([]);
  });

  it('preserves colors, signs, Chinese text, whitespace and empty quoted values', () => {
    const tokens = tokenizer.tokenize('  create\ttext 标题 -1.5 2e2 " 开始 # 标题 " "" #ffffff ');
    expect(tokens.map(t => t.value)).toEqual(['create', 'text', '标题', '-1.5', '2e2', ' 开始 # 标题 ', '', '#ffffff']);
    expect(tokens.map(t => t.quoted)).toEqual([false, false, false, false, false, true, true, false]);
    expect(Object.isFrozen(tokens)).toBe(true);
    expect(Object.isFrozen(tokens[0])).toBe(true);
  });

  it('decodes only the two supported escapes inside quotes and keeps bare Windows paths literal', () => {
    const tokens = tokenizer.tokenize('set t text "say \\"hi\\" at C:\\\\tmp" C:\\tmp\\file.svg');
    expect(tokens.map(t => t.value)).toEqual(['set', 't', 'text', 'say "hi" at C:\\tmp', 'C:\\tmp\\file.svg']);
  });

  it('keeps quoted in distinguishable from the parent marker', () => {
    const tokens = tokenizer.tokenize('"in" in');
    expect(tokens.map(t => [t.value, t.quoted])).toEqual([['in', true], ['in', false]]);
  });

  it.each([
    ['set t text "missing', 'unterminated quoted string'],
    ['set t text "bad\\n"', 'invalid escape sequence: \\n'],
    ['set t text "bad\\t"', 'invalid escape sequence: \\t'],
    ['set t text "trailing\\', 'invalid escape sequence: \\'],
    ['"a"b', 'expected whitespace after quoted string'],
    ['a"b"', 'expected whitespace before quoted string'],
    ['"a""b"', 'expected whitespace after quoted string'],
  ])('rejects malformed tokens: %s', (line, error) => {
    expect(() => tokenizer.tokenize(line)).toThrow(error);
  });
});
