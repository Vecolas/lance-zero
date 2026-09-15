/** Modelo pedagógico da biblioteca de finais.
 *
 * Diferente do domínio de treino (que julga uma tentativa), este contrato
 * descreve o que o aluno está aprendendo: reconhecimento, princípio, técnica
 * e transferência para posições que não são a FEN de exemplo.
 */
export type EndgameCategory =
  | 'pawn'
  | 'rook'
  | 'queen'
  | 'bishop'
  | 'knight'
  | 'conversion'
  | 'defense'
  | 'principle'

export type EndgameStatus = 'not-started' | 'learning' | 'practicing' | 'review' | 'consolidated'

export interface EndgamePosition {
  id: string
  fen: string
  sideToTrain: 'white' | 'black'
  objective: 'win' | 'draw' | 'promote' | 'mate' | 'reach-target' | 'defend'
  conceptIds: string[]
  expectedResult?: 'win' | 'draw' | 'loss'
  validationSource: 'tablebase' | 'engine' | 'curated'
  difficulty: number
}

export interface EndgamePositionSet {
  id: string
  endgameId: string
  positions: EndgamePosition[]
}

export type EndgameLessonStep =
  | { type: 'principle'; title: string; text: string }
  | { type: 'recognition'; question: string; options: string[]; answer: number; explanation: string }
  | { type: 'demonstration'; title: string; fen: string; text: string }
  | { type: 'decision'; question: string; options: string[]; answer: number; explanation: string }
  | { type: 'contrast'; title: string; left: EndgamePosition; right: EndgamePosition; prompt: string; explanation: string }
  | { type: 'play-out'; positionSetId: string; objective: string }
  | { type: 'summary'; title: string; rules: string[] }

export interface EndgameLesson {
  id: string
  endgameId: string
  steps: EndgameLessonStep[]
  version: number
}

export interface TechniqueDefinition {
  id: string
  name: string
  goals: string[]
  phases: string[]
  failurePatterns: string[]
}

export interface EndgameDefinition {
  id: string
  slug: string
  name: string
  category: EndgameCategory
  description: string
  previewFen: string
  difficulty: number
  prerequisiteIds: string[]
  lessonIds: string[]
  drillIds: string[]
  tags: string[]
  level: 'essential' | 'fundamental' | 'intermediate' | 'advanced'
  version: number
}

