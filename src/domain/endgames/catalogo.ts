/** Modelo pedagógico da biblioteca de finais.
 *
 * Diferente do domínio de treino (que julga uma tentativa), este contrato
 * descreve o que o aluno está aprendendo: reconhecimento, princípio, técnica
 * e transferência para posições que não são a FEN de exemplo.
 */
export type EndgameCategory =
  'pawn' | 'rook' | 'queen' | 'bishop' | 'knight' | 'conversion' | 'defense' | 'principle'

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
  | {
      type: 'recognition'
      question: string
      options: string[]
      answer: number
      explanation: string
    }
  | { type: 'demonstration'; title: string; fen: string; text: string }
  | { type: 'decision'; question: string; options: string[]; answer: number; explanation: string }
  | {
      type: 'contrast'
      title: string
      left: EndgamePosition
      right: EndgamePosition
      prompt: string
      explanation: string
    }
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

/**
 * A posição em que o aluno TREINA este final.
 *
 * SEPARADA DE `previewFen`, e a separação é a correção de um defeito medido: as
 * posições de treino eram GERADAS a partir da FEN de prévia, que é um diagrama
 * de ilustração. O portão `tests/contrato/biblioteca-vs-tablebase.test.ts`
 * perguntou à tablebase real e dezessete das quarenta e uma posições estavam
 * erradas — quinze declaravam vitória em posições de EMPATE, Philidor declarava
 * vitória numa posição PERDIDA, os dois bispos do mate de dois bispos estavam na
 * MESMA cor de casa, e duas FENs eram ILEGAIS (rei em xeque com o outro lado na
 * vez).
 *
 * Ilustrar e treinar são coisas diferentes, e usar o mesmo campo para as duas
 * transformou trinta e oito afirmações nunca conferidas em conteúdo de treino.
 */
export interface EndgameTrainingPosition {
  fen: string
  sideToTrain: 'white' | 'black'
  objective: EndgamePosition['objective']
  /** O resultado teórico, conferido contra a tablebase pelo portão de contrato. */
  expectedResult: 'win' | 'draw'
}

export interface EndgameDefinition {
  id: string
  slug: string
  name: string
  category: EndgameCategory
  description: string
  /** Diagrama de ILUSTRAÇÃO, para o card da biblioteca. Nunca o treino. */
  previewFen: string
  /** A posição do TREINO. Ver `EndgameTrainingPosition`. */
  training: EndgameTrainingPosition
  difficulty: number
  prerequisiteIds: string[]
  lessonIds: string[]
  drillIds: string[]
  /** Posição curada do treinador legado, quando o tema já possui play-out. */
  trainingPositionId?: string
  tags: string[]
  level: 'essential' | 'fundamental' | 'intermediate' | 'advanced'
  version: number
}
