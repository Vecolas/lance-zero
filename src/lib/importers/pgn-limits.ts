/**
 * Limites do PGN como entrada NÃO CONFIÁVEL.
 *
 * Seção 125 do plano de segurança. Um PGN pode chegar colado por qualquer
 * pessoa, e o parser roda na thread principal do navegador: sem teto, um texto
 * de alguns megabytes trava a aba do próprio usuário, e um texto com milhares
 * de partidas enche o IndexedDB dele.
 *
 * Isto não é antivírus: é um teto para que entrada absurda seja recusada com
 * mensagem em vez de degradar o app.
 */

export interface PgnLimits {
  maxCaracteres: number
  maxPartidas: number
  maxCaracteresPorPartida: number
  maxComentarios: number
  maxCaracteresPorComentario: number
}

/** Tetos. Heurísticas de produto, generosas para uso real e apertadas para abuso. */
export const PGN_LIMITS: PgnLimits = {
  /** ~2 MB de texto. Uma partida longa raramente passa de 8 KB. */
  maxCaracteres: 2_000_000,
  /** Partidas por lote. Acima disso, importe em partes. */
  maxPartidas: 500,
  /** Caracteres de uma única partida. */
  maxCaracteresPorPartida: 100_000,
  /** Comentários por partida. PGN anotado de verdade raramente passa disso. */
  maxComentarios: 500,
  /** Tamanho de um comentário. */
  maxCaracteresPorComentario: 2_000,
}

export type PgnLimitCode =
  | 'texto-grande-demais'
  | 'partidas-demais'
  | 'partida-grande-demais'
  | 'comentarios-demais'
  | 'comentario-grande-demais'
  | 'caracteres-de-controle'

export class PgnLimitError extends Error {
  readonly code: PgnLimitCode

  constructor(code: PgnLimitCode, message: string) {
    super(message)
    this.name = 'PgnLimitError'
    this.code = code
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Caracteres de controle não têm o que fazer num PGN.
 *
 * Deixamos passar tab, LF e CR. O resto é sinal de arquivo binário renomeado ou
 * de tentativa de confundir quem for exibir o texto depois.
 */
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

export function assertTextoDentroDoLimite(texto: string, limits: PgnLimits = PGN_LIMITS): void {
  if (texto.length > limits.maxCaracteres) {
    throw new PgnLimitError(
      'texto-grande-demais',
      `Este PGN tem ${texto.length.toLocaleString('pt-BR')} caracteres; o limite é ${limits.maxCaracteres.toLocaleString('pt-BR')}. Importe em partes.`,
    )
  }
  if (CONTROLE.test(texto)) {
    throw new PgnLimitError(
      'caracteres-de-controle',
      'Este arquivo tem caracteres de controle e não parece ser um PGN de texto.',
    )
  }
}

export function assertQuantidadeDePartidas(
  quantidade: number,
  limits: PgnLimits = PGN_LIMITS,
): void {
  if (quantidade > limits.maxPartidas) {
    throw new PgnLimitError(
      'partidas-demais',
      `Este lote tem ${quantidade} partidas; o limite é ${limits.maxPartidas}. Importe em partes.`,
    )
  }
}

/** Confere uma partida isolada. Devolve o erro em vez de lançar, para o lote seguir. */
export function verificarPartida(
  chunk: string,
  limits: PgnLimits = PGN_LIMITS,
): PgnLimitError | null {
  if (chunk.length > limits.maxCaracteresPorPartida) {
    return new PgnLimitError(
      'partida-grande-demais',
      `Partida com ${chunk.length.toLocaleString('pt-BR')} caracteres, acima do limite de ${limits.maxCaracteresPorPartida.toLocaleString('pt-BR')}.`,
    )
  }

  const comentarios = chunk.match(/\{[^}]*\}/g) ?? []
  if (comentarios.length > limits.maxComentarios) {
    return new PgnLimitError(
      'comentarios-demais',
      `Partida com ${comentarios.length} comentários, acima do limite de ${limits.maxComentarios}.`,
    )
  }
  const gigante = comentarios.find((c) => c.length > limits.maxCaracteresPorComentario)
  if (gigante) {
    return new PgnLimitError(
      'comentario-grande-demais',
      `Comentário com ${gigante.length.toLocaleString('pt-BR')} caracteres, acima do limite de ${limits.maxCaracteresPorComentario.toLocaleString('pt-BR')}.`,
    )
  }
  return null
}
