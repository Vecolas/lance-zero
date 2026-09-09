import { describe, expect, it } from 'vitest'

import {
  PLANNER_CONFIG,
  buildDailyPlan,
  type PlannerContext,
  type RecentGameError,
} from '@/domain/planning/planner'
import { createRng, hashSeed } from '@/domain/planning/rng'
import { createMastery } from '@/domain/skills/mastery'
import {
  SKILL_IDS,
  type DailyPlan,
  type ReviewCard,
  type SkillId,
  type SkillMastery,
  type UserProfile,
} from '@/domain/types'

const AGORA = new Date('2026-09-09T08:00:00.000Z')

function perfil(dailyBudgetMinutes: 20 | 40 | 60): UserProfile {
  return {
    id: 'usuario-teste',
    createdAt: '2026-08-01T00:00:00.000Z',
    estimatedRating: 1100,
    dailyBudgetMinutes,
    preferences: { boardTheme: 'claro', reducedMotion: false },
  }
}

/** Todas as habilidades com o mesmo domínio, para isolar o que o teste varia. */
function masteryUniforme(valor: number, confianca = 0.8): SkillMastery[] {
  return SKILL_IDS.map((skillId) => ({
    ...createMastery(skillId),
    attempts: 40,
    exposures: 40,
    recentAccuracy: valor,
    retentionAccuracy: valor,
    mastery: valor,
    confidence: confianca,
  }))
}

function comMastery(base: SkillMastery[], skillId: SkillId, valor: number): SkillMastery[] {
  return base.map((item) =>
    item.skillId === skillId
      ? { ...item, mastery: valor, recentAccuracy: valor, retentionAccuracy: valor }
      : item,
  )
}

function card(id: string, dueAt: string, skillIds: SkillId[]): ReviewCard {
  return {
    id,
    kind: 'erro-de-partida',
    skillIds,
    fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    solutionUci: ['a1b1'],
    prompt: 'Qual é o melhor lance?',
    createdAt: '2026-09-01T00:00:00.000Z',
    dueAt,
    scheduler: {
      stability: 1,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 'review',
      lastReviewAt: '2026-09-08T00:00:00.000Z',
    },
  }
}

function erro(skillId: SkillId, severity: RecentGameError['severity']): RecentGameError {
  return { skillId, severity, ocorridoEm: '2026-09-07T20:00:00.000Z' }
}

function contextoVazio(budget: 20 | 40 | 60 = 40): PlannerContext {
  return {
    profile: perfil(budget),
    mastery: [],
    dueCards: [],
    recentGameErrors: [],
    now: AGORA,
  }
}

function contextoCompleto(budget: 20 | 40 | 60 = 60): PlannerContext {
  return {
    profile: perfil(budget),
    mastery: masteryUniforme(0.6),
    dueCards: [
      card('card-1', '2026-09-08T08:00:00.000Z', ['tactics.pin']),
      card('card-2', '2026-09-07T08:00:00.000Z', ['tactics.back-rank']),
      card('card-3', '2026-09-09T07:00:00.000Z', ['endgame.basic-mates']),
    ],
    recentGameErrors: [
      erro('tactics.hanging-piece', 'erro-grave'),
      erro('tactics.hanging-piece', 'erro'),
      erro('opening.king-safety', 'imprecisao'),
    ],
    now: AGORA,
  }
}

function totalDosBlocos(plano: DailyPlan): number {
  return plano.blocks.reduce((soma, bloco) => soma + bloco.estimatedMinutes, 0)
}

describe('createRng', () => {
  it('é determinístico por seed e diverge entre seeds', () => {
    const a = createRng('abc')
    const b = createRng('abc')
    const c = createRng('xyz')

    const serie = (rng: ReturnType<typeof createRng>): number[] =>
      Array.from({ length: 5 }, () => rng.next())

    expect(serie(a)).toEqual(serie(b))
    expect(serie(createRng('abc'))).not.toEqual(serie(c))
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
  })

  it('mantém int dentro do intervalo pedido', () => {
    const rng = createRng(7)
    for (let i = 0; i < 200; i += 1) {
      const valor = rng.int(4)
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(4)
    }
    expect(rng.int(0)).toBe(0)
  })
})

describe('buildDailyPlan — determinismo', () => {
  it('produz exatamente o mesmo plano para o mesmo contexto e seed', () => {
    const primeiro = buildDailyPlan(contextoCompleto(), 'seed-fixa')
    const segundo = buildDailyPlan(contextoCompleto(), 'seed-fixa')

    expect(segundo).toEqual(primeiro)
  })

  it('permite planos diferentes com seeds diferentes', () => {
    const planos = new Set<string>()
    for (let seed = 1; seed <= 12; seed += 1) {
      planos.add(JSON.stringify(buildDailyPlan(contextoVazio(60), seed)))
    }

    expect(planos.size).toBeGreaterThan(1)
  })
})

describe('buildDailyPlan — orçamento', () => {
  const orcamentos: Array<20 | 40 | 60> = [20, 40, 60]

  it('nunca ultrapassa o orçamento do perfil', () => {
    for (const orcamento of orcamentos) {
      for (const contexto of [contextoVazio(orcamento), contextoCompleto(orcamento)]) {
        for (let seed = 1; seed <= 6; seed += 1) {
          const plano = buildDailyPlan(contexto, seed)
          expect(plano.budgetMinutes).toBe(orcamento)
          expect(totalDosBlocos(plano)).toBe(plano.totalMinutes)
          expect(plano.totalMinutes).toBeLessThanOrEqual(orcamento)
          expect(plano.totalMinutes).toBeGreaterThan(0)
          // Sem material finito sobrando, o plano ocupa o orçamento inteiro.
          expect(plano.totalMinutes).toBe(orcamento)
        }
      }
    }
  })

  it('respeita o mínimo de minutos por bloco', () => {
    const plano = buildDailyPlan(contextoCompleto(60), 3)

    for (const bloco of plano.blocks) {
      expect(bloco.estimatedMinutes).toBeGreaterThanOrEqual(PLANNER_CONFIG.minutosMinimosPorBloco)
      expect(bloco.itemCount).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('buildDailyPlan — prioridades', () => {
  it('coloca revisão vencida antes de qualquer conteúdo novo', () => {
    const plano = buildDailyPlan(contextoCompleto(60), 'prioridade')

    expect(plano.blocks[0].kind).toBe('revisao')
    expect(plano.blocks[0].reviewCardIds?.length).toBeGreaterThan(0)
    // Ordenado por vencimento: o card mais antigo entra primeiro.
    expect(plano.blocks[0].reviewCardIds?.[0]).toBe('card-2')
  })

  it('ignora cards que ainda não venceram', () => {
    const contexto: PlannerContext = {
      ...contextoVazio(40),
      dueCards: [card('futuro', '2026-09-20T08:00:00.000Z', ['tactics.pin'])],
    }
    const plano = buildDailyPlan(contexto, 1)

    expect(plano.blocks.some((bloco) => bloco.kind === 'revisao')).toBe(false)
  })

  it('coloca a fraqueza de partida real logo depois das revisões', () => {
    const plano = buildDailyPlan(contextoCompleto(60), 'prioridade')
    const erroDePartida = plano.blocks[1]

    expect(erroDePartida.kind).toBe('erro-de-partida')
    expect(erroDePartida.skillIds).toContain('tactics.hanging-piece')
    expect(erroDePartida.rationale).toContain('partidas')
  })

  it('prioriza habilidade fraca sobre habilidade forte da mesma área', () => {
    const contexto: PlannerContext = {
      ...contextoVazio(60),
      mastery: comMastery(masteryUniforme(0.9), 'tactics.fork', 0.05),
    }
    const plano = buildDailyPlan(contexto, 'fraqueza')
    const tatica = plano.blocks.find((bloco) => bloco.kind === 'tatica')

    expect(tatica).toBeDefined()
    expect(tatica?.skillIds[0]).toBe('tactics.fork')
    expect(plano.blocks[0].skillIds[0]).toBe('tactics.fork')
  })

  it('inclui um bloco de cálculo quando ainda há orçamento', () => {
    const plano = buildDailyPlan(contextoVazio(60), 'calculo')
    const calculo = plano.blocks.find((bloco) => bloco.kind === 'calculo')

    expect(calculo).toBeDefined()
    expect(calculo?.skillIds.every((id) => id.startsWith('calculation.'))).toBe(true)
  })
})

describe('buildDailyPlan — usuário novo', () => {
  it('cai no currículo rotativo e ainda respeita o orçamento', () => {
    for (const orcamento of [20, 40, 60] as const) {
      const plano = buildDailyPlan(contextoVazio(orcamento), 'novo-usuario')

      expect(plano.blocks.length).toBeGreaterThan(0)
      expect(plano.totalMinutes).toBeLessThanOrEqual(orcamento)
      expect(plano.blocks.some((bloco) => bloco.kind === 'revisao')).toBe(false)
      expect(plano.blocks.some((bloco) => bloco.kind === 'erro-de-partida')).toBe(false)
      expect(plano.generatedFor).toBe('2026-09-09')
    }
  })
})

describe('buildDailyPlan — explicabilidade', () => {
  it('dá um rationale não vazio e habilidades para todo bloco', () => {
    const contextos = [contextoVazio(20), contextoVazio(60), contextoCompleto(40)]

    for (const contexto of contextos) {
      for (let seed = 1; seed <= 4; seed += 1) {
        const plano = buildDailyPlan(contexto, seed)
        for (const bloco of plano.blocks) {
          expect(bloco.rationale.trim().length).toBeGreaterThan(0)
          expect(bloco.title.trim().length).toBeGreaterThan(0)
          expect(bloco.skillIds.length).toBeGreaterThan(0)
          expect(bloco.id.length).toBeGreaterThan(0)
        }
        const ids = plano.blocks.map((bloco) => bloco.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })

  it('cita o número de revisões vencidas no rationale', () => {
    const plano = buildDailyPlan(contextoCompleto(60), 'rationale')

    expect(plano.blocks[0].rationale).toContain('3 revisões vencidas')
  })
})
