import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  // Explicit: tsdown defaults to ESM-only, but this is a dual package
  // (package.json exposes both `require` and `import`).
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
})
