/**
 * Portão do que a TELA de aberturas realmente desenha.
 *
 * `openings-tela.test.tsx` cobra os textos e o desenho da árvore como funções.
 * Este arquivo cobra a ligação: que a ideia chega ao aluno, que lacuna e desvio
 * chegam SEPARADAS, e que nada disso depende do explorer nem do armazenamento.
 *
 * 1. A IDEIA APARECE. É o ponto do produto. Um repertório que renderiza os
 *    lances e engole as ideias é memorização com outro nome, e passaria em
 *    qualquer teste que só contasse SAN na tela.
 *
 * 2. LACUNA E DESVIO NÃO SE FUNDEM NA RENDERIZAÇÃO. As duas listas vêm do mesmo
 *    componente `Saidas`; o risco real é uma cair dentro da seção da outra. Por
 *    isso cada asserção é feita DENTRO do escopo da seção, e não na página
 *    inteira — procurar o texto na página toda passaria com as duas listas
 *    trocadas.
 *
 * 3. A TELA NASCE SEM ESTATÍSTICA. O dublê do explorer não pode ser chamado até
 *    o aluno pedir. Consultar sozinho um serviço que respondeu 401 nas duas
 *    medições da issue #71 gastaria dados de quem está no celular.
 *
 * 4. O MOTIVO MUDA A INTERFACE, não só o texto: `timeout` ganha botão de tentar
 *    de novo, `sem-autorizacao` não. Insistir onde insistir não resolve é o
 *    tipo de gentileza que vira frustração.
 *
 * 5. ARMAZENAMENTO FORA DO AR NÃO ESCONDE O REPERTÓRIO. O conteúdo é local e
 *    versionado; travá-lo atrás do IndexedDB seria inventar uma dependência.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a rota `/openings` monta no navegador, que a
 * CSP deixa a requisição do explorer sair, e que o CSS não esconde nada. Isso é
 * `tests/e2e/aberturas.spec.ts`, e só ele.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Chess } from 'chess.js'
import { REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings'
import type { ExplorerStats, Game } from '@/domain/types'
import type { RespostaDoExplorer } from '@/lib/openings'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { APRESENTACAO_POR_SAIDA, SEM_PARTIDAS_NA_POSICAO } from '@/components/openings/textos'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

const { OpeningsWorkbench } = await import('@/components/openings/OpeningsWorkbench')

// ---------------------------------------------------------------- ajudantes

function pgnDe(sans: readonly string[]): string {
  const chess = new Chess()
  for (const san of sans) {
    chess.move(san)
  }
  return chess.pgn()
}

function partida(id: string, sans: readonly string[], userColor: 'w' | 'b' = 'w'): Game {
  return {
    id,
    source: 'pgn',
    pgn: pgnDe(sans),
    playedAt: '2026-03-01T12:00:00Z',
    white: 'aluno',
    black: 'adversario',
    userColor,
    result: '*',
    importedAt: '2026-03-02T00:00:00Z',
  }
}

/** O adversário responde 1...c5: o repertório de brancas não cobre a Siciliana. */
const LACUNA_SICILIANA = ['e4', 'c5', 'Nf3']

/** O ALUNO joga 2.Bc4 no lugar de 2.Nf3: saiu do próprio repertório. */
const DESVIO_DO_ALUNO = ['e4', 'e5', 'Bc4', 'Nc6']

async function montar(
  partidas: readonly Game[],
  consultar?: (fen: string) => Promise<RespostaDoExplorer>,
): Promise<void> {
  const repo = new MemoryTrainingRepository()
  for (const jogo of partidas) {
    await repo.saveGame(jogo)
  }
  contexto.valor = { repo, status: 'pronto', erro: null, revision: 0 }
  // `act` assíncrono porque a leitura das partidas resolve DEPOIS do render.
  // Sem isso o React avisa que houve atualização fora de `act`, e aviso de
  // teste aqui esconderia exatamente o que interessa: uma tela que assere
  // antes de os dados chegarem passa por sorte.
  await act(async () => {
    render(
      <OpeningsWorkbench consultarExplorer={consultar ? (fen) => consultar(fen) : undefined} />,
    )
  })
}

/** A seção de um repertório, para não procurar texto na página inteira. */
function secaoDe(titulo: string): HTMLElement {
  return screen.getByRole('region', { name: titulo })
}

beforeEach(() => {
  contexto.valor = null
})

// --------------------------------------------------------------- repertório

describe('os dois repertórios e as ideias', () => {
  it('mostra o repertório de brancas E o de pretas, com o princípio de cada um', async () => {
    await montar([])

    expect(await screen.findByRole('heading', { name: REPERTORIO_BRANCAS.titulo })).toBeVisible()
    expect(screen.getByRole('heading', { name: REPERTORIO_PRETAS.titulo })).toBeVisible()
    expect(screen.getByText(REPERTORIO_BRANCAS.principio)).toBeVisible()
    expect(screen.getByText(REPERTORIO_PRETAS.principio)).toBeVisible()
  })

  it('a IDEIA de cada lance aparece — inclusive a do lance do ADVERSÁRIO', async () => {
    await montar([])
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    const primeiraLinha = REPERTORIO_BRANCAS.linhas[0]
    const meuLance = primeiraLinha.lances[0]
    const lanceDele = primeiraLinha.lances[1]

    // Derivado do conteúdo: se alguém apagar a ideia lá, o portão da árvore
    // acusa antes deste, e este continua apontando para o lance certo.
    expect(meuLance.ideia, 'o conteúdo perdeu a ideia do primeiro lance').toBeTruthy()
    expect(lanceDele.ideia, 'o conteúdo perdeu a ideia do lance do adversário').toBeTruthy()

    expect(within(brancas).getByText(meuLance.ideia as string)).toBeVisible()
    expect(within(brancas).getByText(lanceDele.ideia as string)).toBeVisible()
  })

  it('diz de quem é cada lance com TEXTO, não só com cor', async () => {
    await montar([])
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    expect(within(brancas).getAllByText(/seu lance/).length).toBeGreaterThan(0)
    expect(within(brancas).getAllByText(/lance do adversário/).length).toBeGreaterThan(0)
  })

  it('marca a transposição em vez de desenhar a mesma posição duas vezes', async () => {
    await montar([])
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    expect(within(brancas).getAllByText(/Transposição/).length).toBeGreaterThan(0)
  })
})

// ------------------------------------------------------- lacunas e desvios

describe('lacuna e desvio chegam separados à tela', () => {
  it('a lacuna aparece com a contagem real, na seção das lacunas', async () => {
    await montar([
      partida('a', LACUNA_SICILIANA),
      partida('b', LACUNA_SICILIANA),
      partida('c', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O']),
    ])

    const lacunas = await screen.findByRole('region', {
      name: new RegExp(APRESENTACAO_POR_SAIDA.lacuna.titulo),
    })

    expect(within(lacunas).getByText(/1\.\.\. c5/)).toBeVisible()
    expect(within(lacunas).getByText(APRESENTACAO_POR_SAIDA.lacuna.frase(2))).toBeVisible()
  })

  it('o desvio aparece na seção dos DESVIOS, e não junto das lacunas', async () => {
    await montar([partida('a', DESVIO_DO_ALUNO)])

    const desvios = await screen.findByRole('region', {
      name: new RegExp(APRESENTACAO_POR_SAIDA.desvio.titulo),
    })
    const lacunas = screen.getAllByRole('region', {
      name: new RegExp(APRESENTACAO_POR_SAIDA.lacuna.titulo),
    })[0]

    expect(within(desvios).getByText(/2\. Bc4/)).toBeVisible()
    expect(within(desvios).getByText(APRESENTACAO_POR_SAIDA.desvio.frase(1))).toBeVisible()

    // O mesmo lance NÃO pode aparecer do lado das lacunas: são diagnósticos
    // opostos, e a fusão é justamente o defeito que esta tela tinha de evitar.
    expect(within(lacunas).queryByText(/2\. Bc4/)).toBeNull()
    expect(within(lacunas).queryByText(APRESENTACAO_POR_SAIDA.desvio.frase(1))).toBeNull()
  })

  it('as duas seções pedem AÇÕES diferentes', async () => {
    await montar([partida('a', LACUNA_SICILIANA), partida('b', DESVIO_DO_ALUNO)])

    const lacunas = await screen.findByRole('region', {
      name: new RegExp(APRESENTACAO_POR_SAIDA.lacuna.titulo),
    })
    const desvios = screen.getByRole('region', {
      name: new RegExp(APRESENTACAO_POR_SAIDA.desvio.titulo),
    })

    expect(within(lacunas).getByText(/O que fazer:/).parentElement).toHaveTextContent(
      APRESENTACAO_POR_SAIDA.lacuna.acao,
    )
    expect(within(desvios).getByText(/O que fazer:/).parentElement).toHaveTextContent(
      APRESENTACAO_POR_SAIDA.desvio.acao,
    )
  })

  it('sem partida importada, nenhuma contagem é inventada', async () => {
    await montar([])

    const brancas = await screen.findByRole('region', { name: REPERTORIO_BRANCAS.titulo })
    expect(within(brancas).getByText(/Nenhuma partida importada ainda/)).toBeVisible()

    // As seções de lacuna e desvio nem existem: "0 lacunas" com zero partidas
    // afirmaria que o repertório cobre tudo.
    expect(within(brancas).queryByText(new RegExp(APRESENTACAO_POR_SAIDA.lacuna.titulo))).toBeNull()
    expect(within(brancas).queryByText(new RegExp(APRESENTACAO_POR_SAIDA.desvio.titulo))).toBeNull()
  })

  it('partidas só do outro lado não viram "nenhuma partida"', async () => {
    await montar([partida('a', ['e4', 'e5'], 'b')])

    const brancas = await screen.findByRole('region', { name: REPERTORIO_BRANCAS.titulo })
    expect(within(brancas).getByText(/nenhuma delas foi jogada de brancas/)).toBeVisible()
    expect(within(brancas).queryByText(/Nenhuma partida importada ainda/)).toBeNull()
  })
})

// -------------------------------------------------------------- degradação

describe('o repertório não depende do armazenamento', () => {
  it('IndexedDB fora do ar não esconde as linhas nem as ideias', async () => {
    contexto.valor = {
      repo: null,
      status: 'erro',
      erro: 'Não consegui abrir o armazenamento local: acesso negado.',
      revision: 0,
    }
    render(<OpeningsWorkbench />)

    expect(await screen.findByRole('heading', { name: REPERTORIO_BRANCAS.titulo })).toBeVisible()
    expect(screen.getByText(REPERTORIO_BRANCAS.principio)).toBeVisible()
    expect(screen.getAllByText(/acesso negado/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/continuam válidas/).length).toBeGreaterThan(0)
  })

  it('leitura das partidas que falha vira aviso, e não lista vazia', async () => {
    const repo = new MemoryTrainingRepository()
    vi.spyOn(repo, 'listGames').mockRejectedValue(new Error('banco fechado'))
    contexto.valor = { repo, status: 'pronto', erro: null, revision: 0 }
    render(<OpeningsWorkbench />)

    expect(await screen.findAllByText(/banco fechado/)).not.toHaveLength(0)
    expect(screen.queryByText(/Nenhuma partida importada ainda/)).toBeNull()
  })
})

// ---------------------------------------------------------------- explorer

function resposta(indisponivel: RespostaDoExplorer['indisponivel']): RespostaDoExplorer {
  return { estatisticas: null, indisponivel }
}

function estatisticasVazias(): ExplorerStats {
  return {
    fen: 'x',
    base: 'lichess',
    brancas: 0,
    empates: 0,
    pretas: 0,
    total: 0,
    lances: [],
    abertura: null,
    doCache: false,
  }
}

describe('o explorer é opcional e diz por que falhou', () => {
  it('a tela NASCE sem estatística: nada é consultado sozinho', async () => {
    const espiao = vi.fn(async () => resposta('sem-autorizacao'))
    await montar([], espiao)

    expect(await screen.findByRole('heading', { name: REPERTORIO_BRANCAS.titulo })).toBeVisible()
    await waitFor(() => {
      expect(screen.getAllByText(/Nenhuma consulta feita nesta posição/).length).toBeGreaterThan(0)
    })
    expect(espiao).not.toHaveBeenCalled()
  })

  it('401 diz que insistir não resolve, e NÃO oferece tentar de novo', async () => {
    const espiao = vi.fn(async () => resposta('sem-autorizacao'))
    await montar([], espiao)

    const brancas = await screen.findByRole('region', { name: REPERTORIO_BRANCAS.titulo })
    await userEvent.click(within(brancas).getByRole('button', { name: 'Consultar o explorador' }))

    const resultado = within(brancas).getByRole('status')
    expect(await within(resultado).findByText(/não autorizou a consulta/)).toBeVisible()
    expect(within(resultado).getByText(/Insistir não resolve/)).toBeVisible()
    expect(within(resultado).queryByRole('button', { name: 'Consultar de novo' })).toBeNull()

    // E jamais a afirmação proibida. O escopo é o RESULTADO da consulta: a
    // frase "Nenhuma partida importada ainda" da frequência é verdadeira e
    // vive noutro lugar da mesma seção.
    expect(within(resultado).queryByText(/nenhuma partida/i)).toBeNull()
  })

  it('timeout convida a tentar de novo — o motivo muda a INTERFACE', async () => {
    const espiao = vi.fn(async () => resposta('timeout'))
    await montar([], espiao)

    const brancas = await screen.findByRole('region', { name: REPERTORIO_BRANCAS.titulo })
    await userEvent.click(within(brancas).getByRole('button', { name: 'Consultar o explorador' }))

    expect(await within(brancas).findByText(/demorou demais/)).toBeVisible()
    const repetir = within(brancas).getByRole('button', { name: 'Consultar de novo' })
    await userEvent.click(repetir)
    expect(espiao).toHaveBeenCalledTimes(2)
  })

  it('serviço que RESPONDE sem partidas é dito de outro jeito', async () => {
    const espiao = vi.fn(async () => ({
      estatisticas: estatisticasVazias(),
      indisponivel: null,
    }))
    await montar([], espiao)

    const brancas = await screen.findByRole('region', { name: REPERTORIO_BRANCAS.titulo })
    await userEvent.click(within(brancas).getByRole('button', { name: 'Consultar o explorador' }))

    expect(await within(brancas).findByText(SEM_PARTIDAS_NA_POSICAO)).toBeVisible()
  })
})
