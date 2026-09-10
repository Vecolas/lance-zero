import { describe, expect, it } from 'vitest'
import { ChessParseError, identidadeDePosicao } from '@/lib/chess'
import {
  aberturaDaLinha,
  aberturaDaPosicao,
  construirIndiceEco,
  ehCodigoEco,
  identidadeDaEntrada,
  lancesDaEntrada,
  type EntradaEco,
} from '@/lib/openings'
import { FIXTURE_ECO, INDICE_ECO } from '@/content/openings'

/**
 * Portão da fixture de aberturas e do índice ECO.
 *
 * Varre a FONTE — `FIXTURE_ECO` inteira, nunca uma lista escrita à mão aqui.
 * Entrada nova que alguém acrescente sem legalidade, sem código ECO válido ou
 * com posição repetida reprova sem ninguém precisar lembrar de atualizar o
 * teste.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que os nomes conferem com o
 * `lichess-org/chess-openings`. Eles foram copiados verbatim da origem e
 * conferidos à mão em 2026-09-09, e nada aqui revalida isso — revalidar exigiria
 * baixar o dump, que é justamente o que a fixture existe para evitar. Também não
 * prova que a tradução em `nomePt` está correta; prova apenas que ela existe e
 * não é uma cópia do inglês.
 */

const identidades = FIXTURE_ECO.map((entrada) => identidadeDaEntrada(entrada))
const indice = INDICE_ECO

describe('fixture de aberturas', () => {
  // Regra 3 dos portões: varredura que não varreu nada não é aprovação.
  it('a varredura encontrou entradas', () => {
    expect(FIXTURE_ECO.length).toBeGreaterThan(20)
  })

  it('todo código ECO tem a forma da origem', () => {
    const fora = FIXTURE_ECO.filter((e) => !ehCodigoEco(e.eco)).map((e) => `${e.eco} ${e.nome}`)
    expect(fora).toEqual([])
  })

  it('toda entrada tem nome e pelo menos um lance', () => {
    const quebradas = FIXTURE_ECO.filter(
      (e) => e.nome.trim().length === 0 || lancesDaEntrada(e.pgn).length === 0,
    ).map((e) => `${e.eco} "${e.nome}" — ${e.pgn}`)
    expect(quebradas).toEqual([])
  })

  it('todo pgn é uma sequência legal a partir da posição inicial', () => {
    const ilegais: string[] = []
    for (const entrada of FIXTURE_ECO) {
      try {
        identidadeDaEntrada(entrada)
      } catch (erro) {
        ilegais.push(`${entrada.eco} ${entrada.nome}: ${(erro as Error).message}`)
      }
    }
    expect(ilegais).toEqual([])
  })

  /**
   * Posição repetida é o defeito que passaria despercebido: as duas entradas
   * carregariam nomes diferentes para o mesmo tabuleiro, e qual delas venceria
   * dependeria da ordem do arquivo.
   */
  it('nenhuma posição aparece duas vezes', () => {
    const vistas = new Map<string, string>()
    const repetidas: string[] = []
    FIXTURE_ECO.forEach((entrada, i) => {
      const anterior = vistas.get(identidades[i])
      if (anterior) {
        repetidas.push(`${entrada.eco} ${entrada.nome} repete a posição de ${anterior}`)
      }
      vistas.set(identidades[i], `${entrada.eco} ${entrada.nome}`)
    })
    expect(repetidas).toEqual([])
  })

  it('nomePt, quando existe, é texto próprio e não uma cópia do inglês', () => {
    const suspeitas = FIXTURE_ECO.filter(
      (e) => e.nomePt !== undefined && (e.nomePt.trim().length === 0 || e.nomePt === e.nome),
    ).map((e) => `${e.eco} ${e.nome}`)
    expect(suspeitas).toEqual([])
  })

  it('há entradas traduzidas e entradas sem tradução — o campo é opcional de verdade', () => {
    expect(FIXTURE_ECO.some((e) => e.nomePt !== undefined)).toBe(true)
    expect(FIXTURE_ECO.some((e) => e.nomePt === undefined)).toBe(true)
  })
})

describe('índice ECO', () => {
  it('o índice tem uma posição por entrada', () => {
    expect(indice.tamanho).toBe(FIXTURE_ECO.length)
  })

  it('reconhece a posição exata', () => {
    const italiana = aberturaDaPosicao(
      indice,
      'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    )
    expect(italiana).toEqual({ eco: 'C50', nome: 'Italian Game', nomePt: 'Abertura Italiana' })
  })

  it('devolve null para posição que não está no índice', () => {
    expect(aberturaDaPosicao(indice, '8/8/8/4k3/8/8/4K3/8 w - - 0 1')).toBeNull()
  })

  /**
   * O TESTE QUE JUSTIFICA O ÍNDICE SER POR POSIÇÃO.
   *
   * `1.e4 e5 2.Bc4 Nc6 3.Nf3` NÃO existe como linha no `chess-openings` nem
   * nesta fixture — a primeira asserção prova isso lendo a própria fixture, para
   * o teste não passar por acidente. Mesmo assim a linha é reconhecida como
   * Italiana, porque chega à mesma posição. Um índice por texto de PGN diria
   * "abertura desconhecida" para uma das aberturas mais jogadas do mundo, e
   * diria calado.
   */
  it('reconhece a abertura por transposição, não por texto de lances', () => {
    const ordemAlternativa = ['e4', 'e5', 'Bc4', 'Nc6', 'Nf3']
    const comoTexto = '1. e4 e5 2. Bc4 Nc6 3. Nf3'
    expect(FIXTURE_ECO.some((e) => e.pgn === comoTexto)).toBe(false)

    const reconhecida = aberturaDaLinha(indice, ordemAlternativa)
    expect(reconhecida?.abertura.nome).toBe('Italian Game')
    expect(reconhecida?.profundidade).toBe(5)
  })

  it('a abertura de uma linha é a MAIS PROFUNDA reconhecida, não a primeira', () => {
    const linha = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3']
    const reconhecida = aberturaDaLinha(indice, linha)
    expect(reconhecida?.abertura.nome).toBe('Italian Game: Giuoco Pianissimo')
    expect(reconhecida?.profundidade).toBe(7)
  })

  it('linha sem nenhuma abertura conhecida devolve null', () => {
    expect(aberturaDaLinha(indice, ['a3', 'h6', 'a4'])).toBeNull()
  })

  /**
   * Partida com PGN torto não pode derrubar a contagem das outras: a busca
   * devolve o que reconheceu até o lance ilegal, em vez de lançar.
   */
  it('lance ilegal interrompe a busca e devolve o que já se reconheceu', () => {
    const reconhecida = aberturaDaLinha(indice, ['e4', 'e5', 'Nf3', 'Qz9'])
    expect(reconhecida?.abertura.nome).toBe("King's Knight Opening")
  })
})

/**
 * Canários: o portão alimentado com o que DEVE reprovar.
 *
 * Sem esta seção, o arquivo inteiro seria um carimbo — só viu a fixture boa
 * passando e nunca viu nada falhar.
 */
describe('o portão morde', () => {
  const boa: EntradaEco = { eco: 'C50', nome: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' }

  it('o caso de controle passa', () => {
    expect(() => construirIndiceEco([boa])).not.toThrow()
    expect(ehCodigoEco(boa.eco)).toBe(true)
  })

  it('pgn com lance ilegal lança em vez de virar abertura sem nome', () => {
    expect(() => identidadeDaEntrada({ ...boa, pgn: '1. e4 e5 2. Nf3 Nf3' })).toThrow(
      ChessParseError,
    )
  })

  it('pgn sem lance nenhum lança', () => {
    expect(() => identidadeDaEntrada({ ...boa, pgn: '  ' })).toThrow(ChessParseError)
  })

  it('código ECO fora do formato é recusado', () => {
    expect(ehCodigoEco('F12')).toBe(false)
    expect(ehCodigoEco('c50')).toBe(false)
    expect(ehCodigoEco('C5')).toBe(false)
    expect(ehCodigoEco('C500')).toBe(false)
  })

  it('índice vazio não reconhece nada — ausência de dado não vira aprovação', () => {
    const vazio = construirIndiceEco([])
    expect(vazio.tamanho).toBe(0)
    expect(aberturaDaLinha(vazio, ['e4', 'e5'])).toBeNull()
  })

  it('a numeração do pgn é descartada e só os lances sobram', () => {
    expect(lancesDaEntrada('1. e4 e5 2. Nf3')).toEqual(['e4', 'e5', 'Nf3'])
    expect(lancesDaEntrada('1... e5')).toEqual(['e5'])
  })

  it('duas entradas para a mesma posição colapsam — por isso o portão acima existe', () => {
    const duplicada = construirIndiceEco([boa, { ...boa, nome: 'Outro nome' }])
    expect(duplicada.tamanho).toBe(1)
    expect(duplicada.porPosicao.get(identidadeDaEntrada(boa))?.nome).toBe('Outro nome')
  })

  it('a identidade usada pelo índice é a mesma função da chave de transposição', () => {
    expect(identidadeDaEntrada(boa)).toBe(
      identidadeDePosicao('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'),
    )
  })
})
