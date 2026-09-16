/**
 * A tela da jornada de lições: TESTES C e D do plano, na tela.
 *
 * O QUE SÓ ESTE ARQUIVO PROVA. O domínio já garante que a lição atual anda
 * quando a anterior é vencida; ele não garante que a TELA troque de lição sem
 * devolver o aluno à lista. E é essa devolução que o plano proíbe — terminar a
 * lição 1 e cair na biblioteca é pedir ao aluno que descubra sozinho qual é a
 * lição 2.
 *
 * `LicaoPlayer` É SUBSTITUÍDO, e de propósito. Atravessar as nove etapas
 * pedagógicas de verdade mediria o player, que tem portão próprio, e faria este
 * teste falhar no dia em que uma etapa mudasse de nome. O que interessa aqui é o
 * que acontece QUANDO uma lição termina — então o dublê expõe um botão que
 * dispara exatamente o evento de término.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProfile } from '@/domain/profile'
import { JORNADA_DE_CANDIDATOS } from '@/domain/roadmap/learning-objects'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { registrarEnsino } from '@/lib/training/registrar-tentativa'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/** O dublê do player: mostra a lição aberta e deixa encerrá-la num clique. */
vi.mock('@/components/lessons/LicaoPlayer', () => ({
  LicaoPlayer: ({
    licao,
    aoAvancar,
  }: {
    licao: { id: string; titulo: string }
    aoAvancar?: (evento: { etapa: string }) => void
  }) => (
    <div data-testid="licao-aberta" data-licao={licao.id}>
      <h2>{licao.titulo}</h2>
      <button type="button" onClick={() => aoAvancar?.({ etapa: 'resumo' })}>
        Terminar lição
      </button>
    </div>
  ),
}))

const { JornadaDeLicoes } = await import('@/components/lessons/JornadaDeLicoes')

const AGORA = new Date('2026-04-01T00:00:00.000Z')
const [PRIMEIRA, SEGUNDA, TERCEIRA] = JORNADA_DE_CANDIDATOS.lessonIds

async function montar(repo: MemoryTrainingRepository, etapaPedida?: string) {
  contexto.valor = {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', AGORA),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
  render(<JornadaDeLicoes target={JORNADA_DE_CANDIDATOS} etapaPedida={etapaPedida} />)
  await screen.findByTestId('licao-aberta')
}

function licaoAberta(): string {
  return screen.getByTestId('licao-aberta').getAttribute('data-licao') ?? ''
}

beforeEach(() => {
  contexto.valor = null
})

describe('TESTE C — terminar uma lição abre a próxima, sozinho', () => {
  it('a jornada anda sem passar pela biblioteca', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    expect(licaoAberta()).toBe(PRIMEIRA)

    await userEvent.click(screen.getByRole('button', { name: 'Terminar lição' }))
    await waitFor(() => expect(licaoAberta()).toBe(SEGUNDA))

    await userEvent.click(screen.getByRole('button', { name: 'Terminar lição' }))
    await waitFor(() => expect(licaoAberta()).toBe(TERCEIRA))
  })

  it('a trilha diz em que etapa o aluno está', async () => {
    await montar(new MemoryTrainingRepository())
    expect(screen.getByTestId('trilha-da-jornada')).toHaveTextContent('Etapa 1 de 3')

    await userEvent.click(screen.getByRole('button', { name: 'Terminar lição' }))
    await waitFor(() =>
      expect(screen.getByTestId('trilha-da-jornada')).toHaveTextContent('Etapa 2 de 3'),
    )
  })

  it('terminar a última encerra a jornada, em vez de voltar à primeira', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Terminar lição' }))
      if (i < 2) await waitFor(() => expect(screen.getByTestId('licao-aberta')).toBeInTheDocument())
    }
    await waitFor(() =>
      expect(screen.getByText(/já venceu todas as etapas deste conteúdo/)).toBeInTheDocument(),
    )
  })

  /**
   * A EVIDÊNCIA DE ENSINO É GRAVADA a cada lição vencida, e é dela que o
   * progresso nasce na próxima visita. Sem esta gravação a jornada reabriria na
   * primeira lição para sempre, e o aluno faria a mesma aula todo dia sem que
   * nada parecesse errado.
   */
  it('cada lição vencida vira evidência no repositório', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    await userEvent.click(screen.getByRole('button', { name: 'Terminar lição' }))

    await waitFor(async () => {
      const estados = await repo.getSkillStates()
      expect(estados.map((estado) => estado.skillId)).toContain(
        'calculation.checks-captures-threats',
      )
    })
  })
})

describe('TESTE D — retomar abre a lição em que o aluno parou', () => {
  it('com a primeira já ensinada, a jornada abre na segunda', async () => {
    const repo = new MemoryTrainingRepository()
    // É o estado que a primeira lição deixa: evidência de ensino da habilidade.
    await registrarEnsino(repo, 'calculation.checks-captures-threats', AGORA)

    await montar(repo)

    expect(licaoAberta()).toBe(SEGUNDA)
    expect(screen.getByTestId('trilha-da-jornada')).toHaveTextContent('Etapa 2 de 3')
  })

  it('NUNCA recomeça da primeira quando há progresso', async () => {
    const repo = new MemoryTrainingRepository()
    await registrarEnsino(repo, 'calculation.checks-captures-threats', AGORA)
    await registrarEnsino(repo, 'calculation.candidate-moves', AGORA)

    await montar(repo)

    expect(licaoAberta()).toBe(TERCEIRA)
  })

  /**
   * A etapa pedida pela URL é respeitada — é o deep link de "Continuar" —, mas
   * só quando pertence à jornada. Um id de fora abriria uma lição que o nó não
   * promete.
   */
  it('a etapa da URL manda, se for desta jornada', async () => {
    await montar(new MemoryTrainingRepository(), TERCEIRA)
    expect(licaoAberta()).toBe(TERCEIRA)
  })

  it('etapa de fora da jornada é ignorada', async () => {
    await montar(new MemoryTrainingRepository(), 'cravada')
    expect(licaoAberta()).toBe(PRIMEIRA)
  })
})
