import { describe, expect, it } from 'vitest'
import {
  applyMove,
  isLegalMove,
  isValidFen,
  legalMoves,
  normalizeFen,
  positionStatus,
  START_FEN,
} from '@/lib/chess'
import { positions } from '../fixtures/positions'

describe('validação de FEN', () => {
  it('aceita a posição inicial e rejeita lixo', () => {
    expect(isValidFen(START_FEN)).toBe(true)
    expect(isValidFen('não é um fen')).toBe(false)
    expect(isValidFen('')).toBe(false)
  })

  it('faz round-trip da posição inicial', () => {
    expect(normalizeFen(START_FEN)).toBe(START_FEN)
  })
})

describe('lances legais', () => {
  it('a posição inicial tem 20 lances', () => {
    expect(legalMoves(START_FEN)).toHaveLength(20)
  })

  it('filtra por casa de origem', () => {
    const moves = legalMoves(START_FEN, 'e2')
    expect(moves.map((m) => m.san).sort()).toEqual(['e3', 'e4'])
  })

  it('reconhece en passant e marca a captura', () => {
    const ep = legalMoves(positions.enPassant).find((m) => m.san === 'exd6')
    expect(ep).toBeDefined()
    expect(ep?.isEnPassant).toBe(true)
    expect(ep?.isCapture).toBe(true)
    expect(ep?.uci).toBe('e5d6')
  })

  it('gera as quatro promoções com o sufixo correto em UCI', () => {
    const promos = legalMoves(positions.promocao).filter((m) => m.isPromotion)
    expect(promos).toHaveLength(4)
    expect(promos.map((m) => m.uci).sort()).toEqual(['b7b8b', 'b7b8n', 'b7b8q', 'b7b8r'])
  })

  it('oferece os dois roques quando o caminho está livre', () => {
    const castles = legalMoves(positions.roqueLivre).filter((m) => m.isCastle)
    expect(castles.map((m) => m.san).sort()).toEqual(['O-O', 'O-O-O'])
  })

  it('não oferece roque com o rei em xeque', () => {
    expect(positionStatus(positions.roqueEmXeque).inCheck).toBe(true)
    expect(legalMoves(positions.roqueEmXeque).filter((m) => m.isCastle)).toHaveLength(0)
  })

  it('marca xeque-mate no lance que dá mate', () => {
    const mate = legalMoves(positions.mateEmUm).find((m) => m.san === 'Qxf7#')
    expect(mate?.isCheckmate).toBe(true)
    expect(mate?.isCheck).toBe(true)
  })
})

describe('aplicar lance', () => {
  it('aceita SAN e objeto from/to', () => {
    expect(applyMove(START_FEN, 'e4')?.move.uci).toBe('e2e4')
    expect(applyMove(START_FEN, { from: 'e2', to: 'e4' })?.move.san).toBe('e4')
  })

  it('devolve null para lance ilegal, sem lançar', () => {
    expect(applyMove(START_FEN, 'e5')).toBeNull()
    expect(applyMove(START_FEN, { from: 'e2', to: 'e5' })).toBeNull()
    expect(isLegalMove(START_FEN, 'Ke2')).toBe(false)
  })

  it('exige a peça de promoção', () => {
    expect(applyMove(positions.promocao, { from: 'b7', to: 'b8' })).toBeNull()
    expect(applyMove(positions.promocao, { from: 'b7', to: 'b8', promotion: 'q' })?.move.uci).toBe(
      'b7b8q',
    )
  })

  it('não altera o FEN de origem', () => {
    const before = START_FEN
    applyMove(before, 'e4')
    expect(before).toBe(START_FEN)
  })
})

describe('status da posição', () => {
  it('classifica mate, afogamento e material insuficiente', () => {
    const mate = applyMove(positions.mateEmUm, 'Qxf7#')
    expect(positionStatus(mate!.fenAfter).outcome).toBe('mate')
    expect(positionStatus(positions.afogamento).outcome).toBe('afogamento')
    expect(positionStatus(positions.materialInsuficiente).outcome).toBe('material-insuficiente')
  })

  it('reporta o lado que joga e o número do lance', () => {
    const status = positionStatus(START_FEN)
    expect(status.turn).toBe('w')
    expect(status.moveNumber).toBe(1)
    expect(status.isGameOver).toBe(false)
  })
})
