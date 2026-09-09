import { describe, expect, it } from 'vitest'

import { SKILL_CATALOG, SKILL_SCALE_MAX, getSkill, skillsByArea } from '@/domain/skills/catalog'
import { createMastery, updateMastery, type MasteryEvent } from '@/domain/skills/mastery'
import { SKILL_IDS, type SkillMastery } from '@/domain/types'

const ACERTO_LIMPO: MasteryEvent = {
  tipo: 'puzzle',
  acertou: true,
  usouDica: false,
  primeiraTentativa: true,
  thinkTimeMs: 12_000,
}

const ERRO_PUZZLE: MasteryEvent = {
  tipo: 'puzzle',
  acertou: false,
  usouDica: false,
  primeiraTentativa: true,
  thinkTimeMs: 20_000,
}

/** Aplica o mesmo evento `vezes` vezes, para montar um estado com histórico. */
function treinar(evento: MasteryEvent, vezes: number): SkillMastery {
  let estado = createMastery('tactics.fork')
  for (let i = 0; i < vezes; i += 1) {
    estado = updateMastery(estado, evento)
  }
  return estado
}

describe('catálogo de habilidades', () => {
  it('cobre exatamente os ids de SKILL_IDS, sem duplicatas', () => {
    expect(SKILL_CATALOG).toHaveLength(SKILL_IDS.length)
    expect(SKILL_CATALOG.map((skill) => skill.id).sort()).toEqual([...SKILL_IDS].sort())
  })

  it('mantém dificuldade e valor pedagógico dentro da escala', () => {
    for (const skill of SKILL_CATALOG) {
      expect(skill.baseDifficulty).toBeGreaterThanOrEqual(1)
      expect(skill.baseDifficulty).toBeLessThanOrEqual(SKILL_SCALE_MAX)
      expect(skill.pedagogicalValue).toBeGreaterThanOrEqual(1)
      expect(skill.pedagogicalValue).toBeLessThanOrEqual(SKILL_SCALE_MAX)
      expect(skill.label.length).toBeGreaterThan(0)
      expect(skill.description.length).toBeGreaterThan(0)
    }
  })

  it('expõe helpers de consulta', () => {
    expect(getSkill('tactics.fork').label).toBe('Garfo')
    expect(skillsByArea('calculation').map((skill) => skill.id)).toEqual([
      'calculation.checks-captures-threats',
      'calculation.candidate-moves',
      'calculation.opponent-best-response',
    ])
    // Deriva da FONTE em vez de cravar um número: o `toHaveLength(3)` que
    // estava aqui reprovava o código certo assim que a taxonomia crescia, e a
    // regra que ele queria afirmar é "o helper devolve a área inteira".
    const finaisEsperados = SKILL_IDS.filter((id) => id.startsWith('endgame.'))
    expect(finaisEsperados.length).toBeGreaterThan(0)
    expect(skillsByArea('endgame').map((skill) => skill.id)).toEqual(finaisEsperados)
  })
})

describe('updateMastery', () => {
  it('sobe a maestria quando o usuário acerta de primeira', () => {
    const inicial = createMastery('tactics.fork')
    const depois = updateMastery(inicial, ACERTO_LIMPO)

    expect(depois.mastery).toBeGreaterThan(inicial.mastery)
    expect(depois.attempts).toBe(1)
    expect(depois.firstTryCorrect).toBe(1)
    expect(depois.exposures).toBe(1)
  })

  it('não muta o estado recebido', () => {
    const inicial = createMastery('tactics.fork')
    updateMastery(inicial, ACERTO_LIMPO)

    expect(inicial.attempts).toBe(0)
    expect(inicial.mastery).toBe(0)
  })

  it('desce a maestria quando o usuário erra', () => {
    const treinado = treinar(ACERTO_LIMPO, 10)
    const depois = updateMastery(treinado, ERRO_PUZZLE)

    expect(depois.mastery).toBeLessThan(treinado.mastery)
    expect(depois.recentAccuracy).toBeLessThan(treinado.recentAccuracy)
  })

  it('sobe menos quando o acerto veio com dica', () => {
    const base = treinar(ACERTO_LIMPO, 3)
    const semDica = updateMastery(base, ACERTO_LIMPO)
    const comDica = updateMastery(base, { ...ACERTO_LIMPO, usouDica: true })

    expect(comDica.mastery).toBeLessThan(semDica.mastery)
    expect(comDica.mastery).toBeGreaterThan(0)
    expect(comDica.hintedAttempts).toBe(1)
    expect(comDica.firstTryCorrect).toBe(base.firstTryCorrect)
  })

  it('sobe menos quando o acerto não foi na primeira tentativa', () => {
    const base = treinar(ACERTO_LIMPO, 3)
    const primeira = updateMastery(base, ACERTO_LIMPO)
    const segunda = updateMastery(base, { ...ACERTO_LIMPO, primeiraTentativa: false })

    expect(segunda.mastery).toBeLessThan(primeira.mastery)
  })

  it('derruba mais quando o erro aconteceu em partida real', () => {
    const base = treinar(ACERTO_LIMPO, 10)
    const erroPuzzle = updateMastery(base, ERRO_PUZZLE)
    const erroPartida = updateMastery(base, { ...ERRO_PUZZLE, tipo: 'partida' })

    expect(erroPartida.mastery).toBeLessThan(erroPuzzle.mastery)
    expect(erroPartida.realGameOccurrences).toBe(1)
    expect(erroPartida.realGameErrors).toBe(1)
    expect(erroPuzzle.realGameOccurrences).toBe(0)
  })

  it('registra retenção apenas em eventos de revisão', () => {
    const base = createMastery('tactics.fork')
    const puzzle = updateMastery(base, ACERTO_LIMPO)
    const revisao = updateMastery(base, { ...ACERTO_LIMPO, tipo: 'revisao' })

    expect(puzzle.retentionAccuracy).toBe(0)
    expect(revisao.retentionAccuracy).toBeGreaterThan(0)
  })

  it('mantém maestria e confiança dentro de 0..1 nos extremos', () => {
    const perfeito = treinar(ACERTO_LIMPO, 50)
    const desastre = treinar(ERRO_PUZZLE, 50)

    for (const estado of [perfeito, desastre]) {
      expect(estado.mastery).toBeGreaterThanOrEqual(0)
      expect(estado.mastery).toBeLessThanOrEqual(1)
      expect(estado.confidence).toBeGreaterThanOrEqual(0)
      expect(estado.confidence).toBeLessThanOrEqual(1)
    }

    expect(perfeito.mastery).toBeGreaterThan(0.8)
    expect(desastre.mastery).toBeLessThan(0.05)
  })

  it('não deixa a maestria ficar negativa saindo do zero', () => {
    const zerado = createMastery('tactics.fork')
    const depois = updateMastery(zerado, { ...ERRO_PUZZLE, tipo: 'partida' })

    expect(depois.mastery).toBe(0)
  })

  it('aumenta a confiança a cada tentativa registrada', () => {
    let estado = createMastery('tactics.fork')
    let anterior = estado.confidence

    for (let i = 0; i < 6; i += 1) {
      estado = updateMastery(estado, i % 2 === 0 ? ACERTO_LIMPO : ERRO_PUZZLE)
      expect(estado.confidence).toBeGreaterThan(anterior)
      anterior = estado.confidence
    }
  })

  it('registra lastSeenAt somente quando o evento traz a data', () => {
    const base = createMastery('tactics.fork')
    const semData = updateMastery(base, ACERTO_LIMPO)
    const comData = updateMastery(semData, {
      ...ACERTO_LIMPO,
      ocorridoEm: '2026-09-09T10:00:00.000Z',
    })

    expect(semData.lastSeenAt).toBeNull()
    expect(comData.lastSeenAt).toBe('2026-09-09T10:00:00.000Z')
  })

  it('estima a mediana de tempo de reflexão caminhando na direção da amostra', () => {
    let estado = updateMastery(createMastery('tactics.fork'), {
      ...ACERTO_LIMPO,
      thinkTimeMs: 10_000,
    })
    expect(estado.medianThinkTimeMs).toBe(10_000)

    estado = updateMastery(estado, { ...ACERTO_LIMPO, thinkTimeMs: 30_000 })
    expect(estado.medianThinkTimeMs).toBeGreaterThan(10_000)
    expect(estado.medianThinkTimeMs).toBeLessThan(30_000)
  })
})
