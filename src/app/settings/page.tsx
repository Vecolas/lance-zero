import type { Metadata } from 'next'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export const metadata: Metadata = { title: 'Ajustes' }

export default function SettingsPage() {
  return (
    <>
      <h1>Ajustes</h1>
      <p>Seus dados são seus: tudo local, exportável e apagável.</p>
      <SettingsPanel />
    </>
  )
}
