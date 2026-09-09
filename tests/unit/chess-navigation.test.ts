import { describe, expect, it } from 'vitest'
import {
  clampPly,
  fenAtPly,
  gameFromFen,
  highlightedSquares,
  navigate,
  parsePgn,
  playMove,
  plyAt,
  START_FEN,
  toMovePairs,
} from '@/lib/chess'
import { matePastor } from '../fixtures/games'
import { positions } from '../fixtures/positions'

const partida = parsePgn(matePastor)

describe('clampPly', () => {
  it('prende o índice entre 0 e o último meio-lance', () => {
    expect(clampPly(partida, -5)).toBe(0)
    expect(clampPly(partida, 3)).toBe(3)
    expect(clampPly(partida, 99)).toBe(7)
    expect(clampPly(partida, Number.NaN)).toBe(0)
  })
})

describe('fenAtPly', () => {
  it('o ply 0 é a posição inicial', () => {
    expect(fenAtPly(partida, 0)).toBe(START_FEN)
  })

  it('o ply n é a posição depois do n-ésimo meio-lance', () => {
    expect(fenAtPly(partida, 1)).toBe(partida.plies[0].fenAfter)
    expect(fenAtPly(partida, 7)).toBe(partida.plies[6].fenAfter)
  })
})

describe('navigate', () => {
  it('anda para os quatro extremos sem sair da faixa', () => {
    expect(navigate(partida, 3, 'primeiro')).toBe(0)
    expect(navigate(partida, 3, 'anterior')).toBe(2)
    expect(navigate(partida, 3, 'proximo')).toBe(4)
    expect(navigate(partida, 3, 'ultimo')).toBe(7)
    expect(navigate(partida, 0, 'anterior')).toBe(0)
    expect(navigate(partida, 7, 'proximo')).toBe(7)
  })
})

describe('plyAt e destaques', () => {
  it('não há lance destacado na posição inicial', () => {
    expect(plyAt(partida, 0)).toBeNull()
    expect(highlightedSquares(partida, 0)).toEqual([])
  })

  it('destaca origem e destino do lance que chegou até aqui', () => {
    expect(highlightedSquares(partida, 1)).toEqual(['e2', 'e4'])
  })
})

describe('toMovePairs', () => {
  it('agrupa em pares e deixa o último lance branco sem par', () => {
    const pares = toMovePairs(partida)
    expect(pares).toHaveLength(4)
    expect(pares[0]).toMatchObject({ moveNumber: 1 })
    expect(pares[0].white?.san).toBe('e4')
    expect(pares[0].black?.san).toBe('e5')
    expect(pares[3].white?.san).toBe('Qxf7#')
    expect(pares[3].black).toBeNull()
  })

  it('lida com uma partida que começa pelas pretas', () => {
    const meioDeJogo = gameFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2')
    const jogado = playMove(meioDeJogo, 0, 'Nc6')
    const pares = toMovePairs(jogado!.game)
    expect(pares).toHaveLength(1)
    expect(pares[0].white).toBeNull()
    expect(pares[0].black?.san).toBe('Nc6')
  })
})

describe('playMove', () => {
  it('acrescenta o lance no fim da linha', () => {
    const inicio = gameFromFen(START_FEN)
    const resultado = playMove(inicio, 0, 'e4')
    expect(resultado?.ply).toBe(1)
    expect(resultado?.game.plies.map((p) => p.san)).toEqual(['e4'])
  })

  it('devolve null para lance ilegal e não altera a partida', () => {
    const inicio = gameFromFen(START_FEN)
    expect(playMove(inicio, 0, 'e5')).toBeNull()
    expect(inicio.plies).toHaveLength(0)
  })

  it('descarta os lances seguintes ao jogar no meio da linha', () => {
    const resultado = playMove(partida, 2, 'Nf3')
    expect(resultado?.ply).toBe(3)
    expect(resultado?.game.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3'])
    // A partida original continua intacta.
    expect(partida.plies).toHaveLength(7)
  })

  it('respeita a promoção', () => {
    const promo = gameFromFen(positions.promocao)
    expect(playMove(promo, 0, { from: 'b7', to: 'b8' })).toBeNull()
    const virou = playMove(promo, 0, { from: 'b7', to: 'b8', promotion: 'q' })
    expect(virou?.game.plies[0].san).toBe('b8=Q+')
  })
})
