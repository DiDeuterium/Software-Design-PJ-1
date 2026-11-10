import { expect, it } from 'vitest';
import { sourceMetrics } from '../../scripts/metrics/SourceMetrics.js';

it('counts AST branches without counting comments, string contents or nested function branches twice', () => {
  const source = '// if && while\nfunction outer(a: boolean) {\n const text = "if while ||";\n if (a && text) return 1;\n const inner = () => a ? 2 : 3;\n return inner();\n}\n';
  const result = sourceMetrics('fixture.ts', source);
  expect(result.lines).toBe(7);
  expect(result.functions.map(fn => [fn.name, fn.complexity])).toEqual([['outer', 3], ['inner', 2]]);
  expect(result.complexity).toBe(5);
});
