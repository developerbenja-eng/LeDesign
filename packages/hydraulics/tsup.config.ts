import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'water-network/index': 'src/water-network/index.ts',
    'sewer/index': 'src/sewer/index.ts',
    'stormwater/index': 'src/stormwater/index.ts',
    'open-channel/index': 'src/open-channel/index.ts',
    'hydrology/index': 'src/hydrology/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
