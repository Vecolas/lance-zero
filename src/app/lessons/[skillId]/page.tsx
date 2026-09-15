import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BibliotecaDeLicoes } from '@/components/lessons/BibliotecaDeLicoes'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { getSkill } from '@/domain/skills/catalog'
import { SKILL_IDS, type SkillId } from '@/domain/types'

/**
 * A lição de UMA habilidade, com endereço próprio.
 *
 * A rota existe porque o plano do dia precisa MANDAR o aluno a uma lição
 * específica — "Aprender: cravada" tem de abrir a cravada, e não a biblioteca
 * inteira para ele procurar. Sem endereço, o card do Hoje só poderia oferecer
 * "abra a biblioteca e ache", que é a versão educada de não oferecer nada.
 *
 * A URL usa o ID DA HABILIDADE e não o da lição, de propósito: quem aponta para
 * cá é o planner, e o planner raciocina em habilidade. Traduzir habilidade para
 * id de lição dentro do planner o faria depender do catálogo de conteúdo.
 *
 * Habilidade sem lição escrita cai em `notFound` em vez de mostrar tela vazia:
 * o catálogo ainda não cobre as 22, e uma página em branco com o nome da
 * habilidade pareceria uma lição que existe e não carregou.
 */
export const dynamicParams = false

export function generateStaticParams(): { skillId: string }[] {
  return CATALOGO_DE_LICOES.map((licao) => ({ skillId: licao.habilidade }))
}

function licaoDe(skillId: string) {
  if (!SKILL_IDS.includes(skillId as SkillId)) return null
  return CATALOGO_DE_LICOES.find((licao) => licao.habilidade === skillId) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skillId: string }>
}): Promise<Metadata> {
  const { skillId } = await params
  const licao = licaoDe(skillId)
  return { title: licao ? licao.titulo : 'Lição' }
}

export default async function LicaoPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params
  const licao = licaoDe(skillId)
  if (!licao) notFound()

  return (
    <>
      <h1>{getSkill(licao.habilidade).label}</h1>
      <p>
        Conceito, exemplo resolvido e exercícios — nesta ordem, com a ajuda diminuindo a cada etapa.
        A última etapa é sem dica nenhuma.
      </p>
      <BibliotecaDeLicoes licaoInicialId={licao.id} />
    </>
  )
}
