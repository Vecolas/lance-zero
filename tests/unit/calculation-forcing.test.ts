import { describe, expect, it } from 'vitest'
import { forcingMoves, scoreForcingSelection } from '@/domain/calculation/forcing'
import { START_FEN } from '@/lib/chess'
import { positions } from '../fixtures/positions'

describe('lances forçantes', () => {
  it('a posição inicial não tem nenhum xeque nem captura', () => {
    const resumo = forcingMoves(START_FEN)
    expect(resumo.todos).toHaveLength(20)
    expect(resumo.forcantes).toHaveLength(0)
    expect(resumo.side).toBe('w')
  })

  it('classifica xeque, captura e as duas coisas ao mesmo tempo', () => {
    const resumo = forcingMoves(positions.mateEmUm)
    const mate = resumo.forcantes.find((f) => f.move.san === 'Qxf7#')
    expect(mate?.kind).toBe('xeque-e-captura')
    expect(resumo.xeques.length).toBeGreaterThan(0)
    expect(resumo.capturas.length).toBeGreaterThan(0)
  })

  it('en passant conta como captura', () => {
    const resumo = forcingMoves(positions.enPassant)
    expect(resumo.capturas.map((m) => m.uci)).toContain('e5d6')
  })

  it('todo forçante é xeque ou captura, e nada além disso', () => {
    const resumo = forcingMoves(positions.mateEmUm)
    for (const f of resumo.forcantes) {
      expect(f.move.isCheck || f.move.isCapture).toBe(true)
    }
    const naoForcantes = resumo.todos.filter((m) => !m.isCheck && !m.isCapture)
    expect(resumo.forcantes.length + naoForcantes.length).toBe(resumo.todos.length)
  })
})

describe('conferência da seleção', () => {
  const resumo = forcingMoves(positions.mateEmUm)

  it('marcar todos os forçantes dá nota cheia e marca como completo', () => {
    const nota = scoreForcingSelection(
      resumo,
      resumo.forcantes.map((f) => f.move.uci),
    )
    expect(nota.precisao).toBe(1)
    expect(nota.completo).toBe(true)
    expect(nota.esquecidos).toHaveLength(0)
  })

  it('esquecer um forçante derruba a nota e aparece na lista', () => {
    const menosUm = resumo.forcantes.slice(1).map((f) => f.move.uci)
    const nota = scoreForcingSelection(resumo, menosUm)
    expect(nota.precisao).toBeLessThan(1)
    expect(nota.completo).toBe(false)
    expect(nota.esquecidos).toHaveLength(1)
  })

  it('marcar um lance quieto conta como falso positivo', () => {
    const quieto = resumo.todos.find((m) => !m.isCheck && !m.isCapture)
    const nota = scoreForcingSelection(resumo, [quieto!.uci])
    expect(nota.falsosPositivos.map((m) => m.uci)).toEqual([quieto!.uci])
    expect(nota.completo).toBe(false)
  })

  it('ignora lance ilegal na seleção, sem quebrar', () => {
    const nota = scoreForcingSelection(resumo, ['a1a8'])
    expect(nota.falsosPositivos).toHaveLength(0)
    expect(nota.acertos).toHaveLength(0)
  })

  it('sem forçante nenhum, acertar é não marcar nada', () => {
    const inicial = forcingMoves(START_FEN)
    expect(scoreForcingSelection(inicial, []).precisao).toBe(1)
    expect(scoreForcingSelection(inicial, ['e2e4']).precisao).toBe(0)
  })

  it('a nota nunca é negativa nem passa de 1', () => {
    const muitosFalsos = resumo.todos.filter((m) => !m.isCheck && !m.isCapture).map((m) => m.uci)
    const nota = scoreForcingSelection(resumo, muitosFalsos)
    expect(nota.precisao).toBeGreaterThanOrEqual(0)
    expect(nota.precisao).toBeLessThanOrEqual(1)
  })
})
