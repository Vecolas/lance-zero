/**
 * Os ITENS de cada etapa da jornada de uma abertura.
 *
 * MESMO CONTRATO DA JORNADA DE FINAIS, e de propósito: a regra de conclusão da
 * etapa nasce da CONTAGEM desta lista, e a tela renderiza esta mesma lista. Ver
 * `@/domain/jornada/exigencia` para o defeito que isso existe para tornar
 * impossível.
 *
 * O QUE MUDA EM RELAÇÃO A FINAIS, e é toda a diferença entre os dois domínios:
 * aqui o exercício tem UM lance certo. Numa abertura, o conteúdo É a linha, e
 * sair dela é o erro que se está medindo. Num final não existe "fora do
 * repertório". Por isso este arquivo carrega `san` — o lance do repertório — e o
 * de finais não carrega lance nenhum.
 *
 * O DEFEITO QUE ESTE ARQUIVO CORRIGE, e ele era menos visível que o dos finais
 * porque não mordia ainda:
 *
 * 1. `itensDePraticaGuiada` fazia `Math.max(itensGuiadosMinimo, decisoes)`. O
 *    piso de 3 promete itens que uma abertura curta não tem — e a etapa nunca
 *    fecharia, exatamente como nos finais. Hoje nenhuma abertura do catálogo é
 *    curta o bastante; "hoje não morde" não é o mesmo que "não existe";
 * 2. a tela indexava `opening.mainline[indice]` com um índice que contava só as
 *    decisões DO LADO DO ALUNO. Num repertório de pretas, o item mostrado era o
 *    lance das brancas — e o aluno era cobrado pelo lance do adversário. Sai por
 *    construção: a lista já vem filtrada, e a tela itera em vez de indexar.
 */

import type { OpeningDefinition, OpeningSide } from './index'
import { ramosCore } from './ramos'

/** A qual linha um item pertence. `null` é a linha principal. */
export type LinhaDoItem = string | null

/** Um item da prática guiada: uma decisão do aluno numa linha do repertório. */
export interface ItemDeAbertura {
  id: string
  /** O ramo a que o item pertence, ou `null` para a linha principal. */
  ramoId: LinhaDoItem
  /** Índice do lance na linha COMPLETA — é ele que endereça a posição. */
  indiceNaLinha: number
  /** O lance do repertório. Um só: numa abertura, a linha é o conteúdo. */
  san: string
  /** Por que este lance, escrito pelo autor do curso. */
  comentario: string
}

/** O lado que joga no índice. A linha é normalizada da posição inicial. */
function ladoDoIndice(indice: number): OpeningSide {
  return indice % 2 === 0 ? 'white' : 'black'
}

/**
 * Os itens da prática guiada: linha principal E ramos `core`.
 *
 * POR QUE OS RAMOS ENTRARAM (plano VNext §28). A prática guiada treinava só a
 * linha principal, e o treino final cobrava os ramos. O degrau com apoio
 * ensaiava uma coisa e a prova cobrava outra — o aluno chegava ao treino tendo
 * praticado metade do que seria medido.
 *
 * SÓ DEPOIS DA BIFURCAÇÃO. Um ramo compartilha o começo com a principal, e
 * cobrar de novo os lances comuns faria o aluno repetir o que acabou de
 * responder — inflando a contagem sem ensinar nada.
 *
 * SÓ RAMO `core`, pela mesma razão do ADR-0025: o que não bloqueia a conclusão
 * do curso não pode bloquear a conclusão de uma etapa dele.
 *
 * O ID CARREGA A LINHA E O ÍNDICE, e nunca a ordem na lista filtrada:
 * acrescentar um lance antes não remexe os ids já gravados em
 * `itensRespondidos`. Os itens da principal MANTÊM o formato `guiada:<indice>`
 * — mudá-lo descartaria em silêncio o que já foi respondido.
 */
export function itensDaPraticaGuiadaDeAbertura(
  opening: OpeningDefinition,
): readonly ItemDeAbertura[] {
  const itens: ItemDeAbertura[] = []

  opening.mainline.forEach((lance, indice) => {
    if (ladoDoIndice(indice) !== opening.side) return
    itens.push({
      id: `guiada:${indice}`,
      ramoId: null,
      indiceNaLinha: indice,
      san: lance.san,
      comentario: lance.comment,
    })
  })

  for (const ramo of ramosCore(opening)) {
    const divergencia = ramo.ramificacao.indiceDaDivergencia
    /*
      O RAMO QUE NÃO BIFURCA NÃO ENTRA. É o Giuoco Piano: um nome para um trecho
      da própria principal. Cobrá-lo seria pedir os mesmos lances duas vezes com
      dois títulos diferentes.
    */
    if (divergencia === null) continue

    ramo.ramificacao.variacao.line.forEach((lance, indice) => {
      if (indice <= divergencia) return
      if (ladoDoIndice(indice) !== opening.side) return
      itens.push({
        id: `guiada:${ramo.id}:${indice}`,
        ramoId: ramo.id,
        indiceNaLinha: indice,
        san: lance.san,
        comentario: lance.comment,
      })
    })
  }

  return itens
}

/** Um trecho da prática: uma linha para jogar, com os itens que ela cobra. */
export interface TrechoDaPraticaGuiada {
  /** `null` na linha principal; o id do ramo nos demais. */
  ramoId: LinhaDoItem
  nome: string
  linha: OpeningDefinition['mainline']
  /** De onde a jogada começa a ser cobrada. Zero na principal. */
  inicio: number
  itens: readonly ItemDeAbertura[]
}

/**
 * O roteiro da prática guiada, na ordem em que se joga.
 *
 * A PRINCIPAL PRIMEIRO, e os ramos na ordem do conteúdo. Treinar o desvio antes
 * da linha que ele recusa é ensinar a exceção antes da regra.
 */
export function roteiroDaPraticaGuiada(opening: OpeningDefinition): TrechoDaPraticaGuiada[] {
  const itens = itensDaPraticaGuiadaDeAbertura(opening)
  const daLinha = (ramoId: LinhaDoItem) => itens.filter((item) => item.ramoId === ramoId)

  const trechos: TrechoDaPraticaGuiada[] = [
    {
      ramoId: null,
      nome: 'Linha principal',
      linha: opening.mainline,
      inicio: 0,
      itens: daLinha(null),
    },
  ]

  for (const ramo of ramosCore(opening)) {
    const divergencia = ramo.ramificacao.indiceDaDivergencia
    if (divergencia === null) continue
    const deste = daLinha(ramo.id)
    // Um ramo sem decisão do aluno depois do desvio não tem o que praticar.
    if (deste.length === 0) continue
    trechos.push({
      ramoId: ramo.id,
      nome: ramo.nome,
      linha: ramo.ramificacao.variacao.line,
      /*
        A JOGADA COMEÇA NO DESVIO, e não do zero: os lances anteriores são os da
        principal, que o trecho anterior acabou de cobrar. O computador os joga
        para montar a posição.
      */
      inicio: divergencia + 1,
      itens: deste,
    })
  }

  return trechos
}
