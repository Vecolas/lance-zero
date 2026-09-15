import { describe, expect, it } from 'vitest'
import { atualizarProgresso, desserializarProgressoDeFinais, estadoInicialDeFinal, registrarResultadoDeFinais, serializarProgressoDeFinais } from '@/domain/endgames'

describe('progresso multidimensional de finais', () => {
  it('persiste com versão e rejeita payload incompatível', () => {
    const state = estadoInicialDeFinal('opposition')
    expect(desserializarProgressoDeFinais(serializarProgressoDeFinais([state]))).toEqual([state])
    expect(desserializarProgressoDeFinais('{"version":99,"states":[]}')).toEqual([])
  })
  it('atualiza competências sem confundir conclusão com domínio', () => {
    const next = registrarResultadoDeFinais(estadoInicialDeFinal('rook-mate'), { recognized: true, chosePrinciple: true, calculated: true, converted: false, defended: false, hints: 1, maxHints: 4 })
    expect(next.recognition).toBeGreaterThan(0)
    expect(next.conversion).toBe(0)
    expect(atualizarProgresso(next, {}).lastPracticedAt).not.toBeNull()
  })
})
