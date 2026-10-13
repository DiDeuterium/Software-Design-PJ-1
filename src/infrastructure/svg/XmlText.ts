/** XML value validation and escaping; document structure is parsed by the XML library. */
export class XmlText {
  private static readonly entities = new Map([
    ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"],
  ]);

  public static validate(value: string): string {
    if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value)) {
      throw new Error('invalid svg: invalid XML character');
    }
    return value;
  }

  public static decode(raw: string, attribute = false): string {
    if (attribute && raw.includes('<')) throw new Error('invalid svg: unescaped < in attribute');
    if (!attribute && raw.includes(']]>')) throw new Error('invalid svg: unexpected CDATA terminator');
    const value = attribute ? raw.replace(/[\t\n\r]/gu, ' ') : raw;
    if (/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/u.test(value)) {
      throw new Error('invalid svg: unknown or malformed entity');
    }
    return this.validate(value.replace(/&([^;]+);/gu, (_match, entity: string) => {
      const predefined = this.entities.get(entity);
      if (predefined !== undefined) return predefined;
      const code = entity.startsWith('#x') ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
        throw new Error('invalid svg: invalid character reference');
      }
      return String.fromCodePoint(code);
    }));
  }

  public static encode(value: string, attribute = false): string {
    const escaped = this.validate(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;')
      .replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&apos;')
      .replace(/\r/gu, '&#13;');
    return attribute ? escaped.replace(/\n/gu, '&#10;').replace(/\t/gu, '&#9;') : escaped;
  }
}
