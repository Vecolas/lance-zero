/**
 * Preferência de tema. Lógica pura — o componente cuida do DOM.
 *
 * São três estados, não dois: "sistema" respeita o `prefers-color-scheme` do
 * aparelho e é o padrão. Só quando o usuário escolhe explicitamente é que
 * gravamos `data-theme` no `<html>` e persistimos.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lancezero:tema'

export const THEME_ORDER: readonly ThemePreference[] = ['system', 'light', 'dark']

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** Próximo tema do ciclo do botão. */
export function nextTheme(current: ThemePreference): ThemePreference {
  const i = THEME_ORDER.indexOf(current)
  return THEME_ORDER[(i + 1) % THEME_ORDER.length]
}

/** Tema efetivamente aplicado, dada a preferência e o que o sistema pede. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/**
 * Script aplicado antes da primeira pintura, para a página não piscar branca
 * antes de virar escura. Vai inline no `<head>`, então precisa ser pequeno e
 * não pode lançar quando o localStorage está bloqueado.
 */
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p)}}catch(e){}`
