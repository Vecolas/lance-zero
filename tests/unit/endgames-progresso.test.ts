import { describe, expect, it } from 'vitest'
import {
  atualizarProgresso,
  desserializarProgressoDeFinais,
  estadoInicialDeFinal,
  registrarResultadoDeFinais,
  selecionarPosicaoAdaptativa,
  serializarProgressoDeFinais,
} from '@/domain/endgames'

describe('progresso multidimensional de finais', () => {
  it('persiste com versão e rejeita payload incompatível', () => {
    const state = estadoInicialDeFinal('opposition')
    expect(desserializarProgressoDeFinais(serializarProgressoDeFinais([state]))).toEqual([state])
    expect(desserializarProgressoDeFinais('{"version":99,"states":[]}')).toEqual([])
  })
  it('atualiza competências sem confundir conclusão com domínio', () => {
    const next = registrarResultadoDeFinais(estadoInicialDeFinal('rook-mate'), {
      recognized: true,
      chosePrinciple: true,
      calculated: true,
      converted: false,
      defended: false,
      hints: 1,
      maxHints: 4,
    })
    expect(next.recognition).toBeGreaterThan(0)
    expect(next.conversion).toBe(0)
    expect(atualizarProgresso(next, {}).lastPracticedAt).not.toBeNull()
  })
  it('seleciona posição adaptativa com desempate determinístico', () => {
    const set = {
      id: 'x',
      endgameId: 'x',
      positions: [
        {
          id: 'b',
          fen: '8/8/8/8/8/8/4K3/4k3 w - - 0 1',
          sideToTrain: 'white' as const,
          objective: 'win' as const,
          conceptIds: ['x'],
          validationSource: 'curated' as const,
          difficulty: 2,
        },
        {
          id: 'a',
          fen: '8/8/8/8/8/8/4K3/4k3 w - - 0 1',
          sideToTrain: 'white' as const,
          objective: 'win' as const,
          conceptIds: ['x'],
          validationSource: 'curated' as const,
          difficulty: 2,
        },
      ],
    }
    expect(selecionarPosicaoAdaptativa(set, estadoInicialDeFinal('x'))?.id).toBe('a')
  })
})
