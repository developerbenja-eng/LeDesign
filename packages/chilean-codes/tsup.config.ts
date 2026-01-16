import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'nch433/index': 'src/nch433/index.ts',
    'nch432/index': 'src/nch432/index.ts',
    'nch691/index': 'src/nch691/index.ts',
    'nch1105/index': 'src/nch1105/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
