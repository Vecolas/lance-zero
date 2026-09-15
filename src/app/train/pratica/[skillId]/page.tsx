import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PraticaDeHabilidade } from '@/components/training/PraticaDeHabilidade'
import { getSkill } from '@/domain/skills/catalog'
import { SKILL_IDS, type SkillId } from '@/domain/types'

/**
 * Prática de uma habilidade, com endereço próprio.
 *
 * Pelo mesmo motivo da rota de lição: o card do Hoje precisa MANDAR o aluno a
 * um lugar concreto, e "abra Treinar e procure" não é um destino. A URL também
 * é o que permite recarregar sem perder o lugar e o que dá ao E2E algo para
 * apontar.
 *
 * A rota NÃO decide o que mostrar. Quem decide é o estágio da habilidade, lido
 * pelo componente — ver o cabeçalho dele. Uma rota que já soubesse se é guiada
 * ou independente teria de ler o estado no servidor, e o estado é local.
 */
export const dynamicParams = false

export function generateStaticParams(): { skillId: string }[] {
  return SKILL_IDS.map((skillId) => ({ skillId }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skillId: string }>
}): Promise<Metadata> {
  const { skillId } = await params
  const valido = SKILL_IDS.includes(skillId as SkillId)
  return { title: valido ? `Praticar: ${getSkill(skillId as SkillId).label}` : 'Praticar' }
}

export default async function PraticaPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params
  if (!SKILL_IDS.includes(skillId as SkillId)) notFound()
  const skill = getSkill(skillId as SkillId)

  return (
    <>
      <h1>{skill.label}</h1>
      <p>{skill.description}</p>
      <PraticaDeHabilidade skillId={skillId as SkillId} />
    </>
  )
}
