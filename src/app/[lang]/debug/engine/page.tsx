import type { Metadata } from 'next'
import { EngineDebugPanel } from '@/components/engine/EngineDebugPanel'

/**
 * Rota interna, fora da navegação de propósito (`src/lib/navigation.ts` não a
 * conhece). Existe para conferir o contrato da engine num navegador de verdade.
 */
export const metadata: Metadata = {
  title: 'Engine (interno)',
  robots: { index: false, follow: false },
}

export default function DebugEnginePage() {
  return (
    <>
      <h1>Engine (interno)</h1>
      <p>
        Bancada de depuração do Stockfish. Não faz parte do produto e não aparece no menu: serve
        para verificar handshake, MultiPV, cancelamento e reinício do worker.
      </p>
      <EngineDebugPanel />
    </>
  )
}
