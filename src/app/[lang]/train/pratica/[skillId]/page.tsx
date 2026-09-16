import { redirect } from 'next/navigation'
import { SKILL_IDS, type SkillId } from '@/domain/types'

/**
 * O endereço antigo da prática. Ela mudou para `/pratica/{skillId}` quando a
 * aba "Treinar" deixou de existir — ficar sob `/train` apontaria para uma seção
 * que não existe mais.
 *
 * Como o de `/train/revisao`, este desvio protege PLANOS JÁ GRAVADOS: o card de
 * prática do plano do dia guarda o href, e um plano de ontem não muda porque o
 * app mudou.
 *
 * `dynamicParams = false` e `generateStaticParams` continuam aqui pelo mesmo
 * motivo da rota nova: o id de habilidade tem ponto (`tactics.fork`), e sem a
 * lista explícita o Next tentaria resolver qualquer coisa como parâmetro.
 */
export const dynamicParams = false

export function generateStaticParams(): { skillId: string }[] {
  return SKILL_IDS.map((skillId) => ({ skillId }))
}

export default async function PraticaAntigaPage({
  params,
}: {
  params: Promise<{ skillId: string }>
}) {
  const { skillId } = await params
  redirect(`/pratica/${skillId as SkillId}`)
}
