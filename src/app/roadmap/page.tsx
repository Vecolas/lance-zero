import type { Metadata } from 'next'
import { RoadmapView } from '@/components/roadmap/RoadmapView'
import { ProgressView } from '@/components/training/ProgressView'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Roadmap' }

/**
 * O ROADMAP É A CASA DO PROGRESSO.
 *
 * Existia uma tela separada em `/progress`. Ela virou `redirect('/roadmap')` e o
 * conteúdo dela ficou ÓRFÃO: `ProgressView` continuou no repositório, inteira e
 * funcionando, sem nenhum componente que a renderizasse. O resumo dos últimos 7
 * dias, os cards de "onde você está firme" e a tabela de habilidades sumiram do
 * produto sem que nada apontasse isso — o redirecionamento levava a uma página
 * que não tinha aquilo.
 *
 * A decisão é a do redirecionamento, agora cumprida: o Roadmap responde às duas
 * perguntas, e é o que a descrição desta página já prometia. "O que o LanceZero
 * ensina" é o mapa; "como vou" é a evolução.
 *
 * O MAPA VEM PRIMEIRO porque é ele que dá nome à tela. A evolução vem logo
 * abaixo, com os próprios títulos dela — nenhuma das duas é subseção da outra, e
 * por isso não há um cabeçalho extra costurando as duas.
 */
export default function RoadmapPage() {
  return (
    <>
      <PageHeader
        title="Roadmap"
        description="Veja tudo o que o LanceZero ensina e acompanhe sua evolução."
      />
      <RoadmapView />
      <ProgressView />
    </>
  )
}
