/**
 * Deduplicação de importação.
 *
 * Importar duas vezes o mesmo mês, ou colar um PGN que já veio da Lichess, tem
 * de ser inofensivo. A chave preferida é `(source, sourceGameId)`; quando não
 * há id de origem — PGN colado —, caímos num hash estável do PGN normalizado,
 * feito em TypeScript puro porque isso roda no navegador.
 */
import type { Game, ImportResult } from '@/domain/types'
import { hashString, normalizePgn } from './hash'

export interface DedupeOutcome {
  /** Contagem para mostrar ao usuário no fim da importação. */
  result: ImportResult
  /** Só as partidas novas e válidas, na ordem em que chegaram. */
  toSave: Game[]
}

/**
 * Chave de deduplicação de uma partida.
 *
 * O hash de PGN não leva a origem: a mesma partida colada à mão e baixada da
 * API deve colidir de propósito.
 */
export function gameKey(game: Game): string {
  const sourceGameId = game.sourceGameId?.trim()
  if (sourceGameId) {
    return `${game.source}:${sourceGameId}`
  }
  return `pgn:${hashString(normalizePgn(game.pgn))}`
}

/** Uma partida sem PGN e sem id de origem não dá para treinar nem identificar. */
function isUsable(game: Game): boolean {
  return game.pgn.trim() !== '' || (game.sourceGameId?.trim() ?? '') !== ''
}

/**
 * Compara as partidas novas com as já guardadas.
 *
 * `ignoradas` conta as inválidas; `duplicadas` conta as que já existiam ou que
 * vieram repetidas dentro do próprio lote.
 */
export function dedupeGames(existentes: readonly Game[], novas: readonly Game[]): DedupeOutcome {
  const seen = new Set<string>()
  for (const game of existentes) {
    seen.add(gameKey(game))
  }

  const toSave: Game[] = []
  let duplicadas = 0
  let ignoradas = 0

  for (const game of novas) {
    if (!isUsable(game)) {
      ignoradas += 1
      continue
    }
    const key = gameKey(game)
    if (seen.has(key)) {
      duplicadas += 1
      continue
    }
    seen.add(key)
    toSave.push(game)
  }

  return {
    result: { importadas: toSave.length, duplicadas, ignoradas },
    toSave,
  }
}
