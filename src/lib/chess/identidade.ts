/**
 * Identidade de uma posição: a chave que responde "estas duas são a mesma?".
 *
 * ONDE ISTO MORA, e por quê: aqui, ao lado de `normalizeFen` e `isValidFen`.
 * Identidade de posição é regra de XADREZ, não de abertura. Ela nasceu em
 * `@/lib/openings` para resolver transposição, e quando os finais precisaram
 * contar repetição a mesma regra passou a ter dois donos — com telas de
 * puzzles e de importação a caminho do terceiro. Quem procura "mesma posição"
 * olha em `@/lib/chess`; não achando aqui, escreve a própria, e aí passam a
 * existir duas regras que divergem na primeira mudança, em silêncio. Ver a
 * issue #74.
 *
 * O PROBLEMA QUE ESTE ARQUIVO RESOLVE. Duas ordens de lances chegam ao mesmo
 * tabuleiro:
 *
 *     1.e4 e5 2.Nf3 Nc6 3.Bc4   →  r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3
 *     1.e4 e5 2.Bc4 Nc6 3.Nf3   →  r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3
 *
 * Aqui os dois FEN completos coincidem por sorte. Não é sempre assim:
 *
 *     1.Nf3 Nf6 2.e4  →  rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2
 *     1.e4 Nf6 2.Nf3  →  rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2
 *
 * Mesmo tabuleiro, mesma vez, mesmos direitos — e FEN diferente, porque o
 * contador de meios-lances desde a última captura ou lance de peão depende do
 * CAMINHO, não da posição. Comparar FEN inteiro partiria este nó em dois, e o
 * sintoma seria mudo: o repertório passaria a ter duas cópias da mesma posição
 * com ideias possivelmente diferentes, e o card de revisão nasceria duplicado.
 *
 * O QUE ENTRA NA IDENTIDADE, e por quê:
 *
 * - **tabuleiro** e **vez**: óbvio.
 * - **direitos de roque**: ENTRAM. `...Ke2 ...Ke7 ...Ke1 ...Ke8` devolve todas
 *   as peças ao lugar e não devolve o direito de rocar. É outra posição, e
 *   fundir as duas prometeria ao aluno um roque que ele não tem mais.
 * - **casa de en passant**: ENTRA. Com `d6` disponível existe um lance legal
 *   que sem ele não existe.
 *
 * O QUE FICA DE FORA: o contador de meios-lances e o número do lance. Nenhum
 * dos dois muda o que se pode JOGAR — e é isso que a chave mede. Vale para os
 * dois consumidores: transposição na abertura, e repetição no final, que pela
 * regra também ignora os contadores.
 *
 * A ARMADILHA DO EN PASSANT, que é onde este código quase errou. O FEN estrito
 * registra a casa de en passant sempre que um peão anda duas casas, MESMO que
 * nenhum peão adversário possa capturar ali. Então isto:
 *
 *     rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
 *     rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -  0 1
 *
 * são a MESMA posição escrita de dois jeitos, e um vem de um PGN importado
 * enquanto o outro vem do nosso próprio gerador. Recortar campos do texto cru
 * trataria as duas como nós diferentes.
 *
 * A defesa é passar pelo `normalizeFen`, que carrega e reserializa a posição
 * pelo `chess.js` — e o `chess.js` 1.4.0 só emite a casa de en passant quando
 * existe captura legal para ela. Confirmado contra a biblioteca instalada, e
 * amarrado por um portão em `tests/unit/chess-identidade.test.ts`, porque é
 * comportamento de terceiro do qual esta função DEPENDE.
 */

import { isValidFen, normalizeFen } from './position'
import { ChessParseError } from './types'

/** Quantos campos do FEN entram na identidade: tabuleiro, vez, roque, en passant. */
const CAMPOS_DE_IDENTIDADE = 4

/**
 * Chave de posição, estável sob transposição.
 *
 * LANÇA para FEN inválido, e não devolve `null`: quem chama já validou (ou
 * deveria) e uma chave silenciosamente errada contaminaria a árvore inteira
 * sem uma linha no console. Use `isValidFen` antes quando a entrada for de fora.
 */
export function identidadeDePosicao(fen: string): string {
  if (!isValidFen(fen)) {
    throw new ChessParseError(`FEN inválido ao calcular identidade de posição: ${fen}`)
  }
  const campos = normalizeFen(fen).split(' ')
  return campos.slice(0, CAMPOS_DE_IDENTIDADE).join(' ')
}

/**
 * FEN jogável a partir de uma identidade.
 *
 * Os contadores voltam como `0 1` porque a identidade não os carrega — e não
 * precisa: nenhuma tela de abertura depende da regra dos 50 lances nem do
 * número do lance. O par existe para o tabuleiro conseguir carregar a posição.
 *
 * Isto é DERIVAÇÃO, não uma segunda fonte: a árvore guarda a identidade e monta
 * o FEN na hora, em vez de guardar os dois e deixá-los divergir.
 */
export function fenJogavelDe(identidade: string): string {
  return `${identidade} 0 1`
}

/** Duas posições são a mesma? Aceita FEN em qualquer forma. */
export function mesmaPosicao(a: string, b: string): boolean {
  return identidadeDePosicao(a) === identidadeDePosicao(b)
}
