'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  isThemePreference,
  nextTheme,
  THEME_LABEL,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/design/theme'
import styles from './ThemeToggle.module.css'

const ICON: Record<ThemePreference, string> = {
  system: 'M4 5.5h16v10H4zM9 19.5h6',
  light:
    'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4',
  dark: 'M20 13.5A8 8 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5z',
}

/**
 * A preferência vive fora do React (localStorage + atributo no `<html>`), então
 * `useSyncExternalStore` é o encaixe certo: nada de setState dentro de efeito, e
 * o servidor renderiza 'system' sem divergir da hidratação.
 */
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function getSnapshot(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function getServerSnapshot(): ThemePreference {
  return 'system'
}

function persist(preference: ThemePreference) {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Sem persistência, mas o tema vale para esta sessão.
  }
  notify()
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const cycle = useCallback(() => persist(nextTheme(preference)), [preference])

  const label = THEME_LABEL[preference]

  return (
    <button
      type="button"
      className={styles.button}
      onClick={cycle}
      aria-label={`Tema: ${label}. Trocar para ${THEME_LABEL[nextTheme(preference)]}.`}
      title={`Tema: ${label}`}
    >
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {preference === 'light' ? <circle cx="12" cy="12" r="3.8" /> : null}
        <path d={ICON[preference]} />
      </svg>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
