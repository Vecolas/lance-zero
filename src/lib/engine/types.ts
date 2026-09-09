/**
 * Tipos próprios da camada de engine.
 *
 * Nada aqui depende de Stockfish, de Worker ou do DOM: são os contratos que o
 * resto do app enxerga. Trocar a engine não deve tocar nenhum consumidor.
 */

/** Lado que joga na posição analisada. */
export type EngineTurn = 'w' | 'b'

/**
 * Distribuição vitória/empate/derrota reportada pela engine, em partes por mil.
 *
 * Atenção: o WDL do Stockfish é calibrado por auto-jogo da engine. Serve para
 * comparar severidade de lances entre si; nunca deve ser apresentado ao usuário
 * como "sua chance humana de vitória".
 */
export interface EngineWdl {
  win: number
  draw: number
  loss: number
}

/** Uma variação principal retornada pela engine. */
export interface EngineLine {
  /** Índice da linha em MultiPV, começando em 1. */
  multiPv: number
  /**
   * Avaliação em centipeões na perspectiva de quem joga a posição.
   * `null` quando a linha é um mate. Use `normalizeScoreToWhite` para
   * converter para a perspectiva das brancas.
   */
  scoreCp: number | null
  /** Lances até o mate, positivo a favor de quem joga. `null` se não há mate. */
  mateIn: number | null
  /** Variação em UCI longo, como `['e2e4', 'e7e5', 'g1f3']`. */
  pv: string[]
  depth: number
  nodes: number
  wdl?: EngineWdl
}

export interface EngineAnalysis {
  fen: string
  /** Lado que joga, extraído do FEN. Define a perspectiva dos scores. */
  turn: EngineTurn
  /** Maior profundidade observada nesta análise. */
  depth: number
  /** Maior contagem de nós observada nesta análise. */
  nodes: number
  bestMoveUci: string | null
  ponderUci: string | null
  /** Linhas ordenadas por `multiPv` crescente. */
  lines: EngineLine[]
  elapsedMs: number
}

export interface AnalysisOptions {
  nodes?: number
  depth?: number
  multiPv?: number
  showWdl?: boolean
}

/**
 * Contrato de engine usado pelo app. Definido em CLAUDE.md.
 *
 * Implementações precisam garantir: handshake UCI antes de qualquer análise,
 * fila serializada de comandos, descarte de respostas obsoletas, cancelamento
 * explícito e liberação de recursos.
 */
export interface EngineProvider {
  init(): Promise<void>
  analyzePosition(fen: string, options: AnalysisOptions): Promise<EngineAnalysis>
  stop(): Promise<void>
  dispose(): Promise<void>
}
