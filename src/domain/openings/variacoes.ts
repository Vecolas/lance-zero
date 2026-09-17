/**
 * O QUE UMA VARIAÇÃO ENSINA, E ONDE ELA COMEÇA A ENSINAR.
 *
 * Uma variação só existe por causa de UM lance: aquele em que alguém recusa a
 * linha principal e joga outra coisa. Tudo antes disso é a linha que o aluno
 * acabou de estudar, repetida.
 *
 * ESTE MÓDULO ACHA ESSE LANCE. É a diferença entre a etapa de variações mostrar
 * `e4 e5 Cf3 Cc6 Bc4 Cf6 d3` — sete lances dos quais cinco são reprise — e
 * mostrar a posição depois de Bc4 dizendo "aqui o adversário joga Cf6 no lugar
 * de Bc5, e é daí em diante que a partida muda".
 *
 * O MESMO FATO SERVE AO BOT. `variacaoEmCurso` responde "em qual linha estamos
 * agora?" durante a prática, e é o que permite ao treino dizer o nome do que o
 * aluno está enfrentando — fechando o laço com a etapa que ensinou aquilo.
 * Ensinar a variação e depois fazer o aluno enfrentá-la sem nome seria ensinar
 * duas coisas que ele não tem como ligar.
 *
 * PURO, como todo `src/domain`: sem React, sem relógio, sem armazenamento.
 */

import { applyMove, normalizeUci } from '@/lib/chess'
import type { OpeningDefinition, OpeningMoveLesson, OpeningSide, OpeningVariation } from './index'

/**
 * As posições ao longo de uma linha. Índice 0 é a posição ANTES do primeiro
 * lance, portanto `posicoes[i]` é a posição em que `lances[i]` é jogado.
 *
 * Mora aqui porque duas telas precisavam dela e cada uma tinha a sua cópia.
 */
export function posicoesDaLinha(raiz: string, lances: readonly OpeningMoveLesson[]): string[] {
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

export interface RamificacaoDaVariacao {
  variacao: OpeningVariation
  /**
   * Índice do lance em que a variação recusa a linha principal.
   *
   * `null` quando ela NÃO desvia — o caso do Giuoco Piano, que é um nome para
   * um trecho da própria linha principal. Fingir que esse nome é um desvio
   * ensinaria uma bifurcação que não existe no tabuleiro.
   */
  indiceDaDivergencia: number | null
  /** A posição em que a decisão é tomada — antes do lance que desvia. */
  fenDaDecisao: string
  /** Os lances compartilhados com a linha principal, que o aluno já estudou. */
  lancesEmComum: OpeningMoveLesson[]
  /** O lance da linha principal recusado aqui, quando a variação desvia. */
  lanceRecusado: OpeningMoveLesson | null
  /** De quem é a decisão que cria a variação. */
  ladoQueDesvia: OpeningSide
}

function mesmoLance(a: OpeningMoveLesson | undefined, b: OpeningMoveLesson | undefined): boolean {
  if (!a || !b) return false
  return normalizeUci(a.uci) === normalizeUci(b.uci)
}

/** De quem é a vez nesta posição. */
function ladoDaVez(fen: string): OpeningSide {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/** Onde esta variação deixa de ser a linha principal, e o que ela passa a ensinar. */
export function ramificacaoDaVariacao(
  opening: OpeningDefinition,
  variacao: OpeningVariation,
): RamificacaoDaVariacao {
  const principal = opening.mainline
  const linha = variacao.line

  let divergencia: number | null = null
  for (let i = 0; i < linha.length; i += 1) {
    if (!mesmoLance(linha[i], principal[i])) {
      divergencia = i
      break
    }
  }

  const posicoes = posicoesDaLinha(opening.rootFen, linha)
  const corte = divergencia ?? linha.length
  const fenDaDecisao = posicoes[Math.min(corte, posicoes.length - 1)] ?? opening.rootFen

  return {
    variacao,
    indiceDaDivergencia: divergencia,
    fenDaDecisao,
    lancesEmComum: linha.slice(0, corte),
    lanceRecusado: divergencia === null ? null : (principal[divergencia] ?? null),
    ladoQueDesvia: ladoDaVez(fenDaDecisao),
  }
}

/** Todas as variações da abertura, já com o ponto em que cada uma ramifica. */
export function ramificacoesDaAbertura(opening: OpeningDefinition): RamificacaoDaVariacao[] {
  return opening.variations.map((variacao) => ramificacaoDaVariacao(opening, variacao))
}

/** A sequência jogada até aqui bate com esta linha? */
function compativel(historico: readonly string[], linha: readonly OpeningMoveLesson[]): boolean {
  const ate = Math.min(historico.length, linha.length)
  for (let i = 0; i < ate; i += 1) {
    if (normalizeUci(historico[i] ?? '') !== normalizeUci(linha[i]?.uci ?? '')) return false
  }
  return true
}

/**
 * Em qual variação a partida está, se estiver em alguma.
 *
 * SÓ NOMEIA DEPOIS QUE O LANCE DE DESVIO FOI JOGADO. Antes disso a partida
 * ainda é a linha principal, e anunciar uma variação porque ela "pode vir"
 * ensinaria o nome errado para a posição que está na tela.
 *
 * Devolve `null` quando duas variações continuam compatíveis: nomear uma das
 * duas seria escolher por sorteio e apresentar o resultado como fato.
 */
export function variacaoEmCurso(
  opening: OpeningDefinition,
  historico: readonly string[],
): OpeningVariation | null {
  const candidatas = ramificacoesDaAbertura(opening).filter(
    (ramo) =>
      ramo.indiceDaDivergencia !== null &&
      ramo.indiceDaDivergencia < historico.length &&
      compativel(historico, ramo.variacao.line),
  )

  return candidatas.length === 1 ? (candidatas[0]?.variacao ?? null) : null
}
