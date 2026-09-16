/**
 * Portão da FILA DE REVISÃO com card de final (segunda metade da issue #62).
 *
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR: a fila comparava
 * `solutionUci` letra a letra. Num final vários lances ganham, e o aluno que
 * jogasse um deles era marcado como errado — o que baixa a maestria e reagenda
 * o card. O sintoma é SILENCIOSO: nada quebra, nada fica vermelho, e o aluno
 * simplesmente aprende a repetir um lance em vez de entender a técnica.
 *
 * O que este arquivo afirma, em duas camadas:
 *
 * 1. A POLÍTICA, pura, em `vereditoDaRevisao`. Ela é varrida a partir de
 *    `GRAUS_DO_LANCE` e de `VEREDITOS_DA_REVISAO` — as FONTES — e não de uma
 *    lista escrita aqui, que ficaria para trás no dia em que nascer um degrau.
 * 2. A LIGAÇÃO: que a política chega ao aluno na tela, com os números na mão, e
 *    que o desconto chega ao MODELO DE MAESTRIA. Testar a função pura nunca
 *    prova que ela está ligada — foi assim que a #61 nasceu.
 *
 * O QUE ELE NÃO PROVA: aparência (cor calculada, contraste, foco), o percurso
 * real do teclado no tabuleiro de terceiros, e a rede — a tablebase é DUBLADA
 * aqui, e o `fetch` global reprova alto se algum caminho esquecido tentar usá-lo.
 * A lacuna de ponta a ponta continua aberta: nenhum teste de navegador cobre
 * esta tela com card de final.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'
import { APRESENTACAO_POR_GRAU, TONS_DO_ESTADO } from '@/components/endgames/textos'
import { CURRICULO_FINAIS } from '@/content/endgames'
import {
  GRAUS_DO_LANCE,
  julgarLanceDeFinal,
  type GrauDoLance,
  type JulgamentoDoLance,
  type LicaoDeFinal,
  type PosicaoDeFinal,
} from '@/domain/endgames'
import {
  EFEITO_DO_VEREDITO,
  posicaoParaReviewCard,
  vereditoDaRevisao,
  VEREDITOS_DA_REVISAO,
} from '@/domain/endgames/persistencia'
import { createDefaultProfile } from '@/domain/profile'
import { RATING_LABEL } from '@/domain/review/session'
import type { ReviewCard } from '@/domain/types'
import { legalMoves, normalizeFen } from '@/lib/chess'
import { createReviewCard } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import type { LanceTablebase, TablebaseResult } from '@/domain/types'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/**
 * O tabuleiro é dependência de terceiros com arraste. O duble EXPÕE `onMove`:
 * é a única forma de entregar um lance sem simular arrastar peça, e a posição
 * jogada continua saindo da mesma FEN que a tela mostra.
 */
const tabuleiro = vi.hoisted(() => ({
  onMove: null as null | ((from: string, to: string, promotion?: string) => boolean),
  interactive: true,
}))

vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: {
    fen: string
    interactive?: boolean
    onMove?: (from: string, to: string, promotion?: string) => boolean
  }) => {
    tabuleiro.onMove = props.onMove ?? null
    tabuleiro.interactive = props.interactive ?? true
    return <div data-testid="tabuleiro" data-fen={props.fen} />
  },
}))

const { COR_DO_TOM, ReviewSession } = await import('@/components/training/ReviewSession')

// ---------------------------------------------------------------- a fixture

/**
 * A posição sai do CURRÍCULO, escolhida por PROPRIEDADE e não pelo nome: tem
 * linha modelo e mais de um lance legal, que é o mínimo para existir um lance
 * alternativo a julgar. Escolher "Lucena" pelo id deixaria o teste morto no dia
 * em que o currículo fosse reorganizado.
 */
function posicaoComAlternativa(): { licao: LicaoDeFinal; posicao: PosicaoDeFinal } {
  for (const licao of CURRICULO_FINAIS) {
    for (const posicao of licao.posicoes) {
      if (posicao.linhaModelo.length > 0 && legalMoves(posicao.fen).length > 1) {
        return { licao, posicao }
      }
    }
  }
  throw new Error('Nenhuma posição do currículo tem linha modelo e mais de um lance legal.')
}

const { licao, posicao } = posicaoComAlternativa()

/** O lance que o card guarda: o primeiro da linha modelo. */
const DO_CARD = posicao.linhaModelo[0]

/** Um lance legal qualquer que NÃO é o do card. */
const OUTRO = (() => {
  const outro = legalMoves(posicao.fen).find((legal) => legal.uci !== DO_CARD)
  if (outro === undefined) {
    throw new Error('A posição só tem um lance legal: não dá para exercitar a alternativa.')
  }
  return outro.uci
})()

/**
 * Um arrasto ILEGAL: a peça do lance da lição para uma casa impossível.
 *
 * Derivado da posição, e não escrito à mão: casa escolhida à mão vira lance
 * legal no dia em que a fixture mudar, e o teste passaria a medir outra coisa.
 */
const ILEGAL = (() => {
  const origem = DO_CARD.slice(0, 2)
  const destinos = new Set(
    legalMoves(posicao.fen)
      .filter((legal) => legal.uci.startsWith(origem))
      .map((legal) => legal.uci.slice(2, 4)),
  )
  for (const coluna of 'abcdefgh') {
    for (const linha of '12345678') {
      const casa = `${coluna}${linha}`
      if (casa !== origem && !destinos.has(casa)) {
        return `${origem}${casa}`
      }
    }
  }
  throw new Error('A peça alcança o tabuleiro inteiro: não há arrasto ilegal a testar.')
})()

/** DTZ da fixture. Os números que a tela mostra têm de sair DAQUI. */
const DTZ_DO_MELHOR = -7
const DTZ_DO_PIOR = -23

/**
 * Tablebase dublada.
 *
 * `perdedores` são os lances que jogam a vitória fora; `empatados` são os que a
 * tablebase não consegue distinguir do melhor. Todo o resto ganha por um
 * caminho mais longo. Os lances saem dos LANCES LEGAIS da posição consultada —
 * uma tablebase falsa que devolvesse lance ilegal exercitaria um caminho que a
 * produção não tem.
 */
function sondaFalsa(
  opcoes: {
    perdedores?: readonly string[]
    empatados?: readonly string[]
    /** Lance que a tablebase põe em PRIMEIRO. Serve ao caso Lucena. */
    melhor?: string
  } = {},
): Sonda {
  const perdedores = opcoes.perdedores ?? []
  const empatados = opcoes.empatados ?? []
  return async (fen) => {
    const legais = legalMoves(fen).map((legal) => legal.uci)
    const padrao = legais.includes(DO_CARD) ? DO_CARD : [...legais].sort()[0]
    const melhor = opcoes.melhor ?? padrao
    const lances: LanceTablebase[] = [melhor, ...legais.filter((uci) => uci !== melhor)].map(
      (uci, indice) => {
        if (perdedores.includes(uci)) {
          return { uci, san: null, categoria: 'draw', resultado: 'empate', dtz: null, dtm: null }
        }
        const comoOMelhor = indice === 0 || empatados.includes(uci)
        return {
          uci,
          san: null,
          categoria: 'loss',
          resultado: 'derrota',
          dtz: comoOMelhor ? DTZ_DO_MELHOR : DTZ_DO_PIOR,
          dtm: null,
        }
      },
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
}

/** A degradação: o serviço não respondeu. */
const sondaMuda: Sonda = async () => null

function cardDoFinal(): ReviewCard {
  return posicaoParaReviewCard(licao, posicao, { agora: new Date('2026-01-01T00:00:00.000Z') })
}

/**
 * Mesmo conteúdo, tipo diferente: é o card que NÃO tem juiz.
 *
 * `nascidoEm` decide a ORDEM na fila (os cards saem por vencimento), e é isso
 * que deixa o teste da fila com duas revisões pôr o card de final na frente
 * sem depender do id.
 */
function cardQueNaoEDeFinal(nascidoEm = new Date('2026-01-01T00:00:00.000Z')): ReviewCard {
  return createReviewCard(
    {
      id: 'card-sem-juiz',
      kind: 'posicao-exata',
      skillIds: [licao.habilidade],
      fen: posicao.fen,
      solutionUci: [DO_CARD],
      prompt: 'Jogue o lance.',
    },
    nascidoEm,
  )
}

async function montarFila(cards: readonly ReviewCard[], probe: Sonda) {
  const repo = new MemoryTrainingRepository()
  for (const card of cards) {
    await repo.saveReviewCard(card)
  }
  contexto.valor = {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', new Date('2026-01-01T00:00:00.000Z')),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
  const tela = render(<ReviewSession probe={probe} />)
  await screen.findByText(new RegExp(`Revisão 1 de ${cards.length}`))
  return { repo, tela }
}

async function montar(card: ReviewCard, probe: Sonda) {
  return (await montarFila([card], probe)).repo
}

/**
 * Entrega o lance como o TABULEIRO REAL entrega.
 *
 * `ChessBoardView` chama `onMove(origem, destino, 'q')` SEMPRE — o `q` vai
 * junto mesmo em lance que não é promoção. Um duble que mandasse `undefined`
 * seria mais limpo e esconderia o sufixo sobrando, que é justamente o que
 * transformaria todo lance arrastado em "não consegui conferir": `e1e8q` não
 * está na lista que a tablebase devolve, e `e1e8` está.
 */
async function jogar(uci: string) {
  await act(async () => {
    tabuleiro.onMove?.(uci.slice(0, 2), uci.slice(2, 4))
  })
}

/**
 * O número INTEIRO, e não um pedaço de outro número. Sem a borda de palavra,
 * `23` contém `2` e a asserção do segundo número passaria com a tela mostrando
 * o mesmo número duas vezes. Esse portão frouxo já mordeu neste projeto.
 */
function numeroSolto(valor: number): RegExp {
  return new RegExp('\\b' + valor + '\\b')
}

/** Nota que só existe quando o aluno NÃO foi reprovado. */
const NOTA_DE_QUEM_ACERTOU = RATING_LABEL.good

beforeEach(() => {
  globalThis.localStorage.clear()
  tabuleiro.onMove = null
  tabuleiro.interactive = true
  contexto.valor = null
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('sem rede no teste')
    }),
  )
})

// ------------------------------------------------------------- a política pura

describe('a política dos vereditos é varrida a partir da fonte', () => {
  function julgamentoCom(
    grau: GrauDoLance,
    motivo: JulgamentoDoLance['motivo'] = 'mais-longo-que-o-melhor',
  ): JulgamentoDoLance {
    return {
      grau,
      motivo,
      uciDoAluno: OUTRO,
      resultadoAntes: 'vitoria',
      resultadoDepois: 'vitoria',
      melhorUci: DO_CARD,
      melhorSan: null,
      comparacao: null,
    }
  }

  it('a varredura tem o que varrer', () => {
    // Portão com zero verificações não é aprovação.
    expect(GRAUS_DO_LANCE.length).toBeGreaterThan(0)
    expect(VEREDITOS_DA_REVISAO.length).toBeGreaterThan(0)
  })

  it('todo degrau do domínio produz um veredito conhecido', () => {
    for (const grau of GRAUS_DO_LANCE) {
      const veredito = vereditoDaRevisao({
        uciDoAluno: OUTRO,
        lanceDoCard: DO_CARD,
        julgamento: julgamentoCom(grau),
      })
      expect(VEREDITOS_DA_REVISAO, `${grau} caiu fora da lista de vereditos`).toContain(veredito)
    }
  })

  it('todo veredito tem efeito declarado', () => {
    expect(Object.keys(EFEITO_DO_VEREDITO).sort()).toEqual([...VEREDITOS_DA_REVISAO].sort())
  })

  it('só o veredito de erro reprova, e só um veredito fica sem juiz', () => {
    // A REGRA, não a linha da tabela: quem reprova é exatamente `erro`, e quem
    // não tem juiz é exatamente `nao-confirmado`.
    const reprovam = VEREDITOS_DA_REVISAO.filter((v) => EFEITO_DO_VEREDITO[v].ehErro)
    const semJuiz = VEREDITOS_DA_REVISAO.filter((v) => !EFEITO_DO_VEREDITO[v].temJuiz)
    const comDesconto = VEREDITOS_DA_REVISAO.filter((v) => EFEITO_DO_VEREDITO[v].comDesconto)
    expect(reprovam).toEqual(['erro'])
    expect(semJuiz).toEqual(['nao-confirmado'])
    expect(comDesconto).toEqual(['aceito-com-desconto'])
  })

  it('o lance que ganha por caminho mais longo é acerto COM DESCONTO, nunca erro', () => {
    const veredito = vereditoDaRevisao({
      uciDoAluno: OUTRO,
      lanceDoCard: DO_CARD,
      julgamento: julgamentoCom('mantem-mas-e-pior'),
    })
    expect(EFEITO_DO_VEREDITO[veredito].ehErro).toBe(false)
    expect(EFEITO_DO_VEREDITO[veredito].comDesconto).toBe(true)
  })

  it('sem juiz, o lance do card continua sendo aceito: é a comparação exata', () => {
    const veredito = vereditoDaRevisao({
      uciDoAluno: DO_CARD,
      lanceDoCard: DO_CARD,
      julgamento: null,
    })
    expect(veredito).toBe('aceito')
  })

  it('sem juiz, o lance diferente NÃO é reprovado — fica não confirmado', () => {
    const veredito = vereditoDaRevisao({
      uciDoAluno: OUTRO,
      lanceDoCard: DO_CARD,
      julgamento: null,
    })
    expect(EFEITO_DO_VEREDITO[veredito].ehErro).toBe(false)
    expect(EFEITO_DO_VEREDITO[veredito].temJuiz).toBe(false)
  })

  it('a tablebase que responde e não sabe comparar também não reprova', () => {
    // Este caso NÃO passa pelo atalho do `julgamento === null`: a tablebase
    // respondeu e o juiz devolveu `indeterminado` (lance fora da lista, sem
    // métrica comparável). Sem este teste, a linha `indeterminado` da tabela de
    // vereditos ficava sem cobertura na camada pura, e uma mutação nela só era
    // pega pela tela.
    const veredito = vereditoDaRevisao({
      uciDoAluno: OUTRO,
      lanceDoCard: DO_CARD,
      julgamento: julgamentoCom('indeterminado', 'sem-metrica-comparavel'),
    })
    expect(EFEITO_DO_VEREDITO[veredito].ehErro).toBe(false)
    expect(EFEITO_DO_VEREDITO[veredito].temJuiz).toBe(false)
  })

  it('o juiz de verdade, com a tablebase dublada, classifica a alternativa como do meio', async () => {
    // Cruza a política com o JUIZ REAL: se `julgarLanceDeFinal` mudar de degrau,
    // este teste muda junto em vez de defender a política contra o domínio.
    const julgamento = julgarLanceDeFinal({
      fenAntes: posicao.fen,
      uciDoAluno: OUTRO,
      antes: await sondaFalsa()(posicao.fen),
      uciDaLicao: DO_CARD,
    })
    expect(julgamento.grau).toBe('mantem-mas-e-pior')
    expect(vereditoDaRevisao({ uciDoAluno: OUTRO, lanceDoCard: DO_CARD, julgamento })).toBe(
      'aceito-com-desconto',
    )
  })
})

// --------------------------------------------------------------- a tela ligada

describe('card de final aceita alternativa na fila de revisão', () => {
  it('lance que ganha por caminho mais longo NÃO é erro, e diz o que foi pior', async () => {
    await montar(cardDoFinal(), sondaFalsa())
    await jogar(OUTRO)

    const bloco = await screen.findByTestId('grau-do-lance')
    expect(bloco.dataset.grau).toBe('mantem-mas-e-pior')
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU['mantem-mas-e-pior'].rotulo)
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_GRAU['mantem-mas-e-pior'].icone)
    // O veredito diz sobre QUAL lance ele fala.
    expect(bloco).toHaveTextContent(OUTRO)
    // O QUE foi pior, em número conferível — e os dois números saem da fixture.
    expect(bloco.textContent).toMatch(numeroSolto(Math.abs(DTZ_DO_PIOR)))
    expect(bloco.textContent).toMatch(numeroSolto(Math.abs(DTZ_DO_MELHOR)))

    // Não é erro: a nota de quem acertou continua disponível.
    expect(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).toBeInTheDocument()
    // E a revisão ACABOU: o tabuleiro não aceita um segundo lance por cima do
    // veredito. Sem isto, o aluno poderia empilhar lances e ver o julgamento
    // trocar sozinho.
    expect(tabuleiro.interactive).toBe(false)
  })

  it('a alternativa que a tablebase não distingue do melhor é acerto limpo', async () => {
    await montar(cardDoFinal(), sondaFalsa({ empatados: [OUTRO] }))
    await jogar(OUTRO)

    const bloco = await screen.findByTestId('grau-do-lance')
    expect(bloco.dataset.grau).toBe('melhor')
    expect(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).toBeInTheDocument()
  })

  it('o lance que joga a vitória fora continua sendo erro', async () => {
    await montar(cardDoFinal(), sondaFalsa({ perdedores: [OUTRO] }))
    await jogar(OUTRO)

    const bloco = await screen.findByTestId('grau-do-lance')
    expect(bloco.dataset.grau).toBe('perde-o-resultado')
    // Reprovado: a única nota é "Errei".
    expect(screen.queryByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: RATING_LABEL.again })).toBeInTheDocument()
  })

  it('o lance da lição não leva desconto nem quando a tablebase põe outro na frente', async () => {
    // O caso é o da Lucena, achado por portão na primeira metade da #62: a
    // ponte é a nona de dezesseis na ordem da tablebase e ainda assim é a
    // técnica que a lição ensina. Aqui ele chega ao JUIZ porque a notação
    // gravada no card difere da do lance jogado — que é exatamente quando a
    // comparação letra a letra falha e o `uciDaLicao` precisa existir. Sem ele,
    // o aluno levaria desconto por jogar o lance da própria lição.
    const cardComOutraNotacao: ReviewCard = {
      ...cardDoFinal(),
      solutionUci: [DO_CARD.toUpperCase()],
    }
    await montar(cardComOutraNotacao, sondaFalsa({ melhor: OUTRO }))
    await jogar(DO_CARD)

    const bloco = await screen.findByTestId('grau-do-lance')
    expect(bloco.dataset.grau).toBe('melhor')
    expect(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).toBeInTheDocument()
  })

  it('arrasto ilegal não é julgado: a revisão continua esperando o lance', async () => {
    // Sem esta guarda o lance impossível iria ao juiz, não estaria na lista da
    // tablebase e a tela diria "não consegui conferir" sobre um lance que não
    // existe — encerrando a revisão por causa de um arrasto torto.
    const espia = vi.fn(sondaFalsa())
    await montar(cardDoFinal(), espia)
    await jogar(ILEGAL)

    expect(espia).not.toHaveBeenCalled()
    expect(screen.queryByTestId('grau-do-lance')).not.toBeInTheDocument()
    expect(screen.queryByTestId('modo-estrito')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
    expect(tabuleiro.interactive).toBe(true)
  })

  it('o lance do card continua sendo acerto', async () => {
    await montar(cardDoFinal(), sondaFalsa())
    await jogar(DO_CARD)

    expect(
      (await screen.findAllByRole('status')).some((element) =>
        /Correto/.test(element.textContent ?? ''),
      ),
    ).toBe(true)
    expect(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).toBeInTheDocument()
  })
})

describe('sem tablebase a fila volta ao modo estrito, e DIZ isso', () => {
  it('lance diferente vira "não consegui conferir", não erro', async () => {
    await montar(cardDoFinal(), sondaMuda)
    await jogar(OUTRO)

    const aviso = await screen.findByTestId('modo-estrito')
    expect(aviso.textContent ?? '').toMatch(/modo estrito/i)
    // As duas metades: o que a tela consegue aceitar, e que isto não é erro.
    expect(aviso).toHaveTextContent(DO_CARD)
    expect(aviso.textContent ?? '').toMatch(/não conta como erro/i)
    expect(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).toBeInTheDocument()
  })

  it('o lance do card continua aceito sem a tablebase: a comparação exata é a degradação', async () => {
    await montar(cardDoFinal(), sondaMuda)
    await jogar(DO_CARD)

    expect(
      (await screen.findAllByRole('status')).some((element) =>
        /Correto/.test(element.textContent ?? ''),
      ),
    ).toBe(true)
    expect(screen.queryByTestId('modo-estrito')).not.toBeInTheDocument()
  })
})

describe('card que não é de final não muda de comportamento', () => {
  it('lance diferente continua sendo erro, e a tablebase nem é consultada', async () => {
    const espia = vi.fn(sondaMuda)
    await montar(cardQueNaoEDeFinal(), espia)
    await jogar(OUTRO)

    const faixa = (await screen.findAllByRole('status')).find((element) =>
      element.textContent?.includes('Achamos algo para treinar'),
    )
    expect(faixa).toBeDefined()
    expect(faixa).toHaveTextContent(/Achamos algo para treinar/)
    expect(screen.queryByTestId('grau-do-lance')).not.toBeInTheDocument()
    expect(screen.queryByTestId('modo-estrito')).not.toBeInTheDocument()
    // Não existe juiz para uma posição de meio-jogo: consultar seria afirmar
    // com uma fonte que não cobre o caso.
    expect(espia).not.toHaveBeenCalled()
  })
})

describe('a revisão seguinte começa limpa', () => {
  it('o veredito do card anterior não aparece na revisão seguinte', async () => {
    // Sem este portão, esquecer de zerar o julgamento ao avançar abriria a
    // próxima revisão JÁ ENCERRADA, com o veredito da anterior na tela e as
    // notas disponíveis antes do aluno jogar. Nada quebraria.
    await montarFila(
      [cardDoFinal(), cardQueNaoEDeFinal(new Date('2026-02-01T00:00:00.000Z'))],
      sondaFalsa(),
    )
    await jogar(OUTRO)
    await screen.findByTestId('grau-do-lance')
    await userEvent.click(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU }))

    await screen.findByText(/Revisão 2 de 2/)
    expect(screen.queryByTestId('grau-do-lance')).not.toBeInTheDocument()
    expect(screen.queryByTestId('modo-estrito')).not.toBeInTheDocument()
    // A revisão nova está em ANDAMENTO: nota nenhuma antes de jogar.
    expect(screen.queryByRole('button', { name: NOTA_DE_QUEM_ACERTOU })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
  })
})

describe('resposta atrasada da tablebase não pousa na revisão errada', () => {
  it('a fila recarregada não recebe o veredito do lance anterior', async () => {
    // O caminho é real: `refresh` (ou qualquer troca de repositório) recarrega
    // a fila enquanto uma consulta está em voo. Sem descartar a resposta velha,
    // a revisão nova abriria mostrando o julgamento de um lance jogado em OUTRA
    // posição — plausível na tela, e errado, sem uma linha no console.
    let liberar: () => void = () => {}
    const presa = new Promise<void>((resolve) => {
      liberar = resolve
    })
    const lenta: Sonda = async (fen) => {
      await presa
      return sondaFalsa()(fen)
    }

    const { tela } = await montarFila([cardDoFinal()], lenta)
    await jogar(OUTRO)
    // A consulta está presa: nada foi julgado ainda.
    expect(screen.queryByTestId('grau-do-lance')).not.toBeInTheDocument()

    // Recarrega a fila com outro repositório — é o que `refresh` provoca.
    const outroRepo = new MemoryTrainingRepository()
    await outroRepo.saveReviewCard(cardDoFinal())
    contexto.valor = { ...(contexto.valor as Record<string, unknown>), repo: outroRepo }
    tela.rerender(<ReviewSession probe={lenta} />)
    await screen.findByText(/Revisão 1 de 1/)

    await act(async () => {
      liberar()
      await presa
    })

    expect(screen.queryByTestId('grau-do-lance')).not.toBeInTheDocument()
    expect(screen.queryByTestId('modo-estrito')).not.toBeInTheDocument()
    // A revisão recarregada está em ANDAMENTO, esperando o lance do aluno.
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
  })
})

// ------------------------------------------------- o desconto chega à maestria

describe('o acerto com desconto chega ao modelo de maestria', () => {
  /** Joga, dá a nota de quem acertou e devolve a maestria gravada. */
  async function maestriaDepoisDe(probe: Sonda, uci: string): Promise<number> {
    const repo = await montar(cardDoFinal(), probe)
    await jogar(uci)
    await screen.findByRole('button', { name: NOTA_DE_QUEM_ACERTOU })
    await userEvent.click(screen.getByRole('button', { name: NOTA_DE_QUEM_ACERTOU }))
    await waitFor(async () => {
      expect(await repo.getSkillMastery()).toHaveLength(1)
    })
    const gravada = (await repo.getSkillMastery())[0]
    expect(gravada.skillId).toBe(licao.habilidade)
    return gravada.mastery
  }

  it('ganhar por caminho mais longo vale MENOS que o lance da lição, e mais que zero', async () => {
    const limpo = await maestriaDepoisDe(sondaFalsa(), DO_CARD)
    const comDesconto = await maestriaDepoisDe(sondaFalsa(), OUTRO)

    // A REGRA, não um número: o desconto existe e não zera o acerto. Cravar o
    // valor aqui defenderia `penalidadeLanceVencedorPior` contra quem for
    // calibrá-la — e ela nasceu declarada como não calibrada.
    expect(comDesconto).toBeGreaterThan(0)
    expect(comDesconto).toBeLessThan(limpo)
  })

  it('a alternativa indistinguível do melhor NÃO leva desconto', async () => {
    const limpo = await maestriaDepoisDe(sondaFalsa(), DO_CARD)
    const empatado = await maestriaDepoisDe(sondaFalsa({ empatados: [OUTRO] }), OUTRO)

    expect(empatado).toBe(limpo)
  })
})

// ---------------------------------------------------- as duas telas concordam

/**
 * `COR_DO_TOM` é a SEGUNDA fonte da cor dos tons: `EndgameTrainer.module.css`
 * tem a primeira. Duas fontes para a mesma verdade divergem, e o sintoma seria
 * o mesmo degrau pintado de um jeito em cada tela — coisa que nenhuma revisão
 * de código pega olhando um arquivo por vez.
 */
describe('a cor dos tons concorda com a tela de finais', () => {
  const CSS_DO_TREINADOR = 'src/components/endgames/EndgameTrainer.module.css'

  function corNoCss(css: string, tom: string): string | null {
    const bloco = new RegExp(`\\.${tom}\\s*\\{[^}]*?color:\\s*(var\\([^)]+\\))`).exec(css)
    return bloco === null ? null : bloco[1]
  }

  it('a varredura encontrou os tons e a folha de estilo', () => {
    expect(TONS_DO_ESTADO.length).toBeGreaterThan(0)
    expect(readFileSync(join(process.cwd(), CSS_DO_TREINADOR), 'utf8').length).toBeGreaterThan(0)
  })

  it('cada tom tem a mesma cor nas duas telas', () => {
    const css = readFileSync(join(process.cwd(), CSS_DO_TREINADOR), 'utf8')
    for (const tom of TONS_DO_ESTADO) {
      const naFolha = corNoCss(css, tom)
      expect(naFolha, `o tom ${tom} não tem cor em ${CSS_DO_TREINADOR}`).not.toBeNull()
      expect(COR_DO_TOM[tom], `o tom ${tom} diverge entre as duas telas`).toBe(naFolha)
    }
  })
})
