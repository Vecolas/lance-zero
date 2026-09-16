'use client'

/**
 * Os cabeçalhos da área de revisão.
 *
 * COMPONENTES DE CLIENTE pelo mesmo motivo do cabeçalho da Biblioteca e do da
 * Conta: o texto é traduzido e o tradutor vem do contexto. As páginas continuam
 * sendo servidor — elas montam cabeçalho e conteúdo, e nenhum dos dois busca
 * dado no servidor.
 */

import { useIdioma } from '@/components/providers/LocaleProvider'
import { PageHeader } from '@/components/ui/primitives'

export function CabecalhoDaRevisao() {
  const { t } = useIdioma()
  return <PageHeader title={t('review.title')} description={t('review.description')} />
}

export function CabecalhoDaSessao() {
  const { t } = useIdioma()
  return (
    <PageHeader title={t('review.sessionTitle')} description={t('review.sessionDescription')} />
  )
}
