import { readFileSync } from 'node:fs';
import { ModuleKind, transpileModule } from 'typescript';
import { expect, it, vi } from 'vitest';

it('initializes the lazy tour after loading React', () => {
  const source = readFileSync('src/components/operator/OperatorLayout.tsx', 'utf8');
  const { outputText } = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, jsx: 4 } });
  const lazy = vi.fn(() => ({}));
  expect(() => new Function('require', 'exports', outputText)(
    (name: string) => name === 'react' ? { lazy } : {}, {},
  )).not.toThrow();
  expect(lazy).toHaveBeenCalledOnce();
});
