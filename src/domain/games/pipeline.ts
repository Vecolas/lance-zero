/**
 * Pipeline de análise de uma partida.
 *
 * Este arquivo é a costura da Fase 6: `severity` classifica, `critical`
 * seleciona, `detectors` detecta e `explain` explica — aqui essas peças viram
 * uma revisão de partida. Nada é reimplementado; tudo é orquestrado.
 *
 * As duas passadas do CLAUDE.md estão aqui e não são negociáveis:
 *
 * 1. VARREDURA RASA: orçamento pequeno de nós em todos os lances do usuário.
 *    O lance do adversário não é analisado — o produto trata do que o USUÁRIO
 *    erra, e analisar a partida inteira dobra o custo sem melhorar a revisão.
 * 2. APROFUNDAMENTO: só nas posições candidatas apontadas pela varredura.
 *    Passar a engine fundo na partida toda é o que este arquivo existe para
 *    evitar.
 *
 * A engine entra por injeção. Este módulo nunca cria worker, nunca sabe onde
 * ficam os assets e nunca bloqueia a thread principal: quem chama decide qual
 * `EngineProvider` usar.
 *
 * Determinismo: sem relógio e sem aleatoriedade. Mesma partida e mesma engine
 * produzem exatamente o mesmo resultado.
 */

import type {
  AnalysisPrecision,
  EngineWdlSnapshot,
  CriticalMoment,
  Game,
  MistakeExplanation,
  MoveSeverity,
  PositionAnalysis,
  SkillId,
} from '@/domain/types'
import type { EngineAnalysis, EngineProvider } from '@/lib/engine/types'
import { normalizeWdlToWhite } from '@/lib/engine/uci'
import { parsePgn, positionStatus, type PieceColor, type Ply } from '@/lib/chess'
import {
  CRITICAL_CONFIG,
  ordenarPorPly,
  selectCandidatePositions,
  selectCriticalMoments,
  type CriticalConfig,
  type ShallowScan,
} from './critical'
import {
  DETECTOR_CONFIG,
  runDetectors,
  type DetectorConfig,
  type DetectorResult,
} from './detectors'
import { explainMistake, skillsForExplanation, unknownRate, UNKNOWN_CODE } from './explain'
import { skillDeFinal } from './endgame-classifier'
import {
  SEVERITY_CONFIG,
  classifySeverity,
  expectedScoreFromEval,
  moveLossPp,
  severityContextFromEvals,
  type EvalScore,
  type SeverityConfig,
} from './severity'

// ------------------------------------------------------------------ erros

/**
 * A análise foi interrompida pelo `AbortSignal` de quem chamou.
 *
 * É diferente de falha: a UI trata cancelamento em silêncio, e erro de engine
 * com aviso. Por isso o tipo é próprio e não um `Error` genérico.
 */
export class AnalysisAbortedError extends Error {
  constructor(message = 'Análise da partida cancelada.') {
    super(message)
    this.name = 'AnalysisAbortedError'
  }
}

// ---------------------------------------------------------------- config

/**
 * Orçamentos e limiares do pipeline.
 *
 * ATENÇÃO: HEURÍSTICAS DE PRODUTO, não constantes científicas. Os orçamentos
 * estão em NÓS e não em profundidade fixa de propósito: nós custam mais ou
 * menos o mesmo tempo em qualquer posição, enquanto a mesma profundidade custa
 * ordens de grandeza a mais num meio-jogo cheio do que num final seco. Os
 * números abaixo foram escolhidos para uma revisão caber em poucos segundos num
 * celular mediano e PRECISAM ser recalibrados com medição real.
 */
export interface PipelineConfig {
  /** Nós por posição na varredura rasa. Pequeno de propósito. */
  varreduraNodes: number
  /** Nós por posição no aprofundamento. Só roda nos candidatos. */
  aprofundamentoNodes: number
  /** MultiPV da varredura. 1 basta: aqui só queremos a avaliação. */
  multiPvVarredura: number
  /** MultiPV do aprofundamento. Mais de uma linha para a revisão mostrar alternativa. */
  multiPvAprofundamento: number
  /**
   * Teto de lances do usuário na varredura. Protege contra partidas absurdas
   * (blitz de 200 lances) sem impor limite em partida normal.
   */
  maxLancesDoUsuario: number
  /** Seleção de candidatos e de momentos críticos. */
  critical: CriticalConfig
  /** Limiares dos detectores determinísticos. */
  detectors: DetectorConfig
  /** Bandas de severidade. */
  severity: SeverityConfig
}

export const PIPELINE_CONFIG: PipelineConfig = {
  varreduraNodes: 60_000,
  aprofundamentoNodes: 600_000,
  multiPvVarredura: 1,
  multiPvAprofundamento: 2,
  maxLancesDoUsuario: 150,
  critical: CRITICAL_CONFIG,
  detectors: DETECTOR_CONFIG,
  severity: SEVERITY_CONFIG,
}

// ------------------------------------------------------------- contratos

export interface AnalyzeGameInput {
  game: Game
  /** Engine já construída por quem chama. O pipeline nunca instancia uma. */
  engine: EngineProvider
  /** Sobrescreve campos do topo de `PIPELINE_CONFIG`; objetos aninhados são trocados inteiros. */
  config?: Partial<PipelineConfig>
  /**
   * Progresso em etapas de engine.
   *
   * O `total` CRESCE ao entrar no aprofundamento: só depois da varredura se
   * sabe quantos candidatos existem. Durante a varredura o total é o número de
   * lances do usuário; na última chamada `feito === total`.
   */
  onProgress?: (feito: number, total: number) => void
  signal?: AbortSignal
}

export interface GameAnalysisSummary {
  /** Lances do usuário considerados (já com o teto de `maxLancesDoUsuario`). */
  pliesDoUsuario: number
  /** Lances que produziram uma `PositionAnalysis`. */
  pliesAnalisados: number
  /** Lances perdidos por falha da engine na varredura. Não derrubam a partida. */
  pliesComFalha: number
  /** Lances que receberam o orçamento grande. */
  pliesAprofundados: number
  /** Candidatos cujo aprofundamento falhou e ficaram com o número raso. */
  aprofundamentosComFalha: number
  porSeveridade: Record<MoveSeverity, number>
  /** Fração das explicações que ficaram em `unknown`, de 0 a 1. */
  unknownRate: number
}

export interface GameAnalysis {
  gameId: string
  /**
   * Todos os lances do usuário que foram analisados, em ordem de ply.
   *
   * Precisão mista de propósito: os plies listados em `pliesAprofundados`
   * carregam o número do orçamento grande; o resto carrega o da varredura rasa,
   * que serve para a distribuição de severidade mas não para julgar um lance
   * isolado.
   */
  analises: PositionAnalysis[]
  /** Momentos destacados na revisão, em ordem cronológica. Teto em `critical`. */
  momentos: CriticalMoment[]
  resumo: GameAnalysisSummary
}

// -------------------------------------------------------------- avaliação

/** O que o pipeline consome de uma resposta da engine. */
interface Avaliacao {
  score: EvalScore
  bestMoveUci: string
  pv: string[]
  /**
   * WDL já na perspectiva das brancas, quando a engine reportou.
   *
   * Só a passagem de aprofundamento pede WDL: na varredura rasa ele custaria em
   * todos os lances e não seria usado, porque o CLAUDE.md só exige persistir
   * WDL nos lances críticos.
   */
  wdl?: EngineWdlSnapshot
}

const SEVERIDADES: readonly MoveSeverity[] = ['ok', 'imprecisao', 'erro', 'erro-grave']

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** Lê a linha principal. Perspectiva dos scores é a de quem joga, como no contrato. */
function avaliacaoDaEngine(analise: EngineAnalysis): Avaliacao {
  const principal = analise.lines.find((linha) => linha.multiPv === 1) ?? analise.lines[0]
  const pv = principal?.pv ?? []
  const wdlBruto = principal?.wdl
  return {
    score: { scoreCp: principal?.scoreCp ?? null, mateIn: principal?.mateIn ?? null },
    bestMoveUci: analise.bestMoveUci ?? pv[0] ?? '',
    pv,
    // A engine reporta na perspectiva de quem joga; guardamos sempre em
    // brancas, senão comparar dois lances exigiria lembrar de quem era a vez.
    wdl: wdlBruto ? normalizeWdlToWhite(wdlBruto, analise.turn) : undefined,
  }
}

/**
 * Avaliação de posição terminal, sem gastar engine.
 *
 * Mate já dado é `mateIn: -1` na perspectiva de quem estaria a jogar — quem
 * está mateado. Isso mantém `severityContextFromEvals` correto: o usuário
 * manteve o mate em vez de tê-lo perdido.
 */
function avaliacaoTerminal(fen: string): Avaliacao | null {
  const status = positionStatus(fen)
  if (!status.isGameOver) return null
  if (status.isCheckmate) return { score: { scoreCp: null, mateIn: -1 }, bestMoveUci: '', pv: [] }
  return { score: { scoreCp: 0, mateIn: null }, bestMoveUci: '', pv: [] }
}

// ----------------------------------------------------------- cancelamento

function abortado(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

function garantirNaoAbortado(signal: AbortSignal | undefined): void {
  if (abortado(signal)) throw new AnalysisAbortedError()
}

/**
 * Corre a análise contra o `signal`.
 *
 * Ao abortar, pede `stop()` à engine para a busca em andamento não continuar
 * queimando CPU, e rejeita imediatamente em vez de esperar a resposta obsoleta.
 */
function comCancelamento<T>(
  promessa: Promise<T>,
  engine: EngineProvider,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) return promessa
  if (signal.aborted) {
    // A promessa já está em voo: pedir `stop()` também aqui, senão a busca
    // continuaria queimando CPU depois de o usuário sair da tela.
    void engine.stop().catch(() => undefined)
    void promessa.catch(() => undefined)
    return Promise.reject(new AnalysisAbortedError())
  }

  return new Promise<T>((resolve, reject) => {
    const aoAbortar = (): void => {
      void engine.stop().catch(() => undefined)
      reject(new AnalysisAbortedError())
    }
    signal.addEventListener('abort', aoAbortar, { once: true })
    promessa.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', aoAbortar)
    })
  })
}

// -------------------------------------------------------------- montagem

interface MontarAnaliseArgs {
  gameId: string
  ply: Ply
  antes: Avaliacao
  depois: Avaliacao
  skillIds: SkillId[]
  explanationCode: string
  precisao: AnalysisPrecision
  config: PipelineConfig
}

function montarAnalise(args: MontarAnaliseArgs): PositionAnalysis {
  const { antes, depois, config } = args
  const perda = arredondar(moveLossPp(antes.score, depois.score, config.severity))

  return {
    gameId: args.gameId,
    ply: args.ply.index,
    fenBefore: args.ply.fenBefore,
    userMoveUci: args.ply.uci,
    bestMoveUci: antes.bestMoveUci,
    pv: antes.pv,
    scoreCp: antes.score.scoreCp,
    mateIn: antes.score.mateIn,
    expectedScoreLossPp: perda,
    severity: classifySeverity(
      perda,
      severityContextFromEvals(antes.score, depois.score),
      config.severity,
    ),
    skillIds: args.skillIds,
    explanationCode: args.explanationCode,
    precisao: args.precisao,
    wdlBefore: antes.wdl,
    wdlAfter: depois.wdl,
  }
}

/**
 * Roda os detectores e monta a explicação de um lance.
 *
 * Detector que estoura (FEN exótico, posição que a geometria não entende) não
 * pode derrubar a revisão: vira `unknown`, que é exatamente o que a explicação
 * já sabe dizer sem inventar tema.
 */
function explicar(
  analise: PositionAnalysis,
  config: PipelineConfig,
): { explicacao: MistakeExplanation; skillIds: SkillId[] } {
  let deteccoes: DetectorResult[]
  try {
    deteccoes = runDetectors(
      analise.fenBefore,
      analise.userMoveUci,
      analise.bestMoveUci,
      config.detectors,
    )
  } catch {
    deteccoes = []
  }

  const explicacao = explainMistake(analise, deteccoes, config.detectors)
  const skills = skillsForExplanation(explicacao)
  const endgameSkill = skillDeFinal(analise.fenBefore)
  if (endgameSkill !== null && !skills.includes(endgameSkill)) skills.push(endgameSkill)
  return { explicacao, skillIds: skills }
}

// ---------------------------------------------------------------- pipeline

/**
 * Analisa uma partida em duas passadas e devolve a revisão pronta.
 *
 * Erros de engine em um lance isolado são absorvidos: aquele ply fica sem
 * análise e o resumo conta a falha. Só cancelamento e PGN ilegível interrompem
 * a partida inteira.
 */
export async function analyzeGame(input: AnalyzeGameInput): Promise<GameAnalysis> {
  const { game, engine, onProgress, signal } = input
  const config: PipelineConfig = { ...PIPELINE_CONFIG, ...input.config }

  garantirNaoAbortado(signal)

  // Pode lançar `ChessParseError`: PGN ilegível é problema de quem importou, e
  // engolir isso esconderia uma partida corrompida no banco local.
  const partida = parsePgn(game.pgn)
  const userColor: PieceColor = game.userColor
  const lancesDoUsuario = partida.plies
    .filter((ply) => ply.color === userColor)
    .slice(0, config.maxLancesDoUsuario)

  await comCancelamento(engine.init(), engine, signal)

  let feito = 0
  const totalVarredura = lancesDoUsuario.length
  const avancar = (total: number): void => {
    feito += 1
    onProgress?.(feito, total)
  }

  // ------------------------------------------------------ varredura rasa
  const scans: ShallowScan[] = []
  const analisePorPly = new Map<number, PositionAnalysis>()
  const plyPorIndice = new Map<number, Ply>()
  let pliesComFalha = 0

  for (const ply of lancesDoUsuario) {
    garantirNaoAbortado(signal)
    plyPorIndice.set(ply.index, ply)

    let avaliacoes: { antes: Avaliacao; depois: Avaliacao }
    try {
      avaliacoes = await avaliarLance(ply, engine, signal, {
        nodes: config.varreduraNodes,
        multiPv: config.multiPvVarredura,
      })
    } catch (erro) {
      if (erro instanceof AnalysisAbortedError) throw erro
      pliesComFalha += 1
      avancar(totalVarredura)
      continue
    }

    const analise = montarAnalise({
      gameId: game.id,
      ply,
      antes: avaliacoes.antes,
      depois: avaliacoes.depois,
      skillIds: [],
      explanationCode: UNKNOWN_CODE,
      precisao: 'rasa',
      config,
    })

    analisePorPly.set(ply.index, analise)
    scans.push({
      ply: ply.index,
      fenBefore: ply.fenBefore,
      moveUci: ply.uci,
      expectedScoreBefore: expectedScoreFromEval(avaliacoes.antes.score, config.severity),
      // A engine devolve `depois` na perspectiva do adversário; aqui tudo é do usuário.
      expectedScoreAfter: 1 - expectedScoreFromEval(avaliacoes.depois.score, config.severity),
      isUserMove: true,
    })

    avancar(totalVarredura)
  }

  // ------------------------------------------------------- aprofundamento
  const candidatos = selectCandidatePositions(scans, config.critical)
  const totalGeral = totalVarredura + candidatos.length
  const explicacoes: Record<number, MistakeExplanation | null> = {}
  const aprofundados: PositionAnalysis[] = []
  let aprofundamentosComFalha = 0
  let pliesAprofundados = 0

  for (const candidato of candidatos) {
    garantirNaoAbortado(signal)
    const ply = plyPorIndice.get(candidato.ply)
    const raso = analisePorPly.get(candidato.ply)
    if (!ply || !raso) continue

    let base = raso
    try {
      const avaliacoes = await avaliarLance(ply, engine, signal, {
        nodes: config.aprofundamentoNodes,
        multiPv: config.multiPvAprofundamento,
        // Só aqui: o CLAUDE.md exige WDL nos lances críticos, e pedir na
        // varredura custaria em todos os lances sem ninguém usar.
        showWdl: true,
      })
      base = montarAnalise({
        gameId: game.id,
        ply,
        antes: avaliacoes.antes,
        depois: avaliacoes.depois,
        skillIds: [],
        explanationCode: UNKNOWN_CODE,
        precisao: 'aprofundada',
        config,
      })
      pliesAprofundados += 1
    } catch (erro) {
      if (erro instanceof AnalysisAbortedError) throw erro
      // Aprofundamento falhou: fica o número raso, que é pior mas não é mentira.
      aprofundamentosComFalha += 1
    }

    const { explicacao, skillIds } = explicar(base, config)
    const completa: PositionAnalysis = {
      ...base,
      skillIds,
      explanationCode: explicacao.code,
    }

    analisePorPly.set(candidato.ply, completa)
    explicacoes[candidato.ply] = explicacao
    aprofundados.push(completa)

    avancar(totalGeral)
  }

  // ------------------------------------------------------------- resultado
  const analises = [...analisePorPly.values()].sort((a, b) => a.ply - b.ply)

  // Só os candidatos aprofundados podem virar momento: destacar um lance que só
  // viu orçamento raso, e sem explicação, seria ruído com cara de diagnóstico.
  const momentos: CriticalMoment[] = ordenarPorPly(
    selectCriticalMoments(aprofundados, {
      userColor,
      playedAt: game.playedAt,
      explanations: explicacoes,
      config: config.critical,
    }),
  )

  return {
    gameId: game.id,
    analises,
    momentos,
    resumo: {
      pliesDoUsuario: lancesDoUsuario.length,
      pliesAnalisados: analises.length,
      pliesComFalha,
      pliesAprofundados,
      aprofundamentosComFalha,
      porSeveridade: contarSeveridades(analises),
      unknownRate: unknownRate(Object.values(explicacoes).filter(naoNulo)),
    },
  }
}

function naoNulo(item: MistakeExplanation | null): item is MistakeExplanation {
  return item !== null
}

function contarSeveridades(analises: readonly PositionAnalysis[]): Record<MoveSeverity, number> {
  const contagem = Object.fromEntries(SEVERIDADES.map((chave) => [chave, 0])) as Record<
    MoveSeverity,
    number
  >
  for (const analise of analises) contagem[analise.severity] += 1
  return contagem
}

/**
 * Avalia um lance: a posição antes (com o usuário a jogar) e a posição depois.
 *
 * Duas chamadas de engine por lance, e nenhuma delas em posição do adversário.
 * A posição depois só vai à engine quando a partida não acabou ali.
 */
async function avaliarLance(
  ply: Ply,
  engine: EngineProvider,
  signal: AbortSignal | undefined,
  orcamento: { nodes: number; multiPv: number; showWdl?: boolean },
): Promise<{ antes: Avaliacao; depois: Avaliacao }> {
  const antes = avaliacaoDaEngine(
    await comCancelamento(
      engine.analyzePosition(ply.fenBefore, {
        nodes: orcamento.nodes,
        multiPv: orcamento.multiPv,
        showWdl: orcamento.showWdl,
      }),
      engine,
      signal,
    ),
  )

  garantirNaoAbortado(signal)

  const terminal = avaliacaoTerminal(ply.fenAfter)
  const depois =
    terminal ??
    avaliacaoDaEngine(
      await comCancelamento(
        engine.analyzePosition(ply.fenAfter, {
          nodes: orcamento.nodes,
          multiPv: orcamento.multiPv,
          showWdl: orcamento.showWdl,
        }),
        engine,
        signal,
      ),
    )

  return { antes, depois }
}
