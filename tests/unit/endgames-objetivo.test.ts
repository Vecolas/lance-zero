/**
 * Testes de `avaliarObjetivo`, `contarPecas` e `posicaoEhJogavel`.
 *
 * Cada objetivo é exercitado nos TRÊS estados: cumprido, falhou e em-andamento.
 * Régua que só conhece o caso feliz aprova qualquer coisa.
 */

import { describe, expect, it } from 'vitest'
import {
  TIPOS_DE_OBJETIVO,
  avaliarObjetivo,
  contarPecas,
  posicaoEhJogavel,
  reproduzirLinhaModelo,
  type ObjetivoFinal,
  type PosicaoDeFinal,
} from '@/domain/endgames'

const MATE_EM_1: ObjetivoFinal = { tipo: 'mate-em', lancesMaximos: 1 }
const PROMOVER: ObjetivoFinal = { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 }
const EMPATAR: ObjetivoFinal = { tipo: 'empate-defendido' }

describe('avaliarObjetivo — mate em N', () => {
  it('reconhece o mate aplicado dentro do prazo', () => {
    // Brancas deram mate: pretas a jogar e em xeque-mate.
    const resultado = avaliarObjetivo('Q6k/8/6K1/8/8/8/8/8 b - - 1 1', MATE_EM_1, {
      ladoDoAluno: 'w',
      lancesDoAluno: 1,
    })
    expect(resultado).toEqual({ estado: 'cumprido', motivo: 'mate-aplicado' })
  })

  it('reprova o mesmo mate quando o aluno gastou lances demais', () => {
    const resultado = avaliarObjetivo('Q6k/8/6K1/8/8/8/8/8 b - - 1 1', MATE_EM_1, {
      ladoDoAluno: 'w',
      lancesDoAluno: 2,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'lances-esgotados' })
  })

  it('trata afogamento como falha, não como fim neutro', () => {
    // Pretas a jogar, sem lance legal e sem xeque.
    const resultado = avaliarObjetivo('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', MATE_EM_1, {
      ladoDoAluno: 'w',
      lancesDoAluno: 1,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'afogamento-indevido' })
  })

  it('reprova quando o prazo acabou sem mate', () => {
    const resultado = avaliarObjetivo('7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', MATE_EM_1, {
      ladoDoAluno: 'w',
      lancesDoAluno: 1,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'lances-esgotados' })
  })

  it('segue em andamento enquanto há prazo', () => {
    const resultado = avaliarObjetivo('7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', MATE_EM_1, {
      ladoDoAluno: 'w',
      lancesDoAluno: 0,
    })
    expect(resultado.estado).toBe('em-andamento')
  })

  it('levar mate derruba o objetivo de dar mate', () => {
    const resultado = avaliarObjetivo('Q6k/8/6K1/8/8/8/8/8 b - - 1 1', MATE_EM_1, {
      ladoDoAluno: 'b',
      lancesDoAluno: 1,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'aluno-recebeu-mate' })
  })
})

describe('avaliarObjetivo — promoção', () => {
  it('reconhece a dama nova no tabuleiro', () => {
    const resultado = avaliarObjetivo('Q6k/8/8/8/8/8/8/7K b - - 0 1', PROMOVER, {
      ladoDoAluno: 'w',
      lancesDoAluno: 3,
    })
    expect(resultado).toEqual({ estado: 'cumprido', motivo: 'promocao-alcancada' })
  })

  it('segue em andamento com o peão ainda a caminho', () => {
    const resultado = avaliarObjetivo('7k/8/8/P7/8/8/8/7K w - - 0 1', PROMOVER, {
      ladoDoAluno: 'w',
      lancesDoAluno: 0,
    })
    expect(resultado.estado).toBe('em-andamento')
  })

  it('reprova quando não sobrou peão para promover', () => {
    const resultado = avaliarObjetivo('7k/8/8/8/8/8/8/7K w - - 0 1', PROMOVER, {
      ladoDoAluno: 'w',
      lancesDoAluno: 4,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'sem-peao-para-promover' })
  })

  it('exigir duas damas não se satisfaz com uma', () => {
    const resultado = avaliarObjetivo(
      'Q6k/P7/8/8/8/8/8/7K b - - 0 1',
      {
        tipo: 'promocao',
        peca: 'q',
        quantidadeMinima: 2,
      },
      { ladoDoAluno: 'w', lancesDoAluno: 3 },
    )
    expect(resultado.estado).toBe('em-andamento')
  })
})

describe('avaliarObjetivo — empate defendido', () => {
  it('reconhece o afogamento como empate defendido', () => {
    const resultado = avaliarObjetivo('k7/P7/K7/8/8/8/8/8 b - - 0 1', EMPATAR, {
      ladoDoAluno: 'b',
      lancesDoAluno: 4,
    })
    expect(resultado).toEqual({ estado: 'cumprido', motivo: 'empate-alcancado' })
  })

  it('reconhece material insuficiente como empate defendido', () => {
    const resultado = avaliarObjetivo('8/k7/8/8/8/8/8/K7 w - - 0 1', EMPATAR, {
      ladoDoAluno: 'b',
      lancesDoAluno: 3,
    })
    expect(resultado).toEqual({ estado: 'cumprido', motivo: 'empate-alcancado' })
  })

  it('não dá o empate por antecipado com peça ainda no tabuleiro', () => {
    const resultado = avaliarObjetivo('3k4/8/8/P7/8/8/8/K7 b - - 0 1', EMPATAR, {
      ladoDoAluno: 'b',
      lancesDoAluno: 0,
    })
    expect(resultado.estado).toBe('em-andamento')
  })

  it('levar mate derruba a defesa do empate', () => {
    const resultado = avaliarObjetivo('Q6k/8/6K1/8/8/8/8/8 b - - 1 1', EMPATAR, {
      ladoDoAluno: 'b',
      lancesDoAluno: 5,
    })
    expect(resultado).toEqual({ estado: 'falhou', motivo: 'aluno-recebeu-mate' })
  })
})

describe('avaliarObjetivo — contrato', () => {
  it('FEN inválido lança em vez de virar "em andamento"', () => {
    expect(() =>
      avaliarObjetivo('isto não é um fen', MATE_EM_1, { ladoDoAluno: 'w', lancesDoAluno: 0 }),
    ).toThrow()
  })

  it('todo tipo declarado em TIPOS_DE_OBJETIVO é tratado sem lançar', () => {
    const exemplos: Record<(typeof TIPOS_DE_OBJETIVO)[number], ObjetivoFinal> = {
      'mate-em': MATE_EM_1,
      promocao: PROMOVER,
      'empate-defendido': EMPATAR,
    }
    let verificados = 0
    for (const tipo of TIPOS_DE_OBJETIVO) {
      const resultado = avaliarObjetivo('3k4/8/8/P7/8/8/8/K7 b - - 0 1', exemplos[tipo], {
        ladoDoAluno: 'b',
        lancesDoAluno: 0,
      })
      expect(resultado.estado, tipo).toBeTruthy()
      verificados += 1
    }
    expect(verificados, 'nenhum tipo de objetivo foi exercitado').toBe(TIPOS_DE_OBJETIVO.length)
  })
})

describe('contarPecas', () => {
  it('conta por cor e por tipo, sem confundir maiúscula com minúscula', () => {
    const fen = '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1'
    expect(contarPecas(fen, 'w')).toEqual({ p: 3, n: 0, b: 0, r: 0, q: 0, k: 1 })
    expect(contarPecas(fen, 'b')).toEqual({ p: 3, n: 0, b: 0, r: 0, q: 0, k: 1 })
  })

  it('ignora os campos do FEN que vêm depois do tabuleiro', () => {
    // O 'b' da vez e o 'k' do roque não podem virar peças.
    expect(contarPecas('4k3/8/8/8/8/8/8/4K2R b Kkq - 0 1', 'b').k).toBe(1)
    expect(contarPecas('4k3/8/8/8/8/8/8/4K2R b Kkq - 0 1', 'w')).toEqual({
      p: 0,
      n: 0,
      b: 0,
      r: 1,
      q: 0,
      k: 1,
    })
  })
})

describe('posicaoEhJogavel', () => {
  it('aceita uma posição possível', () => {
    expect(posicaoEhJogavel('7k/8/6K1/8/8/8/8/1Q6 w - - 0 1')).toBe(true)
  })

  it('recusa a posição em que o lado SEM a vez está em xeque', () => {
    // Dama em a1 dá xeque ao rei em h8 pela diagonal, com as brancas a jogar:
    // impossível numa partida. `isValidFen` aceita isto; este portão não.
    expect(posicaoEhJogavel('7k/8/6K1/8/8/8/8/Q7 w - - 0 1')).toBe(false)
  })

  it('recusa FEN inválido', () => {
    expect(posicaoEhJogavel('não é fen')).toBe(false)
    expect(posicaoEhJogavel('8/8/8/8/8/8/8/8 w - - 0 1')).toBe(false)
  })
})

describe('reproduzirLinhaModelo', () => {
  const base: PosicaoDeFinal = {
    id: 'teste',
    fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: MATE_EM_1,
    enunciado: 'teste',
    linhaModelo: ['b1b8'],
    dicas: [],
  }

  it('reproduz a linha e chega ao objetivo', () => {
    const reproducao = reproduzirLinhaModelo(base)
    expect(reproducao.erro).toBeNull()
    expect(reproducao.fens).toHaveLength(2)
    expect(reproducao.lancesDoAluno).toBe(1)
    expect(reproducao.resultadoFinal.estado).toBe('cumprido')
  })

  it('acusa lance ilegal em vez de fingir que a linha rodou', () => {
    const reproducao = reproduzirLinhaModelo({ ...base, linhaModelo: ['b1b2', 'h8h7', 'b2h2'] })
    expect(reproducao.erro).toMatch(/ilegal/)
    expect(reproducao.resultadoFinal.estado).not.toBe('cumprido')
  })

  it('acusa lance que não tem nem forma de UCI', () => {
    const reproducao = reproduzirLinhaModelo({ ...base, linhaModelo: ['Qb8#'] })
    expect(reproducao.erro).toMatch(/ilegal/)
  })
})
