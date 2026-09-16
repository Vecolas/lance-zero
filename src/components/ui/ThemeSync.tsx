'use client'

/**
 * Reafirma o tema escolhido depois de cada navegação.
 *
 * O DEFEITO QUE ISTO CONSERTA, e ele é exatamente o que o plano de idioma proíbe:
 * trocar de idioma apagava o tema. `/dashboard` → `/en/today` cruza o segmento
 * `[lang]`, o React re-renderiza o layout raiz e reconcilia o `<html>` com o que
 * o SERVIDOR mandou — e o servidor não sabe o tema de ninguém, porque ele mora no
 * `localStorage`. O atributo `data-theme`, que o botão tinha escrito à mão,
 * simplesmente sumia, e o aluno que escolheu escuro voltava ao claro por ter
 * escolhido inglês.
 *
 * O script do `<head>` resolve isso no CARREGAMENTO, antes da primeira pintura;
 * ele não roda numa navegação do roteador. Este componente é a outra metade: ele
 * observa o caminho e reescreve o atributo quando ele se perde.
 *
 * NÃO SUBSTITUI O SCRIPT. Ele continua sendo necessário — sem ele a primeira
 * pintura sairia clara e piscaria para escuro, que é pior de ver do que de ler.
 * Os dois cobrem momentos diferentes: o script cobre o carregamento, este cobre a
 * navegação.
 *
 * TEMA É PREFERÊNCIA DE APRESENTAÇÃO, e idioma também. Uma não pode zerar a
 * outra.
 */

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { isThemePreference, THEME_STORAGE_KEY } from '@/lib/design/theme'

export function ThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const salva = localStorage.getItem(THEME_STORAGE_KEY)
      // "Seguir o sistema" é a ausência de escolha: aí o atributo NÃO é escrito,
      // e a media query do CSS decide. Escrevê-lo seria transformar quem nunca
      // escolheu em quem escolheu.
      if (!isThemePreference(salva) || salva === 'system') return
      if (document.documentElement.getAttribute('data-theme') !== salva) {
        document.documentElement.setAttribute('data-theme', salva)
      }
    } catch {
      // Sem armazenamento não há preferência a reafirmar.
    }
  }, [pathname])

  return null
}
