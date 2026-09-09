'use client'

/**
 * Hook React que liga a tela ao `EngineProvider`.
 *
 * Três regras de produto moram aqui, e só aqui:
 *
 * 1. A engine é carregada SOB DEMANDA. O `import()` de `worker-factory` acontece
 *    dentro do efeito de análise, nunca no topo do módulo — se ele subisse para
 *    o topo, o bundler puxaria a engine para qualquer página que importasse este
 *    arquivo, incluindo a landing (7 MB de wasm).
 * 2. Existe UMA instância de provider por componente, descartada no cleanup.
 * 3. Resultado obsoleto nunca atualiza a tela. Cada chamada de `analyze` ganha
 *    um número de pedido; se ele já não for o mais recente quando a resposta
 *    chega, a promessa resolve `null` e o chamador não tem o que exibir.
 *
 * `analyze` nunca rejeita: cancelamento vira `null` silencioso, falha real vira
 * `status: 'erro'`. A tela não precisa de try/catch.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalysisOptions, EngineAnalysis, EngineProvider } from './types'

/**
 * Carrega a fábrica de worker da engine.
 *
 * O import é dinâmico de propósito: só aqui a engine entra no grafo de módulos,
 * para o binário de 7 MB não ser baixado por quem só abriu a landing.
 */
async function carregarFabricaDeWorker(): Promise<() => Worker> {
  const { createStockfishWorker } = await import('@/lib/engine/worker-factory')
  return createStockfishWorker
}

/** Ciclo de vida da engine do ponto de vista da tela. */
export type EngineStatus = 'ocioso' | 'carregando' | 'pronto' | 'erro'

export interface UseEngineResult {
  status: EngineStatus
  /** Há uma análise em andamento agora. Ortogonal a `status`. */
  analisando: boolean
  /** Mensagem em português da última falha real. `null` quando não houve. */
  erro: string | null
  /**
   * Analisa uma posição.
   *
   * Resolve `null` quando o resultado é obsoleto: cancelado por `stop`,
   * substituído por um pedido mais novo, ou o componente desmontou. Resolve
   * `null` também em falha — nesse caso `status` vira `'erro'`.
   */
  analyze: (fen: string, options?: AnalysisOptions) => Promise<EngineAnalysis | null>
  /** Cancela a análise em andamento. O resultado dela não chega à tela. */
  stop: () => Promise<void>
  /** Encerra o worker. A próxima análise sobe uma engine nova do zero. */
  restart: () => Promise<void>
}

/** Cancelamento e descarte são silenciosos: não são falha da engine. */
function foiDescartada(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.name === 'AnalysisCancelledError' || error.name === 'EngineDisposedError'
}

function mensagemDeErro(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return 'Não consegui falar com a engine.'
}

export function useEngine(): UseEngineResult {
  const [status, setStatus] = useState<EngineStatus>('ocioso')
  const [analisando, setAnalisando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const providerRef = useRef<EngineProvider | null>(null)
  /** Carregamento em voo, para dois `analyze` simultâneos não criarem dois workers. */
  const bootRef = useRef<Promise<EngineProvider> | null>(null)
  /** Número do pedido mais recente. Qualquer resposta com número menor é lixo. */
  const pedidoRef = useRef(0)
  const desmontadoRef = useRef(false)

  useEffect(() => {
    desmontadoRef.current = false
    return () => {
      desmontadoRef.current = true
      pedidoRef.current += 1
      const provider = providerRef.current
      providerRef.current = null
      bootRef.current = null
      if (provider) void provider.dispose()
    }
  }, [])

  const carregarProvider = useCallback(async (): Promise<EngineProvider> => {
    const atual = providerRef.current
    if (atual) return atual
    const emVoo = bootRef.current
    if (emVoo) return emVoo

    if (!desmontadoRef.current) {
      setStatus('carregando')
      setErro(null)
    }

    const boot = (async () => {
      // Imports dinâmicos de propósito: a engine só é baixada quando o usuário
      // realmente pede uma análise, nunca no carregamento da página.
      const [createWorker, { StockfishProvider }] = await Promise.all([
        carregarFabricaDeWorker(),
        import('@/lib/engine/stockfish-provider'),
      ])
      const provider = new StockfishProvider({ createWorker })
      await provider.init()
      if (desmontadoRef.current) {
        void provider.dispose()
        throw new Error('Componente desmontado durante o carregamento da engine.')
      }
      providerRef.current = provider
      return provider
    })()

    bootRef.current = boot

    try {
      const provider = await boot
      if (!desmontadoRef.current) setStatus('pronto')
      return provider
    } catch (error) {
      // Um carregamento falho não pode ficar cacheado: a próxima tentativa
      // precisa poder subir um worker novo.
      bootRef.current = null
      throw error
    }
  }, [])

  const analyze = useCallback(
    async (fen: string, options: AnalysisOptions = {}): Promise<EngineAnalysis | null> => {
      const pedido = ++pedidoRef.current
      const atual = () => pedido === pedidoRef.current && !desmontadoRef.current

      setAnalisando(true)
      setErro(null)

      try {
        const provider = await carregarProvider()
        if (!atual()) return null

        const analise = await provider.analyzePosition(fen, options)
        if (!atual()) return null

        setAnalisando(false)
        return analise
      } catch (error) {
        if (!atual()) return null
        setAnalisando(false)
        if (foiDescartada(error)) return null
        setStatus('erro')
        setErro(mensagemDeErro(error))
        return null
      }
    },
    [carregarProvider],
  )

  const stop = useCallback(async (): Promise<void> => {
    // Invalida o pedido em voo antes de mandar parar: mesmo que a engine ainda
    // devolva algo, a resposta já nasce obsoleta.
    pedidoRef.current += 1
    setAnalisando(false)
    const provider = providerRef.current
    if (!provider) return
    try {
      await provider.stop()
    } catch (error) {
      if (desmontadoRef.current || foiDescartada(error)) return
      setStatus('erro')
      setErro(mensagemDeErro(error))
    }
  }, [])

  const restart = useCallback(async (): Promise<void> => {
    pedidoRef.current += 1
    const provider = providerRef.current
    providerRef.current = null
    bootRef.current = null
    setAnalisando(false)
    setErro(null)
    setStatus('ocioso')
    if (provider) await provider.dispose()
  }, [])

  return { status, analisando, erro, analyze, stop, restart }
}
