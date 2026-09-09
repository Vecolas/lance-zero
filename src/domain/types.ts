/**
 * Contratos compartilhados do domínio.
 *
 * Este arquivo é a fronteira entre as camadas: habilidades, persistência,
 * planner, puzzles e análise de partidas se falam através daqui. É de
 * propriedade da integração — camadas individuais consomem, não redefinem.
 */

// ---------------------------------------------------------------- habilidades

export const SKILL_IDS = [
  'tactics.hanging-piece',
  'tactics.fork',
  'tactics.pin',
  'tactics.skewer',
  'tactics.discovered-attack',
  'tactics.removal-of-defender',
  'tactics.deflection',
  'tactics.overloaded-piece',
  'tactics.back-rank',
  'tactics.mating-net',
  'calculation.checks-captures-threats',
  'calculation.candidate-moves',
  'calculation.opponent-best-response',
  'endgame.basic-mates',
  'endgame.king-pawn-opposition',
  'endgame.key-squares',
  'opening.development',
  'opening.center',
  'opening.king-safety',
] as const

export type SkillId = (typeof SKILL_IDS)[number]

export type SkillArea = 'tactics' | 'calculation' | 'endgame' | 'opening'

/** Estado de domínio de uma habilidade para um usuário. */
export interface SkillMastery {
  skillId: SkillId
  exposures: number
  attempts: number
  /** Acertos sem dica e na primeira tentativa. */
  firstTryCorrect: number
  /** Média móvel exponencial de acerto recente, 0..1. */
  recentAccuracy: number
  /** Acerto em tentativas de revisão espaçada, 0..1. */
  retentionAccuracy: number
  hintedAttempts: number
  /** Milissegundos medianos de reflexão. */
  medianThinkTimeMs: number
  /** Vezes que a habilidade apareceu em partida real. */
  realGameOccurrences: number
  /** Vezes que a habilidade falhou em partida real. */
  realGameErrors: number
  mastery: number
  confidence: number
  lastSeenAt: string | null
}

// -------------------------------------------------------------- revisão FSRS

export type ReviewCardKind =
  'posicao-exata' | 'erro-de-partida' | 'final' | 'conceito' | 'repertorio'

/** Escala do FSRS. Traduzida para PT-BR na UI, nunca no armazenamento. */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewCard {
  id: string
  kind: ReviewCardKind
  skillIds: SkillId[]
  /** Posição a ser apresentada. */
  fen: string
  /** Lances aceitos como solução, em UCI. */
  solutionUci: string[]
  prompt: string
  /** Origem, quando o card nasceu de uma partida do usuário. */
  sourceGameId?: string
  sourcePly?: number
  createdAt: string
  dueAt: string
  /** Estado interno do escalonador. Opaco fora de `src/lib/fsrs`. */
  scheduler: SchedulerState
}

export interface SchedulerState {
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  lastReviewAt: string | null
}

export interface ReviewLog {
  cardId: string
  reviewedAt: string
  rating: ReviewRating
  elapsedMs: number
}

// ------------------------------------------------------------------- puzzles

export interface PuzzleAttempt {
  id: string
  puzzleId: string
  skillIds: SkillId[]
  attemptedAt: string
  solved: boolean
  /** Acertou sem nenhuma dica e sem lance errado antes. */
  firstTry: boolean
  hintsUsed: number
  thinkTimeMs: number
  /** Rating do puzzle, quando conhecido. */
  puzzleRating?: number
}

// ------------------------------------------------------------------ partidas

export type GameSource = 'pgn' | 'lichess' | 'chesscom'

export interface Game {
  id: string
  source: GameSource
  /** ID na origem, usado para deduplicar importações. */
  sourceGameId?: string
  pgn: string
  playedAt: string
  white: string
  black: string
  /** Cor do usuário nesta partida. */
  userColor: 'w' | 'b'
  result: '1-0' | '0-1' | '1/2-1/2' | '*'
  importedAt: string
}

export type MoveSeverity = 'ok' | 'imprecisao' | 'erro' | 'erro-grave'

export interface PositionAnalysis {
  gameId: string
  ply: number
  fenBefore: string
  userMoveUci: string
  bestMoveUci: string
  pv: string[]
  scoreCp: number | null
  mateIn: number | null
  /** Perda de pontuação esperada, em pontos percentuais. */
  expectedScoreLossPp: number
  severity: MoveSeverity
  skillIds: SkillId[]
  /** Código do detector determinístico, ou `unknown`. */
  explanationCode: string
}

// -------------------------------------------------------------------- perfil

export interface UserProfile {
  id: string
  createdAt: string
  /** Rating informado ou estimado pelo diagnóstico. */
  estimatedRating: number
  /** Minutos por sessão que o usuário escolheu. */
  dailyBudgetMinutes: 20 | 40 | 60
  lichessUsername?: string
  chesscomUsername?: string
  preferences: {
    boardTheme: 'claro' | 'contraste'
    reducedMotion: boolean
  }
}

// ------------------------------------------------------------------- planner

export type PlanBlockKind =
  'revisao' | 'erro-de-partida' | 'tatica' | 'calculo' | 'final' | 'abertura'

export interface PlanBlock {
  id: string
  kind: PlanBlockKind
  title: string
  /** Frase curta que explica ao usuário por que este bloco está no plano. */
  rationale: string
  skillIds: SkillId[]
  estimatedMinutes: number
  /** Cards de revisão, quando `kind` for `revisao` ou `erro-de-partida`. */
  reviewCardIds?: string[]
  itemCount: number
}

export interface DailyPlan {
  generatedFor: string
  budgetMinutes: number
  totalMinutes: number
  blocks: PlanBlock[]
}

// --------------------------------------------------------------- persistência

export interface GameQuery {
  limit?: number
  source?: GameSource
  since?: string
}

export interface TrainingRepository {
  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>
  saveGame(game: Game): Promise<void>
  listGames(query?: GameQuery): Promise<Game[]>
  savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void>
  listPuzzleAttempts(limit?: number): Promise<PuzzleAttempt[]>
  savePositionAnalyses(items: PositionAnalysis[]): Promise<void>
  listPositionAnalyses(gameId: string): Promise<PositionAnalysis[]>
  getDueCards(now: Date): Promise<ReviewCard[]>
  listReviewCards(): Promise<ReviewCard[]>
  saveReviewCard(card: ReviewCard): Promise<void>
  saveReviewLog(log: ReviewLog): Promise<void>
  getSkillMastery(): Promise<SkillMastery[]>
  saveSkillMastery(mastery: SkillMastery[]): Promise<void>
}
