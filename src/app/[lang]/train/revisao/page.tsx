import type { Metadata } from 'next'
import { ReviewSession } from '@/components/training/ReviewSession'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Revisar' }

/**
 * A sessão de revisão ganhou rota própria.
 *
 * Ela morava em `/train`, e por isso abrir a aba "Treinar" jogava o aluno numa
 * posição sem escolha nenhuma. Separar as duas é o que permite ao hub existir:
 * quem quer revisar chega aqui por um clique, e quem não quer não é levado.
 *
 * A rota também dá URL própria à sessão — recarregar, voltar e apontar um teste
 * E2E para ela passam a funcionar, o que não era possível quando ela era uma
 * seção sem endereço.
 */
export default function RevisaoPage() {
  return (
    <>
      <PageHeader
        title="Revisar"
        description="A revisão começa pelas vencidas. Tente antes de ver a resposta: é a recuperação que fixa."
      />
      <ReviewSession />
    </>
  )
}
