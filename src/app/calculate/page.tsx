import type { Metadata } from 'next'
import { ForcingDrill } from '@/components/calculate/ForcingDrill'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Cálculo' }

export default function CalculatePage() {
  return (
    <>
      <PageHeader
        title="Cálculo"
        description="Reconhecer padrões e calcular são coisas diferentes. Aqui você constrói candidatos, responde ao adversário e só então avalia."
      />
      <ForcingDrill />
    </>
  )
}
