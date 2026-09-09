/**
 * Reprodução da linha modelo de uma posição de final.
 *
 * Dois consumidores, e é de propósito que sejam os mesmos bytes:
 *
 * - a tela do exemplo resolvido, que precisa das posições intermediárias;
 * - o portão do currículo, que precisa saber se a linha é legal e se ela chega
 *   ao objetivo.
 *
 * Se o portão reproduzisse a linha com um código próprio, o portão passaria a
 * medir o SEU código em vez do que a tela vai executar — duas fontes para a
 * mesma verdade, e a que vale costuma ser a errada.
 *
 * O QUE ESTA PROVA COBRE: que a linha é jogável a partir do FEN e que, ao final
 * dela, o objetivo está cumprido. Ou seja, que o objetivo é ALCANÇÁVEL.
 *
 * O QUE ELA NÃO COBRE: que o objetivo é FORÇADO. Os lances do adversário na
 * linha foram escolhidos por quem escreveu o conteúdo. Para objetivos de mate,
 * `mate-forcado.ts` fecha essa lacuna; para promoção e defesa de empate, a
 * prova definitiva sai da tablebase e é dívida declarada.
 */

import { normalizeUci, parseUci } from '@/domain/puzzles/parser'
import { applyMove } from '@/lib/chess'
import type { PosicaoDeFinal } from './licao'
import { avaliarObjetivo, type ResultadoObjetivo } from './objetivo'

export interface ReproducaoDaLinha {
  /** FENs do início ao fim, incluindo o inicial. Tem `lances.length + 1` itens. */
  fens: string[]
  /** Meios-lances do ALUNO na linha. */
  lancesDoAluno: number
  /** Resultado do objetivo na posição final. */
  resultadoFinal: ResultadoObjetivo
  /**
   * Descrição do primeiro lance ilegal, ou `null` se a linha inteira é legal.
   * Erro é dado de retorno, e não exceção, porque quem chama é um portão que
   * quer relatar TODAS as posições quebradas, não parar na primeira.
   */
  erro: string | null
}

export function reproduzirLinhaModelo(posicao: PosicaoDeFinal): ReproducaoDaLinha {
  const fens: string[] = [posicao.fen]
  let fenAtual = posicao.fen
  let lancesDoAluno = 0
  let erro: string | null = null

  for (const [indice, uci] of posicao.linhaModelo.entries()) {
    // Na linha modelo o aluno joga sempre nos índices pares: o FEN inicial é a
    // vez dele, e isso é cobrado pelo portão do currículo.
    const ehLanceDoAluno = indice % 2 === 0
    // Parseia o UCI explicitamente em vez de entregar a string ao adapter: o
    // `chess.js` aceitaria a string pelo caminho tolerante do parser de SAN, e
    // aí um lance com forma errada viraria outro lance em silêncio.
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(fenAtual, entrada)
    if (!aplicado) {
      erro = `lance ${indice + 1} (${uci}) é ilegal em ${fenAtual}`
      break
    }
    fenAtual = aplicado.fenAfter
    fens.push(fenAtual)
    if (ehLanceDoAluno) {
      lancesDoAluno += 1
    }
  }

  return {
    fens,
    lancesDoAluno,
    resultadoFinal: avaliarObjetivo(fenAtual, posicao.objetivo, {
      ladoDoAluno: posicao.ladoDoAluno,
      lancesDoAluno,
    }),
    erro,
  }
}
