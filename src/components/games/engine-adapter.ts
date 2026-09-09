import type { AnalysisOptions, EngineAnalysis, EngineProvider } from '@/lib/engine/types'

/**
 * Adapta o hook `useEngine` ao contrato `EngineProvider` que o pipeline espera.
 *
 * O pipeline nunca instancia engine — recebe uma por injeção. O hook, por sua
 * vez, cuida do ciclo de vida do worker e do descarte de resposta obsoleta.
 * Este arquivo só faz a ponte.
 *
 * A decisão que ele carrega: `analyze` resolve `null` quando o resultado é
 * obsoleto (cancelado, substituído, ou o componente desmontou). Para o pipeline
 * isso não é "análise vazia", é ausência de resultado — e ele já sabe tratar
 * falha por lance sem derrubar a partida inteira. Devolver um `EngineAnalysis`
 * fabricado aqui seria inventar avaliação, que é exatamente o que o produto
 * proíbe.
 */
export class EngineIndisponivelError extends Error {
  constructor() {
    super('A engine não devolveu resultado para esta posição.')
    this.name = 'EngineIndisponivelError'
  }
}

export interface AdaptarEngineArgs {
  analyze: (fen: string, options?: AnalysisOptions) => Promise<EngineAnalysis | null>
  stop: () => Promise<void>
}

export function adaptarEngine({ analyze, stop }: AdaptarEngineArgs): EngineProvider {
  return {
    // O hook sobe o worker sob demanda na primeira análise; não há o que
    // inicializar aqui, e fingir inicialização seria mentira sem efeito.
    async init() {},
    async analyzePosition(fen: string, options: AnalysisOptions): Promise<EngineAnalysis> {
      const resultado = await analyze(fen, options)
      if (!resultado) throw new EngineIndisponivelError()
      return resultado
    },
    stop,
    // Quem descarta o worker é o hook, no cleanup do efeito dele. Descartar
    // daqui deixaria o hook com referência para um worker morto.
    async dispose() {},
  }
}
