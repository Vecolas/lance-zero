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
  'endgame.rule-of-square',
  'endgame.passed-pawn',
  'endgame.rook-endgames',
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

export type Side = 'w' | 'b'

// ------------------------------------------------------------------- puzzles

/**
 * Puzzle no formato do dump do Lichess (CC0).
 *
 * ATENÇÃO à semântica do dataset: `fen` é a posição ANTES do lance
 * preparatório, e `moves[0]` é esse lance. O jogador resolve a partir de
 * `moves[1]`. Ver `toSolvable` e o teste de regressão.
 */
export interface Puzzle {
  id: string
  fen: string
  /** Lances em UCI. O primeiro é o lance preparatório do adversário. */
  moves: string[]
  rating: number
  ratingDeviation?: number
  popularity?: number
  nbPlays?: number
  /** Temas crus do Lichess, como vêm no dump. */
  themes: string[]
  /** Temas mapeados para a nossa taxonomia. Pode ser vazio. */
  skillIds: SkillId[]
  gameUrl?: string
  openingTags?: string[]
}

/** Puzzle pronto para treinar: o lance preparatório já foi aplicado. */
export interface SolvablePuzzle {
  puzzle: Puzzle
  /** Posição em que o jogador começa a resolver. */
  startFen: string
  /** Lado que resolve o puzzle. */
  playerColor: Side
  /** Lance preparatório do adversário, já aplicado em `startFen`. */
  setupMoveUci: string
  /** Solução a partir do segundo lance do dataset. */
  solutionUci: string[]
}

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
  /**
   * O que o usuário marcou ANTES de ver a engine.
   *
   * Fica na própria partida em vez de uma coleção separada porque só existe no
   * contexto dela, e porque o passe humano precisa sobreviver ao passe da
   * engine sem risco de ficar órfão.
   */
  humanReview?: HumanReview
}

/** Passe 1 da revisão: o que o jogador achou, sem nenhuma avaliação na tela. */
export interface HumanReview {
  /** Plies que o usuário marcou como "aqui a partida mudou". */
  markedPlies: number[]
  /** Anotações livres do usuário. */
  notes: string
  reviewedAt: string
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
  /**
   * Quanto orçamento de engine este lance recebeu.
   *
   * O pipeline faz duas passagens: varredura rasa em todos os lances do
   * usuário e aprofundamento só nos candidatos. Sem este campo, `analises[]`
   * mistura números de precisão diferente e nada na tela distingue os dois — um
   * número raso apresentado como diagnóstico é falsa precisão.
   *
   * É obrigatório de propósito: quem produz uma análise tem de declarar quanto
   * ela vale. Campo opcional com default útil faria todo dado antigo alegar
   * profundidade que não teve.
   */
  precisao: AnalysisPrecision
  /**
   * WDL do Stockfish antes e depois do lance, quando a engine reportou.
   *
   * ATENÇÃO: é calibrado por AUTO-JOGO da engine. Serve para comparar
   * severidade internamente e NUNCA é apresentado como "sua chance humana de
   * vitória". Essa é regra do produto, não preferência de nomenclatura.
   */
  wdlBefore?: EngineWdlSnapshot
  wdlAfter?: EngineWdlSnapshot
}

/** Quanto orçamento de engine uma análise recebeu. */
export type AnalysisPrecision = 'rasa' | 'aprofundada'

/**
 * Distribuição vitória/empate/derrota reportada pela engine, em milésimos.
 *
 * Sempre na perspectiva das brancas, para duas análises poderem ser comparadas
 * sem que alguém precise lembrar de quem era a vez.
 */
export interface EngineWdlSnapshot {
  win: number
  draw: number
  loss: number
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

// -------------------------------------------------- retenção verificada

/**
 * Resposta à pergunta que fecha o ciclo do produto: depois de treinar, a
 * habilidade VOLTOU A FALHAR numa partida nova?
 *
 * O tipo mora aqui, e não em `planning/retencao`, porque duas camadas o
 * consomem (o planner, através da maestria, e a UI de progresso) e nenhuma
 * delas deve depender do módulo que o calcula.
 *
 * A DECISÃO QUE ESTE TIPO CARREGA: **não é booleano.** "Não voltou a falhar" e
 * "não há partida nenhuma para olhar" são coisas diferentes, e colapsar as duas
 * num `false`/`true` é exatamente o desenho em que o app parabeniza o aluno por
 * nada — o erro mais fácil de cometer aqui, porque ausência de erro se parece
 * com sucesso em qualquer contagem.
 *
 * São quatro estados, não três, e o quarto é deliberado:
 *
 * - `sem-evidencia` — o aluno não jogou NENHUMA partida analisada depois do
 *   treino. Não há o que afirmar em nenhuma direção.
 * - `evidencia-insuficiente` — jogou, e não falhou, mas em menos partidas do
 *   que o mínimo para afirmar melhora. É separado de `sem-evidencia` porque a
 *   mensagem honesta é outra: "jogue mais" e "ainda não jogou" pedem ações
 *   diferentes do aluno, e fundir os dois apagaria essa diferença.
 * - `voltou-a-falhar` — a habilidade errou de novo em partida jogada depois do
 *   treino.
 * - `nao-reincidiu` — jogou o bastante e não errou.
 */
export type VereditoDeRetencao =
  'sem-evidencia' | 'evidencia-insuficiente' | 'voltou-a-falhar' | 'nao-reincidiu'

/**
 * Verificação de retenção de UMA habilidade, com os números que a sustentam.
 *
 * Os contadores acompanham o veredito de propósito: um veredito sozinho não é
 * explicável depois, e a tela precisa poder dizer "em 3 partidas analisadas
 * desde o treino, nenhuma falhou" em vez de só "melhorou".
 */
export interface RetencaoDeHabilidade {
  skillId: SkillId
  veredito: VereditoDeRetencao
  /** Instante (ISO 8601) a partir do qual a verificação passou a olhar. */
  treinadaEm: string
  /**
   * Partidas ANALISADAS jogadas depois de `treinadaEm`. É o denominador.
   *
   * Partida importada e não analisada NÃO entra: ninguém olhou aquele jogo, e
   * contá-la seria transformar silêncio em aprovação.
   */
  partidasVerificadas: number
  /** Dessas, quantas trouxeram pelo menos um erro atribuído à habilidade. */
  partidasComFalha: number
  /** Lances errados atribuídos à habilidade nessas partidas. */
  falhas: number
  /** `playedAt` da partida mais recente em que a habilidade falhou, ou `null`. */
  ultimaFalhaEm: string | null
}

// --------------------------------------------------------------- persistência

/**
 * Recorte de leitura de partidas.
 *
 * `since` é `Date`, e não `string`, DE PROPÓSITO (issue #57). Enquanto era
 * texto, `playedAt >= since` compilava e rodava — e comparava data como texto,
 * que só coincide com a ordem cronológica enquanto todo mundo escrever em UTC.
 * Um `2026-08-26T06:00:00-03:00` é ISO-8601 perfeito e ordena errado. Com
 * `Date`, a comparação errada não chega a existir: ela morre no compilador em
 * vez de morrer num teste — e os dois lados (tela e domínio) passam a falar do
 * mesmo instante por construção.
 *
 * `Date` é MUTÁVEL. A pré-condição do contrato é: quem recebe um `since` LÊ O
 * INSTANTE NA ENTRADA (`getTime()`) e descarta a referência. Nenhuma
 * implementação guarda o objeto, então não há cópia defensiva a fazer e não há
 * como o chamador mudar o recorte depois da chamada. Quem guardar a referência
 * quebra esta pré-condição e volta a ter duas verdades.
 *
 * O que é GRAVADO continua string ISO-8601: a borda que decide é a LEITURA, uma
 * só. Decidido na #53 e não reaberto aqui.
 */
export interface GameQuery {
  limit?: number
  source?: GameSource
  /** Instante INCLUSIVO. Partida cuja data não é legível fica de fora. */
  since?: Date
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

// ----------------------------------------------------------------- importação

/**
 * Recorte de importação.
 *
 * `since` é `Date` pelo mesmo motivo de `GameQuery.since` — ver lá. Aqui o
 * defeito estava ARMADO e não disparado: o importador do Chess.com só escrevia
 * UTC, então texto e instante coincidiam por acidente do caminho, não por
 * regra. `ImportQuery` é contrato público, e `since` vem de fora.
 *
 * Mesma pré-condição de mutabilidade: o instante é lido na entrada e a
 * referência é descartada.
 */
export interface ImportQuery {
  /** Instante INCLUSIVO; só partidas jogadas a partir daí. */
  since?: Date
  max?: number
  cursor?: string
}

export interface GamePage {
  games: Game[]
  cursor?: string
  hasMore: boolean
}

export interface GameImportProvider {
  readonly source: GameSource
  listGames(identity: string, query?: ImportQuery): Promise<GamePage>
}

export interface ImportResult {
  importadas: number
  duplicadas: number
  ignoradas: number
}

// ------------------------------------------------- análise e explicação de erro

/**
 * Explicação determinística de um erro.
 *
 * A ordem das quatro partes é a do PEDAGOGY.md e não é negociável: primeiro o
 * que aconteceu, depois o sinal que estava visível, depois o hábito de
 * pensamento, e só então o treino gerado.
 */
export interface MistakeExplanation {
  /** Código do detector. `unknown` quando a confiança é baixa. */
  code: string
  /** 0..1. Abaixo do limiar do detector, o código vira `unknown`. */
  confidence: number
  oQueAconteceu: string
  sinalVisivel: string
  habitoQuePreveniria: string
  treinoGerado: string
}

/** Momento crítico de uma partida, já classificado e explicado. */
export interface CriticalMoment {
  gameId: string
  ply: number
  fenBefore: string
  userMoveUci: string
  bestMoveUci: string
  /** Perda de pontuação esperada, em pontos percentuais. */
  expectedScoreLossPp: number
  severity: MoveSeverity
  skillIds: SkillId[]
  explanation: MistakeExplanation | null
  /**
   * Quando a PARTIDA foi jogada, não quando ela foi analisada.
   *
   * O planner usa uma janela curta para "erro recente de partida real". Sem
   * este campo, analisar hoje uma partida de três semanas atrás a faria entrar
   * como erro recente e inflaria a prioridade daquela habilidade — e o sintoma
   * seria o plano do dia errado, que ninguém liga à causa.
   *
   * É obrigatório de propósito: era um parâmetro opcional, e parâmetro opcional
   * é o desenho em que alguém esquece.
   */
  ocorridoEm: string
}
