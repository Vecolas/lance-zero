import type { SkillId } from '@/domain/types'
import type { SkillState } from '@/domain/aprendizado/skill-state'
import { SKILL_CATALOG } from '@/domain/skills/catalog'

export type RoadmapArea =
  | 'fundamentos'
  | 'processo'
  | 'tática'
  | 'cálculo'
  | 'aberturas'
  | 'finais'
  | 'análise'
  | 'estratégia'
  | 'transferência'

export type RoadmapStage =
  | 'locked'
  | 'available'
  | 'learning'
  | 'completed'
  | 'review'
  | 'needs_relearning'

export type RecallOutcome =
  | 'recalled'
  | 'recalled-with-hint'
  | 'failed'
  | 'declared-forgotten'
  | 'voluntary-relearn'
  | 'relearned'

export interface RoadmapNode {
  id: string
  learningObjectId: string
  title: string
  shortDescription: string
  area: RoadmapArea
  skillId?: SkillId
  prerequisiteIds: string[]
  contentType: 'concept' | 'tactic' | 'calculation' | 'opening' | 'endgame' | 'game-review' | 'strategy'
  roadmapRole: 'core' | 'choice' | 'advanced'
  estimatedMinutes?: number
  order: number
  version: number
}

export interface RoadmapChoiceGroup {
  id: string
  title: string
  minimumSelections: number
  nodeIds: string[]
}

export interface RoadmapDefinition {
  version: number
  areas: readonly { id: RoadmapArea; title: string; description: string }[]
  nodes: readonly RoadmapNode[]
  choiceGroups: readonly RoadmapChoiceGroup[]
}

export interface UserLearningState {
  learningObjectId: string
  stage: RoadmapStage
  learnedAt: string | null
  lastStudiedAt: string | null
  lessonCompleted: boolean
  masteryCheckPassed: boolean
  importedKnownValidated: boolean
  reviewEligible: boolean
  needsRelearning: boolean
  updatedAt: string
}

export interface RoadmapNodeView extends RoadmapNode {
  state: RoadmapStage
  completed: boolean
  reviewEligible: boolean
  action: 'aprender' | 'continuar' | 'revisar' | 'reaprender' | 'bloqueado'
  prerequisiteTitles: string[]
}

export const ROADMAP_AREAS: readonly RoadmapDefinition['areas'][number][] = [
  { id: 'fundamentos', title: 'Fundamentos', description: 'As ideias que tornam cada posição legível.' },
  { id: 'processo', title: 'Processo de pensamento', description: 'Como pensar antes de escolher um lance.' },
  { id: 'tática', title: 'Tática', description: 'Padrões concretos para encontrar oportunidades.' },
  { id: 'cálculo', title: 'Cálculo', description: 'Visualizar, comparar e verificar variantes.' },
  { id: 'aberturas', title: 'Aberturas', description: 'Ideias, planos e repertórios escolhidos.' },
  { id: 'finais', title: 'Finais', description: 'Técnicas para converter e defender posições.' },
  { id: 'análise', title: 'Análise de partidas', description: 'Transformar erros reais em treino.' },
  { id: 'estratégia', title: 'Estratégia', description: 'Planos, estruturas e decisões de longo prazo.' },
  { id: 'transferência', title: 'Aplicação em partidas reais', description: 'Levar o conhecimento para o tabuleiro.' },
]

const AREA_BY_SKILL: Record<string, RoadmapArea> = {
  tactics: 'tática',
  calculation: 'cálculo',
  opening: 'aberturas',
  endgame: 'finais',
}

const TYPE_BY_AREA: Record<RoadmapArea, RoadmapNode['contentType']> = {
  fundamentos: 'concept', processo: 'concept', 'tática': 'tactic', 'cálculo': 'calculation',
  aberturas: 'opening', finais: 'endgame', análise: 'game-review', estratégia: 'strategy', transferência: 'game-review',
}

const foundationalNodes: RoadmapNode[] = [
  ['fundamentos.board', 'Como ler o tabuleiro', 'Orientação, casas e coordenadas sem decorar a interface.', 'fundamentos'],
  ['fundamentos.pieces', 'Valor e atividade das peças', 'Comparar material, atividade e segurança antes de trocar.', 'fundamentos'],
  ['processo.threats', 'O que mudou no último lance?', 'Começar cada decisão procurando mudanças e ameaças.', 'processo'],
  ['processo.candidates', 'Xeques, capturas e ameaças', 'Gerar candidatos fortes antes de calcular variantes.', 'processo'],
  ['strategy.weak-squares', 'Casas fracas e planos', 'Reconhecer alvos duradouros e como explorá-los.', 'estratégia'],
  ['analysis.critical-moment', 'Encontrar o momento crítico', 'Rever uma partida sem transformar toda falha em tática.', 'análise'],
].map(([id, title, description, area], index) => ({
  id, learningObjectId: `roadmap:${id}`, title, shortDescription: description,
  area: area as RoadmapArea, prerequisiteIds: [], contentType: TYPE_BY_AREA[area as RoadmapArea],
  roadmapRole: 'core', order: index, version: 1,
}))

const skillNodes: RoadmapNode[] = SKILL_CATALOG.map((skill, index) => ({
  id: `skill.${skill.id}`,
  learningObjectId: `skill:${skill.id}`,
  title: skill.label,
  shortDescription: skill.description,
  area: AREA_BY_SKILL[skill.area],
  skillId: skill.id,
  prerequisiteIds: [],
  contentType: TYPE_BY_AREA[AREA_BY_SKILL[skill.area]],
  roadmapRole: skill.area === 'opening' ? 'choice' : 'core',
  estimatedMinutes: 8,
  order: 100 + index,
  version: 1,
}))

export const ROADMAP_DEFINITION: RoadmapDefinition = {
  version: 1,
  areas: ROADMAP_AREAS,
  nodes: [...foundationalNodes, ...skillNodes],
  choiceGroups: [
    {
      id: 'choice.opening.white',
      title: 'Escolha um repertório de Brancas',
      minimumSelections: 1,
      nodeIds: skillNodes.filter((node) => node.area === 'aberturas').map((node) => node.id),
    },
  ],
}

export function isReviewEligible(state: Pick<UserLearningState, 'lessonCompleted' | 'masteryCheckPassed' | 'importedKnownValidated' | 'needsRelearning'>): boolean {
  return !state.needsRelearning && (state.lessonCompleted || state.masteryCheckPassed || state.importedKnownValidated)
}

export function isSkillStateReviewEligible(state: SkillState | undefined): boolean {
  return Boolean(state && state.stage !== 'unseen' && state.exposureCount > 0 && !state.precisaDeReensino)
}

export function userLearningStateFromSkill(state: SkillState | undefined, learningObjectId: string): UserLearningState {
  const learned = Boolean(state && state.exposureCount > 0 && state.stage !== 'unseen')
  const needsRelearning = Boolean(state?.precisaDeReensino)
  return {
    learningObjectId,
    stage: needsRelearning ? 'needs_relearning' : learned ? 'completed' : 'available',
    learnedAt: state?.lastTaughtAt ?? null,
    lastStudiedAt: state?.lastPracticedAt ?? null,
    lessonCompleted: learned,
    masteryCheckPassed: false,
    importedKnownValidated: false,
    reviewEligible: isSkillStateReviewEligible(state),
    needsRelearning,
    updatedAt: state?.updatedAt ?? new Date(0).toISOString(),
  }
}

export function deriveRoadmapNode(node: RoadmapNode, state: UserLearningState | undefined, prerequisites: readonly RoadmapNode[] = []): RoadmapNodeView {
  const completed = Boolean(state?.lessonCompleted || state?.masteryCheckPassed || state?.importedKnownValidated)
  const locked = prerequisites.some((item) => !item)
  const current: RoadmapStage = locked ? 'locked' : state?.needsRelearning ? 'needs_relearning' : state?.reviewEligible && state.stage === 'review' ? 'review' : completed ? 'completed' : state?.lastStudiedAt ? 'learning' : 'available'
  return {
    ...node,
    state: current,
    completed,
    reviewEligible: Boolean(state?.reviewEligible),
    action: current === 'locked' ? 'bloqueado' : current === 'needs_relearning' ? 'reaprender' : current === 'review' ? 'revisar' : current === 'completed' ? 'revisar' : current === 'learning' ? 'continuar' : 'aprender',
    prerequisiteTitles: prerequisites.map((item) => item.title),
  }
}

export function roadmapProgress(nodes: readonly RoadmapNodeView[]): { completed: number; total: number } {
  return { completed: nodes.filter((node) => node.completed).length, total: nodes.length }
}
