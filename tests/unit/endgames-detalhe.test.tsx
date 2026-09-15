import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { EndgameDetail } from '@/components/endgames/EndgameDetail'

describe('detalhe de final', () => {
  it('ensina o conceito antes de pedir a posição', () => {
    render(<EndgameDetail licao={CURRICULO_FINAIS[0]} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(CURRICULO_FINAIS[0].titulo)
    expect(screen.getByRole('button', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByText(/O que você precisa reconhecer/)).toBeInTheDocument()
    expect(screen.queryByText(/engine bar/i)).not.toBeInTheDocument()
  })

  it('mostra objetivo e posições sem transformar final em árvore de teoria', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<EndgameDetail licao={CURRICULO_FINAIS[0]} />)
    const tabs = within(screen.getByRole('navigation', { name: 'Seções do final' }))
    await user.click(tabs.getByRole('button', { name: 'Praticar' }))
    expect(screen.getByRole('heading', { name: 'Posições treináveis' })).toBeInTheDocument()
    expect(screen.getAllByText(/Começar posição/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/mate em/i).length).toBeGreaterThan(0)
  })
})
