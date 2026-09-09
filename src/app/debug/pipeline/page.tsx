import type { Metadata } from 'next'
import { PipelineDebugPanel } from '@/components/engine/PipelineDebugPanel'

/**
 * Rota interna, fora da navegação de propósito (`src/lib/navigation.ts` não a
 * conhece). Existe por dois motivos, os dois de engenharia e nenhum de produto:
 *
 * 1. `analyzeGame` só tinha testes com engine falsa. Aqui ele encontra o
 *    Stockfish real, num navegador real — é o alvo de `tests/e2e/pipeline.spec.ts`.
 * 2. Os orçamentos de nós do pipeline nunca foram medidos (issue #21). Esta
 *    tela cronometra as duas passadas e deixa os dois orçamentos editáveis, para
 *    calibrar sem recompilar.
 */
export const metadata: Metadata = {
  title: 'Pipeline (interno)',
  robots: { index: false, follow: false },
}

export default function DebugPipelinePage() {
  return (
    <>
      <h1>Pipeline (interno)</h1>
      <p>
        Bancada de depuração da revisão de partida. Não faz parte do produto e não aparece no menu:
        serve para rodar <code>analyzeGame</code> contra a engine real e medir quanto custa cada
        passada.
      </p>
      <PipelineDebugPanel />
    </>
  )
}
