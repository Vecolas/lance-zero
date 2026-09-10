import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
  ChessParseError,
  fenJogavelDe,
  identidadeDePosicao,
  mesmaPosicao,
  START_FEN,
} from '@/lib/chess'

/**
 * Portão da identidade de posição — a chave da transposição.
 *
 * O QUE ESTE ARQUIVO PROVA: que dois caminhos diferentes até o mesmo tabuleiro
 * dão a MESMA chave, e que duas posições genuinamente diferentes dão chaves
 * diferentes. As duas metades são obrigatórias: uma função que devolvesse
 * sempre a mesma string passaria na primeira metade sozinha.
 *
 * O QUE ELE NÃO PROVA: nada sobre desempenho, e nada sobre posições de xadrez
 * 960 (o projeto é só xadrez clássico).
 */

function fenDe(lancesSan: readonly string[]): string {
  const chess = new Chess()
  for (const san of lancesSan) {
    chess.move(san)
  }
  return chess.fen()
}

describe('identidade de posição', () => {
  it('duas ordens de lances que chegam à mesma posição têm a mesma identidade', () => {
    const italiana = fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    const peloBispo = fenDe(['e4', 'e5', 'Bc4', 'Nc6', 'Nf3'])
    expect(identidadeDePosicao(italiana)).toBe(identidadeDePosicao(peloBispo))
  })

  /**
   * O caso que quebraria uma comparação de FEN inteiro.
   *
   * Aqui os dois FEN completos DIFEREM — o contador de meios-lances depende do
   * caminho, não da posição — e mesmo assim é o mesmo tabuleiro. Sem este teste,
   * a decisão de tirar os contadores da chave não teria prova nenhuma.
   */
  it('ignora os contadores, que dependem do caminho e não da posição', () => {
    const a = fenDe(['Nf3', 'Nf6', 'e4'])
    const b = fenDe(['e4', 'Nf6', 'Nf3'])
    expect(a).not.toBe(b)
    expect(identidadeDePosicao(a)).toBe(identidadeDePosicao(b))
  })

  it('a vez entra na identidade', () => {
    const brancasJogam = 'k7/8/8/8/8/8/8/K7 w - - 0 1'
    const pretasJogam = 'k7/8/8/8/8/8/8/K7 b - - 0 1'
    expect(identidadeDePosicao(brancasJogam)).not.toBe(identidadeDePosicao(pretasJogam))
  })

  /**
   * Roque entra na identidade — e o caso é real, não construído.
   *
   * Depois de Ke2/Ke7/Ke1/Ke8 todas as peças voltam ao lugar e os direitos de
   * roque NÃO voltam. Fundir as duas posições prometeria ao aluno um roque que
   * ele não tem mais.
   */
  it('o direito de roque entra na identidade', () => {
    const direto = fenDe(['e4', 'e5'])
    const comReiPasseando = fenDe(['e4', 'e5', 'Ke2', 'Ke7', 'Ke1', 'Ke8'])
    expect(direto.split(' ')[0]).toBe(comReiPasseando.split(' ')[0])
    expect(identidadeDePosicao(direto)).not.toBe(identidadeDePosicao(comReiPasseando))
  })

  it('a casa de en passant entra na identidade quando a captura existe', () => {
    const comEnPassant = fenDe(['e4', 'c5', 'e5', 'd5'])
    const semEnPassant = comEnPassant.replace(' d6 ', ' - ')
    expect(comEnPassant).toContain(' d6 ')
    expect(identidadeDePosicao(comEnPassant)).not.toBe(identidadeDePosicao(semEnPassant))
  })

  /**
   * A ARMADILHA. O FEN estrito registra a casa de en passant sempre que um peão
   * anda duas casas, mesmo sem captura possível. Os dois textos abaixo são a
   * mesma posição, e um deles vem de PGN importado.
   *
   * Este teste também amarra uma dependência de TERCEIRO: a defesa é o
   * `normalizeFen`, que delega ao `chess.js`. Se uma versão futura passar a
   * preservar a casa inútil, é aqui que se descobre — e não numa árvore de
   * repertório com dois nós idênticos.
   */
  it('en passant sem captura possível não separa a posição', () => {
    const comCasaInutil = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const semCasa = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect(mesmaPosicao(comCasaInutil, semCasa)).toBe(true)
  })

  it('espaçamento e contadores diferentes não mudam a identidade', () => {
    expect(identidadeDePosicao(START_FEN)).toBe(
      identidadeDePosicao('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 9 42'),
    )
  })

  it('FEN inválido lança em vez de devolver chave errada', () => {
    expect(() => identidadeDePosicao('isto não é um FEN')).toThrow(ChessParseError)
  })

  it('a identidade tem exatamente quatro campos', () => {
    expect(identidadeDePosicao(START_FEN).split(' ')).toHaveLength(4)
  })
})

describe('FEN jogável a partir da identidade', () => {
  it('volta a ser carregável e descreve a mesma posição', () => {
    const italiana = fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    const reconstruido = fenJogavelDe(identidadeDePosicao(italiana))
    expect(() => new Chess(reconstruido)).not.toThrow()
    expect(mesmaPosicao(reconstruido, italiana)).toBe(true)
  })

  it('a ida e volta é estável: identidade do FEN jogável é a própria identidade', () => {
    const identidade = identidadeDePosicao(fenDe(['d4', 'd5', 'c4']))
    expect(identidadeDePosicao(fenJogavelDe(identidade))).toBe(identidade)
  })
})
