import type { Metadata } from 'next'
import { TreinoHub } from '@/components/training/TreinoHub'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Treinar' }

/**
 * ABRIR ESTA PÁGINA NÃO ABRE UM EXERCÍCIO.
 *
 * Era o que acontecia antes: a rota montava a sessão de revisão direto, e o
 * aluno caía numa posição sem ter escolhido nada. A sessão continua existindo,
 * agora em `/train/revisao`, alcançável pelo hub — quem quer revisar continua a
 * um clique, e quem abriu a aba para ver o que existe passa a poder ver.
 */
export default function TrainPage() {
  return (
    <>
      <PageHeader
        title="Treinar"
        description="Aprender, praticar, revisar e analisar são atividades diferentes. O LanceZero só cobra sem apoio aquilo que já te ensinou."
      />
      <TreinoHub />
    </>
  )
}
