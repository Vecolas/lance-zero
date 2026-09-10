/**
 * Ligação entre o RESULTADO TEÓRICO da tablebase e o OBJETIVO declarado de uma
 * posição do currículo de finais.
 *
 * POR QUE EXISTE (issue #55, item 2): a linha modelo prova que o objetivo é
 * ALCANÇÁVEL contra a defesa que NÓS escrevemos. Isso não é o que a lição
 * afirma ao aluno. A lição afirma que existe uma estratégia dele que chega ao
 * objetivo contra QUALQUER defesa — e um aluno que jogue fora do roteiro pode
 * encontrar uma defesa que o autor nunca considerou.
 *
 * A prova definitiva vem da tablebase, que já considerou todas as defesas. O
 * trabalho deste arquivo é UM SÓ: dizer, para cada tipo de objetivo, se o
 * resultado teórico decide a pergunta — e dizer NÃO quando não decide.
 *
 * DECISÃO CENTRAL — A EQUIVALÊNCIA NÃO É A MESMA PARA OS TRÊS TIPOS.
 *
 * 1. `empate-defendido` ↔ resultado teórico `empate`: equivalência DIRETA. O
 *    objetivo do aluno é exatamente o resultado teórico da posição, e a
 *    tablebase já quantificou "contra qualquer defesa". Provado.
 *
 * 2. `mate-em` ↔ `vitoria` + DTM dentro do prazo: equivalência DIRETA, com uma
 *    conversão declarada — DTM é medido em MEIOS-LANCES a partir de quem tem a
 *    vez (confirmado contra o serviço real: mate em 1 → dtm 1; mate em 2 →
 *    dtm 3), e o objetivo conta LANCES DO ALUNO. É um segundo par de olhos
 *    sobre `existeMateForcadoEm`, que já prova o mesmo sem rede.
 *
 * 3. `promocao` ↔ `vitoria`: NÃO É EQUIVALÊNCIA, e não vale forçar. Dá para
 *    ganhar sem promover (qualquer material que dê mate sozinho) e dá para
 *    promover sem ganhar (promoção que não muda o resultado). A vitória
 *    teórica só implica promoção forçada num MATERIAL em que o mate é
 *    impossível sem promover — ver `vitoriaExigePromocao`. Fora desse
 *    material, o veredito é `nao-provado`, e isso fica VISÍVEL em vez de virar
 *    um verde barato.
 *
 * O QUE ESTE ARQUIVO NÃO DECIDE, e que quem lê o veredito precisa saber:
 *
 * - `avaliarObjetivo` reconhece empate por afogamento, material insuficiente e
 *   regra dos 50 lances, mas NÃO por repetição (um FEN não carrega histórico).
 *   Então um `empate-defendido` provado forçado AQUI pode, na tela, nunca ser
 *   marcado como cumprido se a defesa embolar até a tríplice repetição. A prova
 *   é sobre o xadrez; o reconhecimento na tela é outro assunto, declarado em
 *   `objetivo.ts`.
 * - nada aqui fala com a rede. A entrada é um `TablebaseResult` que alguém já
 *   obteve — é o que permite testar esta lógica sem rede e usá-la no portão de
 *   contrato, que tem rede.
 */

import { normalizeFen, positionStatus } from '@/lib/chess'
import type { ResultadoTeorico, Side, TablebaseResult } from '@/domain/types'
import {
  contarPecas,
  type ContagemDePecas,
  type ObjetivoFinal,
  type ObjetivoPromocao,
} from './objetivo'

/**
 * O que a prova conclui.
 *
 * Três valores, e não um booleano, porque "não consegui decidir" e "o objetivo
 * é impossível" pedem reações opostas de quem lê: a primeira é limite do
 * método, a segunda é o currículo afirmando algo falso ao aluno.
 */
export const VEREDITOS_DA_PROVA = ['forcado', 'impossivel', 'nao-provado'] as const

export type VereditoDaProva = (typeof VEREDITOS_DA_PROVA)[number]

/**
 * Motivos possíveis, como CÓDIGO e não como frase — mesma regra de
 * `MOTIVOS_DE_OBJETIVO`: quem desenha a tela ou a mensagem de falha traduz.
 *
 * É a FONTE. O veredito de cada motivo, e se ele é limite do método, saem de
 * `PROVA_POR_MOTIVO` logo abaixo; motivo novo que entre aqui e não ganhe
 * decisão lá não compila.
 */
export const MOTIVOS_DA_PROVA = [
  /** O objetivo é segurar o empate e o resultado teórico é empate. */
  'empate-e-o-resultado-teorico',
  /** Vitória teórica num material que não dá mate sem promover. */
  'vitoria-so-se-promover',
  /** Vitória teórica com DTM dentro do prazo declarado. */
  'mate-forcado-no-prazo',
  /** O objetivo é segurar o empate numa posição teoricamente perdida. */
  'empate-em-posicao-perdida',
  /** O objetivo é dar mate numa posição que não é vitória teórica. */
  'mate-em-posicao-nao-ganha',
  /** Vitória teórica, mas o mate chega depois do prazo declarado. */
  'mate-mais-longo-que-o-prazo',
  /** Vitória teórica num material que dá mate sem promover: não decide. */
  'vitoria-nao-exige-promocao',
  /** Vitória teórica sem DTM na resposta: o prazo não pode ser conferido. */
  'mate-sem-dtm',
  /** Pede promoção numa posição que não é vitória teórica. */
  'promocao-sem-vitoria-teorica',
  /** Pede empate numa posição teoricamente ganha pelo aluno. */
  'empate-em-posicao-ganha',
  /** A tablebase respondeu, mas sem resultado utilizável (`unknown`). */
  'resultado-teorico-desconhecido',
  /** Vitória teórica com DTM que não é positivo: a resposta se contradiz. */
  'tablebase-inconsistente',
] as const

export type MotivoDaProva = (typeof MOTIVOS_DA_PROVA)[number]

interface DecisaoDoMotivo {
  veredito: VereditoDaProva
  /**
   * `true` quando o `nao-provado` é limite DESTE MÉTODO — a pergunta continua
   * em aberto, e não há indício de que o currículo esteja errado.
   *
   * `false` quando o `nao-provado` aponta para o currículo ou para o serviço.
   * É essa diferença que permite a um portão tolerar o primeiro caso, com o
   * ponto cego declarado em voz alta, e reprovar o segundo. Sem ela, "não
   * consegui conferir" e "está errado" virariam o mesmo silêncio.
   */
  limiteDoMetodo: boolean
}

/**
 * Veredito e natureza de cada motivo, em UMA fonte só.
 *
 * O `Record` sobre a união é o que força a exaustividade. As listas derivadas
 * (`MOTIVOS_LIMITE_DO_METODO`) nascem daqui e nunca são escritas à mão: duas
 * listas para a mesma verdade divergem no dia em que alguém edita só uma.
 */
const PROVA_POR_MOTIVO: Record<MotivoDaProva, DecisaoDoMotivo> = {
  'empate-e-o-resultado-teorico': { veredito: 'forcado', limiteDoMetodo: false },
  'vitoria-so-se-promover': { veredito: 'forcado', limiteDoMetodo: false },
  'mate-forcado-no-prazo': { veredito: 'forcado', limiteDoMetodo: false },
  'empate-em-posicao-perdida': { veredito: 'impossivel', limiteDoMetodo: false },
  'mate-em-posicao-nao-ganha': { veredito: 'impossivel', limiteDoMetodo: false },
  'mate-mais-longo-que-o-prazo': { veredito: 'impossivel', limiteDoMetodo: false },
  'vitoria-nao-exige-promocao': { veredito: 'nao-provado', limiteDoMetodo: true },
  'mate-sem-dtm': { veredito: 'nao-provado', limiteDoMetodo: true },
  'promocao-sem-vitoria-teorica': { veredito: 'nao-provado', limiteDoMetodo: false },
  'empate-em-posicao-ganha': { veredito: 'nao-provado', limiteDoMetodo: false },
  'resultado-teorico-desconhecido': { veredito: 'nao-provado', limiteDoMetodo: false },
  'tablebase-inconsistente': { veredito: 'nao-provado', limiteDoMetodo: false },
}

/**
 * Os motivos de `nao-provado` que são limite do método, derivados da fonte.
 *
 * Um portão pode tolerar estes — e só estes — desde que os anuncie. Qualquer
 * outro `nao-provado` significa que ninguém conferiu nada e que há uma pergunta
 * para o dono do produto.
 */
export const MOTIVOS_LIMITE_DO_METODO: readonly MotivoDaProva[] = MOTIVOS_DA_PROVA.filter(
  (motivo) => PROVA_POR_MOTIVO[motivo].limiteDoMetodo,
)

export interface ProvaDeObjetivo {
  motivo: MotivoDaProva
  /** Derivado do motivo. Nunca informado por quem chama. */
  veredito: VereditoDaProva
  /** Derivado do motivo. Só faz sentido quando o veredito é `nao-provado`. */
  limiteDoMetodo: boolean
  /** Resultado teórico já convertido para o ponto de vista DO ALUNO. */
  resultadoDoAluno: ResultadoTeorico | null
  /**
   * Lances DO ALUNO até o mate, quando o objetivo é de mate e há DTM. `null`
   * em qualquer outro caso — não é "zero", é "não se aplica".
   */
  lancesAteOMate: number | null
}

function adversarioDe(lado: Side): Side {
  return lado === 'w' ? 'b' : 'w'
}

/** Espelha um resultado teórico para o outro lado do tabuleiro. */
function espelhar(resultado: ResultadoTeorico | null): ResultadoTeorico | null {
  if (resultado === 'vitoria') return 'derrota'
  if (resultado === 'derrota') return 'vitoria'
  return resultado
}

/**
 * Resultado teórico do ponto de vista de `lado`.
 *
 * A tablebase responde sempre do ponto de vista de QUEM TEM A VEZ, e a vez sai
 * do FEN que a própria resposta carrega — não de um parâmetro à parte. Ler a
 * vez de outro lugar seria a segunda fonte da mesma verdade, e o erro seria
 * mudo: um empate viraria empate, uma vitória viraria derrota, e a lição
 * afirmaria o contrário do tabuleiro.
 */
export function resultadoParaOLado(
  tablebase: TablebaseResult,
  lado: Side,
): ResultadoTeorico | null {
  const vez = positionStatus(tablebase.fen).turn
  return vez === lado ? tablebase.resultado : espelhar(tablebase.resultado)
}

/**
 * DTM em meios-lances do ponto de vista de `lado`, ou `null` quando não veio.
 *
 * O sinal também é relativo a quem tem a vez: positivo é "quem joga dá mate em
 * tantos meios-lances".
 */
export function dtmParaOLado(tablebase: TablebaseResult, lado: Side): number | null {
  if (tablebase.dtm === null) {
    return null
  }
  const vez = positionStatus(tablebase.fen).turn
  return vez === lado ? tablebase.dtm : -tablebase.dtm
}

/** Total de peças de uma contagem, sem lista escrita à mão de tipos. */
function totalDe(contagem: ContagemDePecas): number {
  return Object.values(contagem).reduce((soma, quantidade) => soma + quantidade, 0)
}

/**
 * A vitória teórica de `lado` neste material só pode passar por promoção?
 *
 * A REGRA, e não um número: só vale quando o lado que ganha tem REI E UM PEÃO e
 * o adversário tem REI SOZINHO. Nesse material,
 *
 * - o mate é impossível — o rei nunca dá xeque, então só o peão poderia dar, e
 *   nenhuma configuração de rei, peão e rei é mate. Isso não é folclore aqui:
 *   `tests/unit/endgames-forcado.test.ts` varre EXAUSTIVAMENTE as posições em
 *   que o peão dá xeque (as únicas candidatas a mate) e mostra que nenhuma é
 *   mate, nas duas cores;
 * - a única mudança de material possível sem promoção é o peão ser capturado, e
 *   rei contra rei é empate imediato por material insuficiente.
 *
 * Logo, toda linha que termina em mate passou por uma promoção — e a peça
 * promovida é escolha do aluno, então ele pode escolher a do objetivo.
 *
 * A REGRA É ESTREITA DE PROPÓSITO. Com DOIS peões o mate já existe (rei em g6,
 * peões em g7 e h7, rei preto em h8), e o mesmo teste guarda esse
 * contra-exemplo para ninguém alargar a regra achando que "peões não dão mate".
 *
 * `quantidadeMinima` maior que 1 também derruba a regra: um peão só produz uma
 * promoção.
 */
export function vitoriaExigePromocao(fen: string, lado: Side, objetivo: ObjetivoPromocao): boolean {
  const doAluno = contarPecas(fen, lado)
  const doAdversario = contarPecas(fen, adversarioDe(lado))
  const reiEUmPeao = doAluno.k === 1 && doAluno.p === 1 && totalDe(doAluno) === 2
  const reiSozinho = doAdversario.k === 1 && totalDe(doAdversario) === 1
  return reiEUmPeao && reiSozinho && objetivo.quantidadeMinima <= 1
}

export interface EntradaDaProva {
  /** FEN da posição do currículo. */
  fen: string
  objetivo: ObjetivoFinal
  ladoDoAluno: Side
  /** Resposta da tablebase PARA ESTE FEN. */
  tablebase: TablebaseResult
}

function montar(
  motivo: MotivoDaProva,
  resultadoDoAluno: ResultadoTeorico | null,
  lancesAteOMate: number | null = null,
): ProvaDeObjetivo {
  const decisao = PROVA_POR_MOTIVO[motivo]
  return {
    motivo,
    veredito: decisao.veredito,
    limiteDoMetodo: decisao.limiteDoMetodo,
    resultadoDoAluno,
    lancesAteOMate,
  }
}

/**
 * O objetivo declarado é FORÇADO contra qualquer defesa?
 *
 * LANÇA quando o `TablebaseResult` não é o desta posição. Provar o objetivo de
 * uma posição com a resposta de outra é exatamente o erro que um laço sobre o
 * currículo comete em silêncio, e o resultado seria um portão verde que não
 * conferiu nada.
 */
export function provarObjetivoPelaTablebase(entrada: EntradaDaProva): ProvaDeObjetivo {
  const { fen, objetivo, ladoDoAluno, tablebase } = entrada
  if (normalizeFen(fen) !== tablebase.fen) {
    throw new Error(
      `Resposta de tablebase de outra posição: pedida ${normalizeFen(fen)}, recebida ${tablebase.fen}`,
    )
  }

  const resultado = resultadoParaOLado(tablebase, ladoDoAluno)

  switch (objetivo.tipo) {
    case 'empate-defendido':
      if (resultado === null) return montar('resultado-teorico-desconhecido', resultado)
      if (resultado === 'empate') return montar('empate-e-o-resultado-teorico', resultado)
      if (resultado === 'derrota') return montar('empate-em-posicao-perdida', resultado)
      return montar('empate-em-posicao-ganha', resultado)

    case 'promocao':
      if (resultado === null) return montar('resultado-teorico-desconhecido', resultado)
      if (resultado !== 'vitoria') return montar('promocao-sem-vitoria-teorica', resultado)
      return vitoriaExigePromocao(fen, ladoDoAluno, objetivo)
        ? montar('vitoria-so-se-promover', resultado)
        : montar('vitoria-nao-exige-promocao', resultado)

    case 'mate-em': {
      if (resultado === null) return montar('resultado-teorico-desconhecido', resultado)
      if (resultado !== 'vitoria') return montar('mate-em-posicao-nao-ganha', resultado)
      const dtm = dtmParaOLado(tablebase, ladoDoAluno)
      if (dtm === null) return montar('mate-sem-dtm', resultado)
      if (dtm <= 0) return montar('tablebase-inconsistente', resultado)
      // DTM é meio-lance; o objetivo conta lances DO ALUNO. Mate em 1 → dtm 1.
      const lances = Math.ceil(dtm / 2)
      return lances <= objetivo.lancesMaximos
        ? montar('mate-forcado-no-prazo', resultado, lances)
        : montar('mate-mais-longo-que-o-prazo', resultado, lances)
    }

    default:
      // Tipo novo no union sem tratamento aqui: o compilador reprova nesta linha.
      return objetivoNaoTratado(objetivo)
  }
}

function objetivoNaoTratado(objetivo: never): never {
  throw new Error(`Objetivo de final sem prova de forçamento: ${JSON.stringify(objetivo)}`)
}
