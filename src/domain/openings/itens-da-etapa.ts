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

/** Um item da prática guiada: uma decisão do aluno na linha principal. */
export interface ItemDeAbertura {
  id: string
  /** Índice do lance na mainline COMPLETA — é ele que endereça a posição. */
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
 * Os itens da prática guiada: os plies em que é a vez do aluno.
 *
 * O id carrega o ÍNDICE NA LINHA, e não a ordem na lista filtrada: acrescentar
 * um lance antes não remexe os ids já gravados em `itensRespondidos`.
 */
export function itensDaPraticaGuiadaDeAbertura(
  opening: OpeningDefinition,
): readonly ItemDeAbertura[] {
  const itens: ItemDeAbertura[] = []
  opening.mainline.forEach((lance, indice) => {
    if (ladoDoIndice(indice) !== opening.side) return
    itens.push({
      id: `guiada:${indice}`,
      indiceNaLinha: indice,
      san: lance.san,
      comentario: lance.comment,
    })
  })
  return itens
}
