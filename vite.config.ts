import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ include: ['src'], exclude: ['**/*.{test,spec}.*'] })],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/gestuelle.ts'),
      formats: ['es'],
    },
  },
})
