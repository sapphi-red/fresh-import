import { defineConfig } from 'vitest/config'
import { inlineLoaderPlugin } from './inline-loader-plugin.ts'

export default defineConfig({
  plugins: [inlineLoaderPlugin()],
})
