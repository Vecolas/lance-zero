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
  onSquareClick: null as null | ((square: string) => void),
}))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: {
    fen: string
    selected?: string | null
    onMove?: (from: string, to: string, promotion?: string) => boolean
    onSquareClick?: (square: string) => void
  }) => {
    tabuleiro.onMove = props.onMove ?? null
    tabuleiro.onSquareClick = props.onSquareClick ?? null
    return (
      <div data-testid="tabuleiro" data-fen={props.fen} data-selecionada={props.selected ?? ''} />
    )
  },
}))

const { ReviewSession } = await import('@/components/training/ReviewSession')

const AGORA = new Date('2026-01-01T00:00:00.000Z')
const FEN = '7k/8/8/8/8/8/8/1N5K w - - 0 1'

function card(): ReviewCard {
  return createReviewCard(
    {
      id: 'card-board-only',
      kind: 'posicao-exata',
      skillIds: [],
      fen: FEN,
      solutionUci: ['b1c3'],
      prompt: 'Jogue o lance correto.',
    },
    AGORA,
  )
}

async function montar() {
  const repo = new MemoryTrainingRepository()
  await repo.saveReviewCard(card())
  contexto.valor = {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', AGORA),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
  render(<ReviewSession />)
  await screen.findByText(/Revisão 1 de 1/)
}

beforeEach(() => {
  globalThis.localStorage.clear()
  contexto.valor = null
  tabuleiro.onMove = null
  tabuleiro.onSquareClick = null
})

/**
 * O CLIQUE É A ALTERNATIVA AO ARRASTE, e sem ele esta tela não tem nenhuma.
 *
 * Quando o campo de lance em UCI saiu, arrastar virou a ÚNICA forma de responder
 * um card — e a revisão espaçada é o núcleo do produto. Quem usa teclado, leitor
 * de tela ou um toque impreciso ficava sem caminho até a resposta, contra a
 * régua do CLAUDE.md.
 *
 * Estes testes existem para o clique não sumir do mesmo jeito: em silêncio, sem
 * nada reprovando. O portão acima continua valendo — a alternativa é o clique,
 * NÃO a volta do campo de texto.
 */
describe('o lance por clique: origem e destino', () => {
  it('dois cliques jogam o lance', async () => {
    await montar()
    await act(async () => {
      tabuleiro.onSquareClick?.('b1')
    })
    expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-selecionada', 'b1')

    await act(async () => {
      tabuleiro.onSquareClick?.('c3')
    })
    await waitFor(() => expect(screen.getByText(/Você lembrou o lance/i)).toBeInTheDocument())
    expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-selecionada', '')
  })

  it('clicar em casa sem lance legal não seleciona nada', async () => {
    await montar()
    await act(async () => {
      tabuleiro.onSquareClick?.('d4')
    })
    expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-selecionada', '')
  })

  /**
   * TROCAR DE IDEIA precisa funcionar: o segundo clique numa casa que não é
   * alcançável tem de virar a NOVA origem, e não engolir a seleção. Sem isto o
   * aluno que clica na peça errada fica preso — clica de novo e nada acontece.
   */
  it('clicar em outra peça própria troca a origem, sem jogar', async () => {
    await montar()
    await act(async () => {
      tabuleiro.onSquareClick?.('b1')
    })
    await act(async () => {
      tabuleiro.onSquareClick?.('h1')
    })
    expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-selecionada', 'h1')
    expect(screen.queryByText(/Você lembrou o lance/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Revisão 1 de 1/)).toBeInTheDocument()
  })
})

describe('entrada de lance learner-facing', () => {
  it('remove UCI/SAN e confirma o contrato de tabuleiro', async () => {
    await montar()
    expect(screen.queryByText(/Lance em UCI/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jogar lance/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('tabuleiro')).toBeInTheDocument()

    await act(async () => {
      expect(tabuleiro.onMove?.('b1', 'c3')).toBe(true)
    })
    await waitFor(() => expect(screen.getByText(/Você lembrou o lance/i)).toBeInTheDocument())
  })

  it('mantém feedback para lance legal porém fora da resposta', async () => {
    await montar()
    await act(async () => {
      expect(tabuleiro.onMove?.('b1', 'a3')).toBe(true)
    })
    await waitFor(() =>
      expect(screen.getByText(/O lance desta posição ainda não está firme/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Errei' })).toBeInTheDocument()
  })

  it('rejeita lance ilegal sem contar tentativa pedagógica', async () => {
    await montar()
    await act(async () => {
      expect(tabuleiro.onMove?.('b1', 'b2')).toBe(false)
    })
    expect(screen.getByText(/não é um lance legal/i)).toBeInTheDocument()
    expect(screen.getByText(/Revisão 1 de 1/)).toBeInTheDocument()
  })
})
