import { defineConfig } from 'tsdown'
import { queryHashPlugin } from './query-hash-plugin.ts'
import { urlLoaderPlugin } from './url-loader-plugin.ts'

export default defineConfig({
  entry: 'src/index.ts',
  dts: true,
  fixedExtension: false,
  plugins: [urlLoaderPlugin(), queryHashPlugin()],
})
