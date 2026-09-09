import type { Metadata } from 'next'
import { GamesWorkbench } from '@/components/games/GamesWorkbench'

export const metadata: Metadata = { title: 'Partidas' }

export default function GamesPage() {
  return (
    <>
      <h1>Partidas</h1>
      <p>
        Importe suas partidas e revise você primeiro. A engine só entra depois que você disser onde
        acha que a partida mudou — inverter essa ordem transforma revisão em leitura passiva.
      </p>
      <GamesWorkbench />
    </>
  )
}
