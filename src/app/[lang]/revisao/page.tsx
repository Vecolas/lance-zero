import type { Metadata } from 'next'
import { CabecalhoDaRevisao } from '@/components/review/CabecalhoDaRevisao'
import { PainelDeRevisao } from '@/components/review/PainelDeRevisao'

export const metadata: Metadata = { title: 'Revisar' }

/**
 * A CASA DA REVISÃO — o que era a aba "Treinar".
 *
 * Abrir esta aba não dispara exercício nenhum, e essa propriedade é herdada de
 * propósito: o hub anterior existia justamente porque `/train` abria uma posição
 * direto, sem o aluno ter escolhido nada. A fila continua tendo endereço próprio
 * (`/revisao/sessao`), e daqui se vai até ela por um clique.
 */
export default function RevisaoPage() {
  return (
    <>
      <CabecalhoDaRevisao />
      <PainelDeRevisao />
    </>
  )
}
