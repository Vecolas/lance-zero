import type { Metadata } from 'next'
import { DailyPlanView } from '@/components/training/DailyPlanView'

export const metadata: Metadata = { title: 'Treino de hoje' }

export default function DashboardPage() {
  return (
    <>
      <h1>Treino de hoje</h1>
      <DailyPlanView />
    </>
  )
}
