import { describe, expect, it } from 'vitest'

import {
  normalizeScoreToWhite,
  normalizeWdlToWhite,
  parseBestMove,
  parseInfoLine,
  parseUciLine,
  turnFromFen,
} from '@/lib/engine/uci'

describe('parseInfoLine', () => {
  it('lê profundidade, multipv, score em centipeões, nós e pv', () => {
    const info = parseInfoLine(
      'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 120000 pv e2e4 e7e5 g1f3',
    )

    expect(info).not.toBeNull()
    expect(info?.depth).toBe(12)
    expect(info?.seldepth).toBe(18)
    expect(info?.multiPv).toBe(1)
    expect(info?.scoreCp).toBe(34)
    expect(info?.mateIn).toBeNull()
    expect(info?.nodes).toBe(120000)
    expect(info?.pv).toEqual(['e2e4', 'e7e5', 'g1f3'])
  })

  it('lê score negativo sem confundir com o resto da linha', () => {
    const info = parseInfoLine('info depth 9 multipv 2 score cp -145 nodes 50 pv d7d5')

    expect(info?.scoreCp).toBe(-145)
    expect(info?.multiPv).toBe(2)
    expect(info?.pv).toEqual(['d7d5'])
  })

  it('lê mate a favor e mate sofrido', () => {
    const favor = parseInfoLine('info depth 20 score mate 3 nodes 10 pv h5f7 e8f7 d1f3')
    const contra = parseInfoLine('info depth 20 score mate -2 nodes 10 pv a1a2')

    expect(favor?.mateIn).toBe(3)
    expect(favor?.scoreCp).toBeNull()
    expect(contra?.mateIn).toBe(-2)
  })

  it('lê wdl em partes por mil', () => {
    const info = parseInfoLine('info depth 14 score cp 25 wdl 120 700 180 nodes 900 pv e2e4')

    expect(info?.wdl).toEqual({ win: 120, draw: 700, loss: 180 })
    expect(info?.scoreCp).toBe(25)
    expect(info?.nodes).toBe(900)
  })

  it('marca lowerbound e upperbound sem quebrar a leitura seguinte', () => {
    const info = parseInfoLine('info depth 7 score cp 40 lowerbound nodes 77 pv e2e4')

    expect(info?.bound).toBe('lower')
    expect(info?.nodes).toBe(77)
    expect(info?.pv).toEqual(['e2e4'])
  })

  it('preserva o texto de uma linha info string', () => {
    const info = parseInfoLine('info string NNUE evaluation using nn-9067e33176e')

    expect(info?.text).toBe('NNUE evaluation using nn-9067e33176e')
    expect(info?.pv).toEqual([])
  })

  it('ignora tokens desconhecidos', () => {
    const info = parseInfoLine('info depth 5 tbhits 0 cpuload 812 score cp 8 nodes 4 pv b1c3')

    expect(info?.depth).toBe(5)
    expect(info?.scoreCp).toBe(8)
    expect(info?.pv).toEqual(['b1c3'])
  })

  it('retorna null para linha que não é info', () => {
    expect(parseInfoLine('bestmove e2e4')).toBeNull()
    expect(parseInfoLine('readyok')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('lê bestmove com ponder', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({
      bestMove: 'e2e4',
      ponder: 'e7e5',
    })
  })

  it('lê bestmove sem ponder', () => {
    expect(parseBestMove('bestmove g1f3')).toEqual({ bestMove: 'g1f3', ponder: null })
  })

  it('trata (none) como ausência de lance', () => {
    expect(parseBestMove('bestmove (none)')).toEqual({ bestMove: null, ponder: null })
  })

  it('retorna null para linha que não é bestmove', () => {
    expect(parseBestMove('info depth 1 score cp 0 pv e2e4')).toBeNull()
  })
})

describe('parseUciLine', () => {
  it('reconhece uciok e readyok', () => {
    expect(parseUciLine('uciok')).toEqual({ type: 'uciok' })
    expect(parseUciLine('readyok')).toEqual({ type: 'readyok' })
  })

  it('reconhece info, bestmove e id', () => {
    const info = parseUciLine('info depth 3 score cp 12 nodes 10 pv e2e4')
    const best = parseUciLine('bestmove e2e4 ponder e7e5')
    const id = parseUciLine('id name Stockfish 18')

    expect(info.type).toBe('info')
    expect(best).toEqual({ type: 'bestmove', bestMove: 'e2e4', ponder: 'e7e5' })
    expect(id).toEqual({ type: 'id', field: 'name', value: 'Stockfish 18' })
  })

  it('devolve unknown para linha não reconhecida', () => {
    expect(parseUciLine('Stockfish 18 by the Stockfish developers')).toEqual({
      type: 'unknown',
      raw: 'Stockfish 18 by the Stockfish developers',
    })
  })
})

describe('normalização de perspectiva', () => {
  it('mantém o score quando as brancas jogam e inverte quando as pretas jogam', () => {
    expect(normalizeScoreToWhite(34, 'w')).toBe(34)
    expect(normalizeScoreToWhite(34, 'b')).toBe(-34)
    expect(normalizeScoreToWhite(-120, 'b')).toBe(120)
  })

  it('aplica a mesma regra à distância de mate', () => {
    expect(normalizeScoreToWhite(3, 'b')).toBe(-3)
    expect(normalizeScoreToWhite(-2, 'b')).toBe(2)
  })

  it('troca win e loss do wdl quando as pretas jogam', () => {
    const wdl = { win: 120, draw: 700, loss: 180 }

    expect(normalizeWdlToWhite(wdl, 'w')).toEqual(wdl)
    expect(normalizeWdlToWhite(wdl, 'b')).toEqual({ win: 180, draw: 700, loss: 120 })
  })

  it('não muta o wdl de entrada', () => {
    const wdl = { win: 1, draw: 2, loss: 3 }
    normalizeWdlToWhite(wdl, 'b')

    expect(wdl).toEqual({ win: 1, draw: 2, loss: 3 })
  })
})

describe('turnFromFen', () => {
  it('lê o lado que joga', () => {
    expect(turnFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('w')
    expect(turnFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('b')
  })

  it('assume brancas quando o campo falta', () => {
    expect(turnFromFen('8/8/8/8/8/8/8/8')).toBe('w')
  })
})
