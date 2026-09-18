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

import type {
  ImportanciaDoRamo,
  OpeningBoundary,
  OpeningDefinition,
  OpeningSide,
  OpeningVariation,
} from './index'
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

  /*
    O QUE O PLANO DE EXPANSÃO §6 EXIGE DE TODO RAMO `core`.

    Opcionais no tipo e obrigatórios no PORTÃO, que é a mesma divisão do
    ADR-0024: o opcional existe para o tipo não quebrar conteúdo de terceiros;
    quem manda é o teste. Ver `openings-onda0.test.ts`.
  */
  eco?: string
  conceitos?: readonly string[]
  estrutura?: string
  motivos?: readonly string[]
  erroComum?: { lance: string; porque: string }
  fronteira?: OpeningBoundary
  transposicoes?: readonly string[]
  politicaDoLadoInverso?: string
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
    /*
      OS CAMPOS DA EXPANSÃO PASSAM DIRETO, sem transformação. O ramo é a VISTA
      da variação: derivar aqui algo que o conteúdo já declara criaria uma
      segunda verdade sobre o mesmo campo.
    */
    eco: variacao.eco,
    conceitos: variacao.conceitos,
    estrutura: variacao.estrutura,
    motivos: variacao.motivos,
    erroComum: variacao.erroComum,
    fronteira: variacao.fronteira,
    transposicoes: variacao.transposicoes,
    politicaDoLadoInverso: variacao.politicaDoLadoInverso,
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

/* -------------------------------------------------------------------------- */
/* O estado de um ramo, para a biblioteca                                      */
/* -------------------------------------------------------------------------- */

/**
 * O que o aluno já fez com este ramo.
 *
 * TRÊS ESTADOS, E CADA UM TEM EVIDÊNCIA. `visto` significa que ele abriu o
 * estudo do ramo; `praticado`, que ele jogou a decisão que o ramo ensina, no
 * tabuleiro e certa.
 *
 * O PLANO PEDE "✓ estudada" (§17), E ESTE MÓDULO NÃO USA ESSA PALAVRA. Abrir
 * uma tela não é estudar, e um rótulo que promete mais do que a evidência
 * sustenta é a mesma falsa precisão que o produto recusa no WDL do Stockfish.
 * Quem abriu, viu; quem jogou, praticou.
 */
export type EstadoDoRamo = 'nao-visto' | 'visto' | 'praticado'

/**
 * Os ids gravados em `itensRespondidos` da etapa de variações.
 *
 * O PREFIXO EXISTE PARA CONVIVER: a etapa pode passar a gravar outros tipos de
 * item, e ids crus colidiriam em silêncio. `registrarItem` deduplica por id,
 * então reabrir o mesmo ramo não infla contagem nenhuma.
 */
export function idDeRamoVisto(ramoId: string): string {
  return `ramo:${ramoId}:visto`
}

export function idDeRamoPraticado(ramoId: string): string {
  return `ramo:${ramoId}:praticado`
}

/**
 * Lê o estado de um ramo a partir dos itens respondidos da etapa.
 *
 * PRATICADO IMPLICA VISTO, e a ordem da leitura garante isso mesmo que só o
 * segundo id tenha sido gravado — o que acontece se a gravação do primeiro
 * falhar. Um ramo que o aluno jogou não pode aparecer como "não visto".
 */
export function estadoDoRamo(respondidos: readonly string[], ramoId: string): EstadoDoRamo {
  if (respondidos.includes(idDeRamoPraticado(ramoId))) return 'praticado'
  if (respondidos.includes(idDeRamoVisto(ramoId))) return 'visto'
  return 'nao-visto'
}

/**
 * O ramo que a biblioteca recomenda abrir agora.
 *
 * O PRIMEIRO `core` AINDA NÃO PRATICADO, na ordem de importância que
 * `ramosDaAbertura` já estabelece. Quando todos os `core` estão praticados, a
 * recomendação passa para o resto — e some quando não sobra nada.
 *
 * ELE RECOMENDA, NÃO TRANCA. Todos os cards abrem, sempre: é o ADR-0016, e a
 * razão é que esconder conteúdo foi o defeito que aquele ADR desfez.
 */
export function ramoRecomendado(
  ramos: readonly RamoDeAbertura[],
  respondidos: readonly string[],
): RamoDeAbertura | undefined {
  const pendente = (ramo: RamoDeAbertura) => estadoDoRamo(respondidos, ramo.id) !== 'praticado'
  return ramos.find((ramo) => ramo.importancia === 'core' && pendente(ramo)) ?? ramos.find(pendente)
}
