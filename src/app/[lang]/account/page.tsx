import type { Metadata } from 'next'
import { AccountPanel } from '@/components/account/AccountPanel'
import { CabecalhoDaConta } from '@/components/account/CabecalhoDaConta'

export const metadata: Metadata = { title: 'Conta' }

export default function AccountPage() {
  return (
    <>
      <CabecalhoDaConta />
      <AccountPanel />
    </>
  )
}
