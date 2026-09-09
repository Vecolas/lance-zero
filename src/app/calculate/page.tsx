import type { Metadata } from 'next'
import { ForcingDrill } from '@/components/calculate/ForcingDrill'

export const metadata: Metadata = { title: 'Cálculo' }

export default function CalculatePage() {
  return (
    <>
      <h1>Cálculo</h1>
      <p>
        Reconhecer padrões e calcular são coisas diferentes, e é por isso que este treino é separado
        dos puzzles. Aqui não existe um lance certo a adivinhar: existe a rotina de olhar tudo que é
        forçante antes de escolher.
      </p>
      <ForcingDrill />
    </>
  )
}
