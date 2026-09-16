/**
 * A tela de praticar a abertura contra o bot.
 *
 * O DOMÍNIO JÁ TEM PORTÃO PRÓPRIO (`openings-sparring`). Este arquivo cobre o
 * modo de falha que portão de domínio nunca acusa: a regra existir, estar verde,
 * e a TELA não a oferecer. Um sparring sem escolha de lado deixa toda a suíte
 * verde e o aluno sem a metade do exercício.
 *
 * ELE NASCEU DE DOIS CASOS E2E QUE FICAVAM PULADOS. Chegar ao fim da jornada
 * pelo e2e exige cumprir a cobertura do treino final, e o ajudante que atravessa
 * etapas não consegue fazer isso com lances arbitrários. Teste que nunca roda
 * passa para sempre sem provar nada — pior que não existir, porque parece
 * coberto.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'

// O tabuleiro real depende de medida de layout, que o jsdom não tem. O que este
// arquivo mede é a costura da tela — o `data-fen` e a orientação provam que a
// posição certa chegou, e é o bastante.
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: ({ fen, orientation }: { fen: string; orientation: string }) => (
    <div data-testid="tabuleiro" data-fen={fen} data-orientation={orientation} />
  ),
}))

const { SparringDaAbertura } = await import('@/components/openings/SparringDaAbertura')

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana') ?? OPENING_COURSES[0]

describe('praticar a abertura contra o computador', () => {
  it('oferece os dois lados, e marca qual é o do repertório', () => {
    render(<SparringDaAbertura opening={ITALIANA} />)

    /*
      OS DOIS LADOS ENSINAM COISAS DIFERENTES: pelo lado do repertório o aluno
      executa o que estudou; pelo outro ele descobre por que o adversário joga o
      que joga. Oferecer só um lado entrega metade do exercício.
    */
    expect(screen.getByRole('group', { name: 'Escolher o lado' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Brancas/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Pretas/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /seu repertório/ })).toBeTruthy()
  })

  it('o tabuleiro vira para o lado escolhido', async () => {
    const usuario = userEvent.setup()
    render(<SparringDaAbertura opening={ITALIANA} />)

    const outroLado = ITALIANA.side === 'white' ? /Pretas/ : /Brancas/
    await usuario.click(screen.getByRole('button', { name: outroLado }))

    // Jogar pelo outro lado com o tabuleiro na orientação errada seria o
    // exercício certo apresentado de cabeça para baixo.
    expect(screen.getByTestId('tabuleiro').getAttribute('data-orientation')).toBe(
      ITALIANA.side === 'white' ? 'b' : 'w',
    )
  })

  it('dá para recomeçar a partida', async () => {
    const usuario = userEvent.setup()
    render(<SparringDaAbertura opening={ITALIANA} />)

    // Repetição livre é o motivo de a tela existir: a jornada ensina uma vez.
    await usuario.click(screen.getByRole('button', { name: 'Recomeçar a partida' }))
    expect(screen.getByTestId('tabuleiro')).toBeTruthy()
  })
})
