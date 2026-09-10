/**
 * Preferência de tema. Lógica pura — o componente cuida do DOM.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA, e ela mudou: o botão oferece DOIS estados
 * — claro e escuro — mas o armazenamento continua tendo TRÊS.
 *
 * "Sistema" deixou de ser uma opção escolhível e virou o estado de quem ainda
 * não escolheu: enquanto não houver nada gravado, vale o `prefers-color-scheme`
 * do aparelho. Na primeira escolha, o tema passa a ser explícito.
 *
 * Por que os três estados continuam existindo por dentro: apagar o estado
 * "sem escolha" obrigaria a gravar um tema logo na primeira visita, e aí o app
 * pararia de acompanhar o aparelho de quem nunca mexeu nisso — que é a maioria.
 * O modelo de dados é mais rico que o controle, de propósito.
 *
 * CONSEQUÊNCIA DECLARADA: não há caminho de volta para "seguir o sistema" pela
 * interface. Quem escolher uma vez fica com a escolha até limpar os dados do
 * site. Foi uma decisão consciente do dono do produto — o controle de três
 * posições confundia mais do que servia.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

/** O que de fato pinta a tela. Nunca é 'system': isso é ausência de escolha. */
export type ThemeAplicado = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lancezero:tema'

/** Os dois estados que o botão oferece. `system` NÃO está aqui, de propósito. */
export const TEMAS_ESCOLHIVEIS: readonly ThemeAplicado[] = ['light', 'dark']

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/**
 * O outro tema. Simétrica de propósito: `alternar(alternar(t)) === t`, então
 * não existe estado do qual não se volte com um segundo clique.
 */
export function alternar(atual: ThemeAplicado): ThemeAplicado {
  return atual === 'dark' ? 'light' : 'dark'
}

/** Tema efetivamente aplicado, dada a preferência e o que o sistema pede. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeAplicado {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/**
 * Script aplicado antes da primeira pintura, para a página não piscar branca
 * antes de virar escura. Vai inline no `<head>`, então precisa ser pequeno e
 * não pode lançar quando o localStorage está bloqueado.
 *
 * Ele NÃO grava nada: sem preferência salva, o atributo não é escrito e quem
 * decide é o `prefers-color-scheme` do CSS.
 */
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p)}}catch(e){}`
