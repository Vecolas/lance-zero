import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/ui/AppShell'
import { mainNav } from '@/lib/navigation'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('AppShell', () => {
  it('expõe skip link, main e rodapé de licenças', () => {
    render(
      <AppShell>
        <h1>Conteúdo</h1>
      </AppShell>,
    )

    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
    expect(screen.getByRole('link', { name: /licenças/i })).toHaveAttribute('href', '/licenses')
  })

  it('renderiza a navegação principal com todos os destinos', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    )

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    for (const item of mainNav) {
      expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
    }
  })

  it('marca a rota atual com aria-current', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    )

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Partidas' })).not.toHaveAttribute('aria-current')
  })
})
