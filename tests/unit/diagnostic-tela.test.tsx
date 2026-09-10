/**
 * Portão da COSTURA do diagnóstico com a tela.
 *
 * O domínio já tem portão próprio. Este arquivo cobre o modo de falha que
 * portão de domínio nunca acusa: a regra existir, estar verde, e a tela NÃO a
 * chamar. Um diagnóstico que não grava o perfil deixa toda a suíte verde e o
 * aluno sem nada no dia seguinte.
 *
 * As afirmações são sobre comportamento observável — o que aparece na tela e o
 * que sobra no repositório — e não sobre qual função foi chamada.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import { acertou } from '@/domain/diagnostic'
import { createDefaultProfile } from '@/domain/profile'
import type { UserProfile } from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { legalMoves } from '@/lib/chess'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

// O tabuleiro real depende de medida de layout, que o jsdom não tem. O que este
// arquivo mede é a costura do diagnóstico, não o desenho das casas — o `data-fen`
// basta para provar que a posição certa chegou à tela.
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: ({ fen }: { fen: string }) => <div data-testid="tabuleiro" data-fen={fen} />,
}))

const { DiagnosticoWizard } = await import('@/components/onboarding/DiagnosticoWizard')

const AGORA = new Date('2026-09-10T12:00:00.000Z')

function montar() {
  const repo = new MemoryTrainingRepository()
  let perfil: UserProfile = createDefaultProfile('aluno-tela', AGORA)
  contexto.valor = {
    status: 'pronto',
    repo,
    profile: perfil,
    erro: null,
    revision: 0,
    refresh: () => {},
    saveProfile: async (proximo: UserProfile) => {
      perfil = proximo
      await repo.saveProfile(proximo)
    },
  }
  return { repo, perfilAtual: () => perfil }
}

/** Notação curta do lance, que é o rótulo do botão na tela. */
function rotuloDe(fen: string, uci: string): string {
  return legalMoves(fen).find((lance) => lance.uci === uci)?.san ?? uci
}

/** Responde o diagnóstico inteiro escolhendo certo ou errado por item. */
async function responderTudo(
  usuario: ReturnType<typeof userEvent.setup>,
  certo: (dificuldade: number) => boolean,
) {
  for (const item of BANCO_DE_DIAGNOSTICO) {
    const uci = certo(item.dificuldade) ? item.lancesAceitos[0] : item.alternativas[0]
    const botao = await screen.findByRole('button', { name: rotuloDe(item.fen, uci) })
    await usuario.click(botao)
  }
}

describe('diagnóstico na tela', () => {
  it('vai da porta ao plano e grava o perfil sem conta', async () => {
    const usuario = userEvent.setup()
    const { repo, perfilAtual } = montar()
    render(<DiagnosticoWizard />)

    await usuario.click(screen.getByRole('button', { name: '20 min' }))
    await usuario.type(screen.getByLabelText(/rating, se você souber/i), '1100')
    await usuario.click(screen.getByRole('button', { name: /começar o diagnóstico/i }))

    await responderTudo(usuario, (dificuldade) => dificuldade <= 1100)

    expect(await screen.findByText(/seu ponto de partida/i)).toBeInTheDocument()
    expect(screen.getByText(/faixa estimada/i)).toBeInTheDocument()

    await waitFor(async () => {
      expect(await repo.getProfile()).not.toBeNull()
    })
    const gravado = await repo.getProfile()
    expect(gravado?.dailyBudgetMinutes).toBe(20)
    expect(perfilAtual().dailyBudgetMinutes).toBe(20)

    const mastery = await repo.getSkillMastery()
    const medidas = new Set(BANCO_DE_DIAGNOSTICO.map((item) => item.skillId))
    expect(new Set(mastery.map((m) => m.skillId))).toEqual(medidas)

    expect(await screen.findByText(/salvo neste navegador/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /treino de hoje/i })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  }, 60_000)

  it('a primeira semana mostrada respeita o orçamento escolhido', async () => {
    const usuario = userEvent.setup()
    montar()
    render(<DiagnosticoWizard />)

    await usuario.click(screen.getByRole('button', { name: '20 min' }))
    await usuario.click(screen.getByRole('button', { name: /começar o diagnóstico/i }))
    await responderTudo(usuario, () => true)

    const dias = await screen.findAllByText(/^Dia \d+ · \d+ min$/)
    expect(dias.length).toBe(7)
    for (const dia of dias) {
      const minutos = Number(/· (\d+) min/.exec(dia.textContent ?? '')?.[1])
      expect(minutos).toBeLessThanOrEqual(20)
    }
  }, 60_000)

  /**
   * A DECISÃO DE PRODUTO que este caso protege: o diagnóstico MEDE, não treina.
   * Retorno item a item mudaria a forma de responder as posições seguintes.
   */
  it('não dá retorno durante o teste', async () => {
    const usuario = userEvent.setup()
    montar()
    render(<DiagnosticoWizard />)

    await usuario.click(screen.getByRole('button', { name: /começar o diagnóstico/i }))

    const primeiro = BANCO_DE_DIAGNOSTICO[0]
    const errado = primeiro.alternativas[0]
    expect(acertou(primeiro, errado)).toBe(false)
    await usuario.click(screen.getByRole('button', { name: rotuloDe(primeiro.fen, errado) }))

    expect(screen.queryByText(primeiro.explicacao)).not.toBeInTheDocument()
    expect(screen.getByText(/posição 2 de/i)).toBeInTheDocument()
  }, 30_000)

  it('as explicações das posições erradas aparecem no fim', async () => {
    const usuario = userEvent.setup()
    montar()
    render(<DiagnosticoWizard />)

    await usuario.click(screen.getByRole('button', { name: /começar o diagnóstico/i }))
    await responderTudo(usuario, () => false)

    expect(await screen.findByText(/as posições que não saíram/i)).toBeInTheDocument()
    expect(screen.getByText(BANCO_DE_DIAGNOSTICO[0].explicacao)).toBeInTheDocument()
  }, 60_000)
})
