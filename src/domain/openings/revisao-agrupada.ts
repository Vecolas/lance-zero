/**
 * A REVISÃO DE ABERTURA VISTA POR FORA: uma variação, e não vinte posições.
 *
 * O QUE ELA CORRIGE (plano VNext §43–§45). Hoje cada nó do repertório vira um
 * card de FSRS, e é assim que deve continuar — o agendamento por posição é o que
 * faz a revisão acertar o que o aluno de fato esqueceu. O problema não é o
 * modelo: é a APRESENTAÇÃO.
 *
 * Para o aluno, "revisar a Italiana" vira uma fila de posições soltas, cada uma
 * contando como um item. Uma abertura com vinte nós produz vinte itens
 * idênticos na fila — o "1/20 por ply" que o plano nomeia. Ele não sabe o que
 * está revisando, não sabe quanto falta, e a fila do dia parece ter explodido
 * sem nada ter acontecido.
 *
 * O QUE ENTRA: um `OpeningReviewItem` agrupa os cards vencidos POR RAMO.
 * Externamente conta como uma unidade — "Abertura Italiana — Defesa dos Dois
 * Cavalos". Internamente continuam sendo N cards, e os N são atualizados.
 *
 * E A RECONSTRUÇÃO DE CONTEXTO (§44). Um nó vencido não deve ser cobrado
 * isoladamente: cair de paraquedas numa posição do meio da linha mede
 * reconhecimento de imagem, não repertório. O item carrega os lances que levam
 * até lá, para o tabuleiro montar o caminho antes de pedir a decisão.
 *
 * PURO: sem relógio, sem armazenamento. Quem sabe que horas são é quem chama.
 */

import { applyMove, identidadeDePosicao } from '@/lib/chess'
import type { ReviewCard } from '@/domain/types'
import type { OpeningDefinition, OpeningMoveLesson } from './index'
import { ramosDaAbertura, type RamoDeAbertura } from './ramos'

/** O prefixo dos cards de abertura. Ver `openingReviewCards`. */
const PREFIXO = 'opening:'

/**
 * O nó a que um card se refere, ou `null` quando o card não é de abertura.
 *
 * O FORMATO É `opening:<aberturaId>:<nodeId>[:sufixo]`, e o `nodeId` é uma
 * identidade de posição — que pode conter `:`? Não: `identidadeDePosicao`
 * devolve FEN normalizada com espaços, nunca dois-pontos. Ainda assim a leitura
 * é feita por PREFIXO conhecido e não por `split` cego, porque um card de outro
 * domínio com id parecido devolveria um nó inventado.
 */
export function noDoCardDeAbertura(card: ReviewCard, opening: OpeningDefinition): string | null {
  const esperado = `${PREFIXO}${opening.id}:`
  if (!card.id.startsWith(esperado)) return null
  const resto = card.id.slice(esperado.length)
  /*
    OS SUFIXOS CONHECIDOS são `:plan:`, `:mistake:` e `:branch:`. Cortar no
    PRIMEIRO deles preserva o nodeId inteiro — cortar no último `:` partiria a
    identidade da posição ao meio e o card nunca mais encontraria o próprio nó.
  */
  for (const sufixo of [':plan:', ':mistake:', ':branch:']) {
    const corte = resto.indexOf(sufixo)
    if (corte >= 0) return resto.slice(0, corte)
  }
  return resto
}

/** Uma unidade de revisão como o aluno a vê. */
export interface OpeningReviewItem {
  /** Estável e derivado: abertura + ramo. */
  id: string
  openingId: string
  openingSlug: string
  /** "Abertura Italiana — Defesa dos Dois Cavalos". */
  titulo: string
  /** `null` quando o item é da linha principal. */
  ramoId: string | null
  /** Os cards que este item revisa. Todos continuam sendo atualizados. */
  cards: readonly ReviewCard[]
  /**
   * Para onde o CTA de reaprender aponta (§46).
   *
   * Deep-link para a variação, e não para a biblioteca genérica: quem falhou
   * uma revisão precisa do conteúdo daquele ramo, e mandá-lo para a lista é
   * pedir que ele procure sozinho o que o app já sabe.
   */
  rotaParaReaprender: string
}

/**
 * A qual ramo um nó pertence.
 *
 * A REGRA É "DEPOIS DA BIFURCAÇÃO": um nó que está no prefixo compartilhado é da
 * LINHA PRINCIPAL, mesmo que a linha do ramo também passe por ele. Atribuí-lo ao
 * ramo faria o mesmo nó aparecer em dois itens, e o aluno revisaria a posição
 * duas vezes com o mesmo lance.
 */
export function ramoDoNo(opening: OpeningDefinition, nodeId: string): RamoDeAbertura | null {
  for (const ramo of ramosDaAbertura(opening)) {
    const divergencia = ramo.ramificacao.indiceDaDivergencia
    if (divergencia === null) continue
    const posicoes = posicoesDaLinhaInterna(opening.rootFen, ramo.ramificacao.variacao.line)
    /*
      COMEÇA DEPOIS DO DESVIO. `posicoes[i]` é a posição ANTES do lance `i`, e
      `divergencia` é o índice do lance que ramifica — então a primeira posição
      que só existe neste ramo é `divergencia + 1`.
    */
    for (let indice = divergencia + 1; indice < posicoes.length; indice += 1) {
      if (identidadeDePosicao(posicoes[indice] ?? '') === nodeId) return ramo
    }
  }
  return null
}

/**
 * Agrupa os cards vencidos de UMA abertura em itens de revisão.
 *
 * A ORDEM É ESTÁVEL: a principal primeiro, depois os ramos na ordem de
 * importância que `ramosDaAbertura` já estabelece. Uma fila que se reordena
 * entre duas sessões faz o aluno reencontrar a tela diferente sem nada ter
 * mudado.
 */
export function agruparRevisaoDeAbertura(
  opening: OpeningDefinition,
  cards: readonly ReviewCard[],
): OpeningReviewItem[] {
  const daAbertura = cards.filter((card) => noDoCardDeAbertura(card, opening) !== null)
  if (daAbertura.length === 0) return []

  const porRamo = new Map<string | null, ReviewCard[]>()
  for (const card of daAbertura) {
    const nodeId = noDoCardDeAbertura(card, opening)
    const ramo = nodeId ? ramoDoNo(opening, nodeId) : null
    const chave = ramo?.id ?? null
    const atual = porRamo.get(chave) ?? []
    atual.push(card)
    porRamo.set(chave, atual)
  }

  const itens: OpeningReviewItem[] = []
  const principal = porRamo.get(null)
  if (principal && principal.length > 0) {
    itens.push({
      id: `revisao:${opening.id}:mainline`,
      openingId: opening.id,
      openingSlug: opening.slug,
      titulo: `${opening.name} — linha principal`,
      ramoId: null,
      cards: principal,
      rotaParaReaprender: `/aberturas/${opening.slug}?etapa=linha-principal&modo=reaprender`,
    })
  }

  for (const ramo of ramosDaAbertura(opening)) {
    const deste = porRamo.get(ramo.id)
    if (!deste || deste.length === 0) continue
    itens.push({
      id: `revisao:${opening.id}:${ramo.id}`,
      openingId: opening.id,
      openingSlug: opening.slug,
      titulo: `${opening.name} — ${ramo.nome}`,
      ramoId: ramo.id,
      cards: deste,
      rotaParaReaprender: `/aberturas/${opening.slug}?etapa=variacoes&ramo=${encodeURIComponent(ramo.id)}&modo=reaprender`,
    })
  }

  return itens
}

/** O caminho que leva até a posição de um card. */
export interface ContextoDaRevisao {
  /** De onde o tabuleiro começa a montar o caminho. */
  fenInicial: string
  /** Os lances, em UCI, que levam de `fenInicial` até a posição do card. */
  lances: readonly string[]
  /** Os mesmos em SAN, para a tela escrever o caminho. */
  sans: readonly string[]
}

/**
 * Quantas decisões do aluno a reconstrução mostra antes de cobrar a posição.
 *
 * DUAS, e o número é heurística de produto — está aqui, num lugar só, para
 * mudar quando houver telemetria. Zero devolve a posição crua, que é o
 * comportamento anterior.
 */
export const DECISOES_DE_CONTEXTO = 2

/**
 * Monta o caminho até a posição de um card (§44).
 *
 * O DEFEITO QUE ISTO CORRIGE não dá erro nenhum: a revisão largava o aluno numa
 * FEN do meio da linha e perguntava o lance. Isso mede reconhecimento de imagem,
 * não repertório — e a diferença aparece justamente na partida, onde a posição
 * chega por um caminho e não por um cartão.
 *
 * QUANDO NÃO DÁ PARA RECONSTRUIR, devolve a própria posição do card com lista
 * vazia. Um caminho inventado seria pior que nenhum: ensinaria uma ordem de
 * lances que o repertório não tem.
 */
export function contextoDaRevisao(
  opening: OpeningDefinition,
  card: ReviewCard,
  decisoes: number = DECISOES_DE_CONTEXTO,
): ContextoDaRevisao {
  const cru: ContextoDaRevisao = { fenInicial: card.fen, lances: [], sans: [] }
  const nodeId = noDoCardDeAbertura(card, opening)
  if (!nodeId || decisoes <= 0) return cru

  const ramo = ramoDoNo(opening, nodeId)
  const linha = ramo ? ramo.ramificacao.variacao.line : opening.mainline
  const posicoes = posicoesDaLinhaInterna(opening.rootFen, linha)
  const alvo = posicoes.findIndex((fen) => identidadeDePosicao(fen) === nodeId)
  if (alvo < 0) return cru

  /*
    RECUA POR DECISÕES, e não por plies — a mesma razão do ADR-0027: recuar um
    número ímpar entregaria a vez ao outro lado, e a reconstrução terminaria numa
    posição que não é a do card.
  */
  const inicio = Math.max(alvo - decisoes * 2, 0)
  if (inicio === alvo) return cru

  const lances: string[] = []
  const sans: string[] = []
  let fen = posicoes[inicio] ?? card.fen
  for (let indice = inicio; indice < alvo; indice += 1) {
    const lance = linha[indice]
    if (!lance) break
    const aplicado = applyMove(fen, lance.san)
    if (!aplicado) return cru
    fen = aplicado.fenAfter
    lances.push(aplicado.move.uci)
    sans.push(aplicado.move.san)
  }

  /*
    A RECONSTRUÇÃO TEM DE TERMINAR NA POSIÇÃO DO CARD. Se não terminar, o
    conteúdo mudou desde que o card foi criado — e cobrar a decisão numa posição
    diferente da agendada seria o app medindo outra coisa sem avisar.
  */
  if (identidadeDePosicao(fen) !== identidadeDePosicao(card.fen)) return cru

  return { fenInicial: posicoes[inicio] ?? card.fen, lances, sans }
}

/**
 * As posições de uma linha, incluindo a inicial.
 *
 * Cópia local de propósito: `posicoesDaLinha` mora em `variacoes.ts`, que
 * importa deste módulo em nenhum ponto hoje — mas o grafo de importação das
 * aberturas já tem ciclos suficientes, e esta função tem seis linhas.
 */
function posicoesDaLinhaInterna(raiz: string, lances: readonly OpeningMoveLesson[]): string[] {
  const fens = [raiz]
  let atual = raiz
  for (const lance of lances) {
    const aplicado = applyMove(atual, lance.san)
    if (!aplicado) break
    atual = aplicado.fenAfter
    fens.push(atual)
  }
  return fens
}

/**
 * O resolvedor de subgrupo que o planner de revisão injeta.
 *
 * ELE EXISTE PARA NÃO DUPLICAR O AGRUPAMENTO. `planner-v2` já junta cards em
 * itens pedagógicos — o que faltava era o corte por RAMO, e ele depende do
 * conteúdo do curso, que o planner (domínio puro) não conhece.
 *
 * Devolve `null` para qualquer card que não seja de uma abertura conhecida, e
 * `null` é o que mantém o comportamento anterior. Nada aqui pode piorar uma fila
 * que não tenha abertura nenhuma.
 */
export function subgrupoDeAberturaPorRamo(
  openings: readonly OpeningDefinition[],
): (card: ReviewCard) => string | null {
  return (card) => {
    for (const opening of openings) {
      const nodeId = noDoCardDeAbertura(card, opening)
      if (!nodeId) continue
      return ramoDoNo(opening, nodeId)?.id ?? 'mainline'
    }
    return null
  }
}

/**
 * O título humano de um item de revisão de abertura.
 *
 * "Abertura Italiana — Defesa dos Dois Cavalos", e nunca o id cru. O aluno tem
 * de saber o que está revisando ANTES de a posição aparecer — é a diferença
 * entre uma fila e uma pilha de cartões.
 *
 * Devolve `null` quando o id não é de abertura: a tela então usa o rótulo
 * genérico que já existe, em vez de inventar um nome.
 */
export function tituloDoItemDeAbertura(
  learningObjectId: string,
  openings: readonly OpeningDefinition[],
): string | null {
  if (!learningObjectId.startsWith('opening:')) return null
  const partes = learningObjectId.split(':')
  const opening = openings.find((item) => item.id === partes[1])
  if (!opening) return null

  const sufixo = partes[2]
  if (!sufixo || sufixo === 'mainline') return `${opening.name} — linha principal`
  const ramo = ramosDaAbertura(opening).find((item) => item.id === sufixo)
  return ramo ? `${opening.name} — ${ramo.nome}` : opening.name
}
