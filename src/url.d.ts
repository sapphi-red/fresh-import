// `import x from './something.ts?url'` resolves to a `data:` URL string (the
// bundled module as a data URI), provided by url-loader-plugin.ts.
declare module '*?url' {
  const url: string
  export default url
}
