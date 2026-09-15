import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChessWorkspace } from '@/components/chess/ChessWorkspace'

describe('ChessWorkspace', () => {
  it('mantém board e painel em regiões nomeadas', () => {
    render(
      <ChessWorkspace
        board={<div data-testid="board">Board</div>}
        panel={<div data-testid="panel">Comentário longo</div>}
        below={<div data-testid="below">Movelist</div>}
      />,
    )
    expect(screen.getByRole('region', { name: 'Área de trabalho de xadrez' })).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveTextContent('Comentário longo')
    expect(screen.getByTestId('below')).toBeInTheDocument()
  })
})
