import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'analysis/index': 'src/analysis/index.ts',
    'design/index': 'src/design/index.ts',
    factories: 'src/factories.ts',
    'loads/index': 'src/loads/index.ts',
    'geolocation/index': 'src/geolocation/index.ts',
    'geotechnical/index': 'src/geotechnical/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
