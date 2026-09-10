/**
 * Portão da primeira semana.
 *
 * Cobra o critério de aceite "a primeira semana respeita o orçamento de tempo
 * informado" — para OS TRÊS orçamentos que o produto oferece, varridos da
 * fonte (`BUDGET_OPTIONS`), e não para o que eu lembrei de escrever.
 *
 * Cobra também que não nasceu um segundo planner: os blocos da semana têm de
 * ser exatamente os que `buildDailyPlan` produz para o mesmo dia. Se alguém
 * escrever aqui uma regra de alocação própria, este caso reprova.
 */

import { describe, expect, it } from 'vitest'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import {
  PRIMEIRA_SEMANA_CONFIG,
  estimarDiagnostico,
  masteryInicial,
  montarPrimeiraSemana,
  perfilDoDiagnostico,
  type RespostaDeDiagnostico,
} from '@/domain/diagnostic'
import { buildDailyPlan } from '@/domain/planning/planner'
import { BUDGET_OPTIONS, createDefaultProfile, DEFAULT_ESTIMATED_RATING } from '@/domain/profile'

const AGORA = new Date('2026-09-10T12:00:00.000Z')
const INICIO = new Date('2026-09-14T09:30:00.000Z')

const RESPOSTAS: RespostaDeDiagnostico[] = BANCO_DE_DIAGNOSTICO.map((item) => ({
  itemId: item.id,
  lanceEscolhido:
    item.dificuldade <= DEFAULT_ESTIMATED_RATING ? item.lancesAceitos[0] : item.alternativas[0],
  thinkTimeMs: 15_000,
}))

function semanaCom(orcamento: (typeof BUDGET_OPTIONS)[number], inicio: Date = INICIO) {
  const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, RESPOSTAS, {
    ratingInformado: DEFAULT_ESTIMATED_RATING,
  })
  const profile = perfilDoDiagnostico(createDefaultProfile('aluno-semana', AGORA), {
    estimativa,
    orcamento,
  })
  const mastery = masteryInicial(BANCO_DE_DIAGNOSTICO, RESPOSTAS, AGORA)
  return { profile, mastery, semana: montarPrimeiraSemana({ profile, mastery, inicio }) }
}

describe('primeira semana', () => {
  /**
   * O sete é CRAVADO aqui de propósito, e é a única coisa cravada neste
   * arquivo: a promessa da issue #11 é "uma primeira semana". Se um dia o
   * produto passar a entregar outro horizonte, isso é mudança de promessa e
   * tem de doer num teste, não passar batido num ajuste de configuração.
   */
  it('a primeira semana cobre sete dias', () => {
    expect(PRIMEIRA_SEMANA_CONFIG.dias).toBe(7)
    const { semana } = semanaCom(40)
    expect(semana.dias.length).toBe(PRIMEIRA_SEMANA_CONFIG.dias)
  })

  it('nenhum dia passa do orçamento informado, em nenhum dos orçamentos', () => {
    for (const orcamento of BUDGET_OPTIONS) {
      const { semana } = semanaCom(orcamento)
      for (const dia of semana.dias) {
        expect(dia.plano.budgetMinutes, `${orcamento} min, dia ${dia.data}`).toBe(orcamento)
        expect(dia.plano.totalMinutes, `${orcamento} min, dia ${dia.data}`).toBeLessThanOrEqual(
          orcamento,
        )
        expect(dia.plano.blocks.length, `${orcamento} min, dia ${dia.data}`).toBeGreaterThan(0)
      }
    }
  })

  it('os dias são consecutivos e saem do início informado', () => {
    const { semana } = semanaCom(40)
    expect(semana.dias[0].data).toBe('2026-09-14')
    const datas = semana.dias.map((dia) => Date.parse(`${dia.data}T00:00:00.000Z`))
    for (let i = 1; i < datas.length; i += 1) {
      expect(datas[i] - datas[i - 1]).toBe(86_400_000)
    }
  })

  it('o relógio entra por parâmetro: outro início, outras datas', () => {
    const outra = semanaCom(40, new Date('2027-03-01T23:59:59.000Z'))
    expect(outra.semana.dias[0].data).toBe('2027-03-01')
    expect(outra.semana.dias[0].data).not.toBe(semanaCom(40).semana.dias[0].data)
  })

  it('a mesma entrada produz exatamente a mesma semana', () => {
    expect(semanaCom(60).semana).toEqual(semanaCom(60).semana)
  })

  it('o total é derivado dos dias, não guardado à parte', () => {
    const { semana } = semanaCom(20)
    const soma = semana.dias.reduce((total, dia) => total + dia.plano.totalMinutes, 0)
    expect(semana.totalMinutes).toBe(soma)
  })

  /** Não existe um segundo planner: cada dia é `buildDailyPlan` e nada mais. */
  it('cada dia é exatamente o plano que o planner do produto produz', () => {
    const { profile, mastery, semana } = semanaCom(40)
    for (const dia of semana.dias) {
      const esperado = buildDailyPlan(
        {
          profile,
          mastery: [...mastery],
          dueCards: [],
          recentGameErrors: [],
          now: new Date(`${dia.data}T00:00:00.000Z`),
        },
        `${profile.id}|${dia.data}`,
      )
      expect(dia.plano, dia.data).toEqual(esperado)
    }
  })

  it('a semana não é sete cópias do mesmo dia', () => {
    const { semana } = semanaCom(60)
    const assinaturas = semana.dias.map((dia) =>
      dia.plano.blocks.map((bloco) => bloco.skillIds.join('+')).join('|'),
    )
    expect(new Set(assinaturas).size).toBeGreaterThan(1)
  })
})
