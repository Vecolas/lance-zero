'use client'

/**
 * O cabeçalho da tela de Conta.
 *
 * COMPONENTE DE CLIENTE pelo mesmo motivo do cabeçalho da biblioteca: o texto é
 * traduzido e o tradutor vem do contexto. A página continua sendo servidor — ela
 * monta o cabeçalho e o painel, e nenhum dos dois busca dado no servidor.
 */

import { useIdioma } from '@/components/providers/LocaleProvider'
import { PageHeader } from '@/components/ui/primitives'

export function CabecalhoDaConta() {
  const { t } = useIdioma()
  return <PageHeader title={t('account.title')} description={t('account.description')} />
}
