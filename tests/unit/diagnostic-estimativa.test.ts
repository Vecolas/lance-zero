/**
 * Portão do estimador do diagnóstico.
 *
 * O que ele cobra é o critério de aceite da issue #11 — "o diagnóstico produz um
 * perfil inicial coerente para respostas conhecidas" — e a armadilha de produto
 * que vem junto: quem informa 1100 e acerta o básico NÃO pode receber uma
 * trilha só de conceitos elementares.
 *
 * Essa armadilha é afirmada como REGRA COMPARATIVA, e não como um número
 * cravado de dificuldade: o plano de quem acertou o básico tem de ser, em
 * média, mais difícil que o de quem não acertou nada. Um limiar fixo aqui
 * reprovaria o código certo no dia em que o catálogo de habilidades mudasse de
 * escala.
 */

import { describe, expect, it } from 'vitest'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import {
  ESTIMATIVA_CONFIG,
  estimarDiagnostico,
  masteryInicial,
  perfilDoDiagnostico,
  type RespostaDeDiagnostico,
} from '@/domain/diagnostic'
import { buildDailyPlan, PLANNER_CONFIG } from '@/domain/planning/planner'
import { getSkill } from '@/domain/skills/catalog'
import { DEFAULT_ESTIMATED_RATING, createDefaultProfile } from '@/domain/profile'
import { SKILL_IDS, type SkillId } from '@/domain/types'

const AGORA = new Date('2026-09-10T12:00:00.000Z')

/** Tempo de reflexão fixo: o estimador não pode depender dele. */
const PENSOU_MS = 20_000

function responder(acertaSe: (dificuldade: number) => boolean): RespostaDeDiagnostico[] {
  return BANCO_DE_DIAGNOSTICO.map((item) => ({
    itemId: item.id,
    lanceEscolhido: acertaSe(item.dificuldade) ? item.lancesAceitos[0] : item.alternativas[0],
    thinkTimeMs: PENSOU_MS,
  }))
}

const ACERTOU_TUDO = responder(() => true)
const ERROU_TUDO = responder(() => false)
/** Perfil de ~1100: acerta o que está abaixo do nível dele, erra o que está acima. */
const PERFIL_1100 = responder((dificuldade) => dificuldade <= DEFAULT_ESTIMATED_RATING)

function planoDe(respostas: RespostaDeDiagnostico[], ratingInformado: number | null) {
  const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, respostas, { ratingInformado })
  const profile = perfilDoDiagnostico(createDefaultProfile('aluno', AGORA), {
    estimativa,
    orcamento: 40,
  })
  return buildDailyPlan(
    {
      profile,
      mastery: masteryInicial(BANCO_DE_DIAGNOSTICO, respostas, AGORA),
      dueCards: [],
      recentGameErrors: [],
      now: AGORA,
    },
    'seed-fixa',
  )
}

function dificuldadeMediaDoPlano(respostas: RespostaDeDiagnostico[]): number {
  const habilidades = planoDe(respostas, DEFAULT_ESTIMATED_RATING).blocks.flatMap(
    (bloco) => bloco.skillIds,
  )
  const soma = habilidades.reduce((total, id) => total + getSkill(id).baseDifficulty, 0)
  return soma / habilidades.length
}

describe('estimativa do diagnóstico', () => {
  it('as mesmas respostas produzem exatamente o mesmo perfil', () => {
    const primeira = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100, {
      ratingInformado: 1100,
    })
    const segunda = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100, {
      ratingInformado: 1100,
    })
    expect(segunda).toEqual(primeira)
  })

  it('a ordem das respostas não muda o perfil', () => {
    const direta = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100)
    const invertida = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, [...PERFIL_1100].reverse())
    expect(invertida).toEqual(direta)
  })

  it('quem acerta tudo é estimado acima de quem erra tudo', () => {
    const alto = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, ACERTOU_TUDO)
    const baixo = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, ERROU_TUDO)
    expect(alto.ratingEstimado).toBeGreaterThan(baixo.ratingEstimado)
    expect(alto.acertos).toBe(BANCO_DE_DIAGNOSTICO.length)
    expect(baixo.acertos).toBe(0)
  })

  it('a faixa contém a estimativa e não é um ponto', () => {
    const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100)
    expect(estimativa.faixaDeRating.minimo).toBeLessThanOrEqual(estimativa.ratingEstimado)
    expect(estimativa.faixaDeRating.maximo).toBeGreaterThanOrEqual(estimativa.ratingEstimado)
    expect(estimativa.faixaDeRating.maximo).toBeGreaterThan(estimativa.faixaDeRating.minimo)
  })

  it('sem resposta e sem autorrelato, a estimativa é o padrão declarado', () => {
    const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, [])
    expect(estimativa.ratingEstimado).toBe(DEFAULT_ESTIMATED_RATING)
    expect(estimativa.faixaDeRating).toEqual({
      minimo: ESTIMATIVA_CONFIG.gradeMinima,
      maximo: ESTIMATIVA_CONFIG.gradeMaxima,
    })
  })

  it('o desempenho puxa a estimativa contra um autorrelato exagerado', () => {
    const comAutorrelato = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, ERROU_TUDO, {
      ratingInformado: 1900,
    })
    const semAutorrelato = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, ERROU_TUDO)
    expect(comAutorrelato.ratingEstimado).toBeLessThan(1900)
    expect(comAutorrelato.ratingEstimado).toBeGreaterThan(semAutorrelato.ratingEstimado)
  })

  it('as habilidades não medidas saem do banco, não de uma lista à mão', () => {
    const medidas = new Set(BANCO_DE_DIAGNOSTICO.map((item) => item.skillId))
    const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100)
    const naoMedidas = new Set<SkillId>(estimativa.naoMedidas)

    for (const id of SKILL_IDS) {
      expect(naoMedidas.has(id), `${id} classificada errado`).toBe(!medidas.has(id))
    }
  })

  it('a maestria inicial só existe para habilidade que o banco perguntou', () => {
    const mastery = masteryInicial(BANCO_DE_DIAGNOSTICO, PERFIL_1100, AGORA)
    const medidas = new Set(BANCO_DE_DIAGNOSTICO.map((item) => item.skillId))
    expect(new Set(mastery.map((m) => m.skillId))).toEqual(medidas)
  })

  it('acertar sobe a maestria e errar não', () => {
    const bons = masteryInicial(BANCO_DE_DIAGNOSTICO, ACERTOU_TUDO, AGORA)
    const ruins = masteryInicial(BANCO_DE_DIAGNOSTICO, ERROU_TUDO, AGORA)
    for (const bom of bons) {
      const ruim = ruins.find((m) => m.skillId === bom.skillId)
      expect(ruim, `${bom.skillId} sumiu`).toBeDefined()
      expect(bom.mastery, `${bom.skillId}`).toBeGreaterThan(ruim!.mastery)
    }
  })

  /**
   * Quinze posições não sustentam afirmar domínio. A regra é comparada com o
   * limiar do PRÓPRIO planner, não com um número escrito aqui.
   */
  it('a confiança inicial fica no território de "ainda há pouco dado"', () => {
    for (const estado of masteryInicial(BANCO_DE_DIAGNOSTICO, ACERTOU_TUDO, AGORA)) {
      expect(estado.confidence, estado.skillId).toBeLessThan(PLANNER_CONFIG.limiarConfiancaBaixa)
    }
  })

  it('o relógio entra por parâmetro', () => {
    const outra = new Date('2027-01-02T03:04:05.000Z')
    const mastery = masteryInicial(BANCO_DE_DIAGNOSTICO, PERFIL_1100, outra)
    for (const estado of mastery) {
      expect(estado.lastSeenAt).toBe(outra.toISOString())
    }
  })

  it('o perfil gerado carrega o rating estimado e o orçamento escolhido', () => {
    const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, PERFIL_1100, {
      ratingInformado: 1100,
    })
    const perfil = perfilDoDiagnostico(createDefaultProfile('aluno', AGORA), {
      estimativa,
      orcamento: 20,
    })
    expect(perfil.estimatedRating).toBe(estimativa.ratingEstimado)
    expect(perfil.dailyBudgetMinutes).toBe(20)
    expect(perfil.createdAt).toBe(AGORA.toISOString())
  })

  /**
   * A ARMADILHA DE PRODUTO da issue #11, afirmada como comparação.
   *
   * Quem demonstrou as habilidades elementares não pode receber o mesmo plano
   * de quem não demonstrou nenhuma — senão o aluno de 1100 abre a primeira
   * sessão, vê "peça pendurada" e vai embora.
   */
  it('quem acerta o básico recebe um plano mais difícil que quem não acerta nada', () => {
    expect(dificuldadeMediaDoPlano(PERFIL_1100)).toBeGreaterThan(
      dificuldadeMediaDoPlano(ERROU_TUDO),
    )
  })

  it('o plano de quem acerta o básico não é só as habilidades que ele já mostrou', () => {
    const demonstradas = new Set(
      BANCO_DE_DIAGNOSTICO.filter((item) => item.dificuldade <= DEFAULT_ESTIMATED_RATING).map(
        (item) => item.skillId,
      ),
    )
    const plano = planoDe(PERFIL_1100, DEFAULT_ESTIMATED_RATING)
    const habilidades = plano.blocks.flatMap((bloco) => bloco.skillIds)
    expect(habilidades.length).toBeGreaterThan(0)
    expect(habilidades.some((id) => !demonstradas.has(id))).toBe(true)
  })
})
