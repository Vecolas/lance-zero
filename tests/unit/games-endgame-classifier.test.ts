import { describe, expect, it } from 'vitest'
import { skillDeFinal } from '@/domain/games/endgame-classifier'
import { StockfishOpponent } from '@/domain/endgames'

describe('classificação de finais em partidas reais', () => {
  it('mapeia finais de peões e torres para habilidades de finais', () => {
    expect(skillDeFinal('8/8/8/4k3/4P3/4K3/8/8 w - - 0 1')).toBe('endgame.king-pawn-opposition')
    expect(skillDeFinal('8/8/8/4k3/4P3/4K3/8/R7 w - - 0 1')).toBe('endgame.rook-endgames')
  })
  it('não classifica posições de meio-jogo como finais', () => {
    expect(skillDeFinal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull()
  })
  it('valida a resposta do adapter Stockfish antes de entregá-la', async () => {
    const opponent = new StockfishOpponent(async () => 'e8e7')
    await expect(opponent.getMove('4k3/8/8/8/8/8/4K3/8 b - - 0 1', { moves: [] })).resolves.toMatchObject({ uci: 'e8e7', source: 'stockfish' })
  })
})
