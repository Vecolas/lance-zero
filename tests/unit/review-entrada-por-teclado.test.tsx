/**
 * Portão da ENTRADA POR TECLADO na fila de revisão (issue #67).
 *
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR: a revisão espaçada — o núcleo
 * do produto — só aceitava lance por ARRASTE. Quem usa teclado ou leitor de tela
 * não conseguia responder um card. Não havia erro, tela quebrada nem log: a
 * pessoa simplesmente não conseguia usar o produto, e nada acusava.
 *
 * O que este arquivo afirma:
 *
 * 1. O CAMPO VALE PARA TODO TIPO DE CARD, varrido do `ReviewCardKind` da FONTE.
 *    A razão do campo é acessibilidade, e acessibilidade não vale só para o
 *    tipo que algum teste alcança. Tipo novo no domínio reprova aqui.
 * 2. OS DOIS CAMINHOS SÃO O MESMO. A varredura joga TODO lance legal da posição
 *    (e um punhado de ilegais) pelos dois caminhos e exige o MESMO desfecho.
 *    Dois caminhos separados criariam um lance que só um deles aceita, e a
 *    divergência apareceria para quem usa o caminho menos testado.
 * 3. RECUSA COM FRASE, e a tentativa continua. Recusar em silêncio é o pior
 *    desfecho para quem não vê o tabuleiro.
 * 4. NOME ACESSÍVEL LIMPO. A ajuda entra por `aria-describedby`, nunca dentro do
 *    `<label>` — o cuidado conhecido deste projeto, que já produziu dois campos
 *    com o mesmo nome.
 * 5. PROMOÇÃO MENOR. O tabuleiro promove SEMPRE para dama, então o campo é a
 *    ÚNICA porta para torre, bispo e cavalo; e o card que pede dama NÃO pode
 *    aceitar um cavalo por causa de um sufixo ausente.
 *
 * O QUE ELE NÃO PROVA: o percurso real do teclado (ordem de foco, `Tab`, anel de
 * foco desenhado) — isso é do `tests/e2e/revisao-teclado.spec.ts`, que roda em
 * navegador de verdade. Também não prova aparência, contraste, nem rede: a
 * tablebase é DUBLADA aqui e o `fetch` global reprova alto se algum caminho
 * esquecido tentar usá-lo.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'
import { createDefaultProfile } from '@/domain/profile'
import { RATING_LABEL } from '@/domain/review/session'
import type { ReviewCard, ReviewCardKind } from '@/domain/types'
// `PromotionPiece` mora em `@/lib/chess`: UCI é notação de xadrez, não de domínio.
import { legalMoves, type PromotionPiece } from '@/lib/chess'
import { createReviewCard } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/**
 * O tabuleiro é dependência de terceiros com arraste. O duble EXPÕE `onMove` e
 * `interactive`: é a única forma de entregar um lance sem simular arrastar peça.
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

const { AJUDA_DO_LANCE, PECAS_DE_PROMOCAO, ReviewSession } =
  await import('@/components/training/ReviewSession')

// -------------------------------------------------------------- as varreduras

const RAIZ = process.cwd()

/**
 * Os tipos de card, lidos do ARQUIVO de tipos.
 *
 * `ReviewCardKind` é uma união de tipo: não existe em tempo de execução, e
 * `src/domain/types.ts` tem outro dono (a frente das aberturas), então não dá
 * para acrescentar um array lá. Ler a FONTE é o que resta — e é o que importa:
 * tipo novo na união entra nesta lista sozinho, e a varredura passa a cobrá-lo.
 * Uma lista escrita à mão aqui nunca acusaria o tipo que nunca entrou nela.
 */
function unionDoArquivo(relativo: string, nome: string): string[] {
  const fonte = readFileSync(join(RAIZ, relativo), 'utf8')
  const bloco = new RegExp(`export type ${nome}\\s*=([\\s\\S]*?)\\n\\s*\\n`).exec(fonte)
  if (bloco === null) {
    throw new Error(`Não achei a união ${nome} em ${relativo}: a varredura perdeu a fonte.`)
  }
  return [...bloco[1].matchAll(/'([a-z-]+)'/g)].map((achado) => achado[1])
}

const TIPOS_DE_CARD = unionDoArquivo('src/domain/types.ts', 'ReviewCardKind') as ReviewCardKind[]
const PECAS_DA_FONTE = unionDoArquivo(
  'src/lib/chess/types.ts',
  'PromotionPiece',
) as PromotionPiece[]

// ----------------------------------------------------------------- a fixture

const AGORA = new Date('2026-01-01T00:00:00.000Z')

/**
 * Posição de cavalo e reis: poucos lances legais, nenhum de promoção.
 *
 * Serve à varredura de paridade, que monta a tela duas vezes por lance — com
 * uma posição de dama seriam dezenas de montagens para provar a mesma regra.
 */
const FEN_SIMPLES = '7k/8/8/8/8/8/8/1N5K w - - 0 1'

/** O lance que os cards de teste pedem. Sai dos lances legais, não da cabeça. */
const DO_CARD = 'b1c3'

/** Posição com um peão a um passo da promoção, dos dois lados do tabuleiro. */
const FEN_PROMOCAO = '7k/4P3/8/8/8/8/8/7K w - - 0 1'
const CASAS_DA_PROMOCAO = 'e7e8'

const LEGAIS = legalMoves(FEN_SIMPLES).map((legal) => legal.uci)

/**
 * Lances BEM FORMADOS e ilegais, derivados da posição.
 *
 * Casa escolhida à mão vira lance legal no dia em que a fixture mudar, e o
 * teste passaria a medir outra coisa sem avisar.
 */
const ILEGAIS = (() => {
  const origem = DO_CARD.slice(0, 2)
  const alcance = new Set(
    LEGAIS.filter((uci) => uci.startsWith(origem)).map((uci) => uci.slice(2, 4)),
  )
  const fora: string[] = []
  for (const coluna of 'abcdefgh') {
    for (const linha of '12345678') {
      const casa = `${coluna}${linha}`
      if (casa !== origem && !alcance.has(casa)) fora.push(`${origem}${casa}`)
    }
  }
  return fora
})()

function cardCom(
  kind: ReviewCardKind,
  fen: string,
  solutionUci: readonly string[],
  id = `card-${kind}`,
): ReviewCard {
  return createReviewCard(
    {
      id,
      kind,
      skillIds: [],
      fen,
      solutionUci: [...solutionUci],
      prompt: 'Jogue o lance.',
    },
    AGORA,
  )
}

/** Tablebase fora do ar. Card de final cai na comparação exata; os outros nem consultam. */
const sondaMuda: Sonda = async () => null

async function montar(cards: readonly ReviewCard[], probe: Sonda = sondaMuda) {
  const repo = new MemoryTrainingRepository()
  for (const card of cards) {
    await repo.saveReviewCard(card)
  }
  contexto.valor = {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', AGORA),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
  const tela = render(<ReviewSession probe={probe} />)
  await screen.findByText(new RegExp(`Revisão 1 de ${cards.length}`))
  return { repo, tela }
}

const campo = () => screen.getByLabelText('Lance em UCI')

/** Entrega o lance pelo TECLADO: digitar e apertar Enter, sem tocar no botão. */
async function digitar(uci: string): Promise<void> {
  await userEvent.clear(campo())
  await userEvent.type(campo(), `${uci}{Enter}`)
}

/**
 * Entrega o lance como o TABULEIRO REAL entrega: `onMove(origem, destino, 'q')`
 * SEMPRE, inclusive em lance que não é promoção. Um duble que mandasse
 * `undefined` esconderia o sufixo sobrando — que é justamente o que mais
 * facilmente faria os dois caminhos divergirem.
 */
async function arrastar(casas: string): Promise<void> {
  await act(async () => {
    tabuleiro.onMove?.(casas.slice(0, 2), casas.slice(2, 4), 'q')
  })
}

/**
 * O desfecho VISÍVEL da tentativa, em uma string comparável.
 *
 * É o que a varredura de paridade compara. Ele não olha estado interno: olha o
 * que a pessoa vê e ouve — a recusa, as notas disponíveis, ou nada ainda.
 */
function desfechoNaTela(): string {
  const recusa = screen.queryByTestId('recusa-do-lance')
  if (recusa !== null) return `recusado: ${recusa.textContent?.trim()}`
  const notas = Object.values(RATING_LABEL).filter(
    (rotulo) => screen.queryByRole('button', { name: rotulo }) !== null,
  )
  if (notas.length === 0) return 'esperando o lance'
  return `encerrada com notas: ${[...notas].sort().join(', ')}`
}

beforeEach(() => {
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

// ------------------------------------------------- a alternativa existe mesmo

describe('a varredura tem o que varrer', () => {
  // Portão com zero verificações não é aprovação: ele imprimiria "tudo certo"
  // sem ter olhado nada.
  it('achou os tipos de card, as peças de promoção e os lances da posição', () => {
    expect(TIPOS_DE_CARD.length).toBeGreaterThan(1)
    expect(PECAS_DA_FONTE.length).toBeGreaterThan(1)
    expect(LEGAIS).toContain(DO_CARD)
    expect(LEGAIS.length).toBeGreaterThan(1)
    expect(ILEGAIS.length).toBeGreaterThan(0)
  })
})

describe('o campo de lance vale para TODO tipo de card', () => {
  it.each(TIPOS_DE_CARD)('card do tipo %s é respondido pelo teclado', async (kind) => {
    await montar([cardCom(kind, FEN_SIMPLES, [DO_CARD])])

    expect(campo()).toBeEnabled()
    await digitar(DO_CARD)

    // Aceito: a revisão encerrou e as notas de quem acertou apareceram.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: RATING_LABEL.good })).toBeInTheDocument()
    })
    expect(screen.queryByTestId('recusa-do-lance')).not.toBeInTheDocument()
  })
})

// ------------------------------------------------------------ nome e descrição

describe('rótulo, descrição e foco', () => {
  it('o nome acessível é só o rótulo: a ajuda NÃO está dentro do label', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])

    // `getByLabelText` casa com o texto INTEIRO do rótulo. Se a ajuda entrasse
    // no `<label>`, o nome acessível cresceria e esta consulta reprovaria — que
    // é exatamente o defeito que já produziu dois campos com o mesmo nome.
    const entrada = screen.getByLabelText('Lance em UCI')
    expect(entrada.tagName).toBe('INPUT')

    const rotulo = document.querySelector(`label[for="${entrada.id}"]`)
    expect(rotulo?.textContent?.trim()).toBe('Lance em UCI')
  })

  it('a ajuda chega por aria-describedby, e nomeia todas as peças de promoção', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])

    const descrito = campo().getAttribute('aria-describedby')
    expect(descrito, 'campo sem descrição associada').not.toBeNull()
    const ajuda = document.getElementById(descrito as string)
    expect(ajuda?.textContent).toBe(AJUDA_DO_LANCE)

    // A REGRA: toda peça que o domínio aceita como promoção é nomeada, porque o
    // campo é a única porta para as três que não são a dama. Peça nova na união
    // reprova aqui até a ajuda falar dela.
    for (const peca of PECAS_DA_FONTE) {
      expect(PECAS_DE_PROMOCAO[peca], `${peca} sem nome em PT-BR`).toBeTruthy()
      expect(ajuda?.textContent ?? '').toContain(PECAS_DE_PROMOCAO[peca])
    }
  })

  it('o campo fecha junto com o tabuleiro quando a tentativa acaba', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await digitar(DO_CARD)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: RATING_LABEL.good })).toBeInTheDocument()
    })
    // Campo habilitado depois do veredito prometeria um segundo lance que a
    // sessão não aceita — e quem não vê o tabuleiro só descobriria digitando.
    expect(campo()).toBeDisabled()
    expect(tabuleiro.interactive).toBe(false)
  })
})

// ------------------------------------------------------------ recusa com frase

describe('lance recusado é recusado COM FRASE, e a tentativa continua', () => {
  it('lance ilegal digitado nomeia as casas e não encerra a revisão', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await digitar(ILEGAIS[0])

    const recusa = await screen.findByTestId('recusa-do-lance')
    expect(recusa).toHaveTextContent(ILEGAIS[0])
    expect(recusa.textContent ?? '').toMatch(/não é um lance legal/i)
    // Região viva: sem isso a recusa some para quem não vê a tela.
    expect(recusa).toHaveAttribute('role', 'status')

    // A tentativa CONTINUA: nada de nota, nada de erro gravado, campo aberto.
    expect(desfechoNaTela()).toContain('recusado')
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
    expect(campo()).toBeEnabled()
    expect(tabuleiro.interactive).toBe(true)
  })

  it('texto sem forma de lance recebe a frase da forma', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await digitar('cavalo pra frente')

    const recusa = await screen.findByTestId('recusa-do-lance')
    expect(recusa.textContent ?? '').toMatch(/casa de origem e casa de destino/i)
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
  })

  it('a promoção sem a letra da peça é recusada DIZENDO o que falta', async () => {
    // `e7e8` é exatamente o que alguém digita. "Não é um lance legal" seria
    // verdade e inútil: a pessoa não tem como adivinhar que falta um sufixo.
    await montar([cardCom('posicao-exata', FEN_PROMOCAO, [`${CASAS_DA_PROMOCAO}q`])])
    await digitar(CASAS_DA_PROMOCAO)

    const recusa = await screen.findByTestId('recusa-do-lance')
    expect(recusa.textContent ?? '').toMatch(/acrescente a letra da peça/i)
    expect(screen.getByRole('button', { name: 'Não lembro' })).toBeInTheDocument()
  })

  it('depois da recusa o lance certo ainda entra: a tentativa continuou de verdade', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await digitar(ILEGAIS[0])
    await screen.findByTestId('recusa-do-lance')

    await digitar(DO_CARD)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: RATING_LABEL.good })).toBeInTheDocument()
    })
    // A frase da recusa saiu do caminho quando o lance entrou.
    expect(screen.queryByTestId('recusa-do-lance')).not.toBeInTheDocument()
  })

  it('o ARRASTE ilegal também fala: antes desta issue ele só revertia a peça', async () => {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await arrastar(ILEGAIS[0])

    const recusa = await screen.findByTestId('recusa-do-lance')
    // A frase nomeia as CASAS, não o `q` que o tabuleiro manda sozinho: cobrar
    // do aluno um sufixo que ele nunca escreveu seria mentir sobre o que houve.
    expect(recusa).toHaveTextContent(ILEGAIS[0])
    expect(recusa.textContent ?? '').not.toContain(`${ILEGAIS[0]}q`)
  })
})

// --------------------------------------------------------- os dois são um só

describe('arraste e texto entram pela MESMA porta', () => {
  /**
   * Monta uma tela nova, entrega o lance pelo caminho pedido e devolve o
   * desfecho visível. A tela sai no fim: duas montagens vivas ao mesmo tempo
   * fariam `screen` ver dois campos e duas faixas.
   */
  async function desfechoPor(
    caminho: (casas: string) => Promise<void>,
    casas: string,
  ): Promise<string> {
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD])])
    await caminho(casas)
    const desfecho = desfechoNaTela()
    cleanup()
    return desfecho
  }

  it.each([...LEGAIS, ...ILEGAIS])('o lance %s tem o mesmo desfecho pelos dois', async (casas) => {
    const porTexto = await desfechoPor(digitar, casas)
    const porArraste = await desfechoPor(arrastar, casas)

    expect(porArraste, `${casas} diverge entre arraste e texto`).toBe(porTexto)
  })

  it('a paridade viu desfechos DIFERENTES, e não só um repetido', async () => {
    // Sem isto, uma tela que recusasse TUDO passaria na paridade acima: os dois
    // caminhos concordariam em recusar, e o portão diria que está tudo certo.
    const outroLegal = LEGAIS.find((uci) => uci !== DO_CARD) as string
    const certo = await desfechoPor(digitar, DO_CARD)
    const errado = await desfechoPor(digitar, outroLegal)
    const recusado = await desfechoPor(digitar, ILEGAIS[0])

    expect(new Set([certo, errado, recusado]).size).toBe(3)
    expect(recusado).toMatch(/^recusado/)
    expect(certo).toContain(RATING_LABEL.good)
    expect(errado).not.toContain(RATING_LABEL.good)
    expect(errado).toContain(RATING_LABEL.again)
  })
})

// -------------------------------------------------------------- promoção menor

describe('promoção: o campo é a única porta para torre, bispo e cavalo', () => {
  it.each(PECAS_DA_FONTE)(
    'o card que pede promoção para %s é respondido pelo campo',
    async (peca) => {
      await montar([cardCom('posicao-exata', FEN_PROMOCAO, [`${CASAS_DA_PROMOCAO}${peca}`])])
      await digitar(`${CASAS_DA_PROMOCAO}${peca}`)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: RATING_LABEL.good })).toBeInTheDocument()
      })
    },
  )

  it('o tabuleiro NÃO alcança a promoção menor: é isso que torna o campo obrigatório', async () => {
    const menor = PECAS_DA_FONTE.find((peca) => peca !== 'q') as PromotionPiece
    await montar([cardCom('posicao-exata', FEN_PROMOCAO, [`${CASAS_DA_PROMOCAO}${menor}`])])

    await arrastar(CASAS_DA_PROMOCAO)

    // O arraste promoveu para dama: é outro lance, e é erro.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: RATING_LABEL.again })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: RATING_LABEL.good })).not.toBeInTheDocument()
  })

  it('o card com sufixo sobrando é aceito pelos DOIS caminhos, não só pelo arraste', async () => {
    // `b1c3q` num lance que não é promoção é dado torto, e ele existe: o
    // tabuleiro manda `q` em todo arraste, então um card gravado a partir de um
    // arraste pode carregar o sufixo. O arraste sempre o aceitou. Sem a forma
    // implícita, quem digitasse `b1c3` — o lance certo, escrito certo — seria
    // reprovado, e só nesse caminho.
    const comSufixoSobrando = `${DO_CARD}q`
    await montar([cardCom('posicao-exata', FEN_SIMPLES, [comSufixoSobrando])])
    await digitar(DO_CARD)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: RATING_LABEL.good })).toBeInTheDocument()
    })
  })
})

/**
 * Promoção sem sufixo no card: era dado quebrado, e agora é dado legível.
 *
 * O DEFEITO QUE ISTO GUARDA: um card cuja solução é `e7e8` não era respondível
 * por caminho nenhum. `submitReviewMove` aplicava a string do próprio card,
 * `e7e8` é ilegal no tabuleiro, e a sessão caía no ramo "solução inconsistente
 * com a posição" — marcando ERRO contra o aluno que jogou certo. Ninguém
 * percebia, porque o desfecho era idêntico ao de errar de verdade.
 *
 * O conserto ficou no domínio (`comSufixoImplicito`), e não aqui. Afrouxar a
 * comparação na tela deixaria `e7e8n` passar por acerto de um card que ensina a
 * dama: trocaria um defeito por outro, e o novo premiaria a resposta errada.
 *
 * Este bloco substituiu um teste que PINAVA o comportamento quebrado, escrito
 * para reprovar no dia do conserto. Ele reprovou, e é por isso que este texto
 * está aqui em vez daquele.
 */
describe('promoção sem sufixo no card é respondível, e só pela peça certa', () => {
  it('os dois caminhos resolvem, e resolvem IGUAL', async () => {
    const semSufixo = [CASAS_DA_PROMOCAO]

    await montar([cardCom('posicao-exata', FEN_PROMOCAO, semSufixo)])
    await digitar(`${CASAS_DA_PROMOCAO}q`)
    const porTexto = desfechoNaTela()
    cleanup()

    await montar([cardCom('posicao-exata', FEN_PROMOCAO, semSufixo)])
    await arrastar(CASAS_DA_PROMOCAO)
    const porArraste = desfechoNaTela()

    // Os dois caminhos entram pela mesma porta: divergir aqui seria o defeito
    // aparecendo só para quem usa o caminho menos testado.
    expect(porTexto).toBe(porArraste)
    expect(porTexto).toContain(RATING_LABEL.good)
  })

  it('CONTROLE: promover para peça diferente continua sendo erro', async () => {
    // Sem esta metade, uma normalização preguiçosa que aceitasse qualquer
    // promoção passaria — e o card que ensina a dama daria acerto para o cavalo.
    await montar([cardCom('posicao-exata', FEN_PROMOCAO, [CASAS_DA_PROMOCAO])])
    await digitar(`${CASAS_DA_PROMOCAO}n`)

    const desfecho = desfechoNaTela()
    expect(desfecho).toContain(RATING_LABEL.again)
    expect(desfecho).not.toContain(RATING_LABEL.good)
  })
})

// ------------------------------------------------------- estado entre revisões

describe('a revisão seguinte começa com o campo limpo', () => {
  /**
   * O caminho tem de terminar COM a recusa ainda na tela.
   *
   * A primeira versão deste teste recusava um lance e depois jogava o certo —
   * e o lance certo já limpa a recusa dentro de `jogar`. A limpeza do AVANÇO
   * nunca era exercida, e apagá-la não reprovava nada. Foi um portão frouxo
   * achado por mutação. "Não lembro" é o que encerra a revisão sem passar por
   * ali, e é por isso que ele está aqui.
   */
  it('a recusa e o rascunho não atravessam para o próximo card', async () => {
    await montar([
      cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD], 'card-1'),
      cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD], 'card-2'),
    ])

    await digitar(ILEGAIS[0])
    await screen.findByTestId('recusa-do-lance')
    // O rascunho FICA quando o lance é recusado: quem errou de dedo corrige o
    // que escreveu em vez de redigitar tudo.
    expect(campo()).toHaveValue(ILEGAIS[0])

    await userEvent.click(screen.getByRole('button', { name: 'Não lembro' }))
    await userEvent.click(screen.getByRole('button', { name: RATING_LABEL.again }))

    await screen.findByText(/Revisão 2 de 2/)
    // Frase da revisão anterior recusando um lance que ninguém jogou aqui.
    expect(screen.queryByTestId('recusa-do-lance')).not.toBeInTheDocument()
    expect(campo()).toHaveValue('')
    expect(campo()).toBeEnabled()
  })

  it('a fila recarregada também começa limpa', async () => {
    // Outro dono do mesmo reset: o efeito de carregamento. `refresh` recarrega
    // a fila com a recusa ainda na tela, e sem zerar ali a revisão nova abriria
    // recusando um lance jogado em outra posição.
    const { tela } = await montar([cardCom('posicao-exata', FEN_SIMPLES, [DO_CARD], 'card-1')])
    await digitar(ILEGAIS[0])
    await screen.findByTestId('recusa-do-lance')

    const outroRepo = new MemoryTrainingRepository()
    await outroRepo.saveReviewCard(
      cardCom('posicao-exata', FEN_PROMOCAO, [`${CASAS_DA_PROMOCAO}q`], 'card-2'),
    )
    contexto.valor = { ...(contexto.valor as Record<string, unknown>), repo: outroRepo }
    tela.rerender(<ReviewSession probe={sondaMuda} />)

    // A posição na tela é o sinal de que a fila NOVA chegou.
    await waitFor(() => {
      expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-fen', FEN_PROMOCAO)
    })
    expect(screen.queryByTestId('recusa-do-lance')).not.toBeInTheDocument()
    expect(campo()).toHaveValue('')
  })
})
