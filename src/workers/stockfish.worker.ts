/**
 * Ponte fina entre o app e o binário do Stockfish.
 *
 * Responsabilidade única: carregar `/engine/stockfish/...` dentro do worker e
 * repassar mensagens nos dois sentidos. Nenhum parsing de UCI acontece aqui —
 * isso é trabalho de `src/lib/engine/uci.ts`, que é puro e testável.
 *
 * Como o binário descobre o `.wasm`:
 * o build do stockfish.js lê `self.location.hash` do worker. Por isso este
 * arquivo precisa ser instanciado com o fragmento montado por
 * `buildEngineWorkerUrl`, por exemplo
 * `worker.js#/engine/stockfish/stockfish-18-lite-single.wasm,worker`.
 * Sem o fragmento o binário procura o `.wasm` ao lado do arquivo do bundle, que
 * não existe — por isso a fábrica sempre monta a URL com o fragmento.
 *
 * Quando o binário é carregado dentro de um worker ele instala o próprio
 * `onmessage`. Guardamos esse handler e o chamamos, em vez de sobrescrevê-lo:
 * é o único ponto de entrada de comandos UCI do build minificado.
 */

export {}

declare function importScripts(...urls: string[]): void

/** Só o que usamos do escopo de worker; o tsconfig não inclui a lib webworker. */
interface WorkerScope {
  location: { hash: string; origin: string; pathname: string }
  onmessage: ((event: { data: unknown }) => void) | null
  postMessage(message: unknown): void
}

const scope = self as unknown as WorkerScope

const ENGINE_SCRIPT_URL = '/engine/stockfish/stockfish-18-lite-single.js'

/**
 * Aceita a string crua do UCI e também `{ command }`, caso a camada de cima
 * queira mandar mensagens estruturadas no futuro.
 */
function toCommand(payload: unknown): string | null {
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const command = (payload as { command?: unknown }).command
    if (typeof command === 'string') return command
  }
  return null
}

function loadEngine(): void {
  importScripts(new URL(ENGINE_SCRIPT_URL, scope.location.origin).toString())
}

function bridge(): void {
  loadEngine()

  const engineHandler = scope.onmessage
  if (!engineHandler) {
    scope.postMessage('info string LanceZero: a engine não instalou onmessage')
    return
  }

  scope.onmessage = (event: { data: unknown }) => {
    const command = toCommand(event.data)
    if (command === null) return
    engineHandler({ data: command })
  }
}

bridge()
