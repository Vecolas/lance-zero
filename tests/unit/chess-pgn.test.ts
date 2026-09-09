import { describe, expect, it } from 'vitest'
import { ChessParseError, gameFromFen, parsePgn, START_FEN, toPgn } from '@/lib/chess'
import { comComentarios, comRoque, matePastor } from '../fixtures/games'
import { positions } from '../fixtures/positions'

describe('parsePgn', () => {
  it('lê cabeçalhos e a linha principal', () => {
    const game = parsePgn(matePastor)
    expect(game.headers.White).toBe('Brancas')
    expect(game.headers.Result).toBe('1-0')
    expect(game.startFen).toBe(START_FEN)
    expect(game.plies).toHaveLength(7)
    expect(game.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'])
  })

  it('preenche FEN antes e depois de cada meio-lance', () => {
    const game = parsePgn(matePastor)
    expect(game.plies[0].fenBefore).toBe(START_FEN)
    for (let i = 1; i < game.plies.length; i += 1) {
      expect(game.plies[i].fenBefore).toBe(game.plies[i - 1].fenAfter)
    }
  })

  it('alterna cores e numera os lances', () => {
    const game = parsePgn(matePastor)
    expect(game.plies[0]).toMatchObject({ color: 'w', moveNumber: 1, index: 1 })
    expect(game.plies[1]).toMatchObject({ color: 'b', moveNumber: 1, index: 2 })
    expect(game.plies[2]).toMatchObject({ color: 'w', moveNumber: 2, index: 3 })
  })

  it('registra roque com as casas certas', () => {
    const game = parsePgn(comRoque)
    const roqueBrancas = game.plies.find((p) => p.san === 'O-O' && p.color === 'w')
    expect(roqueBrancas).toMatchObject({ from: 'e1', to: 'g1', uci: 'e1g1' })
  })

  it('aceita comentários e variações sem quebrar, mantendo só a linha principal', () => {
    const game = parsePgn(comComentarios)
    expect(game.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
  })

  it('rejeita entradas inválidas com erro tipado', () => {
    expect(() => parsePgn('')).toThrow(ChessParseError)
    expect(() => parsePgn('   ')).toThrow(ChessParseError)
    expect(() => parsePgn('[White "x"]')).toThrow(ChessParseError)
  })
})

describe('toPgn', () => {
  it('faz round-trip da linha principal', () => {
    const game = parsePgn(matePastor)
    const voltou = parsePgn(toPgn(game))
    expect(voltou.plies.map((p) => p.san)).toEqual(game.plies.map((p) => p.san))
    expect(voltou.headers.White).toBe('Brancas')
  })
})

describe('gameFromFen', () => {
  it('cria uma partida vazia a partir de uma posição', () => {
    const game = gameFromFen(positions.promocao)
    expect(game.plies).toHaveLength(0)
    expect(game.startFen).toBe(positions.promocao)
    expect(game.headers.FEN).toBe(positions.promocao)
  })
})
