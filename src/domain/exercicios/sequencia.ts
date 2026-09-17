/**
 * RESPONDER É JOGAR — e uma resposta certa faz a partida CONTINUAR.
 *
 * O DEFEITO CONTRA O QUAL ESTE ARQUIVO FOI ESCRITO: a lição pedia um lance, o
 * aluno arrastava a peça, e a peça voltava. Sempre — inclusive quando ele
 * acertava. `LicaoPlayer` renderizava `fen={exercicio.fen}` do começo ao fim, o
 * lance certo nunca aparecia no tabuleiro, e o adversário não existia. O aluno
 * respondia a uma pergunta; ele não jogava xadrez.
 *
 * O QUE ESTE MÓDULO FAZ: guarda uma LINHA e caminha por ela. O lance do aluno e
 * a resposta do computador acontecem na MESMA transição — não num efeito com
 * relógio, não depois de um botão. Não existe estado intermediário em que é a
 * vez do computador e a tela está parada esperando um clique.
 *
 * A SEMÂNTICA DA LINHA É A DO DUMP DA LICHESS, de propósito: uma lista de
 * lances a partir de uma posição, alternando os lados. Mas QUEM JOGA CADA UM É
 * DERIVADO DO FEN, nunca da paridade do índice — porque a linha pode começar
 * pelo adversário (o "lance preparatório" do dataset) e aí a paridade inverte.
 * Um módulo que lesse a paridade do índice mentiria exatamente nesse caso, que
 * é o caso do banco de puzzles inteiro.
 *
 * LINHA DE UM LANCE É O CASO NORMAL, e não um caso degenerado: quando um lance
 * resolve, o exercício termina nele e o computador não responde nada. Forçar
 * uma resposta ali inventaria a continuação que o conteúdo não tem.
 *
 * AS DUAS PERGUNTAS CONTINUAM SEPARADAS, na ordem de `resposta-no-tabuleiro.ts`:
 * primeiro "isto é um lance?", só depois "é ESTE lance?". Um arraste torto
 * nunca vira erro conceitual.
 *
 * PURO: sem React, sem relógio, sem armazenamento, sem `Math.random`.
 */

import { applyMove, parseUci, positionStatus } from '@/lib/chess'
import type { Side } from '@/domain/types'
import { ehOMesmoLance, PROMOCAO_PADRAO } from './lances'

/** Uma linha treinável: a posição e os lances que saem dela, em ordem. */
export interface LinhaTreinavel {
  /** A posição autorada, ANTES de qualquer lance da linha. */
  fenInicial: string
  /** O lado do aluno. Todo lance do outro lado é do computador. */
  ladoDoAluno: Side
  /**
   * Os lances a partir de `fenInicial`, em UCI e em ordem.
   *
   * O PRIMEIRO PODE SER DO ADVERSÁRIO. É assim que o dump da Lichess entrega um
   * puzzle, e é o que permite uma lição abrir com o lance que cria o problema.
   */
  lances: readonly string[]
}

export interface EstadoDaSequencia {
  /** A posição que está na tela, agora. */
  fen: string
  /** Quantos lances da linha já foram jogados — do aluno e do computador. */
  indice: number
  /** Tudo o que foi jogado, em ordem, incluindo as respostas do computador. */
  jogados: readonly string[]
  /**
   * Tentativas erradas NO LANCE ATUAL. Zera quando a linha avança.
   *
   * Por lance, e não por exercício: a escada de dicas pergunta "quantas vezes
   * ele errou ISTO", e um contador acumulado responderia outra coisa.
   */
  errosNoLance: number
  status: 'em-andamento' | 'concluida'
}

/** O que aconteceu quando o aluno soltou a peça. */
export type LanceNaSequencia =
  /** Nem chegou a ser lance. Snapback, e NÃO conta como erro conceitual. */
  | { tipo: 'ilegal' }
  /** Legal, mas não é o lance da linha. Snapback: a posição NÃO anda. */
  | { tipo: 'fora-da-linha'; uci: string; estado: EstadoDaSequencia }
  /** Certo. O lance do aluno e a resposta do computador, na mesma transição. */
  | {
      tipo: 'seguiu'
      estado: EstadoDaSequencia
      /** O que o computador respondeu, ou `null` quando a linha acabou aqui. */
      respostaDoAdversario: string | null
    }

/**
 * Abre a sequência, já com o computador tendo jogado o que era dele.
 *
 * É AQUI QUE "TREINANDO DE BRANCAS, O COMPUTADOR JOGA DE PRETAS" começa a ser
 * verdade: se a posição autorada não está na vez do aluno, os primeiros lances
 * da linha são do adversário e entram ANTES de a tela pedir qualquer coisa.
 * Sem isto, a lição abriria pedindo um lance a quem não é de jogar.
 */
export function iniciarSequencia(linha: LinhaTreinavel): EstadoDaSequencia {
  return avancarEnquantoForDoComputador(linha, {
    fen: linha.fenInicial,
    indice: 0,
    jogados: [],
    errosNoLance: 0,
    status: linha.lances.length === 0 ? 'concluida' : 'em-andamento',
  }).estado
}

/**
 * Submete um lance do aluno.
 *
 * Nunca lança: lance impossível é entrada de usuário, não defeito de programa.
 */
export function jogarNaSequencia(
  linha: LinhaTreinavel,
  estado: EstadoDaSequencia,
  uci: string,
): LanceNaSequencia {
  if (estado.status === 'concluida') return { tipo: 'ilegal' }

  const entrada = parseUci(uci)
  if (!entrada) return { tipo: 'ilegal' }

  const aplicado = applyMove(estado.fen, entrada)
  if (!aplicado) {
    /*
      SEGUNDA CHANCE PARA A PROMOÇÃO, a mesma de `resposta-no-tabuleiro.ts`: um
      peão arrastado até a última fileira sem sufixo é ilegal como UCI e legal
      como intenção. Sem ela o aluno arrasta, nada acontece, e a tela não diz
      nada — o pior tipo de silêncio.
    */
    if (!entrada.promotion) {
      const comDama = `${entrada.from}${entrada.to}${PROMOCAO_PADRAO}`
      const promovido = parseUci(comDama)
      if (promovido && applyMove(estado.fen, promovido)) {
        return jogarNaSequencia(linha, estado, comDama)
      }
    }
    return { tipo: 'ilegal' }
  }

  const esperado = linha.lances[estado.indice]
  if (esperado === undefined || !ehOMesmoLance(esperado, aplicado.move.uci)) {
    return {
      tipo: 'fora-da-linha',
      uci: aplicado.move.uci,
      /*
        A POSIÇÃO NÃO ANDA. É o snapback, e é o que mantém o aluno NA posição
        até resolvê-la, em vez de arrastá-lo para uma posição seguinte que ele
        chegou sem entender a anterior.
      */
      estado: { ...estado, errosNoLance: estado.errosNoLance + 1 },
    }
  }

  const depoisDoAluno: EstadoDaSequencia = {
    fen: aplicado.fenAfter,
    indice: estado.indice + 1,
    jogados: [...estado.jogados, aplicado.move.uci],
    errosNoLance: 0,
    status: estado.indice + 1 >= linha.lances.length ? 'concluida' : 'em-andamento',
  }

  const avanco = avancarEnquantoForDoComputador(linha, depoisDoAluno)
  return { tipo: 'seguiu', estado: avanco.estado, respostaDoAdversario: avanco.respondeu }
}

/** O lance que a tela está esperando do aluno, ou `null` quando acabou. */
export function lanceEsperado(linha: LinhaTreinavel, estado: EstadoDaSequencia): string | null {
  return estado.status === 'concluida' ? null : (linha.lances[estado.indice] ?? null)
}

/**
 * Joga tudo o que for do computador a partir daqui.
 *
 * É UM LAÇO, e não um lance só: a abertura da sequência pode ter mais de um
 * lance preparatório, e uma linha autorada pode encadear dois lances do mesmo
 * lado depois de uma promoção. O teto é o tamanho da linha — ele não gira para
 * sempre nem confia no conteúdo para parar.
 *
 * ELE PARA NO PRIMEIRO LANCE IMPOSSÍVEL, em silêncio, e é de propósito: quem
 * reprova linha ilegal é o portão de conteúdo, na build. Travar a tela do aluno
 * seria cobrar dele o defeito de quem autorou.
 */
function avancarEnquantoForDoComputador(
  linha: LinhaTreinavel,
  inicio: EstadoDaSequencia,
): { estado: EstadoDaSequencia; respondeu: string | null } {
  let estado = inicio
  let respondeu: string | null = null

  for (let passo = 0; passo < linha.lances.length; passo += 1) {
    if (estado.status === 'concluida') break
    if (positionStatus(estado.fen).turn === linha.ladoDoAluno) break

    const uci = linha.lances[estado.indice]
    if (uci === undefined) break
    const entrada = parseUci(uci)
    if (!entrada) break
    const aplicado = applyMove(estado.fen, entrada)
    if (!aplicado) break

    respondeu = aplicado.move.uci
    estado = {
      fen: aplicado.fenAfter,
      indice: estado.indice + 1,
      jogados: [...estado.jogados, aplicado.move.uci],
      errosNoLance: 0,
      status: estado.indice + 1 >= linha.lances.length ? 'concluida' : 'em-andamento',
    }
  }

  return { estado, respondeu }
}
