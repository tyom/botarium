import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  external: ['cockatiel'],
  splitting: false,
  target: 'es2022',
  platform: 'node',
})
