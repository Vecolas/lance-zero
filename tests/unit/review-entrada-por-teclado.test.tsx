/** Portão: aluno envia lances pelo tabuleiro, nunca por UCI/SAN digitado. */
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProfile } from '@/domain/profile'
import type { ReviewCard } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))
const tabuleiro = vi.hoisted(() => ({
  onMove: null as null | ((from: string, to: string, promotion?: string) => boolean),
}))

vi.mock('@/components/providers/RepositoryProvider', () => ({ useRepository: () => contexto.valor }))
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: { fen: string; onMove?: (from: string, to: string, promotion?: string) => boolean }) => {
    tabuleiro.onMove = props.onMove ?? null
    return <div data-testid="tabuleiro" data-fen={props.fen} />
  },
}))

const { ReviewSession } = await import('@/components/training/ReviewSession')

const AGORA = new Date('2026-01-01T00:00:00.000Z')
const FEN = '7k/8/8/8/8/8/8/1N5K w - - 0 1'

function card(): ReviewCard {
  return createReviewCard({
    id: 'card-board-only', kind: 'posicao-exata', skillIds: [], fen: FEN,
    solutionUci: ['b1c3'], prompt: 'Jogue o lance correto.',
  }, AGORA)
}

async function montar() {
  const repo = new MemoryTrainingRepository()
  await repo.saveReviewCard(card())
  contexto.valor = {
    status: 'pronto' as const, repo, profile: createDefaultProfile('teste', AGORA),
    erro: null, saveProfile: async () => {}, refresh: () => {}, revision: 0,
  }
  render(<ReviewSession />)
  await screen.findByText(/Revisão 0 de 1/)
}

beforeEach(() => {
  globalThis.localStorage.clear()
  contexto.valor = null
  tabuleiro.onMove = null
})

describe('entrada de lance learner-facing', () => {
  it('remove UCI/SAN e confirma o contrato de tabuleiro', async () => {
    await montar()
    expect(screen.queryByText(/Lance em UCI/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jogar lance/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('tabuleiro')).toBeInTheDocument()

    await act(async () => { expect(tabuleiro.onMove?.('b1', 'c3')).toBe(true) })
    await waitFor(() => expect(screen.getByText(/Você lembrou o lance/i)).toBeInTheDocument())
  })

  it('mantém feedback para lance legal porém fora da resposta', async () => {
    await montar()
    await act(async () => { expect(tabuleiro.onMove?.('b1', 'a3')).toBe(true) })
    await waitFor(() => expect(screen.getByText(/O lance desta posição ainda não está firme/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Errei' })).toBeInTheDocument()
  })

  it('rejeita lance ilegal sem contar tentativa pedagógica', async () => {
    await montar()
    await act(async () => { expect(tabuleiro.onMove?.('b1', 'b2')).toBe(false) })
    expect(screen.getByText(/não é um lance legal/i)).toBeInTheDocument()
    expect(screen.getByText(/Revisão 0 de 1/)).toBeInTheDocument()
  })
})
