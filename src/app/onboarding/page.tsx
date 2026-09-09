import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Diagnóstico' }

export default function OnboardingPage() {
  return (
    <PlaceholderScreen
      title="Diagnóstico"
      phase={10}
      lead="Doze a vinte posições para estimar seu ponto de partida e montar a primeira semana."
      planned={[
        'Diagnóstico curto, sem cadastro',
        'Estimativa inicial de habilidades e de faixa de rating',
        'Primeira semana de treino gerada automaticamente',
        'Do zero ao primeiro exercício em poucos minutos',
      ]}
    />
  )
}
