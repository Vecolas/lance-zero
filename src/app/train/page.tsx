import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Treinar' }

export default function TrainPage() {
  return (
    <PlaceholderScreen
      title="Treinar"
      phase={5}
      lead="A sessão em si: um exercício por vez, sem menu, sem escolha paralisante."
      planned={[
        'Execução do plano do dia bloco a bloco',
        'Mistura de puzzles, cálculo e revisões FSRS',
        'Dicas graduais e explicação só depois da resposta',
        'Registro de tentativa alimentando o modelo de habilidades',
      ]}
    />
  )
}
