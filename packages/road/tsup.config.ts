import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'horizontal/index': 'src/horizontal/index.ts',
    'vertical/index': 'src/vertical/index.ts',
    'cross-section/index': 'src/cross-section/index.ts',
    'sight-distance/index': 'src/sight-distance/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
