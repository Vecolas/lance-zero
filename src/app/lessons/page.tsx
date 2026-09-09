import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Biblioteca' }

export default function LessonsPage() {
  return (
    <PlaceholderScreen
      title="Biblioteca"
      phase={10}
      lead="Microlições curtas que sempre terminam em recuperação ativa, nunca em texto solto."
      planned={[
        '30 a 40 lições em PT-BR',
        'Exemplo resolvido, imitação guiada e depois teste sem dica',
        'Vínculo direto com as habilidades do skill graph',
        'Estados vazios que apontam para o treino, não para o catálogo',
      ]}
    />
  )
}
