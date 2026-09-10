/**
 * Notação UCI de um lance: `e2e4`, `e7e8q`.
 *
 * POR QUE MORA AQUI: UCI é notação de XADREZ, não de puzzles. Estas funções
 * nasceram em `@/domain/puzzles/parser` porque o dump do Lichess foi o primeiro
 * consumidor, e com isso o domínio de finais passou a importar do domínio de
 * puzzles — dois domínios que não têm nada a dizer um ao outro amarrados por um
 * detalhe de notação (issue #55, item 4). A engine, os puzzles, os finais e o
 * repertório falam todos UCI; nenhum deles deve ter de conhecer os outros para
 * isso.
 *
 * NÃO CONFUNDIR com `@/lib/engine/uci`, que fala o PROTOCOLO UCI (as linhas
 * `info depth ... pv ...` que o Stockfish escreve). Aqui é só o lance.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: `parseUci` devolve `null` para entrada mal
 * formada, e não lança. Quem chama é ora um pipeline de dados (onde a linha
 * ruim vira erro acumulado), ora a tela (onde é o usuário digitando) — e só o
 * chamador sabe qual dos dois é. Lançar aqui obrigaria os dois a envolver tudo
 * em `try`.
 *
 * O motivo de parsear explicitamente em vez de entregar a string ao `chess.js`
 * está em `linha-modelo.ts`: o adapter aceitaria a string pelo caminho tolerante
 * do parser de SAN, e um lance com forma errada viraria OUTRO lance em silêncio.
 */

import type { PromotionPiece, SquareName } from './types'

/**
 * Forma de um lance UCI. É a FONTE da validação: `isUci`, `parseUci` e o
 * parser do dump de puzzles perguntam todos a este padrão, para não existir a
 * possibilidade de um deles aceitar o que outro recusa.
 */
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][nbrq]?$/

export interface UciMove {
  from: SquareName
  to: SquareName
  promotion?: PromotionPiece
}

/** Normaliza um lance UCI: sem espaços, minúsculo. */
export function normalizeUci(uci: string): string {
  return uci.trim().toLowerCase()
}

export function isUci(uci: string): boolean {
  return UCI_PATTERN.test(normalizeUci(uci))
}

/**
 * Quebra `e7e8q` em `{ from, to, promotion }`. Devolve `null` para entrada que
 * nem sequer tem forma de UCI — cabe ao chamador decidir se isso é erro de
 * dados ou lance digitado errado pelo usuário.
 */
export function parseUci(uci: string): UciMove | null {
  const limpo = normalizeUci(uci)
  if (!UCI_PATTERN.test(limpo)) return null
  const promotion = limpo.length === 5 ? (limpo[4] as PromotionPiece) : undefined
  return { from: limpo.slice(0, 2), to: limpo.slice(2, 4), promotion }
}
