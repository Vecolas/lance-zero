import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Partidas' }

export default function GamesPage() {
  return (
    <PlaceholderScreen
      title="Partidas"
      phase={6}
      lead="Suas partidas importadas, revisadas primeiro por você e só depois pela engine."
      planned={[
        'Importação por PGN, Lichess API e Chess.com PubAPI, sem duplicar',
        'Passe 1 humano: onde você acha que a partida virou',
        'Passe 2 engine: varredura rasa e aprofundamento só nas posições candidatas',
        'Três a oito momentos realmente acionáveis por partida, não dezenas',
      ]}
    />
  )
}
