/**
 * Portão da TELA do julgamento de lance (issue #62).
 *
 * O portão do domínio prova a REGRA; este prova que a regra CHEGA AO ALUNO. São
 * defeitos diferentes, e o segundo é o silencioso: o juiz classifica certo, a
 * tela não mostra, e nada fica vermelho em lugar nenhum.
 *
 * Os três casos que ele cobra:
 *
 * 1. O DEGRAU DO MEIO APARECE, com ícone, texto e os DOIS números. Um lance que
 *    ganha por caminho mais longo não pode terminar a tentativa em silêncio.
 * 2. SEM TABLEBASE, A TELA NÃO INVENTA O DEGRAU DO MEIO. Ela diz que não
 *    consegue comparar — e o veredito do objetivo continua funcionando, porque
 *    ele não depende de rede.
 * 3. O RESUMO DA TENTATIVA conta quantos lances foram do degrau do meio. Sem
 *    ele, o aluno que ganhou por caminho torto lê "objetivo cumprido" e vai
 *    embora achando que executou a técnica.
 *
 * A sonda é DUBLADA e devolve lances legais de verdade, derivados da posição:
 * uma tablebase falsa que devolvesse lance ilegal exercitaria um caminho que a
 * produção não tem.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import type { LicaoDeFinal, PosicaoDeFinal } from '@/domain/endgames'
import { legalMoves, normalizeFen } from '@/lib/chess'
import type { LanceTablebase, TablebaseResult } from '@/domain/types'
import { APRESENTACAO_POR_GRAU } from '@/components/endgames/textos'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: ({ fen }: { fen: string }) => <div data-testid="tabuleiro" data-fen={fen} />,
}))

const { EndgameTrainer } = await import('@/components/endgames/EndgameTrainer')

/**
 * Posição escolhida por PROPRIEDADE: mate em mais de um lance, para a tentativa
 * continuar viva depois do primeiro lance do aluno e o julgamento aparecer com
 * a partida em andamento.
 */
function posicaoDeMaisDeUmLance(): { licao: LicaoDeFinal; posicao: PosicaoDeFinal } {
  for (const licao of CURRICULO_FINAIS) {
    for (const posicao of licao.posicoes) {
      if (
        posicao.objetivo.tipo === 'mate-em' &&
        posicao.objetivo.lancesMaximos > 1 &&
        posicao.linhaModelo.length > 2
      ) {
        return { licao, posicao }
      }
    }
  }
  throw new Error('O currículo não tem mais nenhum mate em dois: reescreva este teste.')
}

const { licao, posicao } = posicaoDeMaisDeUmLance()
const MELHOR = posicao.linhaModelo[0]

const OUTRO = (() => {
  const outro = legalMoves(posicao.fen).find((legal) => legal.uci !== MELHOR)
  if (outro === undefined) {
    throw new Error('A posição só tem um lance legal: não dá para exercitar o degrau do meio.')
  }
  return outro.uci
})()

/** DTZ da fixture. Os números da tela têm de sair DAQUI, nunca de um literal. */
const DTZ_DO_MELHOR = -1
const DTZ_DO_PIOR = -18

/**
 * Tablebase falsa: primeiro o melhor lance, depois todos os outros lances
 * legais, todos ainda ganhando e todos mais longos.
 */
const sonda: Sonda = async (fen) => {
  const legais = legalMoves(fen).map((legal) => legal.uci)
  const melhor = legais.includes(MELHOR) ? MELHOR : [...legais].sort()[0]
  const lances: LanceTablebase[] = [melhor, ...legais.filter((uci) => uci !== melhor)].map(
    (uci, indice) => ({
      uci,
      san: null,
      categoria: 'loss' as const,
      resultado: 'derrota' as const,
      dtz: indice === 0 ? DTZ_DO_MELHOR : DTZ_DO_PIOR,
      dtm: null,
    }),
  )
  const resultado: TablebaseResult = {
    fen: normalizeFen(fen),
    categoria: 'win',
    resultado: 'vitoria',
    dtz: null,
    dtm: null,
    xequeMate: false,
    afogamento: false,
    lances,
    doCache: false,
  }
  return resultado
}

/** A degradação: o serviço não respondeu. */
const sondaMuda: Sonda = async () => null

function contextoPronto() {
  return {
    status: 'pronto' as const,
    repo: null,
    profile: null,
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
}

function montar(probe: Sonda) {
  return render(
    <EndgameTrainer licao={licao} posicao={posicao} onVoltar={() => {}} probe={probe} />,
  )
}

/**
 * O número INTEIRO, e não um pedaço de outro número.
 *
 * A borda de palavra não é preciosismo: sem ela `18` contém `1`, e uma frase
 * que mostrasse o mesmo número duas vezes passaria no portão. Isso já deixou
 * uma mutação passar aqui.
 */
function numeroSolto(valor: number): RegExp {
  return new RegExp('\\b' + valor + '\\b')
}

async function jogar(uci: string) {
  await userEvent.type(screen.getByLabelText(/Lance em UCI/), uci)
  await userEvent.click(screen.getByRole('button', { name: 'Jogar lance' }))
}

beforeEach(() => {
  contexto.valor = contextoPronto()
  // Nenhuma rede sai daqui: a sonda é injetada, e o `fetch` global reprova alto
  // se algum caminho esquecido tentar usá-lo.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('sem rede no teste')
    }),
  )
})

describe('o degrau do meio chega ao aluno', () => {
  it('lance que ganha por caminho mais longo é sinalizado com ícone, texto e os dois números', async () => {
    montar(sonda)
    await jogar(OUTRO)

    const bloco = await screen.findByTestId('julgamento-do-lance')

    expect(bloco.dataset.grau).toBe('mantem-mas-e-pior')
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU['mantem-mas-e-pior'].rotulo)
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU['mantem-mas-e-pior'].icone)
    // O QUE foi pior, e não só QUE foi pior: os dois números saem da fixture.
    // A borda de palavra não é preciosismo: sem ela, `18` contém `1` e a
    // asserção do segundo número passaria mesmo com a tela mostrando o mesmo
    // número duas vezes. Esse portão frouxo já deixou uma mutação passar.
    expect(bloco.textContent).toMatch(numeroSolto(Math.abs(DTZ_DO_PIOR)))
    expect(bloco.textContent).toMatch(numeroSolto(Math.abs(DTZ_DO_MELHOR)))
  })

  it('o degrau do meio não é apresentado como erro: o objetivo segue em andamento', async () => {
    montar(sonda)
    await jogar(OUTRO)
    await screen.findByTestId('julgamento-do-lance')

    // A tentativa continua: o lance ganhou, e a tela não a encerrou como falha.
    expect(screen.queryByText(/Objetivo não cumprido/)).not.toBeInTheDocument()
  })

  it('o melhor lance é apresentado como melhor', async () => {
    montar(sonda)
    await jogar(MELHOR)

    const bloco = await screen.findByTestId('julgamento-do-lance')
    expect(bloco.dataset.grau).toBe('melhor')
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU.melhor.rotulo)
  })
})

describe('sem tablebase a tela não inventa o degrau do meio', () => {
  it('diz que não consegue comparar, em vez de escolher um degrau no escuro', async () => {
    montar(sondaMuda)
    await jogar(OUTRO)

    const bloco = await screen.findByTestId('julgamento-do-lance')

    expect(bloco.dataset.grau).toBe('indeterminado')
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU.indeterminado.rotulo)
    expect(bloco).toHaveTextContent(/não há como dizer qual era o melhor/i)
  })

  it('o veredito do objetivo continua funcionando sem rede', async () => {
    montar(sondaMuda)
    await jogar(OUTRO)
    await screen.findByTestId('julgamento-do-lance')

    // O objetivo é julgado por `avaliarObjetivo`, que não depende de tablebase:
    // a tentativa continua utilizável com o serviço fora do ar.
    expect(screen.getByText(/Em andamento/)).toBeInTheDocument()
  })
})

describe('o resumo da tentativa conta o degrau do meio', () => {
  it('cumprir o objetivo por caminho torto não vira "acerto limpo" em silêncio', async () => {
    montar(sonda)
    await jogar(OUTRO)
    await screen.findByTestId('julgamento-do-lance')
    await userEvent.click(screen.getByRole('button', { name: /Desistir/ }))

    const resumo = await screen.findByTestId('resumo-dos-lances')
    expect(resumo).toHaveTextContent(/mais longo/i)
  })

  it('recomeçar zera os julgamentos: a tentativa nova não herda a anterior', async () => {
    montar(sonda)
    await jogar(OUTRO)
    await screen.findByTestId('julgamento-do-lance')

    await userEvent.click(screen.getByRole('button', { name: /Recomeçar/ }))

    expect(screen.queryByTestId('julgamento-do-lance')).not.toBeInTheDocument()
    expect(screen.queryByTestId('resumo-dos-lances')).not.toBeInTheDocument()
  })
})
