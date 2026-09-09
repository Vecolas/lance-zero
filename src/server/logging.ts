/**
 * Log mínimo de segurança.
 *
 * Referência do plano: seção 89 (o que NUNCA logar) e 90 (log mínimo).
 *
 * O formato é o da seção 90: evento, requestId, ator pseudonimizado, sucesso,
 * timestamp. Nada de header, cookie, sessão, token, corpo da requisição ou
 * linha do banco. Um log que ajuda a investigar não precisa conter o dado que
 * está sendo protegido.
 */

/** Evento estruturado. Campos fixos de propósito: campo livre vira vazamento. */
export interface SecurityLogEvent {
  /** Nome curto e estável, ex.: `profile_update`. */
  event: string
  requestId: string
  /** Pseudônimo do ator. NUNCA o `user_id` cru. `null` quando anônimo. */
  actorHash: string | null
  success: boolean
  timestamp: string
  /**
   * Detalhe técnico do erro. Fica SÓ aqui, no servidor. Nunca é devolvido ao
   * navegador (ver `AppError.toClientPayload`).
   */
  detail?: string
}

export interface SecurityLogger {
  log(event: SecurityLogEvent): void
}

/**
 * Pseudônimo determinístico do `user_id` (FNV-1a, 32 bits, em hexadecimal).
 *
 * Honestidade sobre o que isto é: NÃO é um controle criptográfico. É um hash
 * curto e sem sal, reversível por força bruta se alguém tiver a lista de IDs.
 * Serve para correlacionar linhas de log do mesmo usuário sem escrever o
 * identificador em texto claro — e para nada além disso. Se algum dia o log
 * precisar de anonimização de verdade, troque por HMAC com chave rotacionada.
 */
export function hashActor(userId: string): string {
  let hash = 0x811c9dc5

  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

/** Logger padrão: uma linha JSON por evento. */
export const consoleSecurityLogger: SecurityLogger = {
  log(event: SecurityLogEvent): void {
    console.info(JSON.stringify(event))
  },
}

/** Logger que não escreve nada. Útil em teste e em ambiente sem coleta. */
export const noopSecurityLogger: SecurityLogger = {
  log(): void {},
}
