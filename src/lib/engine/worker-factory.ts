/**
 * Fábricas de worker da engine.
 *
 * Só isto conhece o caminho dos binários. O provider recebe uma fábrica por
 * injeção e nunca monta URL sozinho — assim o teste usa um worker falso e o app
 * pode mudar o local dos assets sem tocar na lógica.
 *
 * Este módulo usa `Worker` e só roda no navegador: importe sob demanda
 * (`await import(...)`) para não puxar a engine na landing page.
 */

/** Pasta isolada dos assets GPL. Ver `public/engine/stockfish/README.md`. */
export const ENGINE_ASSET_BASE = '/engine/stockfish'

/** Build lite single-threaded do stockfish.js (Stockfish 18). */
export const ENGINE_SCRIPT_URL = `${ENGINE_ASSET_BASE}/stockfish-18-lite-single.js`
export const ENGINE_WASM_URL = `${ENGINE_ASSET_BASE}/stockfish-18-lite-single.wasm`

/**
 * Monta a URL de worker no formato que o stockfish.js espera.
 *
 * O build resolve o `.wasm` a partir do fragmento da própria URL do worker
 * (`#<caminho-do-wasm>,worker`). Sem o fragmento ele tenta trocar `.js` por
 * `.wasm` no caminho do script, o que só funciona quando o worker é criado
 * diretamente a partir do arquivo da engine.
 */
export function buildEngineWorkerUrl(scriptUrl: string, wasmUrl: string): string {
  return `${scriptUrl}#${wasmUrl},worker`
}

/**
 * Cria o worker diretamente a partir do arquivo da engine em `public/`.
 *
 * É o caminho padrão: nenhum bundler no meio, nada de código GPL entrando no
 * bundle da aplicação.
 */
export function createStockfishWorker(): Worker {
  return new Worker(buildEngineWorkerUrl(ENGINE_SCRIPT_URL, ENGINE_WASM_URL))
}

/**
 * Cria o worker a partir da nossa ponte (`src/workers/stockfish.worker.ts`).
 *
 * `bridgeUrl` deve vir do chamador, tipicamente
 * `new URL('@/workers/stockfish.worker.ts', import.meta.url)`, porque só o
 * bundler sabe onde o arquivo final foi parar. O fragmento com o caminho do
 * `.wasm` é obrigatório: a ponte o lê de `self.location.hash`.
 */
export function createBridgedStockfishWorker(bridgeUrl: string | URL): Worker {
  return new Worker(buildEngineWorkerUrl(String(bridgeUrl), ENGINE_WASM_URL))
}
