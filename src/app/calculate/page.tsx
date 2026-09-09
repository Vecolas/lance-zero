import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Cálculo' }

export default function CalculatePage() {
  return (
    <PlaceholderScreen
      title="Cálculo"
      phase={4}
      lead="Treino de visualização e candidatos, separado de reconhecimento de padrões."
      planned={[
        'Rotina xeques, capturas e ameaças',
        'Listar candidatos antes de calcular',
        'Prever a melhor resposta do adversário',
        'Posições cegas curtas com aumento gradual de profundidade',
      ]}
    />
  )
}
