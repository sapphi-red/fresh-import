import { defineConfig } from 'vitest/config'
import { urlLoaderPlugin } from './url-loader-plugin.ts'

export default defineConfig({
  plugins: [urlLoaderPlugin()],
})
