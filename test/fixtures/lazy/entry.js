import './eager.js'
// fires AFTER the entry finishes evaluating and after collect() resolves,
// so the tracker's message listener is already detached
setTimeout(() => {
  import('./lazy-dep.js')
}, 50)
export default {}
