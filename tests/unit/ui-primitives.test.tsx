import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Card,
  FilterBar,
  ModeLabel,
  PageHeader,
  ProgressIndicator,
  StatePanel,
  StatusBadge,
  Tabs,
} from '@/components/ui/primitives'

describe('primitives do frontend', () => {
  it('mantém hierarquia e descrição da página', () => {
    render(
      <PageHeader eyebrow="Hoje" title="Treino de hoje" description="Escolha uma atividade." />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Treino de hoje' })).toBeInTheDocument()
    expect(screen.getByText('Escolha uma atividade.')).toBeInTheDocument()
  })

  it('status é textual e não depende só da cor', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Concluída')).toBeInTheDocument()
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true')
  })

  it('separa modo pedagógico de status', () => {
    render(<ModeLabel mode="review" />)
    expect(screen.getByText('Revisar')).toBeInTheDocument()
  })

  it('anuncia progresso com faixa segura', () => {
    render(<ProgressIndicator value={140} label="Nós aprendidos" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Nós aprendidos: 100%',
    )
  })

  it('preserva estados e conteúdo longo', () => {
    render(
      <>
        <Card>Comentário longo que deve continuar visível.</Card>
        <StatePanel kind="error" title="Falha" description="Tente novamente depois." />
        <FilterBar label="Filtros de abertura">Filtro</FilterBar>
      </>,
    )
    expect(screen.getByRole('article')).toHaveTextContent('Comentário longo')
    expect(screen.getByRole('alert')).toHaveTextContent('Tente novamente')
    expect(screen.getByLabelText('Filtros de abertura')).toHaveTextContent('Filtro')
  })

  it('tabs anunciam a seleção sem exigir cor', () => {
    const tabs = [
      { id: 'overview', label: 'Visão geral' },
      { id: 'learn', label: 'Aprender' },
    ] as const
    render(<Tabs tabs={tabs} selected="learn" onSelect={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Aprender' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Visão geral' })).not.toHaveAttribute('aria-current')
  })
})
