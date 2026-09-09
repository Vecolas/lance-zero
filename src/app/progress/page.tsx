import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Progresso' }

export default function ProgressPage() {
  return (
    <PlaceholderScreen
      title="Progresso"
      phase={5}
      lead="Leitura honesta do que melhorou, sem métricas de vaidade."
      planned={[
        'Três forças e três prioridades atuais',
        'Série temporal de erros graves por partida',
        'Retenção: o erro treinado voltou a acontecer?',
        'Tabelas simples por tema; radar apenas como visual secundário',
      ]}
    />
  )
}
