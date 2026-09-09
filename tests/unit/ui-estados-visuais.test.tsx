/**
 * Portões dos componentes de estado (issue #16).
 *
 * As consultas são por PAPEL ACESSÍVEL e por texto — nunca por classe de CSS.
 * Classe é detalhe de implementação; papel é o que o usuário de leitor de tela
 * recebe, e é isso que a casa exige.
 *
 * A varredura percorre os catálogos, e não uma lista de estados escrita à mão:
 * um estado novo que esqueça o ícone ou o texto reprova sozinho.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkillCard } from '@/components/progress/SkillCard'
import { EvaluationBar } from '@/components/ui/EvaluationBar'
import { FeedbackBanner } from '@/components/ui/FeedbackBanner'
import { MoveQualityBadge } from '@/components/ui/MoveQualityBadge'
import { feedbackToneCatalog, type FeedbackTone } from '@/lib/design/feedback'
import { SKILL_CARD_CONFIG } from '@/lib/design/skill-card'
import { moveQualityTokens, type MoveQuality } from '@/lib/design/tokens'

/** Cor + ícone + texto, verificados no DOM renderizado. */
function exigirTrio(elemento: HTMLElement, textoEsperado: string | RegExp): void {
  expect(elemento.querySelector('svg'), 'ícone ausente').not.toBeNull()
  expect(elemento.getAttribute('style') ?? '', 'cor não aplicada').toMatch(/color:\s*var\(--/)
  expect(elemento.textContent ?? '').toMatch(textoEsperado)
}

describe('MoveQualityBadge', () => {
  const classificacoes = Object.keys(moveQualityTokens) as MoveQuality[]

  it('a varredura encontrou classificações', () => {
    expect(classificacoes.length).toBeGreaterThan(0)
  })

  it('toda classificação renderiza cor, ícone e texto', () => {
    for (const quality of classificacoes) {
      const { unmount } = render(<MoveQualityBadge quality={quality} />)
      const selo = screen.getByRole('img', { name: new RegExp(moveQualityTokens[quality].label) })
      exigirTrio(selo, moveQualityTokens[quality].label)
      unmount()
    }
  })

  it('o texto pode ser sobrescrito, mas não suprimido', () => {
    render(<MoveQualityBadge quality="blunder" label="Erro grave" />)
    const selo = screen.getByRole('img', { name: /Erro grave/ })
    exigirTrio(selo, 'Erro grave')
  })

  it('o nome acessível explica a classificação, não só a nomeia', () => {
    render(<MoveQualityBadge quality="imprecisao" />)
    // O resumo entra no nome acessível: quem não vê a cor precisa da frase.
    expect(screen.getByRole('img', { name: /Imprecisão\..+\./ })).toBeInTheDocument()
  })
})

describe('FeedbackBanner', () => {
  const tons = Object.keys(feedbackToneCatalog) as FeedbackTone[]

  it('a varredura encontrou estados de feedback', () => {
    expect(tons.length).toBeGreaterThan(0)
  })

  it('todo estado é anunciado com cor, ícone e a palavra do estado', () => {
    for (const tone of tons) {
      const { unmount } = render(<FeedbackBanner tone={tone} mensagem="Mensagem de teste." />)
      const faixa = screen.getByRole('status')
      exigirTrio(faixa, feedbackToneCatalog[tone].label)
      expect(faixa).toHaveTextContent('Mensagem de teste.')
      unmount()
    }
  })

  it('o erro é apresentado como algo a treinar, não como fracasso', () => {
    render(<FeedbackBanner tone="incorreto" mensagem="Essa jogada permite ...Dxd4." />)
    const faixa = screen.getByRole('status')
    expect(faixa).toHaveTextContent(/treinar/i)
    expect(faixa.textContent ?? '').not.toMatch(/errad|falh|perdeu/i)
  })

  it('o conteúdo extra aparece dentro da mesma região anunciada', () => {
    render(
      <FeedbackBanner tone="correto" mensagem="Você identificou a peça indefesa.">
        <p>Variação: 1. Cxe5 Cxe5 2. d4</p>
      </FeedbackBanner>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Variação: 1. Cxe5 Cxe5 2. d4')
  })
})

describe('EvaluationBar', () => {
  it('anuncia a vantagem e mostra o número', () => {
    render(<EvaluationBar scoreCp={320} mateIn={null} perspectiva="brancas" />)
    expect(screen.getByRole('img', { name: /vantagem das brancas/i })).toBeInTheDocument()
    expect(screen.getByText('+3,2')).toBeInTheDocument()
  })

  it('inverte o lado quando quem joga é o outro', () => {
    render(<EvaluationBar scoreCp={320} mateIn={null} perspectiva="pretas" />)
    expect(screen.getByRole('img', { name: /vantagem das pretas/i })).toBeInTheDocument()
  })

  it('trata mate sem falar em peões', () => {
    render(<EvaluationBar scoreCp={null} mateIn={-4} perspectiva="brancas" />)
    const barra = screen.getByRole('img', { name: /mate em 4 para as pretas/i })
    expect(barra).toBeInTheDocument()
    expect(screen.getByText('M4')).toBeInTheDocument()
  })

  it('sem avaliação, diz que não avaliou em vez de mostrar equilíbrio', () => {
    render(<EvaluationBar scoreCp={null} mateIn={null} perspectiva="brancas" />)
    expect(screen.getByRole('img', { name: /não avaliada/i })).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('nenhum texto visível ou acessível promete chance de vitória', () => {
    const { container } = render(
      <EvaluationBar
        titulo="Antes do seu lance"
        scoreCp={900}
        mateIn={null}
        perspectiva="brancas"
      />,
    )
    const barra = screen.getByRole('img')
    expect(barra.getAttribute('aria-label')).not.toMatch(/chance|probabilidade/i)
    expect(container.textContent ?? '').not.toMatch(/chance|probabilidade/i)
  })
})

describe('SkillCard', () => {
  const suficiente = SKILL_CARD_CONFIG.minimoDeTentativas + 5

  it('mostra maestria com nome, barra e estado', () => {
    render(<SkillCard id="fork" nome="Garfo" mastery={0.82} attempts={suficiente} />)
    const card = screen.getByRole('article', { name: 'Garfo' })
    expect(card).toBeInTheDocument()
    const barra = screen.getByRole('progressbar', { name: /Garfo/ })
    expect(barra).toHaveAttribute('aria-valuenow', '82')
    expect(card).toHaveTextContent('82%')
    expect(card).toHaveTextContent('Firme')
    expect(card.querySelector('svg'), 'ícone de estado ausente').not.toBeNull()
  })

  it('com amostra pequena não inventa precisão', () => {
    render(
      <SkillCard
        id="pin"
        nome="Cravada"
        mastery={0.31}
        attempts={SKILL_CARD_CONFIG.minimoDeTentativas - 1}
      />,
    )
    const card = screen.getByRole('article', { name: 'Cravada' })
    const barra = screen.getByRole('progressbar', { name: /Cravada/ })
    expect(barra).not.toHaveAttribute('aria-valuenow')
    expect(barra).toHaveAttribute('aria-valuetext', 'ainda não medido')
    expect(card).not.toHaveTextContent('31%')
    expect(card).toHaveTextContent('—')
    // E diz o que falta para o número existir: honesto e acionável.
    expect(card).toHaveTextContent(new RegExp(String(SKILL_CARD_CONFIG.minimoDeTentativas)))
  })

  it('sem nenhuma tentativa, o card existe e explica o vazio', () => {
    render(<SkillCard id="back-rank" nome="Mate do corredor" mastery={0} attempts={0} />)
    const card = screen.getByRole('article', { name: 'Mate do corredor' })
    expect(card).toHaveTextContent(/Sem tentativas ainda/i)
    expect(card).toHaveTextContent('Sem amostra')
  })
})
