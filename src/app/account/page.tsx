import type { Metadata } from 'next'
import { AccountPanel } from '@/components/account/AccountPanel'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Conta' }

export default function AccountPage() {
  return (
    <>
      <PageHeader
        title="Conta"
        description="Entre para levar seu progresso entre aparelhos. Sem conta, o LanceZero continua funcionando localmente."
      />
      <AccountPanel />
    </>
  )
}
