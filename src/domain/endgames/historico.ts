/**
 * O HISTÓRICO de uma tentativa de final, na forma que `avaliarObjetivo` precisa.
 *
 * POR QUE EXISTE. Duas das quatro regras de empate do xadrez não cabem num FEN:
 * a repetição precisa saber quais posições já apareceram, e a contagem de lances
 * do aluno precisa saber quem jogou o quê. Antes disto cada tela montava o
 * contexto à mão (`{ ladoDoAluno, lancesDoAluno: 0 }`), e o histórico
 * simplesmente não existia — a repetição nunca era reconhecida e o aluno que
 * segurava o empate como a lição ensina nunca via "cumprido".
 *
 * DECISÃO 1 — UMA PRIMITIVA SÓ. `avancarContexto` é o único lugar do projeto
 * que sabe como um lance muda o contexto. `percorrerTentativa` é uma DOBRA sobre
 * ela, não uma segunda implementação: a tela avança lance a lance porque já tem
 * o FEN na mão, o portão do currículo percorre a linha inteira de uma vez, e as
 * duas contas são literalmente o mesmo código. Duas implementações da mesma
 * conta divergem no dia em que alguém corrige só uma.
 *
 * DECISÃO 2 — `lancesDoAluno` É DERIVADO DA COR DE QUEM JOGOU, e não da paridade
 * do índice. O currículo garante que a posição começa na vez do aluno, mas
 * amarrar a contagem a essa garantia seria depender de um invariante de CONTEÚDO
 * dentro de uma regra de DOMÍNIO. A cor do lance é o dado exato e não custa
 * nada: ela já vem no `LegalMove`.
 *
 * DECISÃO 3 — A IDENTIDADE DA POSIÇÃO NÃO É CALCULADA AQUI. Ela vem de
 * `identidadeDePosicao`, em `@/lib/chess`, que já resolve exatamente este
 * problema (tabuleiro, vez, roque e en passant dentro; contadores fora) e já
 * tem portão próprio. Reescrever a regra aqui seria a segunda fonte da mesma
 * verdade, e a cópia erraria no en passant — que é onde a original quase errou.
 */

import {
  applyMove,
  identidadeDePosicao,
  normalizeUci,
  parseUci,
  type PieceColor,
} from '@/lib/chess'
import type { Side } from '@/domain/types'
import type { ContextoObjetivo } from './objetivo'

/** Contexto de uma tentativa que ainda não teve lance nenhum. */
export function contextoInicial(ladoDoAluno: Side): ContextoObjetivo {
  return { ladoDoAluno, lancesDoAluno: 0, identidadesAnteriores: [] }
}

/**
 * O contexto depois de UM lance.
 *
 * `fenAntes` é a posição em que o lance foi jogado — é ELA que entra na lista de
 * posições anteriores. Passar o FEN de depois adiantaria a lista em um lance e a
 * terceira ocorrência sairia um lance cedo demais, que é o defeito de sinal
 * trocado ao contrário: dar o empate por cumprido antes de ele existir.
 */
export function avancarContexto(
  contexto: ContextoObjetivo,
  fenAntes: string,
  corDoLance: PieceColor,
): ContextoObjetivo {
  return {
    ladoDoAluno: contexto.ladoDoAluno,
    lancesDoAluno: contexto.lancesDoAluno + (corDoLance === contexto.ladoDoAluno ? 1 : 0),
    identidadesAnteriores: [...contexto.identidadesAnteriores, identidadeDePosicao(fenAntes)],
  }
}

export interface EntradaDaTentativa {
  /** Posição em que a tentativa começou. */
  fenInicial: string
  ladoDoAluno: Side
  /** UCIs jogados desde `fenInicial`, dos DOIS lados, na ordem. */
  lancesJogados: readonly string[]
}

export interface TentativaPercorrida {
  /** Posição atual, depois do último lance de `lancesJogados`. */
  fen: string
  contexto: ContextoObjetivo
}

/**
 * Percorre uma tentativa inteira e devolve onde ela está.
 *
 * LANÇA no primeiro lance ilegal, e não devolve erro como valor: a lista de
 * lances de uma tentativa vem do próprio app, que só a alimenta com lances que
 * ele mesmo aplicou. Lance ilegal aqui é bug nosso, e um contexto "quase certo"
 * produziria um veredito plausível e errado — exatamente o que não pode
 * acontecer em silêncio.
 *
 * Quem precisa de erro como valor (o portão do currículo, que quer listar TODAS
 * as linhas quebradas) usa `reproduzirLinhaModelo`, que avança o contexto pela
 * mesma primitiva.
 */
export function percorrerTentativa(entrada: EntradaDaTentativa): TentativaPercorrida {
  let fen = entrada.fenInicial
  let contexto = contextoInicial(entrada.ladoDoAluno)
  for (const [indice, uci] of entrada.lancesJogados.entries()) {
    // Parseia o UCI explicitamente em vez de entregar a string ao adapter: o
    // `chess.js` aceitaria a string pelo caminho tolerante do parser de SAN, e
    // aí um lance com forma errada viraria outro lance em silêncio.
    const lance = parseUci(normalizeUci(uci))
    const aplicado = lance === null ? null : applyMove(fen, lance)
    if (aplicado === null) {
      throw new Error(`Lance ${indice + 1} (${uci}) é ilegal em ${fen}`)
    }
    contexto = avancarContexto(contexto, fen, aplicado.move.color)
    fen = aplicado.fenAfter
  }
  return { fen, contexto }
}
