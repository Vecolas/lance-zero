import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Ajustes' }

export default function SettingsPage() {
  return (
    <PlaceholderScreen
      title="Ajustes"
      phase={4}
      lead="Seus dados são seus: tudo local, exportável e apagável."
      planned={[
        'Exportação e importação de backup JSON com round-trip fiel',
        'Controle de orçamento de análise da engine',
        'Preferências de tabuleiro, tema e movimento reduzido',
        'Apagar dados locais',
      ]}
    />
  )
}
