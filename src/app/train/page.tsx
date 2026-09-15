import type { Metadata } from 'next'
import { TreinoHub } from '@/components/training/TreinoHub'

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
      <h1>Treinar</h1>
      <p>
        Quatro coisas diferentes, com nomes diferentes: aprender um conceito, praticar o que você já
        viu, revisar o que já aprendeu e analisar as suas partidas. O LanceZero só cobra sem apoio
        aquilo que já te ensinou.
      </p>
      <TreinoHub />
    </>
  )
}
