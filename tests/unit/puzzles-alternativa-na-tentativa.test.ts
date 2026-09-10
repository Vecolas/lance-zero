import { describe, expect, it } from 'vitest'

import {
  ATTEMPT_CONFIG,
  createAttemptState,
  EFEITO_DA_ALTERNATIVA,
  houveDesconto,
  submitMove,
  submitMoveComJuiz,
  toPuzzleAttempt,
  ultimaAlternativa,
  type AttemptState,
} from '@/domain/puzzles'
import type { EvalScore } from '@/domain/games/severity'
import { MASTERY_CONFIG, createMastery, updateMastery } from '@/domain/skills/mastery'
import {
  VEREDITOS_DE_ALTERNATIVA,
  type Puzzle,
  type PuzzleAttempt,
  type SolvablePuzzle,
} from '@/domain/types'
import { applyMove, parseUci } from '@/lib/chess'

/**
 * Portão da LIGAÇÃO entre o julgamento de alternativa e a máquina de estado da
 * tentativa (issue #17).
 *
 * A suíte de `julgarAlternativa` já responde por QUAL é o veredito. Aqui a
 * pergunta é outra e é a que a issue abriu: o que a TENTATIVA faz com cada um
 * dos três, e o que sobra GRAVADO. Zero engine — `avaliar` é sempre duble, e a
 * lista de chamadas é o que prova que o caminho barato não paga análise.
 *
 * O que esta suíte NÃO prova está declarado no fim do arquivo.
 */

// ---------------------------------------------------------------- fixtures

/**
 * Posição com DUAS capturas vencedoras da dama preta: Txd5 é a linha do
 * dataset e Dxd5 é a alternativa. A mesma da suíte de `julgarAlternativa`, de
 * propósito: fixture novo para a mesma pergunta seria a segunda fonte.
 */
const FEN_DUAS_CAPTURAS = '4k3/8/8/3q4/8/8/Q7/3RK3 w - - 0 1'
const LANCE_ESPERADO = 'd1d5'
const LANCE_ALTERNATIVO = 'a2d5'
/** Lance de rei, sem captura, sem xeque e sem ameaça nova: não vale análise. */
const LANCE_QUIETO = 'e1f1'

function estadoInicial(): AttemptState {
  const puzzle: Puzzle = {
    id: 'fixture-alternativa',
    fen: FEN_DUAS_CAPTURAS,
    moves: ['a1a1', LANCE_ESPERADO],
    rating: 1100,
    themes: [],
    skillIds: ['tactics.hanging-piece'],
  }
  const solvable: SolvablePuzzle = {
    puzzle,
    startFen: FEN_DUAS_CAPTURAS,
    playerColor: 'w',
    setupMoveUci: 'a1a1',
    solutionUci: [LANCE_ESPERADO],
  }
  return createAttemptState(solvable)
}

function fenDepoisDe(fen: string, uci: string): string {
  const entrada = parseUci(uci)
  if (entrada === null) throw new Error(`fixture com UCI inválido: ${uci}`)
  const aplicado = applyMove(fen, entrada)
  if (aplicado === null) throw new Error(`fixture com lance ilegal: ${uci} em ${fen}`)
  return aplicado.fenAfter
}

const FEN_DO_ALTERNATIVO = fenDepoisDe(FEN_DUAS_CAPTURAS, LANCE_ALTERNATIVO)
const FEN_DO_ESPERADO = fenDepoisDe(FEN_DUAS_CAPTURAS, LANCE_ESPERADO)

interface Duble {
  avaliar: (fen: string) => Promise<EvalScore>
  /** FENs analisados, em ordem. Vazio = ninguém pagou engine. */
  chamadas: string[]
}

/** Avaliação falsa. FEN fora do mapa devolve avaliação VAZIA, nunca um número inventado. */
function duble(mapa: Record<string, EvalScore>): Duble {
  const chamadas: string[] = []
  return {
    chamadas,
    avaliar: async (fen) => {
      chamadas.push(fen)
      return mapa[fen] ?? { scoreCp: null, mateIn: null }
    },
  }
}

/** As duas posições valem o mesmo: a alternativa é equivalente. */
function dubleEquivalente(): Duble {
  return duble({
    [FEN_DO_ALTERNATIVO]: { scoreCp: -900, mateIn: null },
    [FEN_DO_ESPERADO]: { scoreCp: -900, mateIn: null },
  })
}

/** A alternativa ganha bem menos: é vencedora, mas pior. */
function doublePior(): Duble {
  return duble({
    [FEN_DO_ALTERNATIVO]: { scoreCp: -300, mateIn: null },
    [FEN_DO_ESPERADO]: { scoreCp: -900, mateIn: null },
  })
}

/** Ninguém respondeu: sem juiz. É o caminho COMUM aqui, não a exceção. */
function dubleSemResposta(): Duble {
  return duble({})
}

const AGORA = new Date('2026-03-01T12:00:00.000Z')

function gravar(state: AttemptState): PuzzleAttempt {
  return toPuzzleAttempt(state, { agora: AGORA, thinkTimeMs: 4321 })
}

// ------------------------------------------------------- a política, varrida

describe('a tabela de efeitos é a fonte da política', () => {
  it('todo veredito do contrato tem efeito declarado, e os efeitos são coerentes', () => {
    let conferidos = 0
    for (const veredito of VEREDITOS_DE_ALTERNATIVA) {
      const efeito = EFEITO_DA_ALTERNATIVA[veredito]
      expect(efeito, `veredito sem efeito declarado: ${veredito}`).toBeDefined()
      // Aceitar e reprovar o mesmo lance é contradição, não política.
      expect(efeito.ehErro && efeito.aceitaOLance).toBe(false)
      // Desconto sem aceitação seria punir um lance recusado: punição dupla.
      if (efeito.comDesconto) expect(efeito.aceitaOLance).toBe(true)
      // SEM JUIZ NÃO SE APROVA E NÃO SE REPROVA. É a metade da política que a
      // issue #46 decidiu, e é a que some primeiro quando alguém "simplifica".
      if (!efeito.temJuiz) {
        expect(efeito.ehErro).toBe(false)
        expect(efeito.aceitaOLance).toBe(false)
        expect(efeito.comDesconto).toBe(false)
      }
      conferidos += 1
    }
    // Portão com zero verificações REPROVA: um `VEREDITOS_DE_ALTERNATIVA` vazio
    // faria o laço acima imprimir aprovação sem ter olhado nada.
    expect(conferidos).toBe(VEREDITOS_DE_ALTERNATIVA.length)
    expect(conferidos).toBeGreaterThan(0)
  })
})

// --------------------------------------------------- o caminho barato primeiro

describe('o juiz só entra quando vale', () => {
  it('o lance esperado é acerto sem pagar análise', async () => {
    const falso = dubleSemResposta()
    const resultado = await submitMoveComJuiz(estadoInicial(), LANCE_ESPERADO, {
      avaliar: falso.avaliar,
    })
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
    expect(resultado.alternativa).toBeUndefined()
    expect(falso.chamadas).toEqual([])
  })

  it('lance quieto e sem indício de ganho continua sendo erro, e de graça', async () => {
    const falso = dubleSemResposta()
    const resultado = await submitMoveComJuiz(estadoInicial(), LANCE_QUIETO, {
      avaliar: falso.avaliar,
    })
    expect(falso.chamadas).toEqual([])
    expect(resultado.correto).toBe(false)
    expect(resultado.motivo).toBe('lance-errado')
    expect(resultado.state.wrongMoves).toEqual([LANCE_QUIETO])
    expect(resultado.state.firstTry).toBe(false)
    expect(resultado.state.alternativas).toEqual([])
    // E o registro gravado continua sendo o de antes da issue: sem chave nova.
    expect(gravar(resultado.state).alternativas).toBeUndefined()
  })

  it('lance ilegal não chega ao juiz', async () => {
    const falso = dubleSemResposta()
    const resultado = await submitMoveComJuiz(estadoInicial(), 'd1d8', { avaliar: falso.avaliar })
    expect(falso.chamadas).toEqual([])
    expect(resultado.motivo).toBe('lance-ilegal')
  })
})

// ----------------------------------------------------------- os três vereditos

describe('equivalente: acerto limpo', () => {
  it('aceita o lance, encerra resolvido e não derruba a primeira tentativa', async () => {
    const falso = dubleEquivalente()
    const resultado = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: falso.avaliar,
    })
    expect(falso.chamadas).toHaveLength(2)
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
    expect(resultado.state.currentFen).toBe(FEN_DO_ALTERNATIVO)
    expect(resultado.state.playedUci).toEqual([LANCE_ALTERNATIVO])
    expect(resultado.state.wrongMoves).toEqual([])
    expect(resultado.state.firstTry).toBe(true)
    expect(houveDesconto(resultado.state)).toBe(false)

    const registro = gravar(resultado.state)
    expect(registro.solved).toBe(true)
    expect(registro.firstTry).toBe(true)
    expect(registro.alternativas).toEqual([
      { uci: LANCE_ALTERNATIVO, veredito: 'equivalente', margemPp: expect.any(Number) },
    ])
  })
})

describe('pior: acerto COM DESCONTO', () => {
  it('aceita o lance e marca o desconto, sem criar erro nem segunda tentativa', async () => {
    const falso = doublePior()
    const resultado = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: falso.avaliar,
    })
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
    expect(resultado.state.wrongMoves).toEqual([])
    // `firstTry` INTACTO de propósito: o desconto do lance pior é um só. Deixar
    // `firstTry` cair somaria `penalidadeSegundaTentativa` por cima, punindo
    // duas vezes o mesmo fato — e a segunda punição não apareceria em tela.
    expect(resultado.state.firstTry).toBe(true)
    expect(houveDesconto(resultado.state)).toBe(true)

    const registro = gravar(resultado.state)
    expect(registro.solved).toBe(true)
    expect(registro.alternativas?.[0]?.veredito).toBe('pior')
    // O número que a tela vai mostrar existe e é conferível.
    expect(registro.alternativas?.[0]?.margemPp).toBeGreaterThan(0)
  })

  it('o desconto é o da família que já existe, e não um mecanismo novo', () => {
    const evento = {
      tipo: 'puzzle' as const,
      acertou: true,
      usouDica: false,
      primeiraTentativa: true,
      thinkTimeMs: 1000,
    }
    const base = createMastery('tactics.hanging-piece')
    const limpo = updateMastery(base, { ...evento, porCaminhoMaisLongo: false })
    const comDesconto = updateMastery(base, { ...evento, porCaminhoMaisLongo: true })

    // A REGRA, não um número cravado: o crédito da amostra é multiplicado por
    // `1 - penalidadeLanceVencedorPior`, o mesmo peso que os finais usam.
    expect(comDesconto.recentAccuracy).toBeCloseTo(
      limpo.recentAccuracy * (1 - MASTERY_CONFIG.penalidadeLanceVencedorPior),
      10,
    )
    expect(comDesconto.recentAccuracy).toBeLessThan(limpo.recentAccuracy)
    expect(comDesconto.recentAccuracy).toBeGreaterThan(0)
  })
})

describe('indeterminado: não é erro, e é caminho normal', () => {
  it('não gasta vida, não derruba a primeira tentativa e não mexe no tabuleiro', async () => {
    const falso = dubleSemResposta()
    const inicial = estadoInicial()
    const resultado = await submitMoveComJuiz(inicial, LANCE_ALTERNATIVO, {
      avaliar: falso.avaliar,
    })

    expect(resultado.correto).toBe(false)
    expect(resultado.motivo).toBe('alternativa-nao-confirmada')
    expect(resultado.state.status).toBe('em-andamento')
    expect(resultado.state.currentFen).toBe(inicial.currentFen)
    expect(resultado.state.playedUci).toEqual([])
    expect(resultado.state.wrongMoves).toEqual([])
    expect(resultado.state.firstTry).toBe(true)
    expect(resultado.state.solutionIndex).toBe(inicial.solutionIndex)
    expect(houveDesconto(resultado.state)).toBe(false)
  })

  it('repetir o lance não confirmado nunca reprova a tentativa', async () => {
    const falso = dubleSemResposta()
    let estado = estadoInicial()
    // Duas vezes o limite de erros: se o não confirmado gastasse vida, a
    // tentativa teria falhado bem antes do fim deste laço.
    const repeticoes = ATTEMPT_CONFIG.maxErrosAntesDeFalhar * 2
    for (let i = 0; i < repeticoes; i += 1) {
      estado = (await submitMoveComJuiz(estado, LANCE_ALTERNATIVO, { avaliar: falso.avaliar }))
        .state
    }
    expect(repeticoes).toBeGreaterThan(0)
    expect(estado.status).toBe('em-andamento')
    expect(estado.alternativas).toHaveLength(repeticoes)

    // E o jogador ainda pode achar a linha do dataset, como acerto limpo.
    const fim = submitMove(estado, LANCE_ESPERADO)
    expect(fim.correto).toBe(true)
    expect(gravar(fim.state).firstTry).toBe(true)
  })

  it('o motivo de não ter dado para confirmar é gravado, e não há número falso', async () => {
    const falso = dubleSemResposta()
    const resultado = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: falso.avaliar,
    })
    const registro = ultimaAlternativa(resultado.state)
    expect(registro?.veredito).toBe('indeterminado')
    expect(registro?.motivo).toBe('avaliacao-ausente')
    // Zero seria "não perdeu nada", que é uma afirmação que ninguém fez.
    expect(registro?.margemPp).toBeUndefined()
  })
})

// -------------------------------------------- o que sobra no ARMAZENAMENTO

describe('indeterminado é distinguível de equivalente no armazenamento', () => {
  /**
   * A EXIGÊNCIA DA ISSUE, e o motivo dela: os dois terminam em `solved: true` —
   * o equivalente porque o lance foi aceito, o indeterminado porque o jogador
   * acha a linha do dataset em seguida. Sem marca no registro, a taxa de "a
   * engine não respondeu" seria impossível de medir depois, e é ela que diz se
   * a tolerância está calibrada. Sem esse número a política vira folclore.
   */
  it('duas tentativas que terminam resolvidas guardam vereditos diferentes', async () => {
    const comJuiz = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: dubleEquivalente().avaliar,
    })
    const semJuiz = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: dubleSemResposta().avaliar,
    })
    const depoisDeAchar = submitMove(semJuiz.state, LANCE_ESPERADO)

    const registroA = gravar(comJuiz.state)
    const registroB = gravar(depoisDeAchar.state)

    // As duas são acerto. É exatamente por isso que a marca precisa existir.
    expect(registroA.solved).toBe(true)
    expect(registroB.solved).toBe(true)
    expect(registroA.firstTry).toBe(true)
    expect(registroB.firstTry).toBe(true)

    const vereditos = (registro: PuzzleAttempt): string[] =>
      (registro.alternativas ?? []).map((item) => item.veredito)
    expect(vereditos(registroA)).toEqual(['equivalente'])
    expect(vereditos(registroB)).toEqual(['indeterminado'])
    expect(vereditos(registroA)).not.toEqual(vereditos(registroB))
  })

  it('a marca sobrevive à ida e volta de JSON, que é como o backup viaja', async () => {
    const semJuiz = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: dubleSemResposta().avaliar,
    })
    const pior = await submitMoveComJuiz(estadoInicial(), LANCE_ALTERNATIVO, {
      avaliar: doublePior().avaliar,
    })

    let conferidos = 0
    for (const estado of [semJuiz.state, pior.state]) {
      const original = gravar(estado)
      const voltou = JSON.parse(JSON.stringify(original)) as PuzzleAttempt
      expect(voltou).toEqual(original)
      // `NaN` viraria `null` no arquivo e voltaria como número mentiroso. Por
      // isso o registro OMITE a margem em vez de guardar `NaN`.
      for (const item of voltou.alternativas ?? []) {
        expect(item.margemPp === undefined || Number.isFinite(item.margemPp)).toBe(true)
      }
      conferidos += 1
    }
    expect(conferidos).toBe(2)
  })
})

/**
 * O QUE ESTA SUÍTE NÃO PROVA
 *
 * 1. Nada aqui roda Stockfish. `avaliar` é duble em todos os casos, então a
 *    suíte não diz nada sobre a QUALIDADE da ordenação da engine com o
 *    orçamento de nós que a tela usa — que é justamente o que vai decidir com
 *    que frequência o veredito é `indeterminado` na prática. Essa taxa só pode
 *    ser medida com o produto rodando, e é para isso que o veredito é gravado.
 * 2. A tolerância (`ALTERNATIVA_CONFIG.toleranciaPp`) continua NÃO CALIBRADA. A
 *    suíte prova que a fronteira é respeitada, não que ela está no lugar certo.
 * 3. `penalidadeLanceVencedorPior` também não é calibrada: o teste afirma que o
 *    desconto é o da família existente, não que 0,2 seja o valor certo.
 * 4. A tela não é exercitada aqui. Que ela FALA nos três casos é portão de
 *    `puzzles-alternativa-tela.test.tsx`.
 */
