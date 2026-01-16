import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'geotiff-terrain': 'src/geotiff-terrain.ts',
    // TODO: Re-enable after migrating type definitions
    // 'infrastructure-geometry': 'src/infrastructure-geometry.ts',
    'dwg/index': 'src/dwg/index.ts',
    'surface-ai/index': 'src/surface-ai/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
