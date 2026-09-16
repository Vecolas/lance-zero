'use client'

/**
 * O atalho da Conta, no canto direito do cabeçalho.
 *
 * POR QUE ELE SAIU DA FILEIRA DE TEXTO. "Conta" estava dentro do grupo de
 * ferramentas como um link de texto comum, e o grupo é posicionado sobre o canto
 * do cabeçalho. Enquanto ali só havia o botão de tema isso funcionava; com
 * "Conta" e o seletor de idioma dentro, o grupo passou a ser mais largo que o
 * espaço reservado e PASSOU POR CIMA da navegação — em inglês, "Library" e
 * "Account" ficavam impressos um sobre o outro.
 *
 * O arranjo foi corrigido no CSS (o grupo deixou de ser absoluto), e este
 * componente resolve a outra metade: Conta não é uma seção do app como Hoje ou
 * Aberturas. É onde o aluno cuida dos próprios dados. Um ícone no canto diz isso
 * e para de competir por largura com a navegação, que é justamente a parte que
 * cresce quando o idioma muda.
 *
 * O NOME ACESSÍVEL CONTINUA SENDO PALAVRA. Ícone sem rótulo é adivinhação: o
 * `aria-label` vem do dicionário, então leitor de tela e `title` dizem "Conta" ou
 * "Account" conforme o idioma — só a representação visual virou desenho.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { traduzirRota } from '@/lib/i18n/rotas'
import styles from './AccountLink.module.css'

/** Silhueta de pessoa: cabeça e ombros. */
const PESSOA = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0'

export function AccountLink() {
  const pathname = usePathname()
  const { locale, t } = useIdioma()
  const href = traduzirRota('/account', locale)
  const atual = pathname === href || pathname === '/account'
  const rotulo = t('navigation.account')

  return (
    <Link
      href={href}
      className={atual ? `${styles.link} ${styles.active}` : styles.link}
      aria-label={rotulo}
      title={rotulo}
      aria-current={atual ? 'page' : undefined}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={PESSOA} />
      </svg>
    </Link>
  )
}
