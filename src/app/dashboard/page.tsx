import type { Metadata } from 'next'
import { DailyPlanView } from '@/components/training/DailyPlanView'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Treino de hoje' }

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Treino de hoje" description="Escolha o que faz sentido trabalhar agora." />
      <DailyPlanView />
    </>
  )
}
