import { describe, expect, it } from 'vitest'

import { applyMove } from '@/lib/chess'
import { expectedScoreFromEval, type EvalScore } from '@/domain/games/severity'
import {
  ALTERNATIVA_CONFIG,
  inverterPerspectiva,
  julgarAlternativa,
  valeConsultarEngine,
  type AlternativaConfig,
  type JulgamentoAlternativa,
} from '@/domain/puzzles/alternativa'
import { createAttemptState, type AttemptState } from '@/domain/puzzles/attempt'
import { parseUci } from '@/domain/puzzles/parser'
import type { Puzzle, SolvablePuzzle } from '@/domain/types'

/**
 * Suíte do julgamento de solução alternativa. ZERO engine: `avaliar` é sempre
 * um duble, e é ele que prova que o caminho barato não paga análise.
 *
 * O que esta suíte NÃO prova está declarado no fim do arquivo.
 */

// ---------------------------------------------------------------- fixtures

function estadoDe(fen: string, solucao: string[]): AttemptState {
  const puzzle: Puzzle = {
    id: 'fixture',
    fen,
    moves: ['a1a1', ...solucao],
    rating: 1100,
    themes: [],
    skillIds: [],
  }
  const solvable: SolvablePuzzle = {
    puzzle,
    startFen: fen,
    playerColor: fen.split(' ')[1] === 'b' ? 'b' : 'w',
    setupMoveUci: 'a1a1',
    solutionUci: solucao,
  }
  return createAttemptState(solvable)
}

/** Aplica um lance e devolve o FEN resultante. Explode se o fixture estiver errado. */
function fenDepoisDe(fen: string, uci: string): string {
  const entrada = parseUci(uci)
  if (entrada === null) throw new Error(`fixture com UCI inválido: ${uci}`)
  const aplicado = applyMove(fen, entrada)
  if (aplicado === null) throw new Error(`fixture com lance ilegal: ${uci} em ${fen}`)
  return aplicado.fenAfter
}

interface AvaliadorFalso {
  avaliar: (fen: string) => Promise<EvalScore>
  /** FENs que o julgamento pediu, em ordem. Vazio = ninguém pagou engine. */
  chamadas: string[]
}

/**
 * Duble de avaliação. Devolve o score do mapa; FEN fora do mapa vira uma
 * avaliação vazia (e portanto `indeterminado`), nunca um número inventado.
 *
 * A lista `chamadas` é o que permite afirmar que o caminho barato NÃO pagou
 * análise — e é conferida nos testes, senão ela seria decoração.
 */
function avaliadorFalso(mapa: Record<string, EvalScore>): AvaliadorFalso {
  const chamadas: string[] = []
  return {
    chamadas,
    avaliar: async (fen: string) => {
      chamadas.push(fen)
      return mapa[fen] ?? { scoreCp: null, mateIn: null }
    },
  }
}

function comTolerancia(toleranciaPp: number): AlternativaConfig {
  return { ...ALTERNATIVA_CONFIG, toleranciaPp }
}

// Posição com DUAS capturas vencedoras da dama preta: Txd5 (linha do dataset) e
// Dxd5 (a alternativa que hoje seria carimbada como erro).
const FEN_DUAS_CAPTURAS = '4k3/8/8/3q4/8/8/Q7/3RK3 w - - 0 1'
const LANCE_ESPERADO = 'd1d5'
const LANCE_ALTERNATIVO = 'a2d5'

/**
 * Espelha um FEN: inverte as fileiras e troca as cores. A mesma posição com as
 * cores trocadas tem de receber exatamente o mesmo veredito.
 *
 * Serve só aos fixtures desta suíte: descarta roque e en passant de propósito.
 */
function espelharFen(fen: string): string {
  const partes = fen.trim().split(/\s+/)
  const linhas = (partes[0] ?? '').split('/').reverse().map(trocarCaso)
  return `${linhas.join('/')} ${partes[1] === 'w' ? 'b' : 'w'} - - 0 1`
}

function trocarCaso(linha: string): string {
  return [...linha].map((c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('')
}

function espelharUci(uci: string): string {
  const casa = (c: string): string => `${c[0]}${9 - Number(c[1])}`
  return `${casa(uci.slice(0, 2))}${casa(uci.slice(2, 4))}${uci.slice(4)}`
}

/**
 * Encena o fluxo de duas etapas do jeito que o chamador real vai usar: só paga
 * análise quando a primeira etapa disser que vale.
 */
async function fluxoDeDoisEstagios(
  state: AttemptState,
  uci: string,
  avaliar: (fen: string) => Promise<EvalScore>,
  config: AlternativaConfig = ALTERNATIVA_CONFIG,
): Promise<{ vale: boolean; julgamento: JulgamentoAlternativa | null }> {
  const decisao = valeConsultarEngine(state, uci, config)
  if (!decisao.vale) return { vale: false, julgamento: null }
  const julgamento = await julgarAlternativa({
    fenAntes: state.currentFen,
    uciDoJogador: uci,
    uciEsperado: state.solvable.solutionUci[state.solutionIndex] ?? '',
    avaliar,
    config,
  })
  return { vale: true, julgamento }
}

// ------------------------------------------------- etapa 1: vale consultar?

describe('valeConsultarEngine', () => {
  it('não paga análise por lance quieto e sem ganho', async () => {
    // Rei e peão contra rei: e2e3 não captura, não dá xeque, não promove e não
    // passa a ameaçar nada. O caminho de erro tem de continuar barato.
    const state = estadoDe('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', ['e2e4'])
    const decisao = valeConsultarEngine(state, 'e2e3')

    expect(decisao.vale).toBe(false)
    expect(decisao.motivo).toBe('sem-indicio-de-ganho')

    const falso = avaliadorFalso({})
    const resultado = await fluxoDeDoisEstagios(state, 'e2e3', falso.avaliar)
    expect(resultado.julgamento).toBeNull()
    expect(falso.chamadas).toEqual([])
  })

  it('paga análise por captura que ganha material', async () => {
    // Txd5 pega a dama preta indefesa; a linha do dataset era o lance de rei.
    const state = estadoDe('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['e1e2'])
    const decisao = valeConsultarEngine(state, 'd1d5')

    expect(decisao.vale).toBe(true)
    expect(decisao.motivo).toBe('captura')
    expect(decisao.ganhoCp).toBeGreaterThan(0)

    const fenDoJogador = fenDepoisDe(state.currentFen, 'd1d5')
    const fenEsperado = fenDepoisDe(state.currentFen, 'e1e2')
    const falso = avaliadorFalso({
      [fenDoJogador]: { scoreCp: -900, mateIn: null },
      [fenEsperado]: { scoreCp: 300, mateIn: null },
    })

    const resultado = await fluxoDeDoisEstagios(state, 'd1d5', falso.avaliar)
    expect(resultado.vale).toBe(true)
    expect(falso.chamadas).toEqual([fenDoJogador, fenEsperado])
    expect(resultado.julgamento?.veredito).toBe('equivalente')
  })

  it('não consulta pelo próprio lance esperado', () => {
    const state = estadoDe(FEN_DUAS_CAPTURAS, [LANCE_ESPERADO])
    expect(valeConsultarEngine(state, LANCE_ESPERADO)).toEqual({
      vale: false,
      motivo: 'lance-esperado',
      ganhoCp: 0,
    })
    // Maiúsculas e espaço em volta são entrada de usuário, não outro lance.
    expect(valeConsultarEngine(state, ' D1D5 ').motivo).toBe('lance-esperado')
  })

  it('recusa entrada malformada e lance ilegal sem chamar nada', () => {
    const state = estadoDe(FEN_DUAS_CAPTURAS, [LANCE_ESPERADO])
    expect(valeConsultarEngine(state, 'xyz').motivo).toBe('formato-invalido')
    expect(valeConsultarEngine(state, 'd1d8').motivo).toBe('lance-ilegal')
  })

  it('paga análise por xeque, por promoção e por ameaça material nova', () => {
    const xeque = estadoDe('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', ['e1e2'])
    expect(valeConsultarEngine(xeque, 'a1a8').motivo).toBe('xeque')

    const promocao = estadoDe('8/2P5/8/8/4K3/8/8/k7 w - - 0 1', ['e4e5'])
    expect(valeConsultarEngine(promocao, 'c7c8q').motivo).toBe('promocao')

    // Ta1-d1 não captura nem dá xeque, mas passa a atacar o cavalo indefeso.
    const ameaca = estadoDe('4k3/8/8/3n4/8/8/8/R3K3 w - - 0 1', ['e1e2'])
    const decisao = valeConsultarEngine(ameaca, 'a1d1')
    expect(decisao.motivo).toBe('ameaca-material')
    expect(decisao.ganhoCp).toBeGreaterThanOrEqual(ALTERNATIVA_CONFIG.consulta.ameacaGanhoMinimoCp)
  })

  it('os critérios vêm da config: apertá-los muda a decisão', () => {
    // O mesmo lance, com o limiar acima do ganho, deixa de valer análise. Sem
    // este caso os números da config seriam botão morto.
    const ameaca = estadoDe('4k3/8/8/3n4/8/8/8/R3K3 w - - 0 1', ['e1e2'])
    const exigente: AlternativaConfig = {
      ...ALTERNATIVA_CONFIG,
      consulta: { ...ALTERNATIVA_CONFIG.consulta, ameacaGanhoMinimoCp: 5000 },
    }
    expect(valeConsultarEngine(ameaca, 'a1d1', exigente).motivo).toBe('sem-indicio-de-ganho')

    const promocao = estadoDe('8/2P5/8/8/4K3/8/8/k7 w - - 0 1', ['e4e5'])
    const semPromocao: AlternativaConfig = {
      ...ALTERNATIVA_CONFIG,
      consulta: { ...ALTERNATIVA_CONFIG.consulta, promocao: false },
    }
    expect(valeConsultarEngine(promocao, 'c7c8q', semPromocao).motivo).toBe('sem-indicio-de-ganho')

    const captura = estadoDe('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['e1e2'])
    const capturaCara: AlternativaConfig = {
      ...ALTERNATIVA_CONFIG,
      consulta: { ...ALTERNATIVA_CONFIG.consulta, capturaGanhoMinimoCp: 5000 },
    }
    expect(valeConsultarEngine(captura, 'd1d5', capturaCara).vale).toBe(false)
  })
})

// --------------------------------------------------- etapa 2: o julgamento

/** Monta o julgamento das duas capturas com os scores pedidos, na visão de quem responde. */
async function julgarDuasCapturas(
  scoreDoJogador: EvalScore,
  scoreEsperado: EvalScore,
  config?: AlternativaConfig,
): Promise<{ julgamento: JulgamentoAlternativa; chamadas: string[] }> {
  const fenDoJogador = fenDepoisDe(FEN_DUAS_CAPTURAS, LANCE_ALTERNATIVO)
  const fenEsperado = fenDepoisDe(FEN_DUAS_CAPTURAS, LANCE_ESPERADO)
  const falso = avaliadorFalso({
    [fenDoJogador]: scoreDoJogador,
    [fenEsperado]: scoreEsperado,
  })
  const julgamento = await julgarAlternativa({
    fenAntes: FEN_DUAS_CAPTURAS,
    uciDoJogador: LANCE_ALTERNATIVO,
    uciEsperado: LANCE_ESPERADO,
    avaliar: falso.avaliar,
    config,
  })
  return { julgamento, chamadas: falso.chamadas }
}

describe('julgarAlternativa', () => {
  it('chama a alternativa de equivalente quando a perda cabe na tolerância', async () => {
    const { julgamento, chamadas } = await julgarDuasCapturas(
      { scoreCp: -880, mateIn: null },
      { scoreCp: -900, mateIn: null },
    )
    expect(chamadas).toHaveLength(2)
    expect(julgamento.veredito).toBe('equivalente')
    // A regra afirmada é "perda pequena e positiva"; o número medido em
    // 2026-09 foi ~0,26 pp e fica aqui só como nota.
    expect(julgamento.margemPp).toBeGreaterThan(0)
    expect(julgamento.margemPp).toBeLessThan(ALTERNATIVA_CONFIG.toleranciaPp)
  })

  it('chama a alternativa de pior quando a perda estoura a tolerância', async () => {
    const { julgamento } = await julgarDuasCapturas(
      { scoreCp: -300, mateIn: null },
      { scoreCp: -900, mateIn: null },
    )
    expect(julgamento.veredito).toBe('pior')
    expect(julgamento.margemPp).toBeGreaterThan(ALTERNATIVA_CONFIG.toleranciaPp)
  })

  it('alternativa melhor que a linha do dataset não vira perda negativa', async () => {
    const { julgamento } = await julgarDuasCapturas(
      { scoreCp: -2000, mateIn: null },
      { scoreCp: -300, mateIn: null },
    )
    expect(julgamento.veredito).toBe('equivalente')
    expect(julgamento.margemPp).toBe(0)
  })

  it('a tolerância vem da config e a fronteira é estrita dos dois lados', async () => {
    const scoreDoJogador: EvalScore = { scoreCp: -880, mateIn: null }
    const scoreEsperado: EvalScore = { scoreCp: -900, mateIn: null }
    const base = await julgarDuasCapturas(scoreDoJogador, scoreEsperado)
    const margem = base.julgamento.margemPp
    expect(margem).toBeGreaterThan(0)

    const epsilon = 1e-6
    const casos: Array<[number, string]> = [
      [margem - epsilon, 'pior'],
      [margem, 'pior'],
      [margem + epsilon, 'equivalente'],
    ]
    let conferidos = 0
    for (const [tolerancia, esperado] of casos) {
      const { julgamento } = await julgarDuasCapturas(
        scoreDoJogador,
        scoreEsperado,
        comTolerancia(tolerancia),
      )
      expect(julgamento.veredito).toBe(esperado)
      conferidos += 1
    }
    // Portão conta as próprias verificações: laço vazio não é aprovação.
    expect(conferidos).toBe(casos.length)
  })
})

describe('julgarAlternativa na dúvida', () => {
  it('não deixa a exceção de avaliar escapar e devolve indeterminado', async () => {
    const assincrono = await julgarAlternativa({
      fenAntes: FEN_DUAS_CAPTURAS,
      uciDoJogador: LANCE_ALTERNATIVO,
      uciEsperado: LANCE_ESPERADO,
      avaliar: async () => {
        throw new Error('worker caiu no meio da análise')
      },
    })
    expect(assincrono.veredito).toBe('indeterminado')
    expect(assincrono.motivo).toBe('avaliacao-falhou')
    expect(Number.isNaN(assincrono.margemPp)).toBe(true)

    // Duble que estoura ANTES de devolver a promise também é código de fora.
    const sincrono = await julgarAlternativa({
      fenAntes: FEN_DUAS_CAPTURAS,
      uciDoJogador: LANCE_ALTERNATIVO,
      uciEsperado: LANCE_ESPERADO,
      avaliar: () => {
        throw new Error('engine nem iniciou')
      },
    })
    expect(sincrono.veredito).toBe('indeterminado')
  })

  it('avaliação vazia dos dois lados é indeterminado, nunca equivalente', async () => {
    const { julgamento } = await julgarDuasCapturas(
      { scoreCp: null, mateIn: null },
      { scoreCp: null, mateIn: null },
    )
    expect(julgamento.veredito).toBe('indeterminado')
    expect(julgamento.motivo).toBe('avaliacao-ausente')
    expect(Number.isNaN(julgamento.margemPp)).toBe(true)
  })

  it('avaliação vazia de um lado só também é indeterminado', async () => {
    const { julgamento } = await julgarDuasCapturas(
      { scoreCp: null, mateIn: null },
      { scoreCp: -900, mateIn: null },
    )
    expect(julgamento.veredito).toBe('indeterminado')
    expect(julgamento.motivo).toBe('avaliacao-ausente')
  })

  it('avaliação sem lado definido é indeterminado', async () => {
    const mateZero = await julgarDuasCapturas(
      { scoreCp: null, mateIn: 0 },
      { scoreCp: -900, mateIn: null },
    )
    expect(mateZero.julgamento.motivo).toBe('avaliacao-nao-confiavel')

    const cpAbsurdo = await julgarDuasCapturas(
      { scoreCp: Number.POSITIVE_INFINITY, mateIn: null },
      { scoreCp: -900, mateIn: null },
    )
    expect(cpAbsurdo.julgamento.motivo).toBe('avaliacao-nao-confiavel')
  })

  it('lance ilegal e FEN podre são indeterminado, e não erro do jogador', async () => {
    const falso = avaliadorFalso({})
    const ilegal = await julgarAlternativa({
      fenAntes: FEN_DUAS_CAPTURAS,
      uciDoJogador: 'a2b4',
      uciEsperado: LANCE_ESPERADO,
      avaliar: falso.avaliar,
    })
    expect(ilegal.motivo).toBe('lance-do-jogador-ilegal')

    const podre = await julgarAlternativa({
      fenAntes: 'nao é um fen',
      uciDoJogador: LANCE_ALTERNATIVO,
      uciEsperado: LANCE_ESPERADO,
      avaliar: falso.avaliar,
    })
    expect(podre.motivo).toBe('fen-invalido')
    expect(falso.chamadas).toEqual([])
  })

  it('lance do jogador igual ao esperado não paga análise', async () => {
    const falso = avaliadorFalso({})
    const julgamento = await julgarAlternativa({
      fenAntes: FEN_DUAS_CAPTURAS,
      uciDoJogador: LANCE_ESPERADO,
      uciEsperado: LANCE_ESPERADO,
      avaliar: falso.avaliar,
    })
    expect(julgamento).toEqual({ veredito: 'equivalente', margemPp: 0 })
    expect(falso.chamadas).toEqual([])
  })
})

// ------------------------------------------------------------- perspectiva

describe('perspectiva', () => {
  it('inverterPerspectiva é o espelho exato da pontuação esperada', () => {
    const amostras: EvalScore[] = [
      { scoreCp: 0, mateIn: null },
      { scoreCp: 250, mateIn: null },
      { scoreCp: -900, mateIn: null },
      { scoreCp: null, mateIn: 3 },
      { scoreCp: null, mateIn: -2 },
    ]
    let conferidas = 0
    for (const score of amostras) {
      expect(expectedScoreFromEval(inverterPerspectiva(score))).toBeCloseTo(
        1 - expectedScoreFromEval(score),
        10,
      )
      conferidas += 1
    }
    expect(conferidas).toBe(amostras.length)
  })

  it('as mesmas posições com as cores trocadas dão o mesmo veredito', async () => {
    const scoreDoJogador: EvalScore = { scoreCp: -300, mateIn: null }
    const scoreEsperado: EvalScore = { scoreCp: -900, mateIn: null }

    const direto = await julgarDuasCapturas(scoreDoJogador, scoreEsperado)

    const fenEspelhado = espelharFen(FEN_DUAS_CAPTURAS)
    const jogadorEspelhado = espelharUci(LANCE_ALTERNATIVO)
    const esperadoEspelhado = espelharUci(LANCE_ESPERADO)
    const falso = avaliadorFalso({
      [fenDepoisDe(fenEspelhado, jogadorEspelhado)]: scoreDoJogador,
      [fenDepoisDe(fenEspelhado, esperadoEspelhado)]: scoreEsperado,
    })
    const espelhado = await julgarAlternativa({
      fenAntes: fenEspelhado,
      uciDoJogador: jogadorEspelhado,
      uciEsperado: esperadoEspelhado,
      avaliar: falso.avaliar,
    })

    expect(direto.julgamento.veredito).toBe('pior')
    expect(espelhado.veredito).toBe(direto.julgamento.veredito)
    expect(espelhado.margemPp).toBeCloseTo(direto.julgamento.margemPp, 10)
    expect(falso.chamadas).toHaveLength(2)
  })

  it('MORDE DOS DOIS LADOS: avaliação na perspectiva errada muda o veredito', async () => {
    // Este é o caso que TEM de reprovar. Se um dia trocar a perspectiva das
    // avaliações deixar de mudar o veredito, é porque o julgamento parou de
    // olhar a perspectiva — e os dois testes acima viraram carimbo.
    const scoreDoJogador: EvalScore = { scoreCp: -300, mateIn: null }
    const scoreEsperado: EvalScore = { scoreCp: -900, mateIn: null }

    const certo = await julgarDuasCapturas(scoreDoJogador, scoreEsperado)
    const invertido = await julgarDuasCapturas(
      inverterPerspectiva(scoreDoJogador),
      inverterPerspectiva(scoreEsperado),
    )

    expect(certo.julgamento.veredito).toBe('pior')
    expect(invertido.julgamento.veredito).not.toBe(certo.julgamento.veredito)
  })
})

/**
 * O que esta suíte NÃO prova:
 *
 * - nada roda contra Stockfish: `avaliar` é sempre duble, então a suíte não diz
 *   se a engine devolve o score na perspectiva que este módulo assume. Isso é
 *   contrato de engine e precisa de um teste próprio;
 * - os limiares (`ameacaGanhoMinimoCp`, `toleranciaPp`) são exercitados como
 *   REGRA, nunca como valor certo: não há dado real dizendo que 300 cp e 3 pp
 *   são as escolhas boas;
 * - captura en passant não é coberta — está declarada como ponto cego no
 *   cabeçalho do módulo;
 * - nada aqui liga o julgamento à tentativa: `attempt.ts` continua carimbando
 *   a alternativa como erro. Quem chama vem depois.
 */
