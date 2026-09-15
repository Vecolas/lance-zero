import type { Metadata } from 'next'
import { AccountPanel } from '@/components/account/AccountPanel'

export const metadata: Metadata = { title: 'Conta' }

export default function AccountPage() {
  return (
    <>
      <h1>Conta</h1>
      <p>
        Entre para levar seu progresso entre aparelhos. Sem configuração, o LanceZero continua
        funcionando localmente.
      </p>
      <AccountPanel />
    </>
  )
}
