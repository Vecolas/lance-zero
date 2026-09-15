import type { SkillId } from '@/domain/types'

/** Classificação conservadora para que erros de partidas reais alimentem finais
 * apenas quando a posição tem material inequívoco. */
export function skillDeFinal(fen: string): SkillId | null {
  const board = fen.trim().split(/\s+/)[0] ?? ''
  const pieces = [...board.replace(/[\d/]/g, '')]
  if (pieces.length > 10 || !pieces.includes('K') || !pieces.includes('k')) return null
  const minors = pieces.filter((piece) => 'BNbn'.includes(piece)).length
  const rooks = pieces.filter((piece) => 'Rr'.includes(piece)).length
  const queens = pieces.filter((piece) => 'Qq'.includes(piece)).length
  const pawns = pieces.filter((piece) => 'Pp'.includes(piece)).length
  if (queens === 0 && rooks === 0 && minors === 0 && pawns > 0) return 'endgame.king-pawn-opposition'
  if (rooks > 0) return 'endgame.rook-endgames'
  if (queens > 0 || minors > 0) return 'endgame.basic-mates'
  return null
}
