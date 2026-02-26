import { defineConfig, type Options } from 'tsup'

const base: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  splitting: false,
  target: 'es2022',
  platform: 'node',
}

export { defineConfig, base }
