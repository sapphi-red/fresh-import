// `import x from './something.ts?inline'` resolves to a string (the compiled
// module source), provided by inline-loader-plugin.ts.
declare module '*?inline' {
  const source: string
  export default source
}
