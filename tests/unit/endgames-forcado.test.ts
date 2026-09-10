/**
 * Portão da ligação entre resultado teórico e objetivo declarado
 * (`src/domain/endgames/forcado.ts`).
 *
 * Duas coisas são provadas aqui, e nenhuma delas toca a rede:
 *
 * 1. O FATO DE XADREZ em que a regra da promoção se apoia: com REI E UM PEÃO
 *    contra REI SOZINHO o mate é impossível. Isso é varrido EXAUSTIVAMENTE, e
 *    não afirmado num comentário — se fosse afirmado num comentário, ninguém
 *    saberia no dia em que estivesse errado. Junto vem o contra-exemplo com
 *    DOIS peões, que é o que segura a regra estreita no lugar: quem tentar
 *    alargá-la para "peões não dão mate" reprova aqui.
 *
 * 2. A TABELA DE DECISÃO: cada motivo de `MOTIVOS_DA_PROVA` tem um caso, e a
 *    varredura no fim exige que TODOS tenham sido exercitados. Motivo novo sem
 *    caso reprova — lista escrita à mão nunca acusaria o que nunca entrou nela.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: que o currículo real passa. Isso depende da
 * tablebase de verdade e mora em `tests/contrato/objetivos-forcados.test.ts`,
 * fora do CI.
 */

import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_DA_PROVA,
  VEREDITOS_DA_PROVA,
  provarObjetivoPelaTablebase,
  vitoriaExigePromocao,
  type MotivoDaProva,
  type ObjetivoFinal,
} from '@/domain/endgames'
import { normalizeFen, posicaoEhJogavel, positionStatus } from '@/lib/chess'
import type { CategoriaTablebase, ResultadoTeorico, Side, TablebaseResult } from '@/domain/types'

// ------------------------------------------------------------------ fixtures

/** Rei e peão contra rei, brancas a jogar. Vitória teórica conhecida. */
const REI_E_PEAO = '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1'
/** A mesma posição com as PRETAS a jogar: serve para o espelho do ponto de vista. */
const REI_E_PEAO_PRETAS = '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1'
/** Peão de torre com o rei preto no canto: empate teórico, pretas a jogar. */
const PEAO_DE_TORRE = 'k7/8/K7/P7/8/8/8/8 b - - 0 1'
/** Lucena: torre e peão contra torre. A torre dá mate sem promover. */
const LUCENA = '2K5/2P1k3/8/8/8/8/r7/3R4 w - - 0 1'
/** Mate de dama em 1. */
const DAMA_MATE_EM_1 = '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1'
/**
 * Rei e DOIS peões contra rei, e é mate. O contra-exemplo que mantém a regra
 * da promoção restrita a um peão só.
 */
const MATE_COM_DOIS_PEOES = '7k/6PP/6K1/8/8/8/8/8 b - - 0 1'

const PROMOCAO: ObjetivoFinal = { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 }
const EMPATE: ObjetivoFinal = { tipo: 'empate-defendido' }

/** Categoria crua coerente com o resultado, para a resposta falsa não mentir. */
const CATEGORIA_POR_RESULTADO = {
  vitoria: 'win',
  empate: 'draw',
  derrota: 'loss',
  desconhecido: 'unknown',
} as const satisfies Record<ResultadoTeorico | 'desconhecido', CategoriaTablebase>

/**
 * Monta uma resposta de tablebase à mão.
 *
 * `categoria` e `resultado` andam juntos aqui porque quem os liga em produção é
 * o adapter, e a fidelidade desse mapeamento é assunto dos testes DELE. O que
 * este arquivo mede é a decisão tomada A PARTIR do resultado.
 */
function resposta(
  fen: string,
  campos: { resultado: ResultadoTeorico | null; dtm?: number | null },
): TablebaseResult {
  return {
    fen: normalizeFen(fen),
    categoria: CATEGORIA_POR_RESULTADO[campos.resultado ?? 'desconhecido'],
    resultado: campos.resultado,
    dtz: null,
    dtm: campos.dtm ?? null,
    xequeMate: false,
    afogamento: false,
    lances: [],
    doCache: false,
  }
}

// ------------------------------------------- o fato de xadrez sob a regra

const COLUNAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

function casa(coluna: number, linha: number): string {
  return `${COLUNAS[coluna]}${linha}`
}

/** Monta o FEN de um punhado de peças avulsas. */
function fenDe(pecas: ReadonlyMap<string, string>, vez: Side): string {
  const linhas: string[] = []
  for (let linha = 8; linha >= 1; linha -= 1) {
    let texto = ''
    let vazias = 0
    for (let coluna = 0; coluna < 8; coluna += 1) {
      const peca = pecas.get(casa(coluna, linha))
      if (peca === undefined) {
        vazias += 1
        continue
      }
      if (vazias > 0) {
        texto += String(vazias)
        vazias = 0
      }
      texto += peca
    }
    if (vazias > 0) {
      texto += String(vazias)
    }
    linhas.push(texto)
  }
  return `${linhas.join('/')} ${vez} - - 0 1`
}

interface PosicaoCandidata {
  fen: string
  /** Casa do peão, usada para conferir que a varredura cobriu o tabuleiro. */
  casaPeao: string
}

/**
 * Todas as posições de rei-e-peão contra rei em que o PEÃO DÁ XEQUE.
 *
 * São as ÚNICAS candidatas a mate nesse material: o rei nunca dá xeque, não há
 * peça de longo alcance para xeque descoberto, e mate exige xeque. Enumerar só
 * elas é completo, e é o que torna a varredura barata o bastante para rodar em
 * teste unitário.
 */
function candidatasAMate(corDoPeao: Side): PosicaoCandidata[] {
  const candidatas: PosicaoCandidata[] = []
  const avanco = corDoPeao === 'w' ? 1 : -1
  const defensor = corDoPeao === 'w' ? 'b' : 'w'
  const simbolo = {
    peao: corDoPeao === 'w' ? 'P' : 'p',
    reiAtacante: corDoPeao === 'w' ? 'K' : 'k',
    reiDefensor: corDoPeao === 'w' ? 'k' : 'K',
  }

  for (let colunaPeao = 0; colunaPeao < 8; colunaPeao += 1) {
    for (let linhaPeao = 2; linhaPeao <= 7; linhaPeao += 1) {
      const casaPeao = casa(colunaPeao, linhaPeao)
      for (const desvio of [-1, 1]) {
        const colunaRei = colunaPeao + desvio
        const linhaRei = linhaPeao + avanco
        if (colunaRei < 0 || colunaRei > 7 || linhaRei < 1 || linhaRei > 8) {
          continue
        }
        const casaReiDefensor = casa(colunaRei, linhaRei)
        for (let coluna = 0; coluna < 8; coluna += 1) {
          for (let linha = 1; linha <= 8; linha += 1) {
            const casaReiAtacante = casa(coluna, linha)
            if (casaReiAtacante === casaPeao || casaReiAtacante === casaReiDefensor) {
              continue
            }
            const pecas = new Map<string, string>([
              [casaPeao, simbolo.peao],
              [casaReiDefensor, simbolo.reiDefensor],
              [casaReiAtacante, simbolo.reiAtacante],
            ])
            // A vez é de quem está em xeque: é a posição em que o mate apareceria.
            candidatas.push({ fen: fenDe(pecas, defensor), casaPeao })
          }
        }
      }
    }
  }
  return candidatas
}

describe('o fato de xadrez em que a regra da promoção se apoia', () => {
  it('rei e UM peão contra rei sozinho não dá mate em posição nenhuma', () => {
    const mates: string[] = []
    const semXeque: string[] = []
    const peoesCandidatos = new Set<string>()
    const peoesConferidos = new Set<string>()
    let jogaveis = 0

    for (const corDoPeao of ['w', 'b'] as const) {
      for (const candidata of candidatasAMate(corDoPeao)) {
        peoesCandidatos.add(`${corDoPeao}${candidata.casaPeao}`)
        if (!posicaoEhJogavel(candidata.fen)) {
          continue
        }
        jogaveis += 1
        peoesConferidos.add(`${corDoPeao}${candidata.casaPeao}`)
        const status = positionStatus(candidata.fen)
        // Invariante da enumeração, contra o pior verde possível: uma varredura
        // que montasse as posições ERRADAS (rei defensor fora do alcance do
        // peão) não encontraria mate nenhum e passaria sem ter olhado uma única
        // posição candidata. Aqui, em xeque é o que define ser candidata.
        if (!status.inCheck) {
          semXeque.push(candidata.fen)
        }
        if (status.isCheckmate) {
          mates.push(candidata.fen)
        }
      }
    }

    // Varredura que não varreu nada não é aprovação: um erro no montador de FEN
    // reprovaria TODAS as posições e o teste passaria sem olhar uma sequer. A
    // REGRA, e não um piso arbitrário: toda casa de peão enumerada tem de ter
    // produzido pelo menos uma posição jogável.
    expect(jogaveis, 'nenhuma posição candidata foi jogável').toBeGreaterThan(0)
    expect(peoesConferidos.size, 'casas de peão sem nenhuma posição jogável').toBe(
      peoesCandidatos.size,
    )
    expect(
      semXeque.slice(0, 5),
      `posições enumeradas em que o peão NÃO dá xeque (${String(semXeque.length)} no total)`,
    ).toEqual([])
    expect(mates, `posições de rei e peão contra rei que são mate:\n${mates.join('\n')}`).toEqual(
      [],
    )
    // Orçamento próprio, e não o padrão de 5 s: a varredura é exaustiva DE
    // PROPÓSITO (uns doze mil FENs), e com a suíte inteira rodando em paralelo
    // ela passa do padrão. Portão que pisca vermelho por concorrência de
    // máquina treina todo mundo a ignorar vermelho — o número aqui é folga, não
    // uma medida de desempenho, e nada neste teste afirma tempo.
  }, 60_000)

  it('com DOIS peões o mate existe — é o contra-exemplo que mantém a regra estreita', () => {
    // CONTROLE do teste acima: sem isto, um detector de mate quebrado faria a
    // varredura passar sem enxergar mate nenhum.
    expect(posicaoEhJogavel(MATE_COM_DOIS_PEOES)).toBe(true)
    expect(positionStatus(MATE_COM_DOIS_PEOES).isCheckmate).toBe(true)
  })

  it('a regra só vale para rei e um peão contra rei sozinho', () => {
    const promocao = { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 } as const
    expect(vitoriaExigePromocao(REI_E_PEAO, 'w', promocao)).toBe(true)
    // Dois peões: o mate existe, então a vitória não exige promoção.
    expect(vitoriaExigePromocao(MATE_COM_DOIS_PEOES, 'w', promocao)).toBe(false)
    // Torre no tabuleiro: idem.
    expect(vitoriaExigePromocao(LUCENA, 'w', promocao)).toBe(false)
    // Um peão só não produz duas damas.
    expect(vitoriaExigePromocao(REI_E_PEAO, 'w', { ...promocao, quantidadeMinima: 2 })).toBe(false)
  })
})

// ------------------------------------------------------- tabela de decisão

interface Caso {
  nome: string
  fen: string
  objetivo: ObjetivoFinal
  ladoDoAluno: Side
  tablebase: TablebaseResult
  motivo: MotivoDaProva
  veredito: (typeof VEREDITOS_DA_PROVA)[number]
  /**
   * Declarado caso a caso DE PROPÓSITO, e não derivado do que a função
   * devolveu: é essa marca que separa "não consegui provar" de "está errado", e
   * é ela que decide se o portão de contrato tolera ou reprova. Sem afirmá-la
   * aqui, mover um motivo de um lado para o outro passaria despercebido.
   */
  limiteDoMetodo: boolean
  lancesAteOMate?: number
}

const CASOS: readonly Caso[] = [
  {
    nome: 'promoção em rei e peão contra rei, com vitória teórica',
    fen: REI_E_PEAO,
    objetivo: PROMOCAO,
    ladoDoAluno: 'w',
    tablebase: resposta(REI_E_PEAO, { resultado: 'vitoria' }),
    motivo: 'vitoria-so-se-promover',
    veredito: 'forcado',
    limiteDoMetodo: false,
  },
  {
    nome: 'promoção em Lucena: a torre dá mate sem promover',
    fen: LUCENA,
    objetivo: PROMOCAO,
    ladoDoAluno: 'w',
    tablebase: resposta(LUCENA, { resultado: 'vitoria' }),
    motivo: 'vitoria-nao-exige-promocao',
    veredito: 'nao-provado',
    limiteDoMetodo: true,
  },
  {
    nome: 'promoção pedida em posição de empate teórico',
    fen: REI_E_PEAO,
    objetivo: PROMOCAO,
    ladoDoAluno: 'w',
    tablebase: resposta(REI_E_PEAO, { resultado: 'empate' }),
    motivo: 'promocao-sem-vitoria-teorica',
    veredito: 'nao-provado',
    limiteDoMetodo: false,
  },
  {
    nome: 'tablebase respondeu sem resultado utilizável',
    fen: REI_E_PEAO,
    objetivo: PROMOCAO,
    ladoDoAluno: 'w',
    tablebase: resposta(REI_E_PEAO, { resultado: null }),
    motivo: 'resultado-teorico-desconhecido',
    veredito: 'nao-provado',
    limiteDoMetodo: false,
  },
  {
    nome: 'defesa de empate com empate teórico',
    fen: PEAO_DE_TORRE,
    objetivo: EMPATE,
    ladoDoAluno: 'b',
    tablebase: resposta(PEAO_DE_TORRE, { resultado: 'empate' }),
    motivo: 'empate-e-o-resultado-teorico',
    veredito: 'forcado',
    limiteDoMetodo: false,
  },
  {
    nome: 'defesa de empate em posição teoricamente perdida',
    fen: PEAO_DE_TORRE,
    objetivo: EMPATE,
    ladoDoAluno: 'b',
    tablebase: resposta(PEAO_DE_TORRE, { resultado: 'derrota' }),
    motivo: 'empate-em-posicao-perdida',
    veredito: 'impossivel',
    limiteDoMetodo: false,
  },
  {
    nome: 'defesa de empate em posição teoricamente ganha pelo aluno',
    fen: PEAO_DE_TORRE,
    objetivo: EMPATE,
    ladoDoAluno: 'b',
    tablebase: resposta(PEAO_DE_TORRE, { resultado: 'vitoria' }),
    motivo: 'empate-em-posicao-ganha',
    veredito: 'nao-provado',
    limiteDoMetodo: false,
  },
  {
    nome: 'mate em 1 com DTM 1',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'vitoria', dtm: 1 }),
    motivo: 'mate-forcado-no-prazo',
    veredito: 'forcado',
    limiteDoMetodo: false,
    lancesAteOMate: 1,
  },
  {
    nome: 'mate em 2 com DTM 3: meio-lance vira lance do aluno',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 2 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'vitoria', dtm: 3 }),
    motivo: 'mate-forcado-no-prazo',
    veredito: 'forcado',
    limiteDoMetodo: false,
    lancesAteOMate: 2,
  },
  {
    nome: 'DTM 3 com prazo de 1 lance: o objetivo é impossível',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'vitoria', dtm: 3 }),
    motivo: 'mate-mais-longo-que-o-prazo',
    veredito: 'impossivel',
    limiteDoMetodo: false,
    lancesAteOMate: 2,
  },
  {
    nome: 'mate pedido em posição que não é vitória teórica',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'empate' }),
    motivo: 'mate-em-posicao-nao-ganha',
    veredito: 'impossivel',
    limiteDoMetodo: false,
  },
  {
    nome: 'vitória teórica sem DTM: o prazo não pode ser conferido',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'vitoria', dtm: null }),
    motivo: 'mate-sem-dtm',
    veredito: 'nao-provado',
    limiteDoMetodo: true,
  },
  {
    nome: 'vitória teórica com DTM não positivo: a resposta se contradiz',
    fen: DAMA_MATE_EM_1,
    objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
    ladoDoAluno: 'w',
    tablebase: resposta(DAMA_MATE_EM_1, { resultado: 'vitoria', dtm: -3 }),
    motivo: 'tablebase-inconsistente',
    veredito: 'nao-provado',
    limiteDoMetodo: false,
  },
  {
    nome: 'ponto de vista espelhado: a vez é do adversário, o aluno é o outro lado',
    fen: REI_E_PEAO_PRETAS,
    objetivo: PROMOCAO,
    ladoDoAluno: 'w',
    // Do ponto de vista de quem tem a vez (pretas) a posição é DERROTA.
    tablebase: resposta(REI_E_PEAO_PRETAS, { resultado: 'derrota' }),
    motivo: 'vitoria-so-se-promover',
    veredito: 'forcado',
    limiteDoMetodo: false,
  },
]

describe('provarObjetivoPelaTablebase decide cada tipo de objetivo', () => {
  for (const caso of CASOS) {
    it(caso.nome, () => {
      const prova = provarObjetivoPelaTablebase({
        fen: caso.fen,
        objetivo: caso.objetivo,
        ladoDoAluno: caso.ladoDoAluno,
        tablebase: caso.tablebase,
      })
      expect(prova.motivo).toBe(caso.motivo)
      expect(prova.veredito).toBe(caso.veredito)
      expect(prova.limiteDoMetodo).toBe(caso.limiteDoMetodo)
      if (caso.lancesAteOMate !== undefined) {
        expect(prova.lancesAteOMate).toBe(caso.lancesAteOMate)
      }
      // Invariante do desenho: só `nao-provado` pode ser limite do método.
      if (prova.limiteDoMetodo) {
        expect(prova.veredito).toBe('nao-provado')
      }
      expect(VEREDITOS_DA_PROVA).toContain(prova.veredito)
    })
  }

  it('o DTM também é espelhado quando a vez é do adversário', () => {
    const prova = provarObjetivoPelaTablebase({
      fen: REI_E_PEAO_PRETAS,
      objetivo: { tipo: 'mate-em', lancesMaximos: 11 },
      ladoDoAluno: 'w',
      // Pretas a jogar, levando mate em 21 meios-lances: DTM negativo para elas.
      tablebase: resposta(REI_E_PEAO_PRETAS, { resultado: 'derrota', dtm: -21 }),
    })
    expect(prova.motivo).toBe('mate-forcado-no-prazo')
    expect(prova.lancesAteOMate).toBe(11)
  })

  it('provar uma posição com a resposta de OUTRA lança', () => {
    expect(() =>
      provarObjetivoPelaTablebase({
        fen: REI_E_PEAO,
        objetivo: PROMOCAO,
        ladoDoAluno: 'w',
        tablebase: resposta(LUCENA, { resultado: 'vitoria' }),
      }),
    ).toThrow(/outra posição/)
  })

  it('todo motivo da fonte tem caso nesta tabela', () => {
    const exercitados = new Set<MotivoDaProva>(CASOS.map((caso) => caso.motivo))
    const semCaso = MOTIVOS_DA_PROVA.filter((motivo) => !exercitados.has(motivo))
    expect(semCaso, `motivos sem caso na tabela: ${semCaso.join(', ')}`).toEqual([])
  })
})
