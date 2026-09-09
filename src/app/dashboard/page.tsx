import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Treino de hoje' }

export default function DashboardPage() {
  return (
    <PlaceholderScreen
      title="Treino de hoje"
      phase={5}
      lead="A home de quem já usa o app: uma sessão pronta, com tempo estimado e o motivo de cada bloco."
      planned={[
        'Sessão de 20, 40 ou 60 minutos montada pelo planner determinístico',
        'Ordem: revisões vencidas, erro recente de partida, habilidade fraca, cálculo, currículo',
        'Justificativa visível de cada bloco — nada de caixa-preta',
        'Retomada da sessão interrompida',
      ]}
    />
  )
}
