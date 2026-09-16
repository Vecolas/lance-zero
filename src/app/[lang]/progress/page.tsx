import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Roadmap' }

export default function ProgressPage() {
  redirect('/roadmap')
}
