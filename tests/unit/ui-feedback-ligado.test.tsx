/**
 * Portão da LIGAÇÃO do `FeedbackBanner` nas telas de treino (issue #61).
 *
 * POR QUE ESTE ARQUIVO EXISTE. O `FeedbackBanner` já tinha portão próprio em
 * `ui-estados-visuais.test.tsx`, e mesmo assim não rodava em tela nenhuma:
 * `PuzzleTrainer` e `ReviewSession` desenhavam cada um o seu selo de acerto e
 * erro, com as suas próprias classes de cor. Eram TRÊS desenhos para o mesmo
 * estado, e o teste do componente ficava verde enquanto os dois em uso
 * divergiam dele. Testar o componente isolado nunca prova que ele está ligado.
 *
 * O QUE ESTE ARQUIVO AFIRMA, e não é o texto de nenhuma tela:
 *
 * 1. as duas telas, nos dois desfechos, anunciam o estado pela PALAVRA DO
 *    CATÁLOGO — lida de `feedbackToneCatalog` na hora, nunca copiada aqui.
 *    Mudar o rótulo no catálogo tem de mudar as duas telas juntas;
 * 2. o anúncio é `role="status"` também no desfecho ruim. Isso é decisão de
 *    TOM, registrada na issue: erro aqui é informação, e `alert` interromperia
 *    o leitor de tela dizendo o contrário do que o produto quer dizer. Trocar
 *    por `alert` "para ficar mais acessível" reprova aqui, de propósito;
 * 3. cor + ícone + texto, no DOM renderizado;
 * 4. os CSS Modules das duas telas não voltaram a declarar `.status/.ok/.bad`.
 *    Sem esta parte, nada impede que a segunda tabela de cor volte amanhã ao
 *    lado da faixa, e ninguém perceba.
 *
 * A consulta é por PAPEL e por TEXTO. Classe é detalhe de implementação.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: aparência. Ele não vê cor calculada, contraste
 * nem animação — `contrast.test.ts` e o guia cuidam disso.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import { parsePuzzleCsv, toSolvable } from '@/domain/puzzles'
import { createDefaultProfile } from '@/domain/profile'
import type { SolvablePuzzle } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { feedbackToneCatalog, type FeedbackTone } from '@/lib/design/feedback'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { CSV_MATE_EM_UM, PUZZLE_CSV_HEADER } from '../fixtures/puzzles'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/**
 * O tabuleiro é dependência de terceiros com arraste. Aqui ele vira um duble
 * que EXPÕE a posição e o `onMove`: é a única forma de chegar ao desfecho de
 * acerto sem simular arrastar peça, e o lance jogado continua saindo da mesma
 * posição que a tela mostra.
 */
const tabuleiro = vi.hoisted(() => ({
  onMove: null as null | ((from: string, to: string, promotion?: string) => boolean),
}))

vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: {
    fen: string
    onMove?: (from: string, to: string, promotion?: string) => boolean
  }) => {
    tabuleiro.onMove = props.onMove ?? null
    return <div data-testid="tabuleiro" data-fen={props.fen} />
  },
}))

const { PuzzleTrainer } = await import('@/components/puzzles/PuzzleTrainer')
const { ReviewSession } = await import('@/components/training/ReviewSession')

/** Mesmo conjunto que a tela usa. Serve para descobrir a solução da posição exibida. */
const SOLUVEIS: readonly SolvablePuzzle[] = parsePuzzleCsv(STARTER_PUZZLES_CSV, {
  pularCabecalho: true,
}).puzzles.map((puzzle) => toSolvable(puzzle))

/** Fixture com solução de um lance só: a revisão termina em um gesto. */
const REVISAO_DE_UM_LANCE = toSolvable(
  parsePuzzleCsv(`${PUZZLE_CSV_HEADER}\n${CSV_MATE_EM_UM}`, { pularCabecalho: true }).puzzles[0],
)

function contextoCom(repo: MemoryTrainingRepository) {
  return {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', new Date('2026-01-01T00:00:00.000Z')),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
}

/**
 * Cor + ícone + a palavra do estado, no elemento anunciado.
 *
 * O rótulo esperado vem do catálogo, não deste arquivo: é o que faz o portão
 * acompanhar uma mudança de tom em vez de defendê-la contra a tela.
 */
function exigirFaixa(tone: FeedbackTone): HTMLElement {
  const faixa = screen
    .getAllByRole('status')
    .find((element) => element.textContent?.includes(feedbackToneCatalog[tone].label))
  expect(faixa, 'faixa de feedback ausente').toBeDefined()
  if (!faixa) throw new Error('faixa de feedback ausente')
  expect(faixa.querySelector('svg'), 'ícone ausente na faixa').not.toBeNull()
  expect(faixa.getAttribute('style') ?? '', 'cor do estado não aplicada').toMatch(
    /color:\s*var\(--/,
  )
  expect(faixa).toHaveTextContent(feedbackToneCatalog[tone].label)
  return faixa
}

/** Joga um lance da solução pelo duble do tabuleiro. */
async function jogar(uci: string): Promise<void> {
  const promocao = uci.length > 4 ? uci.slice(4) : undefined
  await act(async () => {
    tabuleiro.onMove?.(uci.slice(0, 2), uci.slice(2, 4), promocao)
  })
}

/** A posição na tela é a fonte: a solução é procurada a partir dela. */
function solucaoDaPosicaoExibida(): readonly string[] {
  const fen = screen.getByTestId('tabuleiro').getAttribute('data-fen')
  const alvo = SOLUVEIS.find((s) => s.startFen === fen)
  if (!alvo) {
    throw new Error(`Nenhum puzzle do conjunto inicial começa em ${fen}: o duble desalinhou.`)
  }
  return alvo.solutionUci
}

beforeEach(() => {
  globalThis.localStorage.clear()
  tabuleiro.onMove = null
})

afterEach(() => {
  contexto.valor = null
})

describe('PuzzleTrainer usa a faixa do guia nos dois desfechos', () => {
  async function montar() {
    contexto.valor = contextoCom(new MemoryTrainingRepository())
    render(<PuzzleTrainer />)
    await screen.findByText(/Puzzle 1 de \d+/)
  }

  it('resolver anuncia o estado correto do catálogo', async () => {
    await montar()

    // Lances de índice PAR são do aluno; os ímpares a própria tela responde.
    const solucao = solucaoDaPosicaoExibida()
    for (let i = 0; i < solucao.length; i += 2) {
      await jogar(solucao[i])
    }

    await waitFor(() => exigirFaixa('correto'))
  })

  it('desistir anuncia o estado incorreto do catálogo, sem falar em fracasso', async () => {
    await montar()

    await userEvent.click(screen.getByRole('button', { name: 'Desistir' }))

    const faixa = await waitFor(() => exigirFaixa('incorreto'))
    expect(faixa.textContent ?? '').not.toMatch(/errad|falh|perdeu|reprov/i)
  })

  it('o selo antigo da própria tela não voltou', async () => {
    await montar()
    await userEvent.click(screen.getByRole('button', { name: 'Desistir' }))
    await waitFor(() => exigirFaixa('incorreto'))

    expect(document.body.textContent ?? '').not.toMatch(/Resolvido|Não saiu desta vez/)
  })
})

describe('ReviewSession usa a faixa do guia nos dois desfechos', () => {
  async function montar() {
    const repo = new MemoryTrainingRepository()
    await repo.saveReviewCard(
      createReviewCard(
        {
          id: 'card-de-teste',
          kind: 'posicao-exata',
          skillIds: [],
          fen: REVISAO_DE_UM_LANCE.startFen,
          solutionUci: [...REVISAO_DE_UM_LANCE.solutionUci],
          prompt: 'Brancas jogam.',
        },
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    )
    contexto.valor = contextoCom(repo)
    render(<ReviewSession />)
    await screen.findByText(/Revisão 0 de 1/)
  }

  it('lembrar o lance anuncia o estado correto do catálogo', async () => {
    await montar()

    await jogar(REVISAO_DE_UM_LANCE.solutionUci[0])

    await waitFor(() => exigirFaixa('correto'))
  })

  it('não lembrar anuncia o estado incorreto e traz a resposta dentro da faixa', async () => {
    await montar()

    await userEvent.click(screen.getByRole('button', { name: 'Não lembro' }))

    const faixa = await waitFor(() => exigirFaixa('incorreto'))
    // A resposta é anunciada JUNTO com o estado, não em um parágrafo ao lado.
    expect(faixa).toHaveTextContent(REVISAO_DE_UM_LANCE.solutionUci[0])
    expect(faixa.textContent ?? '').not.toMatch(/errad|falh|perdeu|reprov/i)
  })

  it('o selo antigo da própria tela não voltou', async () => {
    await montar()
    await userEvent.click(screen.getByRole('button', { name: 'Não lembro' }))
    await waitFor(() => exigirFaixa('incorreto'))

    expect(document.body.textContent ?? '').not.toMatch(/Correto|Não era esse/)
  })
})

/**
 * A segunda tabela de cor não pode voltar pela porta dos fundos.
 *
 * A varredura lê o ARQUIVO das duas telas ligadas acima — não uma lista solta —
 * e reprova se qualquer uma delas voltar a declarar as classes de estado que a
 * issue #61 removeu. Comentários são descartados antes: o próprio comentário
 * que explica a remoção cita os nomes.
 */
describe('os CSS Modules das telas ligadas não redeclaram o estado', () => {
  const MODULOS_DAS_TELAS = [
    'src/components/puzzles/PuzzleTrainer.module.css',
    'src/components/training/ReviewSession.module.css',
  ] as const

  const CLASSES_QUE_SAIRAM = ['status', 'ok', 'bad'] as const

  function semComentarios(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  function lerModulo(relativo: string): string {
    return readFileSync(join(process.cwd(), relativo), 'utf8')
  }

  // Regra do portão: varredura sem nada para varrer não é aprovação.
  it('a varredura encontrou os módulos e tem o que procurar', () => {
    expect(MODULOS_DAS_TELAS.length).toBeGreaterThan(0)
    expect(CLASSES_QUE_SAIRAM.length).toBeGreaterThan(0)
    for (const caminho of MODULOS_DAS_TELAS) {
      expect(lerModulo(caminho).length, `${caminho} veio vazio`).toBeGreaterThan(0)
    }
  })

  it('nenhuma das classes removidas foi redeclarada', () => {
    const reincidentes: string[] = []
    for (const caminho of MODULOS_DAS_TELAS) {
      const css = semComentarios(lerModulo(caminho))
      for (const classe of CLASSES_QUE_SAIRAM) {
        if (new RegExp(`(^|[\\s,{}])\\.${classe}\\b`).test(css)) {
          reincidentes.push(`${caminho}: .${classe}`)
        }
      }
    }
    expect(
      reincidentes,
      `estado redesenhado localmente em vez de vir do FeedbackBanner:\n${reincidentes.join('\n')}`,
    ).toEqual([])
  })
})

/**
 * Nenhum estado do catálogo fica sem tela.
 *
 * A varredura percorre o CATÁLOGO, não uma lista escrita à mão: um tom novo
 * que ninguém ligar em tela nenhuma reprova aqui em vez de virar o próximo
 * `FeedbackBanner` esquecido — que é exatamente a falha que originou a #61.
 */
describe('todo estado do catálogo é usado por alguma tela de treino', () => {
  const TELAS_LIGADAS = [
    'src/components/puzzles/PuzzleTrainer.tsx',
    'src/components/training/ReviewSession.tsx',
  ] as const

  const tons = Object.keys(feedbackToneCatalog) as FeedbackTone[]

  it('a varredura encontrou tons e telas', () => {
    expect(tons.length).toBeGreaterThan(0)
    expect(TELAS_LIGADAS.length).toBeGreaterThan(0)
  })

  it('cada tom aparece em pelo menos uma tela', () => {
    const fontes = TELAS_LIGADAS.map((caminho) =>
      readFileSync(join(process.cwd(), caminho), 'utf8'),
    )
    const orfaos = tons.filter((tone) => !fontes.some((src) => src.includes(`tone="${tone}"`)))
    expect(orfaos, `tons do catálogo sem nenhuma tela: ${orfaos.join(', ')}`).toEqual([])
  })
})
