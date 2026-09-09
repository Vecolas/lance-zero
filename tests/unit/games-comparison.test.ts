import { describe, expect, it } from 'vitest'
import {
  compareHumanAndEngine,
  describeComparison,
  porGravidade,
  SEVERITY_LABEL,
  TOLERANCIA_DE_PLY,
} from '@/domain/games/comparison'
import type { CriticalMoment, MoveSeverity } from '@/domain/types'

function momento(ply: number, severity: MoveSeverity = 'erro'): CriticalMoment {
  return {
    gameId: 'g1',
    ply,
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    userMoveUci: 'e2e4',
    bestMoveUci: 'd2d4',
    expectedScoreLossPp: 12,
    severity,
    skillIds: ['tactics.hanging-piece'],
    explanation: null,
  }
}

describe('cruzamento entre a leitura humana e a engine', () => {
  it('sem momento crítico nenhum, a percepção é total por definição', () => {
    const c = compareHumanAndEngine([], [])
    expect(c.taxaDePercepcao).toBe(1)
    expect(describeComparison(c)).toMatch(/não encontrou nenhum momento grave/)
  })

  it('marcação exata no ply conta como percebida', () => {
    const c = compareHumanAndEngine([10], [momento(10)])
    expect(c.confirmados).toHaveLength(1)
    expect(c.despercebidos).toHaveLength(0)
    expect(c.taxaDePercepcao).toBe(1)
  })

  it('marcação a um ply de distância ainda conta — quem sente o momento erra por pouco', () => {
    expect(compareHumanAndEngine([9], [momento(10)]).confirmados).toHaveLength(1)
    expect(compareHumanAndEngine([11], [momento(10)]).confirmados).toHaveLength(1)
  })

  it('marcação além da tolerância não conta', () => {
    const distante = TOLERANCIA_DE_PLY + 1
    const c = compareHumanAndEngine([10 + distante], [momento(10)])
    expect(c.confirmados).toHaveLength(0)
    expect(c.despercebidos).toHaveLength(1)
    expect(c.semConfirmacao).toEqual([10 + distante])
  })

  it('a tolerância entra por parâmetro, para o produto poder calibrar', () => {
    expect(compareHumanAndEngine([13], [momento(10)], 3).confirmados).toHaveLength(1)
    expect(compareHumanAndEngine([13], [momento(10)], 0).confirmados).toHaveLength(0)
  })

  it('separa o que passou batido do que a engine não confirmou', () => {
    const c = compareHumanAndEngine([4, 30], [momento(4), momento(12), momento(20)])
    expect(c.confirmados.map((m) => m.ply)).toEqual([4])
    expect(c.despercebidos.map((m) => m.ply)).toEqual([12, 20])
    expect(c.semConfirmacao).toEqual([30])
    expect(c.taxaDePercepcao).toBeCloseTo(1 / 3, 5)
  })

  it('uma marcação só não pode ser creditada em dois momentos distantes', () => {
    const c = compareHumanAndEngine([10], [momento(10), momento(40)])
    expect(c.confirmados).toHaveLength(1)
    expect(c.despercebidos).toHaveLength(1)
  })

  it('semConfirmacao sai ordenado, mesmo com entrada fora de ordem', () => {
    const c = compareHumanAndEngine([30, 5, 18], [])
    expect(c.semConfirmacao).toEqual([5, 18, 30])
  })

  it('não muta as listas recebidas', () => {
    const marcados = [10, 4]
    const momentos = [momento(4)]
    compareHumanAndEngine(marcados, momentos)
    expect(marcados).toEqual([10, 4])
    expect(momentos).toHaveLength(1)
  })
})

describe('ordenação por gravidade', () => {
  it('erro grave vem antes, e empate desempata pelo ply', () => {
    const lista = [
      momento(30, 'imprecisao'),
      momento(10, 'erro-grave'),
      momento(20, 'erro'),
      momento(5, 'erro-grave'),
    ]
    expect([...lista].sort(porGravidade).map((m) => m.ply)).toEqual([5, 10, 20, 30])
  })

  it('toda severidade tem rótulo em PT-BR', () => {
    for (const [chave, rotulo] of Object.entries(SEVERITY_LABEL)) {
      expect(rotulo.length, chave).toBeGreaterThan(2)
    }
  })
})

describe('texto para o usuário', () => {
  it('quando viu tudo, diz isso sem elogio vazio', () => {
    const texto = describeComparison(compareHumanAndEngine([4, 12], [momento(4), momento(12)]))
    expect(texto).toMatch(/marcou todos os 2/)
  })

  it('quando não viu nada, aponta para o treino em vez de punir', () => {
    const texto = describeComparison(compareHumanAndEngine([], [momento(4)]))
    expect(texto).toMatch(/é exatamente aí que está o treino/i)
    expect(texto).not.toMatch(/errou|falhou|ruim/i)
  })

  it('quando viu parte, informa os dois números', () => {
    const texto = describeComparison(
      compareHumanAndEngine([4], [momento(4), momento(12), momento(20)]),
    )
    expect(texto).toMatch(/1 de 3/)
    expect(texto).toMatch(/outros 2/)
  })
})
