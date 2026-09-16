'use client'

/**
 * O cabeçalho da biblioteca, com o tamanho do catálogo dito em voz alta.
 *
 * ELE É UM COMPONENTE DE CLIENTE por um motivo só: o texto é traduzido, e o
 * tradutor vem do contexto. A página em si continua sendo servidor — ela monta o
 * cabeçalho e a grade, e nenhum dos dois busca dado no servidor.
 *
 * A CONTAGEM É DERIVADA do catálogo, nunca escrita à mão: um número fixo aqui
 * envelheceria em silêncio na primeira lição nova, e a frase passaria a mentir
 * sobre o próprio produto.
 */

import { useIdioma } from '@/components/providers/LocaleProvider'
import { PageHeader } from '@/components/ui/primitives'
import { CATALOGO_DE_LICOES, LICOES_PLANEJADAS } from '@/content/lessons'
import styles from './CabecalhoDaBiblioteca.module.css'

export function CabecalhoDaBiblioteca() {
  const { t } = useIdioma()
  const escritas = CATALOGO_DE_LICOES.length
  const faltam = Math.max(0, LICOES_PLANEJADAS.minimo - escritas)

  return (
    <>
      <PageHeader title={t('lessons.title')} description={t('lessons.description')} />
      <p className={styles.contagem}>{t('lessons.countWritten', { escritas, faltam })}</p>
    </>
  )
}
