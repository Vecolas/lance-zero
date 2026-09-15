import type { Metadata } from 'next'
import Link from 'next/link'
import { EndgamesWorkbench } from '@/components/endgames/EndgamesWorkbench'

export const metadata: Metadata = { title: 'Finais' }

export default function EndgamesPage() {
  return (
    <>
      <h1>Finais</h1>
      <p>
        Final não se decora, se calcula. Cada posição tem um objetivo que o app sabe julgar sozinho:
        você joga, e a tela diz se cumpriu, se ainda dá ou se já era. Quando a tablebase cobre a
        posição, o adversário joga a defesa perfeita — e quando ela não responde, a tela diz isso em
        vez de fingir.
      </p>
      <p><Link href="/finais">Abrir biblioteca visual de finais</Link> — conceitos, técnicas e posições variadas.</p>
      <EndgamesWorkbench />
    </>
  )
}
