import type { Metadata } from 'next'
import { CabecalhoDaSessao } from '@/components/review/CabecalhoDaRevisao'
import { ReviewSession } from '@/components/training/ReviewSession'

export const metadata: Metadata = { title: 'Sessão de revisão' }

/**
 * A FILA, com endereço próprio — que ela ganhou quando saiu de dentro de
 * `/train` e mantém aqui pelo mesmo motivo: recarregar, voltar no navegador e
 * apontar um teste para ela só funcionam porque ela é um lugar.
 *
 * O endereço mudou de `/train/revisao` para `/revisao/sessao` porque a aba
 * inteira virou Revisar. O antigo continua abrindo, redirecionado.
 */
export default function SessaoDeRevisaoPage() {
  return (
    <>
      <CabecalhoDaSessao />
      <ReviewSession />
    </>
  )
}
