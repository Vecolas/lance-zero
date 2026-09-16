import { describe, expect, it } from 'vitest'
import { criarSkillState, marcarParaReensino } from '@/domain/aprendizado/skill-state'
import { deriveRoadmapNode, isReviewEligible, isSkillStateReviewEligible, ROADMAP_DEFINITION, userLearningStateFromSkill } from '@/domain/roadmap'
import { ratingForRecallOutcome } from '@/domain/review/planner-v2'

describe('Roadmap V3 e elegibilidade de revisão', () => {
  it('conta nova começa sem conteúdo elegível', () => {
    const state = criarSkillState('tactics.fork', new Date('2026-01-01T00:00:00.000Z'))
    expect(isSkillStateReviewEligible(state)).toBe(false)
    expect(isReviewEligible({ lessonCompleted: false, masteryCheckPassed: false, importedKnownValidated: false, needsRelearning: false })).toBe(false)
  })

  it('ensino concluído mantém o check quando a revisão vence', () => {
    const state = criarSkillState('tactics.fork', new Date('2026-01-01T00:00:00.000Z'))
    const taught = { ...state, stage: 'independent' as const, exposureCount: 1, lastTaughtAt: '2026-01-01T00:00:00.000Z' }
    const node = ROADMAP_DEFINITION.nodes.find((item) => item.skillId === 'tactics.fork')!
    const view = deriveRoadmapNode(node, { ...userLearningStateFromSkill(taught, node.learningObjectId), stage: 'review' })
    expect(view.completed).toBe(true)
    expect(view.state).toBe('review')
  })

  it('reensino bloqueia recuperação independente sem apagar o histórico', () => {
    const state = marcarParaReensino({ ...criarSkillState('tactics.fork', new Date()), exposureCount: 1, stage: 'independent' }, new Date())
    expect(state.exposureCount).toBe(1)
    expect(isSkillStateReviewEligible(state)).toBe(false)
    expect(userLearningStateFromSkill(state, 'skill:tactics.fork').stage).toBe('needs_relearning')
  })

  it('não confunde reaprender com lembrança perfeita no scheduler', () => {
    expect(ratingForRecallOutcome('recalled')).toBe('good')
    expect(ratingForRecallOutcome('recalled-with-hint')).toBe('hard')
    expect(ratingForRecallOutcome('declared-forgotten')).toBe('again')
    expect(ratingForRecallOutcome('relearned')).toBe('hard')
  })

  it('expõe currículo amplo e escolha de repertório sem obrigar todas as opções', () => {
    expect(ROADMAP_DEFINITION.nodes.length).toBeGreaterThan(45)
    expect(ROADMAP_DEFINITION.areas.map((area) => area.id)).toEqual(expect.arrayContaining(['fundamentos', 'processo', 'tática', 'cálculo', 'aberturas', 'finais', 'análise', 'estratégia', 'transferência']))
    expect(ROADMAP_DEFINITION.choiceGroups[0]?.minimumSelections).toBe(1)
    expect(ROADMAP_DEFINITION.choiceGroups[0]?.nodeIds.length).toBeGreaterThanOrEqual(3)
  })
})
