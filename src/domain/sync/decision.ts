/**
 * Decisão de sincronização entre o aparelho e a cópia remota.
 *
 * O desenho é "última escrita vence" (ADR-0009), e essa escolha só é aceitável
 * porque existe este módulo: antes de sobrescrever, o app precisa saber se o
 * outro lado mudou desde a última vez que os dois estavam iguais. Sem isso,
 * treinar em dois aparelhos apagaria trabalho em silêncio — e "última escrita
 * vence" viraria "última escrita destrói".
 *
 * Puro de propósito: nenhuma chamada de rede aqui dentro, relógio por parâmetro.
 */

/** O que o aparelho lembra do último encontro bem-sucedido com o servidor. */
export interface SyncMarker {
  /** `updated_at` que o servidor tinha quando sincronizamos. */
  remoteUpdatedAt: string
  /** Quando o estado local foi sincronizado. */
  syncedAt: string
}

/** Cabeçalho da cópia remota. O payload não é preciso para decidir. */
export interface RemoteHead {
  updatedAt: string
  schemaVersion: number
  deviceLabel?: string
}

export interface SyncContext {
  /** Quando o estado local mudou pela última vez. `null` se nunca mudou. */
  localChangedAt: string | null
  /** `null` quando este aparelho nunca sincronizou. */
  marker: SyncMarker | null
  /** `null` quando não existe cópia no servidor. */
  remote: RemoteHead | null
  /** Versão de schema que este app entende. */
  localSchemaVersion: number
}

export type SyncAction =
  /** Nada a fazer: os dois lados batem. */
  | { acao: 'em-dia' }
  /** Só o local mudou: subir. */
  | { acao: 'enviar'; motivo: 'primeiro-envio' | 'local-mais-novo' }
  /** Só o remoto mudou: baixar. */
  | { acao: 'baixar'; motivo: 'primeiro-download' | 'remoto-mais-novo' }
  /** Os dois mudaram desde o último encontro. A UI precisa perguntar. */
  | { acao: 'conflito'; localChangedAt: string; remoteUpdatedAt: string }
  /** O servidor tem um formato que este app não sabe ler. */
  | { acao: 'bloqueado'; motivo: 'schema-remoto-mais-novo'; remoteSchemaVersion: number }

function maisNovo(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b)
}

/**
 * Decide o que fazer. Nunca decide sobrescrever quando os dois lados mudaram —
 * nesse caso devolve `conflito` e quem escolhe é o usuário.
 */
export function decideSync(context: SyncContext): SyncAction {
  const { localChangedAt, marker, remote, localSchemaVersion } = context

  if (remote && remote.schemaVersion > localSchemaVersion) {
    // Outro aparelho está numa versão mais nova do app. Sobrescrever aqui
    // rebaixaria o dado e perderia campos que este app nem sabe que existem.
    return {
      acao: 'bloqueado',
      motivo: 'schema-remoto-mais-novo',
      remoteSchemaVersion: remote.schemaVersion,
    }
  }

  if (!remote) {
    return localChangedAt ? { acao: 'enviar', motivo: 'primeiro-envio' } : { acao: 'em-dia' }
  }

  if (!marker) {
    // Aparelho novo, ou dados locais apagados. Sem marcador não dá para saber
    // se o local é evolução do remoto ou algo paralelo.
    if (!localChangedAt) return { acao: 'baixar', motivo: 'primeiro-download' }
    return {
      acao: 'conflito',
      localChangedAt,
      remoteUpdatedAt: remote.updatedAt,
    }
  }

  const remoteMudou = maisNovo(remote.updatedAt, marker.remoteUpdatedAt)
  const localMudou = localChangedAt !== null && maisNovo(localChangedAt, marker.syncedAt)

  if (remoteMudou && localMudou) {
    return { acao: 'conflito', localChangedAt: localChangedAt, remoteUpdatedAt: remote.updatedAt }
  }
  if (remoteMudou) return { acao: 'baixar', motivo: 'remoto-mais-novo' }
  if (localMudou) return { acao: 'enviar', motivo: 'local-mais-novo' }
  return { acao: 'em-dia' }
}

/** Como o usuário resolveu um conflito. Não há merge: ver ADR-0009. */
export type ConflictChoice = 'manter-este-aparelho' | 'usar-a-copia-do-servidor'

export function resolveConflict(escolha: ConflictChoice): SyncAction {
  return escolha === 'manter-este-aparelho'
    ? { acao: 'enviar', motivo: 'local-mais-novo' }
    : { acao: 'baixar', motivo: 'remoto-mais-novo' }
}

/** Texto para a UI. Conflito nunca é resolvido em silêncio. */
export function describeAction(action: SyncAction): string {
  switch (action.acao) {
    case 'em-dia':
      return 'Seu progresso já está igual em todos os aparelhos.'
    case 'enviar':
      return action.motivo === 'primeiro-envio'
        ? 'Enviando seu progresso para o servidor pela primeira vez.'
        : 'Enviando as mudanças deste aparelho.'
    case 'baixar':
      return action.motivo === 'primeiro-download'
        ? 'Baixando seu progresso de outro aparelho.'
        : 'Outro aparelho tem progresso mais recente. Baixando.'
    case 'conflito':
      return 'Você treinou neste aparelho e em outro sem sincronizar entre as sessões. Escolha qual versão manter — não dá para juntar as duas.'
    case 'bloqueado':
      return 'Outro aparelho está numa versão mais nova do LanceZero. Atualize este antes de sincronizar, senão perderia dados.'
  }
}
