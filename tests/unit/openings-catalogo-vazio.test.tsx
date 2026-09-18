/**
 * O ESTADO VAZIO DO CATÁLOGO DE ABERTURAS (dívida D-07).
 *
 * O painel de vazio ficou sem cobertura quando o catálogo cresceu: o e2e o
 * alcançava por uma combinação de filtros que, com 35 cursos, deixou de existir.
 * Um componente vivo que ninguém exercita é o degrau anterior a um componente
 * quebrado sem ninguém saber.
 *
 * A dívida D-06 devolveu uma combinação vazia — "brancas E especializada" — e o
 * e2e voltou a passar por lá. ESTE ARQUIVO EXISTE MESMO ASSIM, e de propósito:
 * aquela combinação é um acidente do conteúdo de hoje, e ela some no dia em que
 * alguém escrever uma abertura especializada de brancas. A cobertura do painel
 * não pode depender de o catálogo continuar desequilibrado.
 *
 * Aqui o vazio é produzido pela FONTE, e não pelos filtros: o catálogo recebe
 * uma lista sem cursos. É a única forma de medir o painel sem depender de o
 * conteúdo cooperar.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/*
  A LISTA DE CURSOS É A FONTE, e é ela que este teste controla. Substituí-la por
  uma lista vazia é o equivalente, para o componente, a um filtro que não deixou
  nada passar — que é exatamente a condição que o painel existe para cobrir.
*/
vi.mock('@/content/openings/course', async (original) => {
  const modulo = await original<typeof import('@/content/openings/course')>()
  return { ...modulo, OPENING_COURSES: [] }
})

const { OpeningCatalog } = await import('@/components/openings/OpeningCatalog')

describe('o catálogo de aberturas sem nenhum curso para mostrar', () => {
  it('mostra o painel de vazio, e não uma grade em branco', async () => {
    contexto.valor = { repo: new MemoryTrainingRepository(), status: 'ready' }

    render(<OpeningCatalog />)

    /*
      O painel só aparece depois da leitura do repositório — antes dela a tela
      está em "carregando", e afirmar sobre o vazio ali seria afirmar sobre o
      estado errado.
    */
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma abertura corresponde aos filtros/)).toBeTruthy()
    })
  })

  it('não mostra nenhum card de abertura junto do painel', async () => {
    /*
      A METADE QUE IMPORTA. Sem ela, um painel de vazio renderizado SEMPRE —
      inclusive com a grade cheia ao lado — passaria no teste acima.
    */
    contexto.valor = { repo: new MemoryTrainingRepository(), status: 'ready' }

    render(<OpeningCatalog />)

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma abertura corresponde aos filtros/)).toBeTruthy()
    })
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
