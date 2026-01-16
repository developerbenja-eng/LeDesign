import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'aashto/index': 'src/aashto/index.ts',
    'cbr/index': 'src/cbr/index.ts',
    'traffic/index': 'src/traffic/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
