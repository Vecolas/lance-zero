import type { Metadata } from 'next'
import { PgnWorkbench } from '@/components/chess/PgnWorkbench'

export const metadata: Metadata = { title: 'Partidas' }

export default function GamesPage() {
  return (
    <>
      <h1>Partidas</h1>
      <p>
        Carregue um PGN ou uma posição e percorra a partida lance a lance. Você também pode jogar a
        partir de qualquer posição — só lances legais são aceitos.
      </p>
      <p>
        A importação automática do Lichess e do Chess.com, a revisão humana antes da engine e a
        detecção de momentos críticos chegam na Fase 6.
      </p>
      <PgnWorkbench />
    </>
  )
}
