# Browser Engine Reference

Stockfish.js 18 exposes:
- large multi-threaded;
- large single-threaded;
- lite multi-threaded;
- lite single-threaded;
- ASM-JS fallback.

For LanceZero MVP prefer lite single-threaded.

## Multi-thread requirements

Browsers gate `SharedArrayBuffer` behind cross-origin isolation.

Typical headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Do not add these only because an engine can use more threads. They can affect integrations and resource loading.

Official references:
- https://github.com/nmrugg/stockfish.js
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy
- https://vercel.com/kb/guide/fix-shared-array-buffer-not-defined-nextjs-react
