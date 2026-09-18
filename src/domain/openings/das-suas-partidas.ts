/**
 * DAS SUAS PARTIDAS: onde a teoria e o tabuleiro de verdade se separaram.
 *
 * O PLANO VNext §36 pede uma seção secundária na página da abertura mostrando os
 * pontos em que as partidas do aluno saíram do repertório. O §36.1 é explícito
 * sobre como fazer: **não exigir backend novo**. As partidas já são importadas e
 * `reviewOpeningGame` já detecta o primeiro desvio — o que falta é AGREGAR.
 *
 * POR QUE ISSO IMPORTA MAIS QUE QUALQUER OUTRA MÉTRICA DO CURSO. Todo o resto do
 * repertório é conteúdo autorado por nós: a linha principal, os ramos, a
 * importância de cada um. Esta é a única parte do produto em que o material de
 * estudo vem do que o aluno REALMENTE enfrentou. Um desvio que aconteceu duas
 * vezes nas partidas dele vale mais que um ramo que alguém achou interessante.
 *
 * O QUE ESTE MÓDULO RECUSA A FAZER (§38.2): inventar um ramo no repertório
 * porque o adversário jogou algo. Um lance que apareceu uma vez não é teoria, e
 * promovê-lo a conteúdo autorado misturaria o que foi revisado com o que foi
 * apenas encontrado. A seção MOSTRA e OFERECE; quem decide é quem autora.
 *
 * PURO: sem relógio, sem armazenamento, sem rede.
 */

import { applyMove, type ChessGame } from '@/lib/chess'
import { reviewOpeningGame } from './game-review'
import { ramoDoNo } from './revisao-agrupada'
import type { OpeningDefinition, OpeningProgress } from './index'

/**
 * Até que lance um desvio é "outra abertura" em vez de erro de repertório.
 *
 * UM: desviar no primeiro lance significa que a partida nunca entrou nesta
 * abertura. `ply` é 1-based.
 */
const PLY_MINIMO_PARA_CONTAR = 1

/** Uma posição em que as partidas do aluno saíram da linha. */
export interface DesvioNasPartidas {
  nodeId: string
  /** A posição ANTES do lance que desviou — é ela que o aluno precisa reconhecer. */
  fen: string
  /** Quantas partidas desviaram exatamente aqui. */
  partidas: number
  /** O lance jogado, em SAN. */
  jogadoSan: string
  /** O lance que o repertório prevê, em SAN. `null` quando o nó é folha. */
  esperadoSan: string | null
  /** Quem saiu da linha. */
  autor: 'aluno' | 'adversario'
  /** O ramo a que a posição pertence, quando ela vem depois de uma bifurcação. */
  ramoId: string | null
  /**
   * Já existe ramo autorado que responde a este lance do adversário?
   *
   * É o que separa "treinar a resposta" de "analisar" (§38.2). Quando existe, o
   * app manda o aluno ao conteúdo; quando não, ele admite que não tem resposta
   * pronta em vez de fabricar uma.
   */
  temRespostaAutorada: boolean
  /** Para onde o botão leva. Ver `rotaDoDesvio`. */
  rota: string
}

/**
 * Agrega os desvios das partidas do aluno numa abertura.
 *
 * ORDENADO POR FREQUÊNCIA, e a frequência aqui é REAL — ao contrário do campo
 * `frequency` do grafo, que conta linhas autoradas. Esta é a única contagem do
 * módulo de aberturas que mede partidas de verdade, e por isso é a única que
 * pode ser apresentada como "aconteceu N vezes".
 *
 * SÓ DESVIOS. Partidas que seguiram a linha até o fim não entram: elas são boa
 * notícia, e uma lista que as incluísse deixaria de responder "onde eu erro".
 */
export function desviosNasSuasPartidas(
  opening: OpeningDefinition,
  partidas: readonly { jogo: ChessGame; corDoAluno: 'w' | 'b' }[],
  progress?: OpeningProgress,
): DesvioNasPartidas[] {
  const porNo = new Map<string, DesvioNasPartidas>()

  for (const { jogo, corDoAluno } of partidas) {
    const review = reviewOpeningGame(opening, jogo, corDoAluno, progress)
    if (review.nodeId === null || review.jogadoUci === null || review.autorDoDesvio === null) {
      continue
    }

    /*
      A PARTIDA PRECISA TER ENTRADO NA ABERTURA para dizer algo sobre ela.

      O DEFEITO QUE ISTO EVITA foi encontrado por um teste: uma partida de 1.d4
      passada ao curso da Italiana era classificada como ERRO DE REPERTÓRIO no
      primeiro lance — tecnicamente verdade (o repertório manda 1.e4), e
      pedagogicamente ruído. O aluno jogou outra abertura; ele não esqueceu a
      Italiana.

      A regra é explícita e não confia em quem chama ter atribuído a partida ao
      curso certo. Desvio no primeiro lance significa que a partida nunca esteve
      nesta abertura.

      `ply` é 1-BASED — o primeiro lance da partida é `1`, e não `0`. Conferido
      contra `parsePgn`, porque errar a convenção aqui deixaria a guarda muda:
      ela nunca dispararia e o ruído voltaria sem nada avisar.
    */
    if (review.ply !== null && review.ply <= PLY_MINIMO_PARA_CONTAR) continue

    const no = opening.graph.get(review.nodeId)
    if (!no) continue

    /*
      O SAN É DERIVADO DA POSIÇÃO, e não guardado na partida: o mesmo UCI produz
      SAN diferente em posições diferentes, e um rótulo errado aqui ensinaria a
      notação errada numa tela cujo propósito é comparar dois lances.
    */
    const jogado = aplicarUci(no.fen, review.jogadoUci)
    if (!jogado) continue
    const esperado = review.esperadoUci ? aplicarUci(no.fen, review.esperadoUci) : null

    const chave = `${review.nodeId}:${review.jogadoUci}`
    const existente = porNo.get(chave)
    if (existente) {
      porNo.set(chave, { ...existente, partidas: existente.partidas + 1 })
      continue
    }

    const ramo = ramoDoNo(opening, review.nodeId)
    const temResposta =
      review.autorDoDesvio === 'adversario' &&
      no.outgoingMoves.some((aresta) => aresta.uci === review.jogadoUci)

    porNo.set(chave, {
      nodeId: review.nodeId,
      fen: no.fen,
      partidas: 1,
      jogadoSan: jogado,
      esperadoSan: esperado,
      autor: review.autorDoDesvio,
      ramoId: ramo?.id ?? null,
      temRespostaAutorada: temResposta,
      rota: rotaDoDesvio(opening, ramo?.id ?? null),
    })
  }

  return [...porNo.values()].sort(
    (a, b) => b.partidas - a.partidas || a.jogadoSan.localeCompare(b.jogadoSan),
  )
}

/**
 * Para onde o botão do desvio leva.
 *
 * DEEP-LINK PARA O CONTEÚDO DAQUELE PONTO, nunca para a biblioteca genérica —
 * a mesma regra do ADR-0028. Quem acabou de descobrir que erra numa posição
 * precisa da explicação daquela posição, e não de uma lista para procurar.
 */
export function rotaDoDesvio(opening: OpeningDefinition, ramoId: string | null): string {
  if (ramoId === null) return `/aberturas/${opening.slug}?etapa=linha-principal&modo=reaprender`
  return `/aberturas/${opening.slug}?etapa=variacoes&ramo=${encodeURIComponent(ramoId)}&modo=reaprender`
}

/**
 * O rótulo da ação, que depende de quem desviou (§38.1 e §38.2).
 *
 * TRÊS CASOS, E A DIFERENÇA ENTRE ELES É O QUE O APP SABE:
 *
 *   - o ALUNO desviou: existe conteúdo, e ele já o estudou — "reaprender";
 *   - o ADVERSÁRIO desviou e existe ramo para o lance dele — "treinar resposta";
 *   - o adversário desviou e NÃO existe ramo — "analisar", porque o app não tem
 *     resposta pronta e dizer o contrário seria mentira.
 */
export function acaoDoDesvio(desvio: DesvioNasPartidas): 'reaprender' | 'treinar' | 'analisar' {
  if (desvio.autor === 'aluno') return 'reaprender'
  return desvio.temRespostaAutorada ? 'treinar' : 'analisar'
}

function aplicarUci(fen: string, uci: string): string | null {
  const aplicado = applyMove(fen, {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined,
  })
  return aplicado?.move.san ?? null
}
