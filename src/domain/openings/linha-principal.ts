/**
 * A LINHA PRINCIPAL EM DOIS TEMPOS: entender, depois completar.
 *
 * O QUE MUDA, e por quê. A etapa era uma leitura: tabuleiro fixo, ← / →,
 * comentário. É boa como referência e fraca como aquisição — o aluno atravessa
 * nove lances sem nunca ter de produzir nenhum, e sair da etapa com a sensação
 * de ter aprendido é o resultado mais provável e o menos verdadeiro.
 *
 * A PESQUISA QUE O PLANO CITA (§3.2, §3.3, §3.4) diz as três coisas na ordem:
 * worked example primeiro, porque pedir produção antes de haver o que reproduzir
 * só mede quem já sabia; completion depois, porque recuperar da memória é o que
 * fixa; e ajuda decrescente ao longo do caminho, porque ajuda constante vira
 * muleta e ajuda ausente vira adivinhação.
 *
 * ESTE MÓDULO É SÓ A POLÍTICA. Ele não joga nada: quem move as peças é
 * `sequencia.ts`, que já resolve legalidade, snapback e a resposta do
 * computador na mesma transição. Aqui se decide onde a demonstração para, o que
 * é cobrado e quanta ajuda cada cobrança recebe.
 *
 * PURO: sem React, sem relógio, sem armazenamento, sem `Math.random`. A mesma
 * abertura dá sempre o mesmo percurso, e é isso que torna a política testável.
 */

import { applyMove } from '@/lib/chess'
import type { SquareName } from '@/lib/chess/types'
import type { LinhaTreinavel } from '@/domain/exercicios/sequencia'
import type { OpeningDefinition, OpeningMoveLesson } from './index'
import type { RamoDeAbertura } from './ramos'

/**
 * Quantas decisões do aluno o computador demonstra antes de cobrar a primeira.
 *
 * DOIS, e o número vem do exemplo do próprio plano (§15.2): a Italiana mostra
 * `e4 e5 Nf3 Nc6` e então pergunta por `Bc4`. Duas demonstrações bastam para o
 * aluno ter visto o padrão — abertura de centro, cavalo, bispo — sem que a
 * linha acabe antes de ele produzir alguma coisa.
 *
 * É HEURÍSTICA DE PRODUTO, não constante científica. Está aqui, num lugar só,
 * para mudar quando houver telemetria.
 */
export const DEMONSTRACOES_MAXIMAS = 2

/** Quanta ajuda a tela oferece antes de o aluno jogar. */
export type NivelDeAjuda =
  /** Primeira cobrança: o objetivo e uma casa para onde olhar. */
  | 'objetivo-e-dica'
  /** Depois: só o objetivo. */
  | 'objetivo'
  /** No fim: a posição, e nada mais. */
  | 'posicao'

/**
 * Uma dica de um degrau só.
 *
 * ELA É DADO, NÃO FRASE. A redação em português mora na tela, junto do resto do
 * texto que o aluno lê — devolver prosa daqui obrigaria a traduzir o domínio.
 */
export type DicaDaDecisao =
  /** A casa que a jogada mira. Vem de `highlights`. */
  | { tipo: 'casa-alvo'; casa: SquareName }
  /** De onde a peça sai. Vem de `arrows`, e é o degrau mais próximo da resposta. */
  | { tipo: 'peca'; casa: SquareName }

export interface DecisaoDaLinhaPrincipal {
  /** Índice do lance dentro de `opening.mainline`. */
  indice: number
  san: string
  uci: string
  nivel: NivelDeAjuda
  /**
   * O que o aluno busca aqui, nas palavras de quem autorou.
   *
   * `null` quando o conteúdo não declara nenhuma — e aí a tela pergunta sem
   * enunciado, em vez de inventar um. Ver o portão que proíbe o objetivo conter
   * o SAN do lance: um enunciado que entrega a resposta é pior que nenhum.
   */
  objetivo: string | null
  dica: DicaDaDecisao | null
}

export interface PercursoDaLinhaPrincipal {
  /** Quantos plies o computador demonstra antes de pedir o primeiro lance. */
  demonstrados: number
  /** Os lances demonstrados, para a fase de entender percorrer. */
  exemplo: readonly OpeningMoveLesson[]
  /** O resto da linha, pronto para `iniciarSequencia`. */
  linha: LinhaTreinavel
  /** O que será cobrado, em ordem, com a ajuda de cada um. */
  decisoes: readonly DecisaoDaLinhaPrincipal[]
}

/**
 * Monta o percurso da linha principal de uma abertura.
 *
 * A REGRA DE ONDE A DEMONSTRAÇÃO PARA é `min(2, metade das decisões)`, e a
 * metade não é enfeite: sem ela, uma principal de seis plies pelas pretas — que
 * dá ao aluno três decisões — gastaria duas em demonstração e cobraria uma só.
 * Um exercício único no fim de uma leitura é a leitura com um passo a mais, não
 * prática. Com a metade, toda abertura do curso atual cobra pelo menos duas.
 */
export function percursoDaLinhaPrincipal(opening: OpeningDefinition): PercursoDaLinhaPrincipal {
  return montarPercurso(
    opening.rootFen,
    opening.mainline,
    opening.side,
    demonstradosPelaMetade(opening.mainline, opening.side),
  )
}

/**
 * O percurso de UM RAMO. Mesma escada, ponto de partida diferente.
 *
 * A POLÍTICA AQUI NÃO É A DA METADE, e a diferença é do conteúdo: um ramo já
 * nasce depois de uma linha que o aluno percorreu. O que ele precisa ver
 * demonstrado é o lance que RAMIFICA — e o que ele precisa produzir é a
 * resposta a esse lance. Demonstrar metade do ramo desperdiçaria a única
 * decisão que o ramo existe para ensinar.
 *
 * O RAMO QUE NÃO RAMIFICA cai na política da linha principal. É o Giuoco
 * Piano: um nome para um trecho da própria principal, sem bifurcação. Tratá-lo
 * como desvio ensinaria uma decisão que não existe no tabuleiro.
 */
export function percursoDoRamo(
  opening: OpeningDefinition,
  ramo: RamoDeAbertura,
): PercursoDaLinhaPrincipal {
  const lances = ramo.ramificacao.variacao.line
  const divergencia = ramo.ramificacao.indiceDaDivergencia

  if (divergencia === null) {
    return montarPercurso(
      opening.rootFen,
      lances,
      opening.side,
      demonstradosPelaMetade(lances, opening.side),
    )
  }

  /*
    A DEMONSTRAÇÃO VAI ATÉ O PRIMEIRO LANCE DO ALUNO NO RAMO OU DEPOIS DELE.

    Quando quem ramifica é o adversário, isso inclui o lance dele: o aluno vê o
    desvio acontecer e responde. Quando quem ramifica é o próprio aluno, a
    demonstração para ANTES — a decisão de desviar é dele, e demonstrá-la seria
    responder a pergunta antes de fazê-la.
  */
  const primeiroDoAluno = lances.findIndex(
    (lance, indice) => indice >= divergencia && ehDoAluno(lance, opening.side),
  )
  return montarPercurso(
    opening.rootFen,
    lances,
    opening.side,
    primeiroDoAluno >= 0 ? primeiroDoAluno : Math.max(lances.length - 1, 0),
  )
}

/** O lance é do lado que o aluno joga? `ply` é 1-based: ímpar é das brancas. */
function ehDoAluno(lance: OpeningMoveLesson, lado: OpeningDefinition['side']): boolean {
  return (lance.ply % 2 === 1) === (lado === 'white')
}

/**
 * A política da linha principal: `min(2, metade das decisões)`.
 *
 * Devolve o ÍNDICE onde a demonstração para, e não a contagem de decisões — é o
 * índice que o resto do percurso usa, e converter em dois lugares é onde os dois
 * divergem.
 */
function demonstradosPelaMetade(
  lances: readonly OpeningMoveLesson[],
  lado: OpeningDefinition['side'],
): number {
  const decisoes = lances
    .map((lance, indice) => ({ lance, indice }))
    .filter(({ lance }) => ehDoAluno(lance, lado))
  const demonstradas = Math.min(DEMONSTRACOES_MAXIMAS, Math.floor(decisoes.length / 2))
  const primeiroCobrado = decisoes[demonstradas]?.indice
  return primeiroCobrado ?? Math.max(lances.length - 1, 0)
}

/**
 * O núcleo: dado onde a demonstração para, monta exemplo, linha treinável e a
 * escada de ajuda.
 *
 * ELE NÃO DECIDE ONDE PARAR. As duas políticas — principal e ramo — decidem, e
 * é de propósito: uma função que recebesse um enum e escolhesse por dentro
 * viraria o lugar onde a terceira política entra como mais um `if`.
 */
function montarPercurso(
  rootFen: string,
  lances: readonly OpeningMoveLesson[],
  lado: OpeningDefinition['side'],
  demonstrados: number,
): PercursoDaLinhaPrincipal {
  const parada = Math.min(Math.max(demonstrados, 0), lances.length)

  let fen = rootFen
  for (const lance of lances.slice(0, parada)) {
    const aplicado = applyMove(fen, lance.san)
    /*
      PARA NO PRIMEIRO ILEGAL, em silêncio. Quem reprova linha ilegal é o portão
      de conteúdo, na build; travar a tela do aluno cobraria dele o defeito de
      quem autorou.
    */
    if (!aplicado) break
    fen = aplicado.fenAfter
  }

  const cobradas = lances
    .map((lance, indice) => ({ lance, indice }))
    .filter(({ lance, indice }) => indice >= parada && ehDoAluno(lance, lado))

  return {
    demonstrados: parada,
    exemplo: lances.slice(0, parada),
    linha: {
      fenInicial: fen,
      ladoDoAluno: lado === 'white' ? 'w' : 'b',
      lances: lances.slice(parada).map((lance) => lance.uci),
    },
    decisoes: cobradas.map(({ lance, indice }, ordem) => ({
      indice,
      san: lance.san,
      uci: lance.uci,
      nivel: nivelDaOrdem(ordem),
      objetivo: lance.strategicIdea ?? lance.tacticalIdea ?? null,
      dica: dicaDoLance(lance),
    })),
  }
}

/**
 * A ajuda cai com a ordem da cobrança, e só com ela.
 *
 * DERIVAR DA POSIÇÃO É O PONTO: qualquer regra que olhasse o conteúdo do lance
 * — "este é difícil, dá mais ajuda" — poderia aumentar a ajuda no meio do
 * caminho, que é exatamente o contrário de fading.
 */
function nivelDaOrdem(ordem: number): NivelDeAjuda {
  if (ordem === 0) return 'objetivo-e-dica'
  if (ordem === 1) return 'objetivo'
  return 'posicao'
}

/**
 * A dica sai do que o conteúdo já marca no tabuleiro.
 *
 * A CASA ALVO VEM PRIMEIRO porque ela diz o que procurar sem dizer o que jogar
 * — "olhe f7" admite mais de um lance. A casa de origem é o degrau seguinte e
 * quase entrega a resposta; ela só entra quando não há alvo marcado.
 */
function dicaDoLance(lance: OpeningMoveLesson): DicaDaDecisao | null {
  const alvo = lance.highlights?.[0]
  if (alvo) return { tipo: 'casa-alvo', casa: alvo }
  const seta = lance.arrows?.[0]
  if (seta) return { tipo: 'peca', casa: seta.from }
  return null
}
