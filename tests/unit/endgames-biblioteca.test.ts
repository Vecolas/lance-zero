import { describe, expect, it } from 'vitest'
import { ENDGAME_DEFINITIONS, ENDGAME_POSITION_SETS, validarBibliotecaDeFinais } from '@/content/endgames/biblioteca'
import { statusDoFinal, estadoInicialDeFinal } from '@/domain/endgames'

describe('biblioteca pedagógica de finais', () => {
  it('passa pelo portão de IDs, dependências e posições', () => {
    expect(validarBibliotecaDeFinais()).toEqual([])
    expect(ENDGAME_DEFINITIONS.length).toBeGreaterThanOrEqual(15)
    expect(ENDGAME_POSITION_SETS.length).toBe(ENDGAME_DEFINITIONS.length)
  })

  it('começa não iniciado e evolui para consolidado por competência', () => {
    const inicial = estadoInicialDeFinal('opposition')
    expect(statusDoFinal(inicial)).toBe('not-started')
    expect(statusDoFinal({ ...inicial, recognition: 1, principleSelection: 1, calculation: 1, conversion: 1, defense: 1 })).toBe('consolidated')
  })
})
