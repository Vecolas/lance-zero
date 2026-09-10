/**
 * Portão do ESTADO VAZIO da página de licenças.
 *
 * POR QUE ISTO É ASSUNTO DA FASE 9. A única linha de "Previstos no roadmap" é a
 * API de Opening Explorer da Lichess. No dia em que ela sair de lá — porque o
 * acesso voltou e o serviço passou a ser distribuído de verdade — a lista fica
 * VAZIA, e a página desenhava um cabeçalho de tabela com nenhuma linha embaixo.
 * O leitor lê isso como "faltou carregar", não como "não há mais nada previsto".
 *
 * O portão morde dos dois lados de propósito: lista vazia tem de virar frase, e
 * lista cheia tem de virar tabela. Só o primeiro caso passaria com a tabela
 * apagada para sempre; só o segundo é o defeito de origem.
 *
 * O mock é do MÓDULO de inventário, não da página: é a única forma de esvaziar a
 * lista sem editar o inventário de verdade, que pertence a outra frente.
 */

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { runtimeDependencies as Inventario } from '@/lib/legal/licenses'

type Linhas = typeof Inventario

const UMA_LINHA: Linhas = [
  {
    ids: ['exemplo'],
    name: 'Dependência de exemplo',
    license: 'MIT',
    reason: 'Existe só para provar que a tabela aparece quando há linha.',
    url: 'https://example.invalid',
  },
]

async function paginaCom(planned: Linhas): Promise<() => React.JSX.Element> {
  vi.resetModules()
  vi.doMock('@/lib/legal/licenses', () => ({
    runtimeDependencies: UMA_LINHA,
    plannedDependencies: planned,
  }))
  const modulo = await import('@/app/licenses/page')
  return modulo.default
}

afterEach(() => {
  vi.doUnmock('@/lib/legal/licenses')
  vi.resetModules()
})

describe('página de licenças', () => {
  it('lista vazia vira FRASE, e não um cabeçalho de tabela sem linha', async () => {
    const Pagina = await paginaCom([])
    render(<Pagina />)

    expect(screen.getByText(/Nada previsto no momento/)).toBeVisible()

    // Só a tabela de "Em uso hoje" sobra: um cabeçalho, não dois.
    expect(screen.getAllByRole('columnheader', { name: 'Componente' })).toHaveLength(1)
  })

  it('lista cheia continua virando TABELA', async () => {
    const Pagina = await paginaCom(UMA_LINHA)
    render(<Pagina />)

    expect(screen.queryByText(/Nada previsto no momento/)).toBeNull()
    expect(screen.getAllByRole('columnheader', { name: 'Componente' })).toHaveLength(2)
  })
})
