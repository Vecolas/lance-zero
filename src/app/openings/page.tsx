import type { Metadata } from 'next'
import { OpeningsWorkbench } from '@/components/openings/OpeningsWorkbench'

export const metadata: Metadata = { title: 'Aberturas' }

export default function OpeningsPage() {
  return (
    <>
      <h1>Aberturas</h1>
      <p>
        Abertura para este nível não é livro de variantes: são poucas linhas, cada uma com a ideia
        escrita ao lado do lance — inclusive os lances do adversário. O que decide o que estudar em
        seguida não é a teoria, e sim as suas partidas: as lacunas abaixo saem do que você enfrentou
        de verdade, ordenadas por quantas vezes apareceram.
      </p>
      <OpeningsWorkbench />
    </>
  )
}
