import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BibliotecaDeLicoes } from '@/components/lessons/BibliotecaDeLicoes'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { getSkill } from '@/domain/skills/catalog'
import { SKILL_IDS, type SkillId } from '@/domain/types'
import { PageHeader } from '@/components/ui/primitives'

/**
 * UMA lição, com endereço próprio.
 *
 * A rota existe porque quem manda o aluno para cá — o plano do dia, o hub, e
 * agora o Roadmap — sabe QUAL lição ele quer. Sem endereço, a única oferta
 * possível seria "abra a biblioteca e ache", que é a versão educada de não
 * oferecer nada.
 *
 * O SEGMENTO ACEITA DOIS VOCABULÁRIOS, e o motivo é que existem dois chamadores
 * legítimos com ids diferentes:
 *
 * - o PLANNER raciocina em HABILIDADE (`calculation.candidate-moves`), porque é
 *   o que o modelo de maestria conhece. Traduzir habilidade para id de lição
 *   dentro do planner o faria depender do catálogo de conteúdo;
 * - o ROADMAP raciocina em LIÇÃO (`lances-candidatos`), porque um nó composto
 *   aponta para uma lição específica de uma sequência — e nesse caso a
 *   habilidade não identifica qual.
 *
 * Um segundo espaço de URLs para o segundo vocabulário seria pior: duas rotas
 * para a mesma tela é a duplicação que produz a divergência seguinte. A ordem de
 * busca é ID DE LIÇÃO PRIMEIRO, porque ele é o mais específico dos dois.
 *
 * Habilidade ou lição sem conteúdo cai em `notFound` em vez de tela vazia: o
 * catálogo ainda não cobre as 22 habilidades, e uma página em branco com o nome
 * do assunto pareceria uma lição que existe e não carregou.
 */
export const dynamicParams = false

export function generateStaticParams(): { licao: string }[] {
  // Os dois vocabulários, sem repetir quando coincidirem.
  const enderecos = new Set<string>()
  for (const licao of CATALOGO_DE_LICOES) {
    enderecos.add(licao.id)
    enderecos.add(licao.habilidade)
  }
  return [...enderecos].map((licao) => ({ licao }))
}

function licaoDe(endereco: string) {
  const porId = CATALOGO_DE_LICOES.find((licao) => licao.id === endereco)
  if (porId) return porId
  if (!SKILL_IDS.includes(endereco as SkillId)) return null
  return CATALOGO_DE_LICOES.find((licao) => licao.habilidade === endereco) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ licao: string }>
}): Promise<Metadata> {
  const { licao } = await params
  const encontrada = licaoDe(licao)
  return { title: encontrada ? encontrada.titulo : 'Lição' }
}

export default async function LicaoPage({ params }: { params: Promise<{ licao: string }> }) {
  const { licao } = await params
  const encontrada = licaoDe(licao)
  if (!encontrada) notFound()

  return (
    <>
      <PageHeader
        title={getSkill(encontrada.habilidade).label}
        description="Conceito, exemplo resolvido e exercícios, com a ajuda diminuindo a cada etapa."
      />
      <BibliotecaDeLicoes licaoInicialId={encontrada.id} />
    </>
  )
}
