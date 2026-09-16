import type { Metadata } from 'next'
import { RoadmapView } from '@/components/roadmap/RoadmapView'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Roadmap' }
export default function RoadmapPage() { return <><PageHeader title="Roadmap" description="Veja tudo o que o LanceZero ensina e acompanhe sua evolução." /><RoadmapView /></> }
