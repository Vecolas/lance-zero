import type { Metadata } from 'next'
import { ProgressView } from '@/components/training/ProgressView'

export const metadata: Metadata = { title: 'Progresso' }

export default function ProgressPage() {
  return (
    <>
      <h1>Progresso</h1>
      <p>
        Leitura honesta do que mudou. Sem métricas de vaidade e sem gráfico bonito que não muda
        nenhuma decisão de treino.
      </p>
      <ProgressView />
    </>
  )
}
