import { defineConfig } from 'tsdown'
import { inlineLoaderPlugin } from './inline-loader-plugin.ts'

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  fixedExtension: false,
  plugins: [inlineLoaderPlugin()],
})
