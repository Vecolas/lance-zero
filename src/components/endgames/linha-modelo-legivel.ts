/**
 * Linha modelo em forma legível para a tela.
 *
 * DECISÃO: quem joga cada lance é DERIVADO do tabuleiro (de quem tem a vez no
 * FEN daquele momento), e não da paridade do índice. A regra "o aluno joga nos
 * índices pares" já existe em `@/domain/endgames/linha-modelo`; reescrevê-la
 * aqui criaria a segunda fonte da mesma verdade, e a que estaria errada seria
 * justamente a que o aluno lê.
 *
 * Pelo mesmo motivo os FENs saem de `reproduzirLinhaModelo`: se esta tela
 * andasse a linha com código próprio, ela poderia mostrar uma linha que o
 * portão do currículo nunca conferiu.
 *
 * Quando a reprodução acusa lance ilegal — o que o portão do currículo impede
 * de existir —, o erro é DEVOLVIDO e a tela o mostra. Esconder devolvendo a
 * linha pela metade seria transformar conteúdo quebrado em conteúdo pobre.
 */

import { reproduzirLinhaModelo, type PosicaoDeFinal } from '@/domain/endgames'
import { normalizeUci, parseUci } from '@/domain/puzzles/parser'
import { applyMove, positionStatus } from '@/lib/chess'

export interface LanceDaLinha {
  /** 1 para o primeiro meio-lance. */
  ordem: number
  uci: string
  /** Notação curta, quando o lance pôde ser aplicado. */
  san: string
  doAluno: boolean
}

export interface LinhaLegivel {
  lances: LanceDaLinha[]
  /** Descrição do primeiro lance ilegal, ou `null`. */
  erro: string | null
}

export function descreverLinhaModelo(posicao: PosicaoDeFinal): LinhaLegivel {
  const reproducao = reproduzirLinhaModelo(posicao)
  const lances: LanceDaLinha[] = []

  // `fens` tem um item a mais que os lances reproduzidos com sucesso: o inicial.
  for (let indice = 0; indice < reproducao.fens.length - 1; indice += 1) {
    const fenAntes = reproducao.fens[indice]
    const uci = normalizeUci(posicao.linhaModelo[indice])
    const entrada = parseUci(uci)
    const aplicado = entrada === null ? null : applyMove(fenAntes, entrada)
    lances.push({
      ordem: indice + 1,
      uci,
      san: aplicado?.move.san ?? uci,
      doAluno: positionStatus(fenAntes).turn === posicao.ladoDoAluno,
    })
  }

  return { lances, erro: reproducao.erro }
}
