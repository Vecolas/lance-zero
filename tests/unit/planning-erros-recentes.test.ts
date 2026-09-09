/**
 * Portão de `errosRecentesDeAnalises`.
 *
 * A decisão que esta suíte protege é a que já custou caro uma vez: a data do
 * erro é a da PARTIDA, não a da análise. Analisar hoje um jogo de três semanas
 * atrás não pode inflar a prioridade da habilidade — o sintoma seria o plano do
 * dia errado, e ninguém liga um plano ruim a uma data.
 *
 * As varreduras por severidade e por precisão percorrem a FONTE (um `Record`
 * tipado, que o compilador obriga a atualizar quando o `union` cresce, cruzado
 * com a tabela de pesos do planner) e CONTAM as próprias verificações: tabela
 * vazia não é aprovação.
 */

import { describe, expect, it } from 'vitest'

import {
  ERROS_RECENTES_CONFIG,
  errosRecentesDeAnalises,
  indexarPartidas,
  inicioDaJanela,
} from '@/domain/planning/erros-recentes'
import {
  PLANNER_CONFIG,
  buildDailyPlan,
  type PlannerContext,
  type RecentGameError,
} from '@/domain/planning/planner'
import { createMastery } from '@/domain/skills/mastery'
import {
  SKILL_IDS,
  type AnalysisPrecision,
  type Game,
  type MoveSeverity,
  type PositionAnalysis,
  type SkillId,
  type SkillMastery,
  type UserProfile,
} from '@/domain/types'

const AGORA = new Date('2026-09-09T08:00:00.000Z')
const ONTEM = '2026-09-08T19:00:00.000Z'
const TRES_SEMANAS_ATRAS = '2026-08-19T19:00:00.000Z'

const FEN_QUALQUER = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1'

function partida(id: string, playedAt: string): Game {
  return {
    id,
    source: 'pgn',
    pgn: '1. e4 e5 *',
    playedAt,
    white: 'eu',
    black: 'adversario',
    userColor: 'w',
    result: '*',
    importedAt: '2026-09-09T07:00:00.000Z',
  }
}

interface AnaliseParcial {
  gameId?: string
  ply?: number
  severity?: MoveSeverity
  precisao?: AnalysisPrecision
  skillIds?: SkillId[]
}

/**
 * Análise "de erro por padrão".
 *
 * O default é o caso que DEVE virar sinal; cada teste desliga uma coisa só.
 * Assim, um teste que passa a não medir nada fica visível: ele deixaria de
 * diferir do caso base.
 */
function analise({
  gameId = 'p1',
  ply = 24,
  severity = 'erro-grave',
  precisao = 'aprofundada',
  skillIds = ['tactics.fork'],
}: AnaliseParcial = {}): PositionAnalysis {
  return {
    gameId,
    ply,
    fenBefore: FEN_QUALQUER,
    userMoveUci: 'g1f3',
    bestMoveUci: 'c4f7',
    pv: ['c4f7'],
    scoreCp: -180,
    mateIn: null,
    expectedScoreLossPp: 24,
    severity,
    skillIds,
    explanationCode: 'peca-pendurada',
    precisao,
  }
}

function chamar(
  analises: readonly PositionAnalysis[],
  partidas: readonly Game[],
  janelaDias?: number,
): RecentGameError[] {
  return errosRecentesDeAnalises(analises, indexarPartidas(partidas), {
    agora: AGORA,
    janelaDias,
  })
}

// ------------------------------------------------------------------ a data

describe('a data do erro é a da partida', () => {
  it('conta o erro de uma partida de ontem', () => {
    const erros = chamar([analise()], [partida('p1', ONTEM)])

    expect(erros).toEqual([{ skillId: 'tactics.fork', severity: 'erro-grave', ocorridoEm: ONTEM }])
  })

  it('ignora o erro de uma partida de três semanas atrás, mesmo analisada agora', () => {
    // A análise não carrega data nenhuma: se a implementação usasse "agora",
    // este caso passaria a contar. É exatamente o bug que já existiu aqui.
    expect(chamar([analise()], [partida('p1', TRES_SEMANAS_ATRAS)])).toEqual([])
  })

  it('a borda da janela é a mesma que o repositório usa para filtrar partidas', () => {
    const borda = inicioDaJanela(AGORA)
    const dentro = new Date(borda.getTime() + 1000).toISOString()
    const fora = new Date(borda.getTime() - 1000).toISOString()

    expect(chamar([analise()], [partida('p1', dentro)])).toHaveLength(1)
    expect(chamar([analise()], [partida('p1', fora)])).toHaveLength(0)
  })

  it('respeita a janela recebida por parâmetro', () => {
    const partidas = [partida('p1', TRES_SEMANAS_ATRAS)]

    expect(chamar([analise()], partidas, 30)).toHaveLength(1)
    expect(chamar([analise()], partidas, 1)).toHaveLength(0)
  })

  it('ignora partida com data ilegível em vez de tratá-la como recente', () => {
    expect(chamar([analise()], [partida('p1', 'quando der')])).toEqual([])
  })

  it('ignora análise órfã: sem a partida não há data confiável', () => {
    // Ponto cego declarado no cabeçalho do módulo.
    expect(chamar([analise({ gameId: 'sumiu' })], [partida('p1', ONTEM)])).toEqual([])
  })
})

// -------------------------------------------------------------- a precisão

describe('número raso não julga lance', () => {
  /**
   * Varre a FONTE: o `Record` tipado quebra a compilação se `AnalysisPrecision`
   * ganhar um terceiro valor, então nenhuma precisão pode sumir da conta.
   */
  const PRECISAO_VIRA_SINAL: Record<AnalysisPrecision, boolean> = {
    rasa: false,
    aprofundada: true,
  }

  it('cobre toda precisão declarada no domínio', () => {
    let verificadas = 0

    for (const [precisao, deveVirarSinal] of Object.entries(PRECISAO_VIRA_SINAL) as [
      AnalysisPrecision,
      boolean,
    ][]) {
      const erros = chamar([analise({ precisao })], [partida('p1', ONTEM)])
      expect(erros.length > 0, `precisão ${precisao}`).toBe(deveVirarSinal)
      verificadas += 1
    }

    expect(verificadas).toBe(Object.keys(PRECISAO_VIRA_SINAL).length)
    expect(verificadas).toBeGreaterThan(0)
  })

  it('recusa análise rasa mesmo quando ela já tem habilidade atribuída', () => {
    // Caminho real do pipeline: aprofundamento que falhou mantém o número raso
    // e ainda assim anexa a explicação. Prioridade vinda daí é falsa precisão.
    expect(
      chamar([analise({ precisao: 'rasa', skillIds: ['tactics.pin'] })], [partida('p1', ONTEM)]),
    ).toEqual([])
  })
})

// ------------------------------------------------------------ a severidade

describe('severidade', () => {
  /** Varre a FONTE pelo mesmo motivo do bloco de precisão. */
  const SEVERIDADE_VIRA_SINAL: Record<MoveSeverity, boolean> = {
    ok: false,
    imprecisao: true,
    erro: true,
    'erro-grave': true,
  }

  it('cobre toda severidade declarada no domínio', () => {
    let verificadas = 0

    for (const [severity, deveVirarSinal] of Object.entries(SEVERIDADE_VIRA_SINAL) as [
      MoveSeverity,
      boolean,
    ][]) {
      const erros = chamar([analise({ severity })], [partida('p1', ONTEM)])
      expect(erros.length > 0, `severidade ${severity}`).toBe(deveVirarSinal)
      verificadas += 1
    }

    expect(verificadas).toBe(Object.keys(SEVERIDADE_VIRA_SINAL).length)
    expect(verificadas).toBeGreaterThan(0)
  })

  it('concorda com o peso que o planner dá a cada severidade', () => {
    // Duas metades da mesma regra: aqui decidimos o que é sinal, e o planner
    // decide quanto ele pesa. Se as duas divergirem, este portão morde antes
    // de o plano do dia começar a contar lance `ok` como erro.
    let verificadas = 0

    for (const [severity, deveVirarSinal] of Object.entries(SEVERIDADE_VIRA_SINAL) as [
      MoveSeverity,
      boolean,
    ][]) {
      expect(PLANNER_CONFIG.pesoSeveridade[severity] > 0, `peso de ${severity}`).toBe(
        deveVirarSinal,
      )
      verificadas += 1
    }

    expect(verificadas).toBe(Object.keys(PLANNER_CONFIG.pesoSeveridade).length)
  })
})

// ------------------------------------------------------------ as habilidades

describe('habilidades', () => {
  it('análise sem habilidade atribuída não contribui', () => {
    expect(chamar([analise({ skillIds: [] })], [partida('p1', ONTEM)])).toEqual([])
  })

  it('uma entrada por habilidade da análise', () => {
    const erros = chamar(
      [analise({ skillIds: ['tactics.fork', 'calculation.opponent-best-response'] })],
      [partida('p1', ONTEM)],
    )

    expect(erros.map((erro) => erro.skillId)).toEqual([
      'tactics.fork',
      'calculation.opponent-best-response',
    ])
  })

  it('três falhas na mesma habilidade geram três entradas', () => {
    // O planner conta OCORRÊNCIAS: agrupar aqui apagaria a informação de
    // quantas vezes a habilidade falhou, e o texto do bloco diria "1 lance".
    const erros = chamar(
      [
        analise({ ply: 10 }),
        analise({ ply: 22, severity: 'erro' }),
        analise({ ply: 30, gameId: 'p2' }),
      ],
      [partida('p1', ONTEM), partida('p2', ONTEM)],
    )

    expect(erros).toHaveLength(3)
    expect(erros.every((erro) => erro.skillId === 'tactics.fork')).toBe(true)
  })
})

// ---------------------------------------------------------------- pureza

describe('determinismo', () => {
  it('a mesma entrada produz exatamente a mesma saída', () => {
    const analises = [analise({ ply: 10 }), analise({ ply: 12, gameId: 'p2', severity: 'erro' })]
    const partidas = [partida('p1', ONTEM), partida('p2', ONTEM)]

    expect(chamar(analises, partidas)).toEqual(chamar(analises, partidas))
  })

  it('não lê o relógio: mudar só o `agora` muda o resultado', () => {
    const analises = [analise()]
    const partidas = [partida('p1', ONTEM)]
    const muitoDepois = new Date('2026-11-09T08:00:00.000Z')

    expect(chamar(analises, partidas)).toHaveLength(1)
    expect(
      errosRecentesDeAnalises(analises, indexarPartidas(partidas), { agora: muitoDepois }),
    ).toHaveLength(0)
  })
})

// ------------------------------------------------- integração com o planner

function perfil(): UserProfile {
  return {
    id: 'usuario-teste',
    createdAt: '2026-08-01T00:00:00.000Z',
    estimatedRating: 1100,
    dailyBudgetMinutes: 60,
    preferences: { boardTheme: 'claro', reducedMotion: false },
  }
}

/** Domínio uniforme: o único sinal que varia entre os casos é o erro de partida. */
function masteryUniforme(): SkillMastery[] {
  return SKILL_IDS.map((skillId) => ({
    ...createMastery(skillId),
    attempts: 40,
    exposures: 40,
    recentAccuracy: 0.7,
    retentionAccuracy: 0.7,
    mastery: 0.7,
    confidence: 0.8,
  }))
}

function contexto(recentGameErrors: RecentGameError[]): PlannerContext {
  return {
    profile: perfil(),
    mastery: masteryUniforme(),
    dueCards: [],
    recentGameErrors,
    now: AGORA,
  }
}

describe('o resultado alimenta o plano do dia', () => {
  const analises = [
    analise({ ply: 18 }),
    analise({ ply: 26, severity: 'erro' }),
    analise({ ply: 34 }),
  ]
  const partidas = [partida('p1', ONTEM)]

  it('faz nascer o bloco de erro de partida, com o número de ocorrências', () => {
    const erros = chamar(analises, partidas)
    const plano = buildDailyPlan(contexto(erros), 'seed-fixa')

    const bloco = plano.blocks.find((item) => item.kind === 'erro-de-partida')
    expect(bloco, 'o plano precisa destacar o erro vindo da partida').toBeDefined()
    expect(bloco?.skillIds).toContain('tactics.fork')
    expect(bloco?.rationale).toContain('3 lances')
  })

  it('controle: sem os erros, o mesmo contexto não gera o bloco', () => {
    // Sem este caso o teste acima aprovaria um planner que sempre põe o bloco.
    const plano = buildDailyPlan(contexto([]), 'seed-fixa')

    expect(plano.blocks.some((item) => item.kind === 'erro-de-partida')).toBe(false)
  })

  it('controle: partida antiga não gera o bloco', () => {
    const erros = chamar(analises, [partida('p1', TRES_SEMANAS_ATRAS)])
    const plano = buildDailyPlan(contexto(erros), 'seed-fixa')

    expect(erros).toEqual([])
    expect(plano.blocks.some((item) => item.kind === 'erro-de-partida')).toBe(false)
  })
})

// ------------------------------------------------------------------ config

describe('configuração', () => {
  it('a janela é a mesma do planner, derivada e não copiada', () => {
    expect(ERROS_RECENTES_CONFIG.janelaDias).toBe(PLANNER_CONFIG.janelaErrosRecentesDias)
  })

  it('o teto de partidas varridas é positivo', () => {
    expect(ERROS_RECENTES_CONFIG.maxPartidasVarridas).toBeGreaterThan(0)
  })
})
