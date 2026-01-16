import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'geotiff-terrain': 'src/geotiff-terrain.ts',
    'dem-service': 'src/dem-service.ts',
    'terrain-service': 'src/terrain-service.ts',
    // TODO: Re-enable after migrating type definitions
    // 'infrastructure-geometry': 'src/infrastructure-geometry.ts',
    'dwg/index': 'src/dwg/index.ts',
    // TODO: Fix type errors in surface-ai before re-enabling
    // 'surface-ai/index': 'src/surface-ai/index.ts',
    'triangulation/index': 'src/triangulation/index.ts',
    'volume-calculation': 'src/volume-calculation.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
