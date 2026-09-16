import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JornadaDeLicoes } from '@/components/lessons/JornadaDeLicoes'
import { JORNADAS_DE_LICOES } from '@/domain/roadmap/learning-objects'
import {
  PARAM_DA_ETAPA,
  PARAM_DO_MODO,
  type ModoDeAprendizado,
} from '@/domain/roadmap/learning-target'
import { PageHeader } from '@/components/ui/primitives'

/**
 * Uma jornada de lições, com endereço próprio.
 *
 * O ENDEREÇO É O QUE FAZ "CONTINUAR" CONTINUAR: sem ele, o nó composto do
 * Roadmap só teria como apontar para a primeira lição, e quem parasse na segunda
 * recomeçaria da primeira a cada visita.
 *
 * O SEGMENTO É ESTÁTICO E VEM ANTES DE `[licao]` na resolução do Next, então
 * `/lessons/jornada/candidatos` nunca é confundido com uma lição chamada
 * "jornada". `[licao]` também declara `dynamicParams = false` e não gera esse
 * parâmetro, o que fecha a porta pelos dois lados.
 */
export const dynamicParams = false

const MODOS: readonly ModoDeAprendizado[] = ['aprender', 'continuar', 'revisar', 'reaprender']

export function generateStaticParams(): { jornada: string }[] {
  return JORNADAS_DE_LICOES.map((jornada) => ({ jornada: jornada.journeyId }))
}

function jornadaDe(journeyId: string) {
  return JORNADAS_DE_LICOES.find((jornada) => jornada.journeyId === journeyId) ?? null
}

/** Títulos de tela. Ficam aqui porque são texto de produto, não currículo. */
const TITULO_DA_JORNADA: Record<string, { titulo: string; descricao: string }> = {
  candidatos: {
    titulo: 'Geração de candidatos',
    descricao:
      'Três lições em sequência: varrer os lances forçados, escolher os poucos que merecem cálculo e prever a resposta do adversário.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jornada: string }>
}): Promise<Metadata> {
  const { jornada } = await params
  return { title: TITULO_DA_JORNADA[jornada]?.titulo ?? 'Jornada de lições' }
}

export default async function JornadaDeLicoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ jornada: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { jornada } = await params
  const target = jornadaDe(jornada)
  if (!target) notFound()

  const busca = await searchParams
  const modoBruto = busca[PARAM_DO_MODO]
  const etapaBruta = busca[PARAM_DA_ETAPA]
  const modo = MODOS.find((valor) => valor === modoBruto)
  const etapa = typeof etapaBruta === 'string' ? etapaBruta : undefined

  const texto = TITULO_DA_JORNADA[jornada] ?? {
    titulo: 'Jornada de lições',
    descricao: 'Lições em sequência: ao terminar uma, a próxima abre sozinha.',
  }

  return (
    <>
      <PageHeader title={texto.titulo} description={texto.descricao} />
      <JornadaDeLicoes target={target} etapaPedida={etapa} modo={modo} />
    </>
  )
}
