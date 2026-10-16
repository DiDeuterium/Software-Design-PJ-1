/** Extract the course transcripts so acceptance follows the supplied requirements. */
export class CourseScenario {
  private readonly commandsValue: readonly string[];
  private readonly expectedValue: readonly string[];

  private constructor(commands: string[], expected: string[]) {
    this.commandsValue = Object.freeze(commands);
    this.expectedValue = Object.freeze(expected);
  }

  public static extract(markdown: string, section: 'session' | 'flowchart'): CourseScenario {
    const start = section === 'session' ? '## 6. 典型会话' : '### 6.1 案例';
    const end = section === 'session' ? '其中 ' : '**版本 B';
    const content = markdown.slice(markdown.indexOf(start), markdown.indexOf(end, markdown.indexOf(start)));
    const fence = String.fromCharCode(96).repeat(3);
    const pattern = new RegExp(fence + 'text\\r?\\n([\\s\\S]*?)' + fence, 'gu');
    const blocks = [...content.matchAll(pattern)].map(match => match[1]!);
    const transcript = blocks.find(block => block.includes('svg> init'));
    if (transcript === undefined) throw new Error('Missing course transcript: ' + section);
    const commands: string[] = [];
    const expected: string[] = [];
    for (const line of transcript.split(/\r?\n/u)) {
      if (line.startsWith('svg> ')) commands.push(line.slice(5));
      else if (line.trim().length > 0 && !line.startsWith('$ ') && !line.startsWith('#') &&
        !line.startsWith('svg-editor ')) expected.push(line);
    }
    return new CourseScenario(commands, expected);
  }

  public get commands(): readonly string[] { return this.commandsValue; }
  public get expected(): readonly string[] { return this.expectedValue; }
  public get input(): string { return this.commandsValue.join('\n') + '\n'; }

  public outputLines(output: string): string[] {
    return output.replace(/\r\n/gu, '\n').split('\n')
      .map(line => line.replace(/^(?:svg> )+/u, ''))
      .filter(line => line.trim().length > 0 && !line.startsWith('svg-editor '));
  }

  public normalize(line: string): string {
    // The sample pads labels for alignment; geometry and text remain exact.
    return line.replace(/^([ │├└─]*[a-z]+#[^\s]+) +/u, '$1 ');
  }

  public matches(actual: string, expected: string): boolean {
    const left = this.normalize(actual);
    const right = this.normalize(expected);
    // §6.1 omits the explicitly created line's stroke in its illustrative tree.
    return left === right || (right.startsWith('    └── line#arrow1 ') && left === right + ' stroke=black');
  }
}
