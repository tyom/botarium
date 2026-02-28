import { defineConfig, base } from '../../tsup.base'

export default defineConfig({
  ...base,
  entry: { index: 'src/index.ts' },
  external: ['cockatiel'],
})
