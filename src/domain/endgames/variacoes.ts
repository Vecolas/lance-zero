import { isValidFen } from '@/lib/chess'
import type { EndgamePosition } from './catalogo'

/** Transformações simples e explícitas; conteúdo ainda precisa declarar o propósito. */
export function espelharHorizontalmenteFen(fen: string): string {
  const fields = fen.trim().split(/\s+/)
  const ranks = (fields[0] ?? '').split('/').map((rank) => rank.split('').reverse().join(''))
  return [ranks.join('/'), ...fields.slice(1)].join(' ')
}

export function validarPosicaoDeFinal(
  position: EndgamePosition,
): { ok: true } | { ok: false; reason: string } {
  if (!isValidFen(position.fen)) return { ok: false, reason: 'FEN inválida.' }
  if (position.difficulty < 1 || position.difficulty > 5)
    return { ok: false, reason: 'Dificuldade fora de 1–5.' }
  if (position.conceptIds.length === 0)
    return { ok: false, reason: 'A posição precisa declarar um conceito.' }
  return { ok: true }
}
