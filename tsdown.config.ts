import { defineConfig } from 'tsdown'
import { urlLoaderPlugin } from './url-loader-plugin.ts'

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  fixedExtension: false,
  plugins: [urlLoaderPlugin()],
})
