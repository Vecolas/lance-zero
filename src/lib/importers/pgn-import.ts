/**
 * Importação de PGN colado ou de arquivo com várias partidas concatenadas.
 *
 * As regras de xadrez vêm inteiras de `@/lib/chess`; aqui só separamos o texto
 * em partidas, lemos cabeçalhos e montamos `Game`. Uma partida corrompida no
 * meio do lote não derruba as outras: o erro é acumulado e o lote segue.
 */
import type { Game } from '@/domain/types'
import { parsePgn } from '@/lib/chess'
import { hashString, normalizePgn } from './hash'

const RESULTS: ReadonlySet<string> = new Set(['1-0', '0-1', '1/2-1/2', '*'])

export interface PgnImportOptions {
  /**
   * Nome do usuário nos cabeçalhos `White`/`Black`, sem diferenciar
   * maiúsculas. Define `userColor`; sem ele, assumimos brancas.
   */
  username?: string
  /** Cor do usuário, quando ele informa em vez de deixar deduzir. */
  userColor?: Game['userColor']
  /** Relógio injetado, em milissegundos. */
  now?: () => number
}

/** Uma partida do lote que não pôde ser lida. */
export interface PgnImportIssue {
  /** Posição da partida no texto, começando em 1. */
  index: number
  message: string
  /** Primeiras linhas do trecho, para o usuário localizar o problema. */
  snippet: string
}

export interface PgnImportOutcome {
  games: Game[]
  issues: PgnImportIssue[]
}

/**
 * Separa o texto em partidas.
 *
 * O corte é no cabeçalho `[Event`, que abre toda partida pela especificação do
 * PGN. Só consideramos `[Event` em início de linha, para não cortar dentro de
 * um comentário.
 */
export function splitPgnGames(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const chunks: string[] = []
  let current: string[] = []
  let currentHasContent = false

  const flush = (): void => {
    const chunk = current.join('\n').trim()
    if (chunk !== '') {
      chunks.push(chunk)
    }
    current = []
    currentHasContent = false
  }

  for (const line of lines) {
    if (/^\[Event\s/.test(line) && currentHasContent) {
      flush()
    }
    current.push(line)
    if (line.trim() !== '') {
      currentHasContent = true
    }
  }
  flush()

  return chunks
}

/** Converte `2024.05.03` mais `19:30:00` num ISO em UTC. */
function toIsoDate(date: string | undefined, time: string | undefined): string | null {
  if (!date) {
    return null
  }
  const match = /^(\d{4})[.\-/](\d{2})[.\-/](\d{2})$/.exec(date.trim())
  if (!match) {
    return null
  }
  const [, year, month, day] = match
  const clock = /^(\d{2}):(\d{2}):(\d{2})$/.test(time?.trim() ?? '') ? time?.trim() : '00:00:00'
  const parsed = Date.parse(`${year}-${month}-${day}T${clock}Z`)
  if (Number.isNaN(parsed)) {
    return null
  }
  return new Date(parsed).toISOString()
}

function resultOf(headers: Record<string, string>): Game['result'] {
  const raw = headers.Result?.trim()
  if (raw && RESULTS.has(raw)) {
    return raw as Game['result']
  }
  return '*'
}

function colorOf(headers: Record<string, string>, options: PgnImportOptions): Game['userColor'] {
  if (options.userColor) {
    return options.userColor
  }
  const username = options.username?.trim().toLowerCase()
  if (!username) {
    return 'w'
  }
  return headers.Black?.trim().toLowerCase() === username ? 'b' : 'w'
}

/**
 * Lê um texto com uma ou mais partidas e devolve as que puderam ser lidas,
 * junto da lista de problemas.
 */
export function importPgnTextDetailed(
  text: string,
  options: PgnImportOptions = {},
): PgnImportOutcome {
  const now = options.now ?? (() => Date.now())
  const games: Game[] = []
  const issues: PgnImportIssue[] = []

  splitPgnGames(text).forEach((chunk, position) => {
    const index = position + 1
    try {
      const parsed = parsePgn(chunk)
      const headers = parsed.headers
      const importedAtMs = now()
      const playedAt =
        toIsoDate(headers.UTCDate ?? headers.Date, headers.UTCTime ?? headers.Time) ??
        new Date(importedAtMs).toISOString()

      games.push({
        id: `pgn:${hashString(normalizePgn(chunk))}`,
        source: 'pgn',
        pgn: chunk,
        playedAt,
        white: headers.White?.trim() || 'Anônimo',
        black: headers.Black?.trim() || 'Anônimo',
        userColor: colorOf(headers, options),
        result: resultOf(headers),
        importedAt: new Date(importedAtMs).toISOString(),
      })
    } catch (error) {
      issues.push({
        index,
        message: error instanceof Error ? error.message : 'Não consegui ler esta partida.',
        snippet: chunk.split('\n').slice(0, 3).join('\n'),
      })
    }
  })

  return { games, issues }
}

/** Atalho para quem só quer as partidas legíveis do lote. */
export function importPgnText(text: string, options: PgnImportOptions = {}): Game[] {
  return importPgnTextDetailed(text, options).games
}
