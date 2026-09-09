import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Finais' }

export default function EndgamesPage() {
  return (
    <PlaceholderScreen
      title="Finais"
      phase={8}
      lead="Currículo curto de finais, com defesa perfeita quando a tablebase cobrir a posição."
      planned={[
        'Mates básicos, oposição, casas-chave, regra do quadrado, peão passado',
        'Adapter de tablebase Syzygy com cache e degradação graciosa',
        'Posições treináveis com objetivo verificável',
        'Lições completáveis offline depois de cacheadas',
      ]}
    />
  )
}
