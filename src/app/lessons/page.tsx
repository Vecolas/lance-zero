import type { Metadata } from 'next'
import Link from 'next/link'
import { BibliotecaDeLicoes } from '@/components/lessons/BibliotecaDeLicoes'
import { CATALOGO_DE_LICOES, LICOES_PLANEJADAS } from '@/content/lessons'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Biblioteca' }

export default function LessonsPage() {
  // Números derivados do catálogo: uma contagem escrita à mão aqui envelheceria
  // em silêncio na primeira lição nova.
  const escritas = CATALOGO_DE_LICOES.length
  const faltam = LICOES_PLANEJADAS.minimo - escritas

  return (
    <>
      <PageHeader
        title="Biblioteca"
        description="Microlições curtas: conceito, exemplo resolvido e exercício sem ajuda. Tentar responder ensina."
      />
      <p>
        {escritas} lições escritas até agora; faltam pelo menos {faltam} para fechar o currículo
        planejado. Enquanto isso, o <Link href="/dashboard">treino de hoje</Link> não depende delas.
      </p>
      <BibliotecaDeLicoes />
    </>
  )
}
