import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'water-network/index': 'src/water-network/index.ts',
    'sewer/index': 'src/sewer/index.ts',
    'stormwater/index': 'src/stormwater/index.ts',
    'open-channel/index': 'src/open-channel/index.ts',
    'hydrology/index': 'src/hydrology/index.ts',
    'data-sources/index': 'src/data-sources/index.ts',
    'data-sources/conaf': 'src/data-sources/conaf.ts',
    'data-sources/sernageomin': 'src/data-sources/sernageomin.ts',
    'data-sources/minvu': 'src/data-sources/minvu.ts',
    'data-sources/shoa': 'src/data-sources/shoa.ts',
    'data-sources/soil': 'src/data-sources/soil.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
