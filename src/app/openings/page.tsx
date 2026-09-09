import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Aberturas' }

export default function OpeningsPage() {
  return (
    <PlaceholderScreen
      title="Aberturas"
      phase={9}
      lead="Repertório enxuto, baseado nas linhas que você de fato enfrenta."
      planned={[
        'Nomes ECO a partir de dados CC0',
        'Opening Explorer do Lichess atrás de um adapter com cache',
        'Árvore de repertório com nota de ideia, não só o lance',
        'Cards FSRS priorizando ramos vistos nas suas partidas',
      ]}
    />
  )
}
