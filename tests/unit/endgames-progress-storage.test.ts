import { describe, expect, it } from 'vitest'
import { carregarProgressoDeFinais, salvarProgressoDeFinais } from '@/lib/training/endgame-progress'
import { estadoInicialDeFinal } from '@/domain/endgames'

describe('armazenamento do progresso de finais', () => {
  it('usa uma chave versionada e sobrevive ao recarregamento', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    }
    salvarProgressoDeFinais([estadoInicialDeFinal('opposition')], storage)
    expect(carregarProgressoDeFinais(storage)).toHaveLength(1)
  })
})
