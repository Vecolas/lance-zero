import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { identidadeDePosicao } from '@/lib/chess'
import { construirIndiceEco } from '@/lib/openings'
import {
  construirRepertorio,
  frequenciaDeAberturas,
  frequenciaDoRepertorio,
} from '@/domain/repertoire'
import { INDICE_ECO, REPERTORIO_BRANCAS } from '@/content/openings'
import type { Game } from '@/domain/types'

/**
 * Portão da frequência calculada a partir das partidas importadas.
 *
 * O QUE ELE PROVA: que a contagem sai das partidas passadas por parâmetro, que
 * nada some em silêncio (partida do outro lado, PGN ilegível e data ilegível têm
 * cada uma o seu contador), que "o adversário saiu do livro" e "eu saí do livro"
 * são coisas separadas, e que a partida mais recente é escolhida por INSTANTE e
 * não por ordem de texto.
 *
 * O QUE ELE NÃO PROVA: nada sobre desempenho com milhares de partidas, e nada
 * sobre a qualidade do repertório — frequência é medida, não julgamento.
 */

const arvore = construirRepertorio(REPERTORIO_BRANCAS)
const indice = INDICE_ECO

function jogo(sans: readonly string[]): Chess {
  const chess = new Chess()
  for (const san of sans) {
    chess.move(san)
  }
  return chess
}

function pgnDe(sans: readonly string[]): string {
  return jogo(sans).pgn()
}

function fenDe(sans: readonly string[]): string {
  return jogo(sans).fen()
}

function partida(
  id: string,
  sans: readonly string[],
  userColor: 'w' | 'b' = 'w',
  playedAt = '2026-01-01T12:00:00Z',
): Game {
  return {
    id,
    source: 'pgn',
    pgn: pgnDe(sans),
    playedAt,
    white: 'aluno',
    black: 'adversario',
    userColor,
    result: '*',
    importedAt: '2026-01-05T00:00:00Z',
  }
}

const ITALIANA = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O']

describe('frequência do repertório', () => {
  it('conta os ramos percorridos pelas partidas', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', ITALIANA),
      partida('b', ITALIANA),
      partida('c', ['e4', 'e5', 'Nf3', 'd6', 'd4']),
    ])

    expect(resultado.partidasConsideradas).toBe(3)
    const raiz = resultado.ramos.find((r) => r.origem === arvore.raiz && r.san === 'e4')
    expect(raiz?.partidas).toBe(3)
    expect(raiz?.doUsuario).toBe(true)
    expect([...(raiz?.gameIds ?? [])].sort()).toEqual(['a', 'b', 'c'])

    const bispo = resultado.ramos.find((r) => r.san === 'Bc4')
    expect(bispo?.partidas).toBe(2)
  })

  it('a ordem é a mais frequente primeiro e é determinística', () => {
    const partidas = [partida('a', ITALIANA), partida('b', ITALIANA), partida('c', ['e4', 'e5'])]
    const uma = frequenciaDoRepertorio(arvore, partidas).ramos.map((r) => `${r.san}@${r.partidas}`)
    const outra = frequenciaDoRepertorio(arvore, [...partidas]).ramos.map(
      (r) => `${r.san}@${r.partidas}`,
    )
    expect(uma).toEqual(outra)
    const contagens = uma.map((t) => Number(t.split('@')[1]))
    expect([...contagens].sort((x, y) => y - x)).toEqual(contagens)
  })

  /**
   * A entrega de produto: o que o adversário joga e o repertório não cobre.
   * O repertório inicial responde só a 1...e5, de propósito — a Siciliana tem
   * de aparecer aqui, ordenada por quantas vezes apareceu de verdade.
   */
  it('lacuna é o lance do ADVERSÁRIO que o repertório não cobre', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', ['e4', 'c5', 'Nf3']),
      partida('b', ['e4', 'c5', 'd4']),
      partida('c', ['e4', 'e6', 'd4']),
    ])

    expect(resultado.lacunas.map((l) => l.san)).toEqual(['c5', 'e6'])
    expect(resultado.lacunas[0].partidas).toBe(2)
    expect(resultado.lacunas[0].origem).toBe(identidadeDePosicao(fenDe(['e4'])))
    expect(resultado.desvios).toEqual([])
  })

  it('desvio é o USUÁRIO jogando fora do próprio repertório', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', ['d4', 'd5', 'c4']),
      partida('b', ['e4', 'e5', 'Bc4']),
    ])

    expect(resultado.desvios.map((d) => d.san).sort()).toEqual(['Bc4', 'd4'])
    expect(resultado.lacunas).toEqual([])
  })

  it('as duas saídas são separadas porque pedem ações opostas do aluno', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', ['e4', 'c5']),
      partida('b', ['d4']),
    ])
    expect(resultado.lacunas).toHaveLength(1)
    expect(resultado.desvios).toHaveLength(1)
  })

  it('chegar ao fim do livro não é sair dele', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', [...ITALIANA, 'a6', 'Nc3', 'h6']),
    ])
    expect(resultado.lacunas).toEqual([])
    expect(resultado.desvios).toEqual([])
    expect(resultado.partidasNoLivro).toBe(1)
  })

  it('partida do outro lado não entra na conta e não some em silêncio', () => {
    const resultado = frequenciaDoRepertorio(arvore, [
      partida('a', ITALIANA, 'w'),
      partida('b', ITALIANA, 'b'),
    ])
    expect(resultado.partidasRecebidas).toBe(2)
    expect(resultado.partidasDeOutroLado).toBe(1)
    expect(resultado.partidasConsideradas).toBe(1)
  })

  it('PGN ilegível é contado, não descartado', () => {
    const quebrada: Game = { ...partida('x', ['e4']), pgn: 'isto não é um PGN de verdade' }
    const resultado = frequenciaDoRepertorio(arvore, [partida('a', ITALIANA), quebrada])
    expect(resultado.partidasIlegiveis).toBe(1)
    expect(resultado.partidasConsideradas).toBe(1)
    expect(resultado.partidasRecebidas).toBe(2)
  })

  it('sem partidas, tudo é zero e nada é afirmado', () => {
    const resultado = frequenciaDoRepertorio(arvore, [])
    expect(resultado.partidasRecebidas).toBe(0)
    expect(resultado.partidasConsideradas).toBe(0)
    expect(resultado.ramos).toEqual([])
    expect(resultado.lacunas).toEqual([])
    expect(resultado.desvios).toEqual([])
  })

  /**
   * A DATA MAIS RECENTE É POR INSTANTE, NUNCA POR TEXTO.
   *
   * As duas datas abaixo estão em ordem INVERSA quando comparadas como string:
   * `2026-01-02T00:30:00Z` é maior que `2026-01-01T23:00:00-03:00` no
   * alfabeto, e menor no relógio (a segunda é 02:00Z do dia 2). Trocar
   * `instanteDe` por uma comparação de texto faz este teste reprovar — e sem
   * ele o defeito seria mudo: a tela mostraria a partida errada como "a mais
   * recente" sem erro nenhum no caminho.
   */
  it('a partida mais recente é escolhida por instante, não por ordem alfabética', () => {
    const cedo = partida('cedo', ITALIANA, 'w', '2026-01-02T00:30:00Z')
    const tarde = partida('tarde', ITALIANA, 'w', '2026-01-01T23:00:00-03:00')
    expect(cedo.playedAt > tarde.playedAt).toBe(true)

    const resultado = frequenciaDoRepertorio(arvore, [cedo, tarde])
    const raiz = resultado.ramos.find((r) => r.san === 'e4')
    expect(raiz?.ultimaEm).toBe(tarde.playedAt)
  })

  it('data ilegível não derruba a partida da contagem, só não concorre a ultimaEm', () => {
    const semData = partida('sem-data', ITALIANA, 'w', 'ontem à noite')
    const comData = partida('com-data', ITALIANA, 'w', '2026-01-03T10:00:00Z')
    const resultado = frequenciaDoRepertorio(arvore, [semData, comData])
    const raiz = resultado.ramos.find((r) => r.san === 'e4')
    expect(raiz?.partidas).toBe(2)
    expect(raiz?.ultimaEm).toBe('2026-01-03T10:00:00Z')
  })

  it('quando nenhuma data é legível, ultimaEm é null em vez de uma data inventada', () => {
    const resultado = frequenciaDoRepertorio(arvore, [partida('a', ITALIANA, 'w', 'sei lá')])
    expect(resultado.ramos.find((r) => r.san === 'e4')?.ultimaEm).toBeNull()
  })
})

describe('frequência por abertura', () => {
  it('conta as aberturas que o usuário realmente alcança, dos dois lados', () => {
    const resultado = frequenciaDeAberturas(
      [
        partida('a', ITALIANA, 'w'),
        partida('b', ITALIANA, 'b'),
        partida('c', ['e4', 'c5', 'Nf3'], 'w'),
      ],
      indice,
    )

    const italiana = resultado.aberturas.find((a) => a.abertura.nome.startsWith('Italian Game'))
    expect(italiana?.partidas).toBe(2)
    expect(italiana?.comoBrancas).toBe(1)
    expect(italiana?.comoPretas).toBe(1)

    const siciliana = resultado.aberturas.find((a) => a.abertura.nome === 'Sicilian Defense')
    expect(siciliana?.partidas).toBe(1)
    expect(siciliana?.abertura.nomePt).toBe('Defesa Siciliana')
  })

  it('a abertura contada é a mais profunda reconhecida na partida', () => {
    const resultado = frequenciaDeAberturas([partida('a', ITALIANA)], indice)
    expect(resultado.aberturas).toHaveLength(1)
    expect(resultado.aberturas[0].abertura.nome).toBe('Italian Game: Giuoco Pianissimo')
  })

  it('partida sem abertura conhecida é contada à parte, não somada a outra', () => {
    const resultado = frequenciaDeAberturas([partida('a', ['a3', 'h6'])], indice)
    expect(resultado.partidasSemAbertura).toBe(1)
    expect(resultado.aberturas).toEqual([])
  })

  it('PGN ilegível tem contador próprio', () => {
    const quebrada: Game = { ...partida('x', ['e4']), pgn: '???' }
    const resultado = frequenciaDeAberturas([quebrada], indice)
    expect(resultado.partidasIlegiveis).toBe(1)
    expect(resultado.partidasRecebidas).toBe(1)
  })

  it('índice vazio não reconhece nada — e diz isso em vez de aprovar', () => {
    const resultado = frequenciaDeAberturas([partida('a', ITALIANA)], construirIndiceEco([]))
    expect(resultado.aberturas).toEqual([])
    expect(resultado.partidasSemAbertura).toBe(1)
  })
})
