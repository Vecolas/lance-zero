/**
 * O RAMO É A UNIDADE QUE O ALUNO VÊ.
 *
 * O QUE ISTO SUBSTITUI, e o defeito era de modelo mental, não de código: a
 * jornada tinha DUAS etapas — "Melhores respostas do adversário" e "Variações
 * importantes" — separadas por `respostasDoAdversario` e `variacoesDoAluno`,
 * isto é, por QUEM TOMOU A DECISÃO. A separação é limpa no domínio e artificial
 * na cabeça de quem estuda: o jogador pensa "estou na Defesa dos Dois Cavalos",
 * e não "estou na lista de ramos cujo autor da decisão foi o oponente".
 *
 * Aqui existe UMA lista. `autor` continua existindo e continua sendo verdade —
 * ele muda o texto da tela ("o adversário joga" contra "você joga") e a
 * cobertura por papel —, mas deixou de criar duas etapas pedagógicas.
 *
 * O QUE NÃO MUDOU, de propósito: a ramificação continua sendo DERIVADA do
 * conteúdo por `ramificacaoDaVariacao`, lendo o grafo e o FEN. Este módulo
 * acrescenta metadata de currículo a um fato de xadrez que já estava calculado;
 * ele não recalcula xadrez nenhum.
 *
 * PURO, como todo `src/domain`: sem React, sem relógio, sem armazenamento.
 */

import type { ImportanciaDoRamo, OpeningDefinition, OpeningSide, OpeningVariation } from './index'
import { ramificacaoDaVariacao, type RamificacaoDaVariacao } from './variacoes'

/**
 * De quem é a decisão que cria o ramo.
 *
 * `nenhum` não é um caso de borda inventado: é o Giuoco Piano, que no conteúdo
 * atual é o NOME de um trecho da própria linha principal e não ramifica em
 * lugar nenhum. Chamá-lo de escolha do aluno ou do adversário ensinaria uma
 * bifurcação que não existe no tabuleiro.
 */
export type AutorDoRamo = 'aluno' | 'adversario' | 'nenhum'

/** Um ramo do repertório, com o que a tela precisa para ensiná-lo. */
export interface RamoDeAbertura {
  id: string
  nome: string
  descricao: string
  /** O fato de xadrez: onde ramifica, o que recusa, de quem é a vez. */
  ramificacao: RamificacaoDaVariacao
  autor: AutorDoRamo
  importancia: ImportanciaDoRamo
  /** O que o adversário quer aqui, quando o conteúdo diz. */
  intencaoDoAdversario?: string
  /** O que o aluno busca aqui, quando o conteúdo diz. */
  objetivoDoAluno?: string
  /** O lance que cria o ramo, em SAN. `null` quando ele não desvia. */
  lanceQueRamifica: string | null
  /** O lance da linha principal recusado aqui, em SAN. */
  lanceRecusado: string | null
}

/** A ordem em que os ramos aparecem: primeiro o que o curso exige. */
const PESO_DA_IMPORTANCIA: Record<ImportanciaDoRamo, number> = {
  core: 0,
  secondary: 1,
  optional: 2,
}

function autorDoRamo(opening: OpeningDefinition, ramo: RamificacaoDaVariacao): AutorDoRamo {
  if (ramo.indiceDaDivergencia === null) return 'nenhum'
  return ramo.ladoQueDesvia === opening.side ? 'aluno' : 'adversario'
}

function ramoDaVariacao(opening: OpeningDefinition, variacao: OpeningVariation): RamoDeAbertura {
  const ramificacao = ramificacaoDaVariacao(opening, variacao)
  const indice = ramificacao.indiceDaDivergencia
  return {
    id: variacao.id,
    nome: variacao.name,
    descricao: variacao.description,
    ramificacao,
    autor: autorDoRamo(opening, ramificacao),
    importancia: variacao.importancia ?? 'core',
    intencaoDoAdversario: variacao.intencaoDoAdversario,
    objetivoDoAluno: variacao.objetivoDoAluno,
    lanceQueRamifica: indice === null ? null : (variacao.line[indice]?.san ?? null),
    lanceRecusado: ramificacao.lanceRecusado?.san ?? null,
  }
}

/**
 * Todos os ramos da abertura, na ordem em que o curso os pede.
 *
 * A ORDENAÇÃO É ESTÁVEL e não depende de sorteio: dentro da mesma importância,
 * a ordem é a do conteúdo. Um ramo que muda de lugar entre duas sessões faria o
 * aluno reencontrar a tela diferente sem nada ter mudado.
 */
export function ramosDaAbertura(opening: OpeningDefinition): RamoDeAbertura[] {
  return opening.variations
    .map((variacao) => ramoDaVariacao(opening, variacao))
    .sort((a, b) => PESO_DA_IMPORTANCIA[a.importancia] - PESO_DA_IMPORTANCIA[b.importancia])
}

/** Os ramos que a conclusão inicial exige. Ver `ImportanciaDoRamo`. */
export function ramosCore(opening: OpeningDefinition): RamoDeAbertura[] {
  return ramosDaAbertura(opening).filter((ramo) => ramo.importancia === 'core')
}

/** Um ramo pelo id, ou `undefined`. Para o deep-link vindo da revisão. */
export function ramoPorId(opening: OpeningDefinition, ramoId: string): RamoDeAbertura | undefined {
  return ramosDaAbertura(opening).find((ramo) => ramo.id === ramoId)
}

/**
 * O lado que o aluno joga num ramo, no papel pedido.
 *
 * `principal` é o lado do repertório; `reverso` é enfrentá-lo. A cobertura dos
 * dois lados passa a ser por RAMO e por PAPEL — ver o plano VNext §27 — em vez
 * de um único alvo largo de "perspectiva reversa", que dizia pouco sobre o que
 * de fato foi demonstrado.
 */
export function ladoDoPapel(
  opening: OpeningDefinition,
  papel: 'principal' | 'reverso',
): OpeningSide {
  if (papel === 'principal') return opening.side
  return opening.side === 'white' ? 'black' : 'white'
}
