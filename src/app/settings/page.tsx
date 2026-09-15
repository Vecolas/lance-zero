import type { Metadata } from 'next'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Ajustes' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Seus dados são seus: tudo local, exportável e apagável."
      />
      <SettingsPanel />
    </>
  )
}
