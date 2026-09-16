import type { Metadata } from 'next'
import { EndgameLibrary } from '@/components/endgames/EndgameLibrary'

export const metadata: Metadata = { title: 'Finais' }

export default function FinaisPage() {
  return (
    <>
      <h1>Finais</h1>
      <p>
        Aprenda a reconhecer posições, encontrar planos e converter vantagens — ou defender o
        empate. Finais são princípios aplicados em posições variadas, não linhas para decorar.
      </p>
      <EndgameLibrary />
    </>
  )
}
