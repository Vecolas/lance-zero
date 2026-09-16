'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useTraduzir } from '@/components/providers/LocaleProvider'
import {
  alternar,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeAplicado,
  type ThemePreference,
} from '@/lib/design/theme'
import styles from './ThemeToggle.module.css'

/**
 * Botão de tema: duas posições, sol e lua.
 *
 * DECISÃO 1 — O ÍCONE É ESCOLHIDO POR CSS, NÃO POR JAVASCRIPT. Os dois desenhos
 * estão sempre no DOM e o tema em vigor esconde um deles. Isso existe porque o
 * servidor não tem como saber o `prefers-color-scheme` do aparelho: decidir o
 * ícone em JS faria a primeira pintura mostrar o símbolo errado e corrigi-lo
 * depois da hidratação — um piscar que aparece em toda navegação.
 *
 * DECISÃO 2 — O RÓTULO ACESSÍVEL vem do JavaScript, e aí o custo é aceitável:
 * antes da hidratação ele pode descrever o tema errado, mas ninguém o lê nesse
 * intervalo, e leitor de tela recebe o valor certo assim que o React assume.
 * Trocar precisão de texto por um piscar visível seria o negócio errado.
 *
 * DECISÃO 3 — O rótulo diz o estado E a ação ("Tema claro. Trocar para
 * escuro."). Só o estado deixa a pessoa sem saber o que o clique faz; só a ação
 * esconde em que tema ela está.
 */

const SOL =
  'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4'
const LUA = 'M20 13.5A8 8 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5z'

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function mediaEscura(): MediaQueryList | null {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  // Sem isto, quem está em "seguir o sistema" veria o rótulo congelado no tema
  // antigo quando o aparelho trocasse de modo sozinho, ao anoitecer.
  const media = mediaEscura()
  media?.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
    media?.removeEventListener('change', listener)
  }
}

function preferenciaSalva(): ThemePreference {
  try {
    const salva = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(salva) ? salva : 'system'
  } catch {
    return 'system'
  }
}

function getSnapshot(): ThemeAplicado {
  return resolveTheme(preferenciaSalva(), mediaEscura()?.matches ?? false)
}

/**
 * No servidor não há aparelho para consultar. 'light' é o mesmo padrão que o
 * CSS assume fora da media query, então o rótulo nasce coerente com a folha de
 * estilo — e o ícone, que é decidido por CSS, já nasce certo de qualquer jeito.
 */
function getServerSnapshot(): ThemeAplicado {
  return 'light'
}

function persist(escolhido: ThemeAplicado) {
  document.documentElement.setAttribute('data-theme', escolhido)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, escolhido)
  } catch {
    // Sem persistência, mas o tema vale para esta sessão.
  }
  notify()
}

export function ThemeToggle() {
  const t = useTraduzir()
  const aplicado = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const trocar = useCallback(() => persist(alternar(aplicado)), [aplicado])

  return (
    <button
      type="button"
      className={styles.button}
      onClick={trocar}
      aria-label={aplicado === 'dark' ? t('appearance.themeToLight') : t('appearance.themeToDark')}
    >
      <svg
        className={`${styles.icon} ${styles.sol}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3.8" />
        <path d={SOL} />
      </svg>
      <svg
        className={`${styles.icon} ${styles.lua}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={LUA} />
      </svg>
    </button>
  )
}
