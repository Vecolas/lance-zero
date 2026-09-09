import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GameViewer } from '@/components/chess/GameViewer'
import { MoveList } from '@/components/chess/MoveList'
import { parsePgn } from '@/lib/chess'
import { matePastor } from '../fixtures/games'

// O tabuleiro é uma dependência de terceiros com drag-and-drop: fora do escopo
// deste teste, que verifica navegação, estado e acessibilidade.
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: ({ fen, orientation }: { fen: string; orientation: string }) => (
    <div data-testid="board" data-fen={fen} data-orientation={orientation} />
  ),
}))

const partida = parsePgn(matePastor)

describe('MoveList', () => {
  it('mostra estado vazio quando não há lances', () => {
    render(<MoveList game={{ ...partida, plies: [] }} currentPly={0} onSelectPly={() => {}} />)
    expect(screen.getByText(/Nenhum lance ainda/)).toBeInTheDocument()
  })

  it('lista os lances e marca o atual com aria-current', () => {
    render(<MoveList game={partida} currentPly={3} onSelectPly={() => {}} />)
    expect(screen.getByRole('button', { name: 'e4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bc4' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'e4' })).not.toHaveAttribute('aria-current')
  })

  it('avisa qual lance foi clicado', async () => {
    const onSelectPly = vi.fn()
    render(<MoveList game={partida} currentPly={0} onSelectPly={onSelectPly} />)
    await userEvent.click(screen.getByRole('button', { name: 'Nc6' }))
    expect(onSelectPly).toHaveBeenCalledWith(4)
  })
})

describe('GameViewer', () => {
  it('começa na posição inicial com os controles de voltar desabilitados', () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    expect(screen.getByText('Lance 0 de 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lance anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próximo lance' })).toBeEnabled()
  })

  it('navega para frente e para trás atualizando o tabuleiro', async () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    const inicial = screen.getByTestId('board').getAttribute('data-fen')

    await userEvent.click(screen.getByRole('button', { name: 'Próximo lance' }))
    expect(screen.getByText('Lance 1 de 7')).toBeInTheDocument()
    expect(screen.getByTestId('board').getAttribute('data-fen')).not.toBe(inicial)

    await userEvent.click(screen.getByRole('button', { name: 'Lance anterior' }))
    expect(screen.getByTestId('board').getAttribute('data-fen')).toBe(inicial)
  })

  it('vai ao último lance e anuncia o xeque-mate', async () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Último lance' }))
    expect(screen.getByText('Lance 7 de 7')).toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText('Xeque-mate')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo lance' })).toBeDisabled()
  })

  it('pula direto para o lance escolhido na lista textual', async () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Qh5' }))
    expect(screen.getByText('Lance 5 de 7')).toBeInTheDocument()
  })

  it('gira o tabuleiro', async () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    expect(screen.getByTestId('board')).toHaveAttribute('data-orientation', 'w')
    await userEvent.click(screen.getByRole('button', { name: 'Girar tabuleiro' }))
    expect(screen.getByTestId('board')).toHaveAttribute('data-orientation', 'b')
  })

  it('navega pelo teclado com as setas', async () => {
    render(<GameViewer game={partida} onGameChange={() => {}} />)
    const regiao = screen.getByRole('region', { name: 'Tabuleiro e lances' })
    regiao.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByText('Lance 2 de 7')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByText('Lance 1 de 7')).toBeInTheDocument()
    await userEvent.keyboard('{End}')
    expect(screen.getByText('Lance 7 de 7')).toBeInTheDocument()
    await userEvent.keyboard('{Home}')
    expect(screen.getByText('Lance 0 de 7')).toBeInTheDocument()
  })
})
