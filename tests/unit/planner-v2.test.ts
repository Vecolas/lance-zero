/**
 * Portão do Today Planner V2.
 *
 * Os dez testes críticos da §43 do plano moram aqui, e cada um afirma uma das
 * dez regras duras da §34. A ordem dos `describe` segue a das regras para que
 * uma regra sem teste fique visível como buraco na sequência.
 *
 * O TESTE QUE MAIS IMPORTA é `nenhuma atividade depende de outra do mesmo
 * plano`. Ele é a razão de "qualquer ordem" ser verdade: sem ele, a promessa da
 * tela (faça 4 → 1 → 5 → 2 → 3) dependeria de sorte na seleção, e quebraria no
 * dia em que o catálogo crescesse — silenciosamente, porque um aluno que abre a
 * prática antes da lição não recebe erro nenhum, só uma pergunta que ele não
 * tem como responder.
 */

import { describe, expect, it } from 'vitest'
import {
  ESTAGIO_MINIMO_DO_TIPO,
  criarSkillState,
  estagioAlcanca,
  marcarParaReensino,
  prerequisitosDe,
  type LearningStage,
  type SkillState,
} from '@/domain/aprendizado'
import {
  PLANNER_V2_CONFIG,
  buildDailyPlanV2,
  tiposPermitidos,
  type PlannerV2Context,
} from '@/domain/planning/planner-v2'
import type { RecentGameError } from '@/domain/planning/planner'
import { SKILL_IDS, type ReviewCard, type SkillId, type UserProfile } from '@/domain/types'
import { OPENING_COURSES } from '@/content/openings/course'
import { emptyOpeningProgress, markOpeningLearned } from '@/domain/openings'

const AGORA = new Date('2026-03-10T12:00:00.000Z')

const PERFIL: UserProfile = {
  id: 'aluno',
  createdAt: '2026-01-01T00:00:00.000Z',
  estimatedRating: 1100,
  dailyBudgetMinutes: 40,
  preferences: { boardTheme: 'claro', reducedMotion: false },
}

/** Todas as habilidades num estágio só. Base de quase todo cenário. */
function todasEm(stage: LearningStage): SkillState[] {
  return SKILL_IDS.map((skillId) => {
    const base = criarSkillState(skillId, AGORA)
    if (stage === 'unseen') return base
    return {
      ...base,
      stage,
      exposureCount: 1,
      guidedAttempts: 4,
      guidedSuccesses: 4,
      independentAttempts: estagioAlcanca(stage, 'independent') ? 4 : 0,
      independentSuccesses: estagioAlcanca(stage, 'independent') ? 4 : 0,
      lastTaughtAt: AGORA.toISOString(),
    }
  })
}

function contexto(parcial: Partial<PlannerV2Context> = {}): PlannerV2Context {
  return {
    profile: PERFIL,
    skillStates: todasEm('unseen'),
    dueCards: [],
    recentGameErrors: [],
    now: AGORA,
    ...parcial,
  }
}

function cardVencido(skillIds: SkillId[], id = 'card-1'): ReviewCard {
  return {
    id,
    kind: 'conceito',
    skillIds,
    fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    solutionUci: ['h1h8'],
    prompt: 'Teste',
    createdAt: '2026-03-01T00:00:00.000Z',
    dueAt: '2026-03-09T00:00:00.000Z',
    scheduler: {
      stability: 1,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 'review',
      lastReviewAt: '2026-03-01T00:00:00.000Z',
    },
  }
}

// ------------------------------------------------------------------- R1

describe('R1 — unseen nunca gera prática independente', () => {
  it('a tabela de estágio mínimo barra os tipos que cobram', () => {
    expect(ESTAGIO_MINIMO_DO_TIPO.licao).toBe('unseen')
    expect(ESTAGIO_MINIMO_DO_TIPO.diagnostico).toBe('unseen')
    // Afirmado sobre a TABELA e não sobre um nome: um tipo novo que cobre
    // resposta e nasça com mínimo `unseen` cai aqui.
    for (const [tipo, minimo] of Object.entries(ESTAGIO_MINIMO_DO_TIPO)) {
      if (tipo === 'licao' || tipo === 'diagnostico') continue
      expect(minimo, `${tipo} aceita habilidade nunca ensinada`).not.toBe('unseen')
    }
  })

  it('tiposPermitidos para unseen só devolve ensino e calibração', () => {
    expect(tiposPermitidos(criarSkillState('tactics.fork', AGORA)).sort()).toEqual([
      'diagnostico',
      'licao',
    ])
  })

  it('o plano de um aluno novo NÃO contém nenhuma atividade que cobre', () => {
    const plano = buildDailyPlanV2(contexto(), 'seed')
    expect(plano.activities.length).toBeGreaterThan(0)
    for (const atividade of plano.activities) {
      expect(
        ['licao', 'diagnostico', 'revisao-de-partida'],
        `${atividade.id} cobra um aluno que nunca viu o tema`,
      ).toContain(atividade.definition.kind)
    }
  })

  it('o erro de partida de um tema nunca ensinado vira LIÇÃO, não exercício', () => {
    const erros: RecentGameError[] = [
      { skillId: 'tactics.hanging-piece', severity: 'erro-grave', ocorridoEm: AGORA.toISOString() },
    ]
    const plano = buildDailyPlanV2(contexto({ recentGameErrors: erros }), 'seed')
    const doErro = plano.activities.find((a) =>
      a.definition.skillIds.includes('tactics.hanging-piece'),
    )
    expect(doErro).toBeDefined()
    // É a §12 do plano inteira, num teste: o MESMO erro real gera ensino ou
    // cobrança conforme o estágio, e nunca "qual é o melhor lance?" para quem
    // não recebeu o conceito.
    expect(doErro?.definition.kind).toBe('licao')
  })
})

// ------------------------------------------------------------------- R6

describe('R6 — erro de partida vira prática só se o conceito já é conhecido', () => {
  it('com a habilidade em independent, o mesmo erro vira prática independente', () => {
    const erros: RecentGameError[] = [
      { skillId: 'tactics.hanging-piece', severity: 'erro-grave', ocorridoEm: AGORA.toISOString() },
    ]
    const plano = buildDailyPlanV2(
      contexto({ recentGameErrors: erros, skillStates: todasEm('independent') }),
      'seed',
    )
    const doErro = plano.activities.find((a) => a.definition.id === 'erro-tactics.hanging-piece')
    expect(doErro?.definition.kind).toBe('pratica-independente')
  })

  it('com a habilidade em introduced, vira prática GUIADA', () => {
    const erros: RecentGameError[] = [
      { skillId: 'tactics.hanging-piece', severity: 'erro', ocorridoEm: AGORA.toISOString() },
    ]
    const plano = buildDailyPlanV2(
      contexto({ recentGameErrors: erros, skillStates: todasEm('introduced') }),
      'seed',
    )
    const doErro = plano.activities.find((a) => a.definition.id === 'erro-tactics.hanging-piece')
    expect(doErro?.definition.kind).toBe('pratica-guiada')
  })
})

// ------------------------------------------------------------------- R2

describe('R2 — nenhuma atividade depende de outra do mesmo plano', () => {
  /**
   * A invariante, afirmada sobre o GRAFO e não sobre um par escolhido a dedo.
   *
   * Um teste que checasse só "cravada e peça pendurada não coexistem" passaria
   * para sempre enquanto o planner nunca as escolhesse juntas por acaso —
   * incluindo pelos motivos errados.
   *
   * O CRITÉRIO É DIRECIONAL, e a primeira versão deste arquivo o escreveu largo
   * demais: rejeitava também dois treinos de habilidades aparentadas cujos
   * pré-requisitos já estavam satisfeitos ANTES do plano — o que a §8 permite
   * explicitamente. O que quebra "qualquer ordem" é depender de um conceito que
   * o plano APRESENTA HOJE. Ver `podeEntrarCom`, no planner.
   */
  function dependeDeConceitoApresentadoHoje(
    atividades: readonly { skillIds: readonly SkillId[]; apresentaConceitoNovo: boolean }[],
  ): boolean {
    const apresentadasHoje = new Set(
      atividades.filter((a) => a.apresentaConceitoNovo).flatMap((a) => a.skillIds),
    )
    return atividades.some(
      (atividade) =>
        !atividade.apresentaConceitoNovo &&
        atividade.skillIds.some((skillId) =>
          prerequisitosDe(skillId).some((pai) => apresentadasHoje.has(pai)),
        ),
    )
  }

  function resumir(plano: ReturnType<typeof buildDailyPlanV2>) {
    return plano.activities.map((a) => ({
      skillIds: a.definition.skillIds,
      apresentaConceitoNovo:
        a.definition.kind === 'licao' && a.definition.pedagogicalStage === 'unseen',
    }))
  }

  it('vale para um aluno novo', () => {
    expect(dependeDeConceitoApresentadoHoje(resumir(buildDailyPlanV2(contexto(), 'seed')))).toBe(
      false,
    )
  })

  it('vale em vários estágios e várias seeds', () => {
    const estagios: LearningStage[] = ['unseen', 'introduced', 'guided', 'independent', 'review']
    for (const stage of estagios) {
      for (const seed of ['a', 'b', 'c', '2026-03-10', '2026-07-04']) {
        const plano = buildDailyPlanV2(contexto({ skillStates: todasEm(stage) }), seed)
        expect(
          dependeDeConceitoApresentadoHoje(resumir(plano)),
          `estágio ${stage}, seed ${seed}`,
        ).toBe(false)
      }
    }
  })

  /**
   * O cenário do plano §8, montado à mão: peça pendurada nunca vista, garfo já
   * conhecido. O planner PODE querer ensinar a primeira e cobrar a segunda no
   * mesmo dia — e é exatamente isso que a regra proíbe, porque abrir o garfo
   * antes usaria uma ferramenta que só o outro card entrega.
   */
  it('não cobra uma habilidade cujo pré-requisito é ensinado hoje', () => {
    const estados = SKILL_IDS.map((skillId) => {
      const base = criarSkillState(skillId, AGORA)
      if (skillId === 'tactics.hanging-piece') return base
      return {
        ...base,
        stage: 'independent' as const,
        exposureCount: 1,
        guidedAttempts: 4,
        guidedSuccesses: 4,
        independentAttempts: 4,
        independentSuccesses: 4,
      }
    })

    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const plano = buildDailyPlanV2(contexto({ skillStates: estados }), seed)
      expect(dependeDeConceitoApresentadoHoje(resumir(plano)), `seed ${seed}`).toBe(false)
    }
  })

  it('só oferece conceito novo cujos pré-requisitos JÁ estavam satisfeitos', () => {
    // Só as raízes em `guided`; o resto nunca visto.
    const estados = SKILL_IDS.map((skillId) => {
      const base = criarSkillState(skillId, AGORA)
      if (prerequisitosDe(skillId).length > 0) return base
      return {
        ...base,
        stage: 'guided' as const,
        exposureCount: 1,
        guidedAttempts: 2,
        guidedSuccesses: 2,
      }
    })

    const plano = buildDailyPlanV2(contexto({ skillStates: estados }), 'seed')
    const licoesNovas = plano.activities.filter((a) => a.definition.id.startsWith('curriculo-'))

    for (const atividade of licoesNovas) {
      for (const skillId of atividade.definition.skillIds) {
        for (const pai of prerequisitosDe(skillId)) {
          const paiEstado = estados.find((e) => e.skillId === pai)
          expect(
            estagioAlcanca(paiEstado?.stage ?? 'unseen', 'guided'),
            `${skillId} foi oferecida sem ${pai} estar pronta`,
          ).toBe(true)
        }
      }
    }
  })
})

describe('aberturas — aprender e treinar são cards independentes', () => {
  it('aluno novo recebe Aprender, mas nunca Treinar a mesma abertura', () => {
    const plano = buildDailyPlanV2(contexto({ openingCourses: [OPENING_COURSES[0]] }), 'aberturas')
    const cards = plano.activities.filter(
      (item) => item.definition.openingId === OPENING_COURSES[0].id,
    )
    expect(cards.map((item) => item.definition.openingMode)).toEqual(['learn'])
  })

  it('depois de ensinar, recebe Treinar sem duplicar Aprender no mesmo dia', () => {
    const opening = OPENING_COURSES[0]
    const progress = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      opening.rootNodeId,
      AGORA.toISOString(),
    )
    const plano = buildDailyPlanV2(
      contexto({ openingCourses: [opening], openingProgress: [progress] }),
      'aberturas',
    )
    const cards = plano.activities.filter((item) => item.definition.openingId === opening.id)
    expect(cards.map((item) => item.definition.openingMode)).toEqual(['train'])
  })
})

// ------------------------------------------------------------------- R5

describe('R5 — revisões vencidas têm prioridade', () => {
  it('a revisão vencida entra no plano', () => {
    const plano = buildDailyPlanV2(
      contexto({
        skillStates: todasEm('independent'),
        dueCards: [cardVencido(['tactics.fork'])],
      }),
      'seed',
    )
    expect(plano.activities.some((a) => a.definition.kind === 'revisao')).toBe(true)
  })

  it('card NÃO vencido não entra', () => {
    const futuro: ReviewCard = {
      ...cardVencido(['tactics.fork']),
      dueAt: '2026-12-31T00:00:00.000Z',
    }
    const plano = buildDailyPlanV2(
      contexto({ skillStates: todasEm('independent'), dueCards: [futuro] }),
      'seed',
    )
    expect(plano.activities.some((a) => a.definition.kind === 'revisao')).toBe(false)
  })
})

// ------------------------------------------------------- teste 7 do plano

describe('teste 7 — revisão vencida com reensino pendente vira lição', () => {
  it('a revisão NÃO é oferecida, e a lição é', () => {
    const estados = todasEm('review').map((estado) =>
      estado.skillId === 'tactics.fork' ? marcarParaReensino(estado, AGORA) : estado,
    )

    const plano = buildDailyPlanV2(
      contexto({ skillStates: estados, dueCards: [cardVencido(['tactics.fork'])] }),
      'seed',
    )

    const revisao = plano.activities.find((a) => a.definition.kind === 'revisao')
    expect(revisao, 'ofereceu revisão de um tema nunca ensinado').toBeUndefined()

    const reensino = plano.activities.find((a) => a.definition.id === 'reensino-tactics.fork')
    expect(reensino).toBeDefined()
    expect(reensino?.definition.kind).toBe('licao')
  })

  it('tiposPermitidos com reensino pendente barra tudo o que cobra', () => {
    const marcado = marcarParaReensino(todasEm('review')[0], AGORA)
    expect(tiposPermitidos(marcado).sort()).toEqual(['diagnostico', 'licao'])
  })
})

// ------------------------------------------------------------- R7, R8, R9

describe('R7, R8 e R9 — os limites do dia', () => {
  it('não passa do teto de conceitos novos', () => {
    const plano = buildDailyPlanV2(contexto(), 'seed')
    const novas = plano.activities.filter(
      (a) => a.definition.kind === 'licao' && a.definition.pedagogicalStage === 'unseen',
    )
    expect(novas.length).toBeLessThanOrEqual(PLANNER_V2_CONFIG.maxConceitosNovosPorDia)
  })

  it('não repete a mesma habilidade além do teto', () => {
    for (const seed of ['a', 'b', 'c']) {
      const plano = buildDailyPlanV2(contexto({ skillStates: todasEm('independent') }), seed)
      const contagem = new Map<SkillId, number>()
      for (const atividade of plano.activities) {
        for (const skillId of atividade.definition.skillIds) {
          contagem.set(skillId, (contagem.get(skillId) ?? 0) + 1)
        }
      }
      for (const [skillId, vezes] of contagem) {
        expect(vezes, `${skillId} aparece demais`).toBeLessThanOrEqual(
          PLANNER_V2_CONFIG.maxAtividadesPorHabilidade,
        )
      }
    }
  })

  it('a soma dos minutos nunca passa do orçamento', () => {
    for (const minutos of [20, 40, 60] as const) {
      for (const stage of ['unseen', 'guided', 'independent'] as LearningStage[]) {
        const plano = buildDailyPlanV2(
          contexto({
            profile: { ...PERFIL, dailyBudgetMinutes: minutos },
            skillStates: todasEm(stage),
          }),
          'seed',
        )
        const soma = plano.activities.reduce((t, a) => t + a.definition.estimatedMinutes, 0)
        expect(soma, `orçamento de ${minutos} estourado em ${stage}`).toBeLessThanOrEqual(minutos)
      }
    }
  })
})

// ------------------------------------------------------------------ R10

describe('R10 — todo card tem motivo explicável', () => {
  it('nenhuma atividade sai sem motivo, em nenhum cenário', () => {
    const cenarios = [
      contexto(),
      contexto({ skillStates: todasEm('independent') }),
      contexto({
        skillStates: todasEm('review'),
        dueCards: [cardVencido(['tactics.fork'])],
        recentGameErrors: [
          { skillId: 'tactics.pin', severity: 'erro', ocorridoEm: AGORA.toISOString() },
        ],
        partidasPorRevisar: [{ id: 'p1', rotulo: 'Você x Adversário' }],
      }),
    ]

    for (const cenario of cenarios) {
      for (const atividade of buildDailyPlanV2(cenario, 'seed').activities) {
        expect(atividade.generatedReason.length, `${atividade.id} sem motivo`).toBeGreaterThan(20)
        // O motivo é para o ALUNO ler: nada de id de habilidade cru na frase.
        expect(atividade.generatedReason).not.toMatch(/tactics\.|endgame\.|calculation\./)
      }
    }
  })
})

// ---------------------------------------------------------- determinismo

describe('teste 8 — mesmos inputs e mesma seed dão o mesmo plano', () => {
  it('é determinístico', () => {
    const a = buildDailyPlanV2(contexto({ skillStates: todasEm('guided') }), 'seed-fixa')
    const b = buildDailyPlanV2(contexto({ skillStates: todasEm('guided') }), 'seed-fixa')
    expect(a).toEqual(b)
  })

  it('seeds diferentes podem dar planos diferentes, mas sempre válidos', () => {
    const planos = ['a', 'b', 'c', 'd'].map((seed) =>
      buildDailyPlanV2(contexto({ skillStates: todasEm('guided') }), seed),
    )
    for (const plano of planos) {
      expect(plano.activities.length).toBeGreaterThan(0)
      const soma = plano.activities.reduce((t, a) => t + a.definition.estimatedMinutes, 0)
      expect(soma).toBeLessThanOrEqual(PERFIL.dailyBudgetMinutes)
    }
  })

  it('ids de atividade são únicos dentro do plano', () => {
    const plano = buildDailyPlanV2(contexto({ skillStates: todasEm('guided') }), 'seed')
    const ids = plano.activities.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toda atividade nasce pendente, sem carimbo de conclusão', () => {
    for (const atividade of buildDailyPlanV2(contexto(), 'seed').activities) {
      expect(atividade.status).toBe('pendente')
      expect(atividade.completedAt).toBeNull()
      expect(atividade.startedAt).toBeNull()
      expect(atividade.progress.completedItemIds).toEqual([])
    }
  })

  it('toda atividade aponta para uma rota interna', () => {
    for (const atividade of buildDailyPlanV2(contexto(), 'seed').activities) {
      expect(atividade.definition.href.startsWith('/')).toBe(true)
    }
  })
})
