import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/gestuelle.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
})
