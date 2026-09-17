/**
 * Contrato de um exercício posicional conferível, e a verificação dele.
 *
 * ONDE ISTO MORA, e por quê: em `@/domain/exercicios`. É o vocabulário
 * COMPARTILHADO entre o banco de diagnóstico (`@/content/diagnostic`) e a etapa
 * de recuperação das lições. Os dois precisam da mesma prova — lance aceito
 * cumpre o objetivo, alternativa apresentada como errada falha — e escrever
 * essa verificação duas vezes seria duas fontes para a mesma verdade, com a
 * segunda cópia divergindo no dia em que a primeira ganhasse um caso novo.
 *
 * Morava em `@/domain/diagnostic` só porque aquele era o único diretório que a
 * rodada que o escreveu podia criar, e o nome do endereço fazia parecer que a
 * regra era do diagnóstico. Ver a issue #74.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA — as alternativas erradas são CONTEÚDO
 * VERIFICADO, não enfeite. O portão exige que cada uma seja legal e que cada
 * uma FALHE o objetivo. É o lado do portão que morde para dentro: se eu
 * escrever como "errada" uma jogada que também ganha, o banco reprova em vez de
 * ensinar ao aluno que a resposta certa dele estava errada.
 *
 * `lancesAceitos` e `alternativas` são TUPLAS não-vazias: exercício sem
 * resposta certa, ou sem nenhuma alternativa, não chega a compilar. É a mesma
 * ideia do esquema de lição — impedir na forma em vez de cobrar num portão
 * depois.
 */

import type { Side } from '@/domain/types'
import {
  applyMove,
  legalMoves,
  normalizeUci,
  parseUci,
  posicaoEhJogavel,
  positionStatus,
} from '@/lib/chess'
import { ehOMesmoLance } from './lances'
import type { LinhaTreinavel } from './sequencia'
import { avaliarLance, type ObjetivoDeDiagnostico } from './objetivo'

/** Lista com pelo menos um elemento. */
export type NaoVazia<T> = readonly [T, ...T[]]

/** Um exercício posicional conferível: posição, objetivo e a chave de correção. */
export interface ExercicioPosicional {
  /** Único no catálogo onde ele vive. */
  id: string
  fen: string
  /** Lado do aluno. É sempre a vez dele no FEN. */
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  lancesAceitos: NaoVazia<string>
  alternativas: NaoVazia<string>
  /**
   * A linha completa, quando o exercício continua depois do lance certo.
   *
   * OPCIONAL, E A AUSÊNCIA É O CASO NORMAL: quando um lance resolve, o
   * exercício termina nele e o computador não responde nada. Inventar uma
   * resposta ali seria inventar continuação que o conteúdo não tem.
   *
   * Quando existe, começa pelo MESMO lance que `lancesAceitos[0]` e segue
   * alternando os lados — a semântica do dump da Lichess, e a que
   * `@/domain/exercicios/sequencia` caminha. Quem escolhe qual dos dois lances
   * de uma alternativa equivalente continua a linha é o autor: a continuação é
   * uma linha só, e não uma árvore.
   */
  continuacao?: NaoVazia<string>
}

/**
 * A linha treinável deste exercício.
 *
 * DERIVADA, e nunca um segundo campo: sem continuação autorada a linha é o
 * próprio lance que o exercício já cobra. É isto que faz os exercícios que
 * existem hoje passarem a jogar no tabuleiro sem uma palavra de conteúdo novo —
 * e faz "acrescentar a resposta do adversário" ser acrescentar um campo, e não
 * reescrever o exercício.
 */
export function linhaDoExercicio(item: ExercicioPosicional): LinhaTreinavel {
  return {
    fenInicial: item.fen,
    ladoDoAluno: item.ladoDoAluno,
    lances: item.continuacao ?? [item.lancesAceitos[0]],
  }
}

/** Um problema encontrado num exercício, já com o item que o carrega. */
export interface FalhaDeItem {
  itemId: string
  problema: string
}

/**
 * Confere um exercício inteiro e devolve TODOS os problemas dele.
 *
 * Devolve lista em vez de lançar no primeiro problema porque quem chama é o
 * portão do banco: parar no primeiro item quebrado esconderia os outros e
 * transformaria a correção do conteúdo numa fila de uma falha por execução.
 */
export function verificarExercicio(item: ExercicioPosicional): FalhaDeItem[] {
  const falhas: string[] = []

  if (!posicaoEhJogavel(item.fen)) {
    // Sem posição jogável nada mais pode ser conferido: as buscas lançariam.
    return [{ itemId: item.id, problema: `FEN inválido ou posição impossível: ${item.fen}` }]
  }
  const estado = positionStatus(item.fen)
  if (estado.turn !== item.ladoDoAluno) {
    return [{ itemId: item.id, problema: `o FEN não está na vez de ${item.ladoDoAluno}` }]
  }
  if (estado.isGameOver) {
    return [{ itemId: item.id, problema: 'a posição já está terminada' }]
  }

  for (const uci of item.lancesAceitos) {
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (!veredito.cumpre) {
      falhas.push(`lance aceito não cumpre o objetivo: ${veredito.motivo}`)
    }
  }

  // As opções LEGAIS da posição, para conferir as alternativas contra elas.
  //
  // ESTE PONTO CEGO ERA REAL e foi encontrado escrevendo conteúdo: `avaliarLance`
  // devolve `cumpre: false` tanto para "é legal e não ganha" quanto para "não
  // existe". Uma alternativa com um typo — `d8d4` virando `d8d9` — passava pelo
  // portão em SILÊNCIO, porque não cumprir o objetivo era exatamente o que se
  // esperava dela. O aluno então via, entre as opções, um lance impossível: a
  // tela cai no `?? uci` da notação e mostra a string crua.
  //
  // O mesmo não precisa ser dito dos `lancesAceitos`: um aceito ilegal já
  // reprova pelo outro lado, porque ilegal nunca cumpre objetivo nenhum.
  const legais = new Set(legalMoves(item.fen).map((lance) => lance.uci))

  for (const uci of item.alternativas) {
    if (item.lancesAceitos.includes(uci)) {
      falhas.push(`${uci} está ao mesmo tempo entre os aceitos e entre as alternativas`)
      continue
    }
    if (!legais.has(normalizeUci(uci))) {
      falhas.push(`alternativa ${uci} não é um lance legal nesta posição`)
      continue
    }
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (veredito.cumpre) {
      falhas.push(
        `alternativa apresentada como errada também cumpre o objetivo: ${veredito.motivo}`,
      )
    }
  }

  falhas.push(...problemasDaContinuacao(item))

  return falhas.map((problema) => ({ itemId: item.id, problema }))
}

/**
 * O portão da continuação — e ele morde dos dois lados.
 *
 * O MODO DE FALHA QUE ELE COBRE É SILENCIOSO: `avancarEnquantoForDoComputador`
 * PARA no primeiro lance impossível, sem erro nenhum. Uma continuação com um
 * typo apareceria na tela como um exercício que simplesmente termina cedo — o
 * aluno joga o lance certo, o computador não responde, e nada diz que faltou
 * conteúdo. Por isso a legalidade é conferida aqui, na build, e não lá.
 *
 * E O ÚLTIMO LANCE É DO ALUNO. Terminar no lance do computador deixaria a tela
 * pedindo uma jogada que a linha não tem: o aluno ficaria olhando uma posição
 * esperando instrução, e o exercício nunca concluiria.
 */
function problemasDaContinuacao(item: ExercicioPosicional): string[] {
  const continuacao = item.continuacao
  if (!continuacao) return []

  const falhas: string[] = []

  if (!item.lancesAceitos.some((aceito) => ehOMesmoLance(aceito, continuacao[0]))) {
    falhas.push(`a continuação começa com ${continuacao[0]}, que não está entre os lances aceitos`)
  }

  /*
    QUEM JOGOU O ÚLTIMO LANCE é a única pergunta de paridade que importa, e ela
    se responde pelo FEN — nunca pelo índice. A alternância entre os lados já é
    garantida pelo xadrez; o que não é garantido é a linha PARAR no lado certo.
  */
  let fen = item.fen
  let ultimoLadoQueJogou: Side | null = null
  for (const uci of continuacao) {
    const deQuem = positionStatus(fen).turn
    const entrada = parseUci(uci)
    const aplicado = entrada === null ? null : applyMove(fen, entrada)
    if (!aplicado) {
      falhas.push(`a continuação tem lance impossível na posição: ${uci}`)
      return falhas
    }
    ultimoLadoQueJogou = deQuem
    fen = aplicado.fenAfter
  }

  if (ultimoLadoQueJogou !== item.ladoDoAluno) {
    falhas.push('a continuação termina num lance do computador; ela tem de terminar no do aluno')
  }

  return falhas
}
